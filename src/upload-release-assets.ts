import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import fs from 'fs'
import path from 'path'

export default async function uploadAssets(uploadUrl: string, releaseId: number, assets: string[]) {
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
        url: uploadUrl,
        headers,
        name: path.basename(assetPath),
        data: fs.readFileSync(assetPath).toString(),
        owner: context.repo.owner,
        repo: context.repo.repo,
        release_id: Number(releaseId)
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
