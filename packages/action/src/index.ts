import { platform } from 'os'
import * as core from '@actions/core'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import uploadReleaseAssets from './upload-release-assets'
import createRelease from './create-release'
import { getPackageJson, buildProject, execCommand } from '@tauri-apps/action-core'
import type { BuildOptions } from '@tauri-apps/action-core'

async function run(): Promise<void> {
  try {
    const preferGlobal = core.getInput('preferGlobal') === 'true'
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
    const includeDebug = core.getInput('includeDebug') === 'true'
    const npmScript = core.getInput('npmScript')

    let tagName = core.getInput('tagName').replace('refs/tags/', '')
    let releaseName = core.getInput('releaseName').replace('refs/tags/', '')
    let body = core.getInput('releaseBody')
    const draft = core.getInput('releaseDraft') === 'true'
    const prerelease = core.getInput('prerelease') === 'true'
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
      npmScript
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

    let releaseId: number
    if (tagName) {
      const packageJson = getPackageJson(projectPath)
      const templates = [
        {
          key: '__VERSION__',
          value: packageJson?.version
        }
      ]

      templates.forEach(template => {
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
          if (artifact.endsWith('.app')) {
            await execCommand(`tar -czf ${artifact}.tgz ${artifact}`, {
              cwd: undefined
            })
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
