import fs from 'node:fs';

import { getOctokit } from '@actions/github';

import {
  githubBaseUrl,
  isGitea,
  owner,
  releaseAssetNamePattern,
  repo,
  uploadUpdaterSignatures,
} from './inputs';
import {
  deleteGiteaReleaseAsset,
  getAssetName,
  ghAssetName,
  retry,
} from './utils';

import type { Artifact } from './types';

export async function uploadAssets(
  releaseId: number,
  assets: Artifact[],
  retryAttempts: number,
) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const github = getOctokit(process.env.GITHUB_TOKEN, {
    baseUrl: githubBaseUrl,
  });

  const existingAssets = (
    await github.rest.repos.listReleaseAssets({
      owner,
      repo,
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
        await deleteGiteaReleaseAsset(github, releaseId, existingAsset.id);
      } else {
        await github.rest.repos.deleteReleaseAsset({
          owner,
          repo,
          asset_id: existingAsset.id,
        });
      }
    }

    console.log(`Uploading Assets`);

    if (isGitea) {
      console.log(`Trying to upload ${assetName} to Gitea...`);
      //Workaround for Gitea's api, proper endpoint
      //todo: add retry with looser Promise type
      try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(asset.path);
        const fileBlob = new Blob([fileBuffer]);
        formData.append("attachment", fileBlob, assetName);
        formData.append("name", assetName);
        const response = await fetch(
          `${githubBaseUrl}/repos/${owner}/${repo}/releases/${releaseId}/assets`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
            body: formData,
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to upload asset: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log(`Trying to upload ${assetName} to Github...`);
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
            owner,
            repo,
            release_id: releaseId,
          }),
        retryAttempts,
      );
    }

    console.log(`${assetName} successfully uploaded.`);
  }
}
