import { getOctokit, context } from '@actions/github'
import { Artifact } from '@tauri-apps/action-core'
import fs from 'fs'
import { getAssetName } from './utils'

export default async function uploadAssets(
  releaseId: number,
  assets: Artifact[]
) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required')
  }



  const github = getOctokit(process.env.GITHUB_TOKEN)

  const existingAssets = (
    await github.rest.repos.listReleaseAssets({
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: releaseId
    })
  ).data

  // Determine content-length for header to upload asset
  const contentLength = (filePath: string) => fs.statSync(filePath).size

  for (const asset of assets) {
    const headers = {
      'content-type': 'application/zip',
      'content-length': contentLength(asset.path)
    }

    const assetName = getAssetName(asset.path)

    const existingAsset = existingAssets.find((a) => a.name === assetName)
    if (existingAsset) {
      console.log(`Deleting existing ${assetName}...`)
      await github.rest.repos.deleteReleaseAsset({
        owner: context.repo.owner,
        repo: context.repo.repo,
        asset_id: existingAsset.id
      })
    }

    console.log(`Uploading ${assetName}...`)

    await github.rest.repos.uploadReleaseAsset({
      headers,
      name: assetName,
      // https://github.com/tauri-apps/tauri-action/pull/45
      // @ts-ignore error TS2322: Type 'Buffer' is not assignable to type 'string'.
      data: fs.readFileSync(asset.path),
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: releaseId
    })
  }
}
