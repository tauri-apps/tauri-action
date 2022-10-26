import { getOctokit, context } from '@actions/github'
import fs from 'fs'
import path from 'path'

export default async function uploadAssets(
  releaseId: number,
  assets: string[]
) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const extensions = [
    '.app.tar.gz.sig',
    '.app.tar.gz',
    '.dmg',
    '.AppImage.tar.gz.sig',
    '.AppImage.tar.gz',
    '.AppImage',
    '.deb',
    '.msi.zip.sig',
    '.msi.zip',
    '.msi'
  ]

  const github = getOctokit(process.env.GITHUB_TOKEN)

  // Determine content-length for header to upload asset
  const contentLength = (filePath: string) => fs.statSync(filePath).size

  for (const assetPath of assets) {
    const headers = {
      'content-type': 'application/zip',
      'content-length': contentLength(assetPath)
    }

    const basename = path.basename(assetPath)
    const exts = extensions.filter((s) => basename.includes(s))
    const ext = exts[0] || path.extname(assetPath)
    const filename = basename.replace(ext, '')

    let arch = ''
    if (ext === '.app.tar.gz.sig' || ext === '.app.tar.gz') {
      arch = assetPath.includes('universal-apple-darwin')
        ? '_universal'
        : assetPath.includes('aarch64-apple-darwin')
        ? '_aarch64'
        : '_x86_64'
    }

    const assetName = assetPath.includes(`${path.sep}debug${path.sep}`)
      ? `${filename}-debug${arch}${ext}`
      : `${filename}${arch}${ext}`

    console.log(`Uploading ${assetName}...`)

    await github.rest.repos.uploadReleaseAsset({
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
