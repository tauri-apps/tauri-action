import { platform } from 'os'
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'fs'
import execa from 'execa'
import { parse as parseToml } from '@iarna/toml'
import { join } from 'path'

export function getPackageJson(root: string): any {
  const packageJsonPath = join(root, 'package.json')
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString()
    const packageJson = JSON.parse(packageJsonString)
    return packageJson
  }
  return null
}

function hasDependency(dependencyName: string, root: string): boolean {
  const packageJson = getPackageJson(root)
  return (
    packageJson &&
    ((packageJson.dependencies && packageJson.dependencies[dependencyName]) ||
      (packageJson.devDependencies &&
        packageJson.devDependencies[dependencyName]))
  )
}

function usesYarn(root: string): boolean {
  return existsSync(join(root, 'yarn.lock'))
}

export function execCommand(
  command: string,
  args: string[],
  { cwd }: { cwd?: string } = {}
): Promise<void> {
  console.log(`running ${command}`, args)
  return execa(command, args, {
    cwd,
    stdio: 'inherit',
    env: { FORCE_COLOR: '0' }
  }).then()
}

interface CargoManifestBin {
  name: string
}

interface CargoManifest {
  package: { version: string; name: string; 'default-run': string }
  bin: CargoManifestBin[]
}

interface TauriConfig {
  package?: {
    productName?: string
    version?: string
  }
}

interface Application {
  runner: Runner
  name: string
  version: string
}

export interface BuildOptions {
  configPath: string | null
  distPath: string | null
  iconPath: string | null
  npmScript: string | null
  args: string[] | null
}

export interface Runner {
  runnerCommand: string
  runnerArgs: string[]
}

interface Info {
  name: string
  version: string
}
export function getInfo(root: string): Info {
  const configPath = join(root, 'src-tauri/tauri.conf.json')
  if (existsSync(configPath)) {
    let name
    let version
    const config = JSON.parse(
      readFileSync(configPath).toString()
    ) as TauriConfig
    if (config.package) {
      name = config.package.productName
      version = config.package.version
    }
    if (!(name && version)) {
      const manifestPath = join(root, 'src-tauri/Cargo.toml')
      const cargoManifest = (parseToml(
        readFileSync(manifestPath).toString()
      ) as any) as CargoManifest
      name = name || cargoManifest.package.name
      version = version || cargoManifest.package.version
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version')
      process.exit(1)
    }

    return {
      name,
      version,
    }
  } else {
    const packageJson = getPackageJson(root)
    const appName = packageJson
      ? (packageJson.displayName || packageJson.name).replace(/ /g, '-')
      : 'app'
    const version = packageJson ? packageJson.version : '0.1.0'
    return {
      name: appName,
      version
    }
  }
}

