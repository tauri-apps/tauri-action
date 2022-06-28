import path from 'path';

export function getAssetName(assetPath: string) {
  const ext = path.extname(assetPath)
  const filename = path.basename(assetPath).replace(ext, '')
  return path.dirname(assetPath).includes(`target${path.sep}debug`)
      ? `${filename}-debug${ext}`
      : `${filename}${ext}`
}