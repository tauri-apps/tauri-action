import { getOctokit, context } from "@actions/github";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import uploadAssets from "./upload-release-assets";
import fetch from "node-fetch";
import { arch, platform } from "os";
import { getAssetName } from "./utils";

export default async function uploadVersionJSON({
  version,
  notes,
  releaseId,
  artifacts,
}: {
  version: string;
  notes: string;
  releaseId: number;
  artifacts: string[];
}) {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error("GITHUB_TOKEN is required");
  }

  const github = getOctokit(process.env.GITHUB_TOKEN);

  const versionFilename = "latest-version.json";
  const versionFile = resolve(process.cwd(), versionFilename);
  const versionContent = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms: {},
  };

  const assets = await github.rest.repos.listReleaseAssets({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id: releaseId,
  });
  const asset = assets.data.find((e) => e.name === versionFilename);

  if (asset) {
    versionContent.platforms = (
      (await (await fetch(asset.browser_download_url)).json()) as any
    ).platforms;

    // https://docs.github.com/en/rest/releases/assets#update-a-release-asset
    await github.rest.repos.deleteReleaseAsset({
      owner: context.repo.owner,
      repo: context.repo.repo,
      release_id: releaseId,
      asset_id: asset.id,
    });
  }

  const sigFile = artifacts.find((s) => s.endsWith(".sig"));
  const assetNames = new Set(artifacts.map((p) => getAssetName(p)));
  const downloadUrl = assets.data
    .filter((e) => assetNames.has(e.name))
    .find(
      (s) => s.name.endsWith(".tar.gz") || s.name.endsWith(".zip")
    )?.browser_download_url;

  if (downloadUrl) {
    // https://github.com/tauri-apps/tauri/blob/fd125f76d768099dc3d4b2d4114349ffc31ffac9/core/tauri/src/updater/core.rs#L856
    versionContent.platforms[
      `${platform().replace("win32", "windows")}-${arch()
        .replace("arm64", "aarch64")
        .replace("x64", "x86_64")
        .replace("amd64", "x86_64")
        .replace("arm", "armv7")
        .replace("x32", "i686")}`
    ] = {
      signature: sigFile ? readFileSync(sigFile).toString() : undefined,
      url: downloadUrl,
    };
  }

  writeFileSync(versionFile, JSON.stringify(versionContent, null, 2));

  console.log(`Uploading ${versionFile}...`);
  await uploadAssets(releaseId, [versionFile]);
}
