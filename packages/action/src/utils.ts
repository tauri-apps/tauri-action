import path from 'path';

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

export function getAssetName(assetPath: string) {
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
        : '_x64'
  }

  return assetPath.includes(`${path.sep}debug${path.sep}`)
    ? `${filename}-debug${arch}${ext}`
    : `${filename}${arch}${ext}`
}
