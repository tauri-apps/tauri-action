import { platform } from 'os'
import * as core from '@actions/core'
import execa from 'execa'
import { join, resolve } from 'path'
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'fs'
import uploadReleaseAssets from './upload-release-assets'
import createRelease from './create-release'
import toml from '@iarna/toml'

function getPackageJson(root: string): any {
  const packageJsonPath = join(root, 'package.json')
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString()
    const packageJson = JSON.parse(packageJsonString)
    return packageJson
  }
  return null
}

function hasTauriDependency(root: string): boolean {
  const packageJson = getPackageJson(root)
  return packageJson && ((packageJson.dependencies && packageJson.dependencies.tauri) || ((packageJson.devDependencies && packageJson.devDependencies.tauri)))
}

function usesYarn(root: string): boolean {
  return existsSync(join(root, 'yarn.lock'))
}

function execCommand(command: string, { cwd }: { cwd: string | undefined }): Promise<void> {
  console.log(`running ${command}`)
  const [cmd, ...args] = command.split(' ')
  return execa(cmd, args, {
    cwd,
    shell: process.env.shell || true,
    windowsHide: true,
    stdio: 'inherit',
    env: { FORCE_COLOR: '0' },
  }).then()
}

interface CargoManifestBin {
  name: string
}

interface CargoManifest {
  package: { version: string, name: string, 'default-run': string }
  bin: CargoManifestBin[]
}

interface Application {
  runner: string
  name: string
  version: string
}

interface BuildOptions {
  configPath: string | null
  distPath: string | null
  iconPath: string | null
  npmScript: string | null
}

async function buildProject(root: string, debug: boolean, { configPath, distPath, iconPath, npmScript }: BuildOptions): Promise<string[]> {
  return new Promise<string>((resolve) => {
    if (hasTauriDependency(root)) {
      if (npmScript) {
        resolve(usesYarn(root) ? `yarn ${npmScript}` : `npm run ${npmScript}`)
      } else {
        resolve(usesYarn(root) ? 'yarn tauri' : 'npx tauri')
      }
    } else {
      execCommand('npm install -g tauri', { cwd: undefined }).then(() => resolve('tauri'))
    }
  })
    .then((runner: string) => {
      const manifestPath = join(root, 'src-tauri/Cargo.toml')
      if (existsSync(manifestPath)) {
        const cargoManifest = toml.parse(readFileSync(manifestPath).toString()) as any as CargoManifest
        return {
          runner,
          name: cargoManifest.package.name,
          version: cargoManifest.package.version
        }
      } else {
        const packageJson = getPackageJson(root)
        const appName = packageJson ? (packageJson.displayName || packageJson.name).replace(/ /g, '-') : 'app'
        return execCommand(`${runner} init --ci --app-name ${appName}`, { cwd: root }).then(() => {
          const cargoManifest = toml.parse(readFileSync(manifestPath).toString()) as any as CargoManifest
          const version = packageJson ? packageJson.version : '0.1.0'

          console.log(`Replacing cargo manifest options - package.version=${version}`)
          cargoManifest.package.version = version
          writeFileSync(manifestPath, toml.stringify(cargoManifest as any))

          const app = {
            runner,
            name: appName,
            version
          }
          if (iconPath) {
            return execCommand(`${runner} icon --i ${join(root, iconPath)}`, { cwd: root }).then(() => app)
          }

          return app
        })
      }
    })
    .then((app: Application) => {
      const tauriConfPath = join(root, 'src-tauri/tauri.conf.json')
      if (configPath !== null) {
        copyFileSync(configPath, tauriConfPath)
      }

      if (distPath) {
        const tauriConf = JSON.parse(readFileSync(tauriConfPath).toString())
        tauriConf.build.distDir = distPath
        writeFileSync(tauriConfPath, JSON.stringify(tauriConf))
      }

      const args = debug ? ['--debug'] : []
      return execCommand(`${app.runner} build` + (args.length ? ` ${args.join(' ')}` : ''), { cwd: root }).then(() => {
        const appName = app.name
        const artifactsPath = join(root, `src-tauri/target/${debug ? 'debug' : 'release'}`)

        switch (platform()) {
          case 'darwin':
            return [
              join(artifactsPath, `bundle/dmg/${appName}_${app.version}_${process.arch}.dmg`),
              join(artifactsPath, `bundle/osx/${appName}_${app.version}_${process.arch}.app`)
            ]
          case 'win32':
            return [
              join(artifactsPath, `bundle/msi/${appName}_${app.version}_${process.arch}.msi`),
            ]
          default:
            const arch = process.arch === 'x64'
              ? 'amd64'
              : (process.arch === 'x32' ? 'i386' : process.arch)
            return [
              join(artifactsPath, `bundle/deb/${appName}_${app.version}_${arch}.deb`),
              join(artifactsPath, `bundle/appimage/${appName}_${app.version}_${arch}.AppImage`)
            ]
        }
      }).then(paths => paths.filter(p => existsSync(p)))
    })
}

async function run(): Promise<void> {
  try {
    const projectPath = resolve(process.cwd(), core.getInput('projectPath') || process.argv[2])
    const configPath = join(projectPath, core.getInput('configPath') || 'tauri.conf.json')
    const distPath = core.getInput('distPath')
    const iconPath = core.getInput('iconPath')
    const includeDebug = core.getInput('includeDebug') === 'true'
    const npmScript = core.getInput('npmScript')

    let tagName = core.getInput('tagName').replace('refs/tags/', '')
    let releaseName = core.getInput('releaseName').replace('refs/tags/', '')
    let body = core.getInput('releaseBody')
    const draft = core.getInput('releaseDraft') === 'true'
    const prerelease = core.getInput('prerelease') === 'true'
    const commitish = core.getInput('releaseCommitish') || null

    if (Boolean(tagName) !== Boolean(releaseName)) {
      throw new Error('`tag` is required along with `releaseName` when creating a release.')
    }

    const options: BuildOptions = { configPath: existsSync(configPath) ? configPath : null, distPath, iconPath, npmScript }
    const artifacts = await buildProject(projectPath, false, options)
    if (includeDebug) {
      const debugArtifacts = await buildProject(projectPath, true, options)
      artifacts.push(...debugArtifacts)
    }

    if (artifacts.length === 0) {
      throw new Error('No artifacts were found.')
    }

    console.log(`Artifacts: ${artifacts}.`)

    let releaseId: number
    if (tagName) {
      const packageJson = getPackageJson(projectPath)
      const templates = [{
        key: '__VERSION__',
        value: packageJson?.version
      }]

      templates.forEach(template => {
        const regex = new RegExp(template.key, 'g')
        tagName = tagName.replace(regex, template.value)
        releaseName = releaseName.replace(regex, template.value)
        body = body.replace(regex, template.value)
      })

      const releaseData = await createRelease(tagName, releaseName, body, commitish || undefined, draft, prerelease)
      releaseId = releaseData.id
      core.setOutput('releaseUploadUrl', releaseData.uploadUrl)
      core.setOutput('releaseId', releaseData.id)
      core.setOutput('releaseHtmlUrl', releaseData.htmlUrl)
    } else {
      releaseId = Number(core.getInput('releaseId') || 0)
    }

    if (releaseId) {
      if (platform() === 'darwin') {
        let i = 0
        for (const artifact of artifacts) {
          if (artifact.endsWith('.app')) {
            await execCommand(`tar -czf ${artifact}.tgz ${artifact}`, { cwd: undefined })
            artifacts[i] += '.tgz'
          }
          i++
        }
      }
      await uploadReleaseAssets(releaseId, artifacts)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
