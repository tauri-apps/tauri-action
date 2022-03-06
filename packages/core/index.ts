import { platform } from 'os'
import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'fs'
import { execa } from 'execa'
import { parse as parseToml } from '@iarna/toml'
import { join, resolve, normalize, sep } from 'path'
import { sync as globSync } from 'glob-gitignore'
import ignore from 'ignore'
import JSON5 from 'json5'

export function getPackageJson(root: string): any {
  const packageJsonPath = join(root, 'package.json')
  if (existsSync(packageJsonPath)) {
    const packageJsonString = readFileSync(packageJsonPath).toString()
    const packageJson = JSON.parse(packageJsonString)
    return packageJson
  }
  return null
}

function getTauriDir(root: string): string | null {
  const ignoreRules = ignore()
  const gitignorePath = join(root, '.gitignore')
  if (existsSync(gitignorePath)) {
    ignoreRules.add(readFileSync(gitignorePath).toString())
  } else {
    ignoreRules.add('node_modules').add('target')
  }
  const paths = globSync('**/tauri.conf.json', {
    cwd: root,
    ignore: ignoreRules,
  })
  const tauriConfPath = paths[0]
  return tauriConfPath ? resolve(root, tauriConfPath, '..') : null
}

function getWorkspaceDir(dir: string): string | null {
  const rootPath = dir
  while (dir.length && dir[dir.length - 1] !== sep) {
    const manifestPath = join(dir, 'Cargo.toml')
    if (existsSync(manifestPath)) {
      const toml = parseToml(readFileSync(manifestPath).toString())
      // @ts-expect-error
      if (toml.workspace && toml.workspace.members) {
        // @ts-expect-error
        const members: string[] = toml.workspace.members
        if (members.some((m) => resolve(dir, m) === rootPath)) {
          return dir
        }
      }
    }

    dir = normalize(join(dir, '..'))
  }
  return null
}

function getTargetDir(crateDir: string): string {
  const def = join(crateDir, 'target')
  if ('CARGO_TARGET_DIR' in process.env) {
    return process.env.CARGO_TARGET_DIR ?? def
  }
  let dir = crateDir
  while (dir.length && dir[dir.length - 1] !== sep) {
    let cargoConfigPath = join(dir, '.cargo/config')
    if (!existsSync(cargoConfigPath)) {
      cargoConfigPath = join(dir, '.cargo/config.toml')
    }
    if (existsSync(cargoConfigPath)) {
      const cargoConfig = parseToml(readFileSync(cargoConfigPath).toString())
      // @ts-ignore
      if (cargoConfig.build && cargoConfig.build['target-dir']) {
        // @ts-ignore
        return cargoConfig.build['target-dir']
      }
    }

    dir = normalize(join(dir, '..'))
  }
  return def
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
    env: { FORCE_COLOR: '0' },
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
  tauri?: {
    bundle?: {
      windows?: {
        wix?: {
          language?: string | string[] | { [language: string]: unknown }
        }
      }
    }
  }
}

interface Application {
  tauriPath: string
  runner: Runner
  name: string
  version: string
  wixLanguage: string | string[] | { [language: string]: unknown }
}

export interface BuildOptions {
  configPath: string | null
  distPath: string | null
  iconPath: string | null
  tauriScript: string | null
  args: string[] | null
}

export interface Runner {
  runnerCommand: string
  runnerArgs: string[]
}

interface Info {
  tauriPath: string | null
  name: string
  version: string
  wixLanguage: string | string[] | { [language: string]: unknown }
}

function _getJson5Config(contents: string): TauriConfig | null {
  try {
    const config = JSON5.parse(contents) as TauriConfig
    return config
  } catch (e) {
    return null
  }
}

function getConfig(path: string): TauriConfig {
  const contents = readFileSync(path).toString()
  try {
    const config = JSON.parse(contents) as TauriConfig
    return config
  } catch (e) {
    let json5Conf = _getJson5Config(contents)
    if (json5Conf === null) {
      json5Conf = _getJson5Config(
        readFileSync(join(path, '..', 'tauri.conf.json5')).toString()
      )
    }
    if (json5Conf) {
      return json5Conf
    }
    throw e
  }
}

export function getInfo(root: string): Info {
  const tauriDir = getTauriDir(root)
  if (tauriDir !== null) {
    const configPath = join(tauriDir, 'tauri.conf.json')
    let name
    let version
    let wixLanguage: string | string[] | { [language: string]: unknown } = 'en-US'
    const config = getConfig(configPath)
    if (config.package) {
      name = config.package.productName
      version = config.package.version
    }
    if (!(name && version)) {
      const manifestPath = join(tauriDir, 'Cargo.toml')
      const cargoManifest = parseToml(
        readFileSync(manifestPath).toString()
      ) as any as CargoManifest
      name = name || cargoManifest.package.name
      version = version || cargoManifest.package.version
    }
    if (config.tauri?.bundle?.windows?.wix?.language) {
      wixLanguage = config.tauri.bundle.windows.wix.language
    }

    if (!(name && version)) {
      console.error('Could not determine package name and version')
      process.exit(1)
    }

    return {
      tauriPath: tauriDir,
      name,
      version,
      wixLanguage,
    }
  } else {
    const packageJson = getPackageJson(root)
    const appName = packageJson
      ? (packageJson.displayName || packageJson.name).replace(/ /g, '-')
      : 'app'
    const version = packageJson ? packageJson.version : '0.1.0'
    return {
      tauriPath: null,
      name: appName,
      version,
      wixLanguage: 'en-US',
    }
  }
}

