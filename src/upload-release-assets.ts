import fs from 'node:fs';

import { getOctokit } from '@actions/github';

import { deleteGiteaReleaseAsset, getAssetName, retry } from './utils';
import type { Artifact } from './types';

export async function uploadAssets(
  owner: string,
  repo: string,
  releaseId: number,
  assets: Artifact[],
  retryAttempts: number,
  githubBaseUrl: string,
  isGitea: boolean,
  assetNamePattern?: string,
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
    const headers = {
      'content-type': 'application/zip',
      'content-length': contentLength(asset.path),
    };

    const assetName = getAssetName(asset, assetNamePattern);

    const existingAsset = existingAssets.find(
      (a) =>
        a.name ===
        assetName
          .trim()
          .replace(/[ ()[\]{}]/g, '.')
          .replace(/\.\./g, '.')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
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
          // https://github.com/tauri-apps/tauri-action/pull/45
          // @ts-expect-error error TS2322: Type 'Buffer' is not assignable to type 'string'.
          data: fs.createReadStream(asset.path),
          owner: owner,
          repo: repo,
          release_id: releaseId,
          baseUrl: githubBaseUrl,
        }),
      retryAttempts + 1,
    );
  }
}