export async function buildProject(
  preferGlobal: boolean,
  root: string,
  debug: boolean,
  { configPath, distPath, iconPath, npmScript, args }: BuildOptions
): Promise<string[]> {
  return new Promise<Runner>((resolve, reject) => {
    if (preferGlobal) {
      resolve({ runnerCommand: 'tauri', runnerArgs: [] })
    } else if (hasDependency('@tauri-apps/cli', root) || hasDependency('vue-cli-plugin-tauri', root)) {
      if (npmScript) {
        resolve(
          usesYarn(root)
            ? { runnerCommand: 'yarn', runnerArgs: npmScript.split(' ') }
            : { runnerCommand: 'npm', runnerArgs: ['run', ...npmScript.split(' ')] }
        )
      } else {
        resolve(
          usesYarn(root)
            ? { runnerCommand: 'yarn', runnerArgs: ['tauri'] }
            : { runnerCommand: 'npx', runnerArgs: ['tauri'] }
        )
      }
    } else {
      execCommand('npm', ['install', '-g', '@tauri-apps/cli'], { cwd: undefined }).then(() => {
        resolve({ runnerCommand: 'tauri', runnerArgs: [] })
      }).catch(reject)
    }
  })
    .then((runner: Runner) => {
      const configPath = join(root, 'src-tauri/tauri.conf.json')
      const info = getInfo(root)
      if (existsSync(configPath)) {
        return {
          runner,
          name: info.name,
          version: info.version,
        }
      } else {
        const packageJson = getPackageJson(root)
        return execCommand(runner.runnerCommand, [...runner.runnerArgs, 'init', '--ci', '--app-name', info.name], {
          cwd: root
        }).then(() => {
          const config = JSON.parse(
            readFileSync(configPath).toString()
          ) as TauriConfig

          console.log(
            `Replacing tauri.conf.json config - package.version=${info.version}`
          )
          const pkgConfig = {
            ...config.package,
            version: info.version
          }
          if (packageJson?.productName) {
            console.log(
              `Replacing tauri.conf.json config - package.productName=${packageJson.productName}`
            )
            pkgConfig.productName = packageJson.productName
          }
          config.package = pkgConfig
          writeFileSync(configPath, JSON.stringify(config, null, 2))

          const app = {
            runner,
            name: info.name,
            version: info.version,
          }
          if (iconPath) {
            return execCommand(runner.runnerCommand, [...runner.runnerArgs, 'icon', join(root, iconPath)], {
              cwd: root
            }).then(() => app)
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

      const tauriArgs = debug ? ['--debug', ...(args ?? [])] : (args ?? [])
      let buildCommand
      let buildArgs: string[] = []

      if (hasDependency('vue-cli-plugin-tauri', root)) {
        if (usesYarn(root)) {
          buildCommand = 'yarn'
        } else {
          buildCommand = 'npx'
          buildArgs = ['run', 'tauri:build']
        }
      } else {
        buildCommand = app.runner.runnerCommand
        buildArgs = [...app.runner.runnerArgs, 'build']
      }

      return execCommand(
        buildCommand,
        [...buildArgs, ...tauriArgs],
        { cwd: root }
      )
        .then(() => {
          let fileAppName = app.name
          // on Linux, the app product name is converted to kebab-case
          if (!['darwin', 'win32'].includes(platform())) {
            fileAppName = fileAppName.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
              .replace(/ /g, '-')
              .toLowerCase()
          }
          const artifactsPath = join(
            root,
            `src-tauri/target/${debug ? 'debug' : 'release'}`
          )

          if (platform() === 'darwin') {
              return [
                join(
                  artifactsPath,
                  `bundle/dmg/${fileAppName}_${app.version}_${process.arch}.dmg`
                ),
                join(
                  artifactsPath,
                  `bundle/macos/${fileAppName}.app`
                ),
                join(
                  artifactsPath,
                  `bundle/macos/${fileAppName}.app.tar.gz`
                ),
                join(
                  artifactsPath,
                  `bundle/macos/${fileAppName}.app.tar.gz.sig`
                )
              ]
          } else if (platform() === 'win32') {
              return [
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}.msi`
                ),
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}.msi.zip`
                ),
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}.msi.zip.sig`
                )
              ]
          } else {
              const arch =
                process.arch === 'x64'
                  ? 'amd64'
                  : process.arch === 'x32'
                    ? 'i386'
                    : process.arch
              return [
                join(
                  artifactsPath,
                  `bundle/deb/${fileAppName}_${app.version}_${arch}.deb`
                ),
                join(
                  artifactsPath,
                  `bundle/appimage/${fileAppName}_${app.version}_${arch}.AppImage`
                ),
                join(
                  artifactsPath,
                  `bundle/appimage/${fileAppName}_${app.version}_${arch}.AppImage.tar.gz`
                ),
                join(
                  artifactsPath,
                  `bundle/appimage/${fileAppName}_${app.version}_${arch}.AppImage.tar.gz.sig`
                )
              ]
          }
        })
        .then(paths => paths.filter(p => existsSync(p)))
    })
}
