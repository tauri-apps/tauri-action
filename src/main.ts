import * as core from '@actions/core'
import {buildProject} from './build-project'
import stringArgv from 'string-argv'

async function run(): Promise<void> {
  try {
    const artifacts = await buildProject({
      runner: core.getInput('runner'),
      args: stringArgv(core.getInput('args')),
      projectPath: core.getInput('projectPath'),
      configPath: core.getInput('configPath'),
      target: core.getInput('target'),
      debug: core.getBooleanInput('debug')
    })

    core.setOutput('artifacts', JSON.stringify(artifacts))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
