import * as core from '@actions/core'
import { GitHub } from '@actions/github'
import fs from 'fs'
import path from 'path'

export default async function uploadAssets(uploadUrl: string, assets: string[]) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const github = new GitHub(process.env.GITHUB_TOKEN)

  // Determine content-length for header to upload asset
  const contentLength = (filePath: string) => fs.statSync(filePath).size

  for (const assetPath of assets) {
    const headers = { 'content-type': 'application/zip', 'content-length': contentLength(assetPath) }

    await github.repos.uploadReleaseAsset({
      url: uploadUrl,
      headers,
      name: path.basename(assetPath),
      data: fs.readFileSync(assetPath)
    })
  }
}
