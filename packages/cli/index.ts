import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { buildProject } from '@tauri-apps/action-core'
import type { BuildOptions } from '@tauri-apps/action-core'
import parseArgs from 'minimist'

export async function run(): Promise<void> {
  const argv = parseArgs(process.argv.slice(2), {
    string: ['project-path', 'config-path', 'dist-path', 'icon-path', 'npm-script'],
    boolean: ['global-tauri', 'include-debug'],
    default: {
      'config-path': 'tauri.conf.json',
      'project-path': '',
    }
  })

  const preferGlobal = argv['global-tauri']
  const projectPath = resolve(process.cwd(), argv['project-path'])
  const configPath = join(projectPath, argv['config-path'])
  const distPath = argv['dist-path']
  const iconPath = argv['icon-path']
  const includeDebug = argv['include-debug']
  const npmScript = argv['npm-script']
  const args = argv._

  const options: BuildOptions = {
    configPath: existsSync(configPath) ? configPath : null,
    distPath,
    iconPath,
    npmScript,
    args
  }
  const artifacts = await buildProject(preferGlobal, projectPath, false, options)
  if (includeDebug) {
    const debugArtifacts = await buildProject(preferGlobal, projectPath, true, options)
    artifacts.push(...debugArtifacts)
  }

  if (artifacts.length === 0) {
    throw new Error('No artifacts were found.')
  }

  console.log(`Artifacts: ${artifacts}.`)
}
