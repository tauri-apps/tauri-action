import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { buildProject } from '@tauri-apps/action-core'
import type { BuildOptions } from '@tauri-apps/action-core'
import parseArgs from 'minimist'

export async function run(): Promise<void> {
  const argv = parseArgs(process.argv.slice(2), {
    string: ['project-path', 'config-path', 'dist-path', 'icon-path', 'tauri-script'],
    boolean: ['global-tauri', 'include-debug'],
    default: {
      'config-path': 'tauri.conf.json',
      'project-path': '',
    }
  })

  const projectPath = resolve(process.cwd(), argv['project-path'])
  const configPath = join(projectPath, argv['config-path'])
  const distPath = argv['dist-path']
  const iconPath = argv['icon-path']
  const includeDebug = argv['include-debug']
  const tauriScript = argv['tauri-script']
  const args = argv._

  const options: BuildOptions = {
    configPath: existsSync(configPath) ? configPath : null,
    distPath,
    iconPath,
    tauriScript,
    args
  }
  const artifacts = await buildProject(projectPath, false, options)
  if (includeDebug) {
    const debugArtifacts = await buildProject(projectPath, true, options)
    artifacts.push(...debugArtifacts)
  }

  if (artifacts.length === 0) {
    throw new Error('No artifacts were found.')
  }

  console.log(`Artifacts: ${artifacts}.`)
}