export async function buildProject(
  root: string,
  debug: boolean,
  { configPath, distPath, iconPath, tauriScript, args }: BuildOptions
): Promise<string[]> {
  return new Promise<Runner>((resolve, reject) => {
    if (tauriScript) {
      const [runnerCommand, ...runnerArgs] = tauriScript.split(' ')
      resolve({ runnerCommand, runnerArgs })
    } else if (
      hasDependency('@tauri-apps/cli', root) ||
      hasDependency('vue-cli-plugin-tauri', root)
    ) {
      resolve(
        usesYarn(root)
          ? { runnerCommand: 'yarn', runnerArgs: ['tauri'] }
          : { runnerCommand: 'npx', runnerArgs: ['tauri'] }
      )
    } else {
      execCommand('npm', ['install', '-g', '@tauri-apps/cli'], {
        cwd: undefined,
      })
        .then(() => {
          resolve({ runnerCommand: 'tauri', runnerArgs: [] })
        })
        .catch(reject)
    }
  })
    .then((runner: Runner) => {
      const info = getInfo(root)
      if (info.tauriPath) {
        return {
          tauriPath: info.tauriPath,
          runner,
          name: info.name,
          version: info.version,
          wixLanguage: info.wixLanguage,
        }
      } else {
        const packageJson = getPackageJson(root)
        return execCommand(
          runner.runnerCommand,
          [...runner.runnerArgs, 'init', '--ci', '--app-name', info.name],
          {
            cwd: root,
          }
        ).then(() => {
          const tauriPath = getTauriDir(root)
          if (tauriPath === null) {
            console.error('Failed to resolve Tauri path')
            process.exit(1)
          }
          const configPath = join(tauriPath, 'tauri.conf.json')
          const config = getConfig(configPath)

          console.log(
            `Replacing tauri.conf.json config - package.version=${info.version}`
          )
          const pkgConfig = {
            ...config.package,
            version: info.version,
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
            tauriPath,
            runner,
            name: info.name,
            version: info.version,
            wixLanguage: info.wixLanguage,
          }
          if (iconPath) {
            return execCommand(
              runner.runnerCommand,
              [...runner.runnerArgs, 'icon', join(root, iconPath)],
              {
                cwd: root,
              }
            ).then(() => app)
          }

          return app
        })
      }
    })
    .then((app: Application) => {
      const tauriConfPath = join(app.tauriPath, 'tauri.conf.json')
      if (configPath !== null) {
        copyFileSync(configPath, tauriConfPath)
      }

      if (distPath) {
        const tauriConf = JSON.parse(readFileSync(tauriConfPath).toString())
        tauriConf.build.distDir = distPath
        writeFileSync(tauriConfPath, JSON.stringify(tauriConf))
      }

      const tauriArgs = debug ? ['--debug', ...(args ?? [])] : args ?? []
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

      return execCommand(buildCommand, [...buildArgs, ...tauriArgs], {
        cwd: root,
      })
        .then(() => {
          let fileAppName = app.name
          // on Linux, the app product name is converted to kebab-case
          if (!['darwin', 'win32'].includes(platform())) {
            fileAppName = fileAppName
              .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
              .replace(/ /g, '-')
              .toLowerCase()
          }

          const cratePath = getWorkspaceDir(app.tauriPath) ?? app.tauriPath

          const artifactsPath = join(
            getTargetDir(cratePath),
            debug ? 'debug' : 'release'
          )

          if (platform() === 'darwin') {
            return [
              join(
                artifactsPath,
                `bundle/dmg/${fileAppName}_${app.version}_${process.arch}.dmg`
              ),
              join(artifactsPath, `bundle/macos/${fileAppName}.app`),
              join(artifactsPath, `bundle/macos/${fileAppName}.app.tar.gz`),
              join(artifactsPath, `bundle/macos/${fileAppName}.app.tar.gz.sig`),
            ]
          } else if (platform() === 'win32') {
            // If multiple Wix languages are specified, multiple installers (.msi) will be made
            // The .zip and .sig are only generated for the first specified language
            let langs
            if (typeof app.wixLanguage === 'string') {
              langs = [app.wixLanguage]
            } else if (Array.isArray(app.wixLanguage)) {
              langs = app.wixLanguage
            } else {
              langs = Object.keys(app.wixLanguage)
            }
            const artifacts: string[] = []
            langs.forEach((lang) => {
              artifacts.push(
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}_${lang}.msi`
                )
              )
              artifacts.push(
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}_${lang}.msi.zip`
                )
              )
              artifacts.push(
                join(
                  artifactsPath,
                  `bundle/msi/${fileAppName}_${app.version}_${process.arch}_${lang}.msi.zip.sig`
                )
              )
            })
            return artifacts
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
              ),
            ]
          }
        })
        .then((paths) => {
          console.log(`Expected artifacts paths:\n${paths.join('\n')}`)
          return paths.filter((p) => existsSync(p))
        })
    })
}
