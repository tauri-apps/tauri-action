import {getOctokit, context} from '@actions/github'
import fs from 'fs'
import path from 'path'

export default async function uploadAssets(
  releaseId: number,
  assets: string[]
) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const github = getOctokit(process.env.GITHUB_TOKEN)

  // Determine content-length for header to upload asset
  const contentLength = (filePath: string) => fs.statSync(filePath).size

  for (const assetPath of assets) {
    const headers = {
      'content-type': 'application/zip',
      'content-length': contentLength(assetPath)
    }

    const ext = path.extname(assetPath)
    const filename = path.basename(assetPath).replace(ext, '')
    const assetName = path.dirname(assetPath).includes(`target${path.sep}debug`)
      ? `${filename}-debug${ext}`
      : `${filename}${ext}`
    console.log(`Uploading ${assetName}...`)
    await github.repos.uploadReleaseAsset({
      headers,
      name: assetName,
      // https://github.com/tauri-apps/tauri-action/pull/45
      // @ts-ignore error TS2322: Type 'Buffer' is not assignable to type 'string'.
      data: fs.readFileSync(assetPath),
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: releaseId
    })
  }
}
