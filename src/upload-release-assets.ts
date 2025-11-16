import fs from 'node:fs';

import { getOctokit } from '@actions/github';

import {
  deleteGiteaReleaseAsset,
  getAssetName,
  ghAssetName,
  retry,
} from './utils';
import type { Artifact } from './types';

export async function uploadAssets(
  owner: string,
  repo: string,
  releaseId: number,
  assets: Artifact[],
  retryAttempts: number,
  githubBaseUrl: string,
  isGitea: boolean,
  releaseAssetNamePattern?: string,
  uploadUpdaterSignatures?: boolean,
) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const github = getOctokit(process.env.GITHUB_TOKEN, {
    baseUrl: githubBaseUrl,
  });

  const existingAssets = (
    await github.rest.repos.listReleaseAssets({
      owner: owner,
      repo: repo,
      release_id: releaseId,
      per_page: 100,
    })
  ).data;

  // Determine content-length for header to upload asset
  const contentLength = (filePath: string) => fs.statSync(filePath).size;

  for (const asset of assets) {
    if (!uploadUpdaterSignatures && asset.ext.endsWith('.sig')) {
      continue;
    }

    const headers = {
      'content-type': 'application/zip',
      'content-length': contentLength(asset.path),
    };

    const assetName = getAssetName(asset, releaseAssetNamePattern);
    const assetNameGH = ghAssetName(asset, releaseAssetNamePattern);

    const existingAsset = existingAssets.find(
      (a) => a.label === assetName || a.name === assetNameGH,
    );

    if (existingAsset) {
      console.log(`Deleting existing ${assetName}...`);
      if (isGitea) {
        await deleteGiteaReleaseAsset(
          github,
          owner,
          repo,
          releaseId,
          existingAsset.id,
        );
      } else {
        await github.rest.repos.deleteReleaseAsset({
          owner: owner,
          repo: repo,
          asset_id: existingAsset.id,
        });
      }
    }

    console.log(`Uploading ${assetName}...`);

    await retry(
      () =>
        github.rest.repos.uploadReleaseAsset({
          headers,
          name: assetName,
          // GitHub renames the filename so we'll also set the label which it leaves as-is.
          label: assetName,
          // https://github.com/tauri-apps/tauri-action/pull/45
          // @ts-expect-error error TS2322: Type 'Buffer' is not assignable to type 'string'.
          data: fs.createReadStream(asset.path),
          owner: owner,
          repo: repo,
          release_id: releaseId,
        }),
      retryAttempts + 1,
    );

    console.log(`${assetName} successfully uploaded.`);
  }
}
