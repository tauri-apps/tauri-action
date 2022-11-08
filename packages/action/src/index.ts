import { platform } from 'os'
import * as core from '@actions/core'
import { join, resolve, dirname, basename } from 'path'
import { existsSync } from 'fs'
import uploadReleaseAssets from './upload-release-assets'
import uploadVersionJSON from './upload-version-json'
import createRelease from './create-release'
import {
  getPackageJson,
  buildProject,
  getInfo,
  execCommand
} from '@tauri-apps/action-core'
import type { BuildOptions } from '@tauri-apps/action-core'
import stringArgv from 'string-argv'

async function run(): Promise<void> {
  try {
    const projectPath = resolve(
      process.cwd(),
      core.getInput('projectPath') || process.argv[2]
    )
    const configPath = join(
      projectPath,
      core.getInput('configPath') || 'tauri.conf.json'
    )
    const distPath = core.getInput('distPath')
    const iconPath = core.getInput('iconPath')
    const includeDebug = core.getBooleanInput('includeDebug')
    const tauriScript = core.getInput('tauriScript')
    const args = stringArgv(core.getInput('args'))
    const bundleIdentifier = core.getInput('bundleIdentifier')

    let tagName = core.getInput('tagName').replace('refs/tags/', '')
    let releaseName = core.getInput('releaseName').replace('refs/tags/', '')
    let body = core.getInput('releaseBody')
    const draft = core.getBooleanInput('releaseDraft')
    const prerelease = core.getBooleanInput('prerelease')
    const commitish = core.getInput('releaseCommitish') || null

    if (Boolean(tagName) !== Boolean(releaseName)) {
      throw new Error(
        '`tag` is required along with `releaseName` when creating a release.'
      )
    }

    const options: BuildOptions = {
      configPath: existsSync(configPath) ? configPath : null,
      distPath,
      iconPath,
      tauriScript,
      args,
      bundleIdentifier
    }
    const info = getInfo(projectPath)
    const artifacts = await buildProject(projectPath, false, options)
    if (includeDebug) {
      const debugArtifacts = await buildProject(projectPath, true, options)
      artifacts.push(...debugArtifacts)
    }

    if (artifacts.length === 0) {
      throw new Error('No artifacts were found.')
    }

    console.log(`Found artifacts:\n${artifacts.map((a) => a.path).join('\n')}`)

    let releaseId: number
    if (tagName) {
      const packageJson = getPackageJson(projectPath)
      const templates = [
        {
          key: '__VERSION__',
          value: info.version || packageJson.version
        }
      ]

      templates.forEach((template) => {
        const regex = new RegExp(template.key, 'g')
        tagName = tagName.replace(regex, template.value)
        releaseName = releaseName.replace(regex, template.value)
        body = body.replace(regex, template.value)
      })

      const releaseData = await createRelease(
        tagName,
        releaseName,
        body,
        commitish || undefined,
        draft,
        prerelease
      )
      releaseId = releaseData.id
      core.setOutput('releaseUploadUrl', releaseData.uploadUrl)
      core.setOutput('releaseId', releaseData.id.toString())
      core.setOutput('releaseHtmlUrl', releaseData.htmlUrl)
    } else {
      releaseId = Number(core.getInput('releaseId') || 0)
    }

    if (releaseId) {
      if (platform() === 'darwin') {
        let i = 0
        for (const artifact of artifacts) {
          // updater provide a .tar.gz, this will prevent duplicate and overwriting of
          // signed archive
          if (
            artifact.path.endsWith('.app') &&
            !existsSync(`${artifact.path}.tar.gz`)
          ) {
            await execCommand('tar', [
              'czf',
              `${artifact}.tar.gz`,
              '-C',
              dirname(artifact.path),
              basename(artifact.path)
            ])
            artifact[i].path += '.tar.gz'
          } else if (artifact.path.endsWith('.app')) {
            // we can't upload a directory
            artifacts.splice(i, 1)
          }
          i++
        }
      }
      console.log(artifacts)
      await uploadReleaseAssets(releaseId, artifacts)
      await uploadVersionJSON({
        version: info.version,
        notes: body,
        releaseId,
        artifacts
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
