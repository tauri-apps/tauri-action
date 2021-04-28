import { platform } from 'os'
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'fs'
import execa from 'execa'
import toml from '@iarna/toml'
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
  { cwd }: { cwd: string | undefined }
): Promise<void> {
  console.log(`running ${command}`)
  const [cmd, ...args] = command.split(' ')
  return execa(cmd, args, {
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
  runner: string
  name: string
  version: string
}

export interface BuildOptions {
  configPath: string | null
  distPath: string | null
  iconPath: string | null
  npmScript: string | null
}

export async function buildProject(
  preferGlobal: boolean,
  root: string,
  debug: boolean,
  { configPath, distPath, iconPath, npmScript }: BuildOptions
): Promise<string[]> {
  return new Promise<string>((resolve, reject) => {
    if (preferGlobal) {
      resolve('tauri')
    } else if (hasDependency('@tauri-apps/cli', root) || hasDependency('vue-cli-plugin-tauri', root)) {
      if (npmScript) {
        resolve(usesYarn(root) ? `yarn ${npmScript}` : `npm run ${npmScript}`)
      } else {
        resolve(usesYarn(root) ? 'yarn tauri' : 'npx tauri')
      }
    } else {
      execCommand('npm install -g @tauri-apps/cli', { cwd: undefined }).then(() => {
        resolve('tauri')
      }).catch(reject)
    }
  })
    .then((runner: string) => {
      const configPath = join(root, 'src-tauri/tauri.conf.json')
      const manifestPath = join(root, 'src-tauri/Cargo.toml')
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
        if (!(name || version)) {
          const cargoManifest = (toml.parse(
            readFileSync(manifestPath).toString()
          ) as any) as CargoManifest
          name = name || cargoManifest.package.name
          version = version || cargoManifest.package.version
        }

        if (!(name || version)) {
          console.error('Could not determine package name and version')
          process.exit(1)
        }

        return {
          runner,
          name,
          version
        }
      } else {
        const packageJson = getPackageJson(root)
        const appName = packageJson
          ? (packageJson.displayName || packageJson.name).replace(/ /g, '-')
          : 'app'
        return execCommand(`${runner} init --ci --app-name ${appName}`, {
          cwd: root
        }).then(() => {
          const cargoManifest = (toml.parse(
            readFileSync(manifestPath).toString()
          ) as any) as CargoManifest
          const version = packageJson ? packageJson.version : '0.1.0'

          console.log(
            `Replacing cargo manifest options - package.version=${version}`
          )
          cargoManifest.package.version = version
          writeFileSync(manifestPath, toml.stringify(cargoManifest as any))

          const app = {
            runner,
            name: appName,
            version
          }
          if (iconPath) {
            return execCommand(`${runner} icon ${join(root, iconPath)}`, {
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

      const args = debug ? ['--debug'] : []
      const buildCommand = hasDependency('vue-cli-plugin-tauri', root)
        ? (usesYarn(root) ? 'yarn' : 'npm run') + ' tauri:build'
        : `${app.runner} build`
      return execCommand(
        buildCommand + (args.length ? ` ${args.join(' ')}` : ''),
        { cwd: root }
      )
        .then(() => {
          const appName = app.name
          const artifactsPath = join(
            root,
            `src-tauri/target/${debug ? 'debug' : 'release'}`
          )

          switch (platform()) {
            case 'darwin':
              return [
                join(
                  artifactsPath,
                  `bundle/dmg/${appName}_${app.version}_${process.arch}.dmg`
                ),
                join(
                  artifactsPath,
                  `bundle/macos/${appName}.app`
                )
              ]
            case 'win32':
              return [
                join(
                  artifactsPath,
                  `bundle/msi/${appName}_${app.version}_${process.arch}.msi`
                )
              ]
            default:
              const arch =
                process.arch === 'x64'
                  ? 'amd64'
                  : process.arch === 'x32'
                    ? 'i386'
                    : process.arch
              return [
                join(
                  artifactsPath,
                  `bundle/deb/${appName}_${app.version}_${arch}.deb`
                ),
                join(
                  artifactsPath,
                  `bundle/appimage/${appName}_${app.version}_${arch}.AppImage`
                )
              ]
          }
        })
        .then(paths => paths.filter(p => existsSync(p)))
    })
}
