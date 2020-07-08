import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import fs from 'fs'
import path from 'path'

export default async function uploadAssets(releaseId: number, assets: string[]) {
  try {
    if (process.env.GITHUB_TOKEN === undefined) {
      throw new Error('GITHUB_TOKEN is required')
    }

    const github = getOctokit(process.env.GITHUB_TOKEN)

    // Determine content-length for header to upload asset
    const contentLength = (filePath: string) => fs.statSync(filePath).size

    for (const assetPath of assets) {
      const headers = { 'content-type': 'application/zip', 'content-length': contentLength(assetPath) }

      await github.repos.uploadReleaseAsset({
        release_id: releaseId,
        headers,
        name: path.basename(assetPath),
        data: fs.readFileSync(assetPath).toString(),
        repo: context.repo.repo,
        owner: context.repo.owner
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
