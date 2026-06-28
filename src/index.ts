import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import * as core from '@actions/core';

import { buildProject } from './build';
import { getOrCreateRelease } from './create-release';
import {
  isIOS,
  parsedArgs,
  retryAttempts,
  shouldUploadUpdaterJson,
  shouldUploadWorkflowArtifacts,
} from './inputs';
import { uploadAssets as uploadReleaseAssets } from './upload-release-assets';
import { uploadVersionJSON } from './upload-version-json';
import { uploadWorkflowArtifacts } from './upload-workflow-artifacts';
import { execCommand, getInfo, getTargetInfo, retry } from './utils';

import type { Artifact } from './types';

async function run(): Promise<void> {
  try {
    if (isIOS && process.platform !== 'darwin') {
      throw new Error('Building for iOS is only supported on macOS runners.');
    }

    // inputs that won't be changed are in ./inputs
    let tagName = core.getInput('tagName').replace('refs/tags/', '');
    let releaseId = Number(core.getInput('releaseId'));
    let releaseName = core.getInput('releaseName').replace('refs/tags/', '');
    let body = core.getInput('releaseBody');

    const targetPath = parsedArgs.target as string | undefined;
    const configArg = parsedArgs.config as string[] | undefined;

    const artifacts: Artifact[] = [];

    artifacts.push(...(await buildProject()));

    if (artifacts.length === 0) {
      if (releaseId || tagName || shouldUploadWorkflowArtifacts) {
        throw new Error('No artifacts were found.');
      } else {
        console.log(
          'No artifacts were found. The action was not configured to upload artifacts, therefore this is not handled as an error.',
        );
        return;
      }
    }

    console.log(`Found artifacts:\n${artifacts.map((a) => a.path).join('\n')}`);
    core.setOutput(
      'artifactPaths',
      JSON.stringify(artifacts.map((a) => a.path)),
    );

    const targetInfo = getTargetInfo(targetPath);
    const info = getInfo(targetInfo, configArg);
    core.setOutput('appVersion', info.version);

    // Since artifacts are .zip archives we can do this before the .tar.gz step below.
    if (shouldUploadWorkflowArtifacts) {
      console.log('uploadWorkflowArtifacts enabled');
      await uploadWorkflowArtifacts(artifacts);
    }

    // Other steps may benefit from this so we do this whether or not we want to upload it.
    if (targetInfo.platform === 'macos') {
      let i = 0;
      for (const artifact of artifacts) {
        // updater provide a .tar.gz, this will prevent duplicate and overwriting of
        // signed archive
        if (
          artifact.path.endsWith('.app') &&
          !existsSync(`${artifact.path}.tar.gz`)
        ) {
          console.log(
            `Packaging ${artifact.path} directory into ${artifact.path}.tar.gz`,
          );

          await execCommand('tar', [
            'czf',
            `${artifact.path}.tar.gz`,
            '-C',
            dirname(artifact.path),
            basename(artifact.path),
          ]);
          artifact.path += '.tar.gz';
          artifact.ext += '.tar.gz';
        } else if (artifact.path.endsWith('.app')) {
          // we can't upload a directory
          artifacts.splice(i, 1);
        }
        i++;
      }
    }

    // If releaseId is set we'll use this to upload the assets to.
    // If tagName is set we will try to upload assets to the release associated with the given tagName.
    // If there's no release for that tag, we require releaseName to create a new one.
    if (tagName && !releaseId) {
      const templates = [
        {
          key: '__VERSION__',
          value: info.version,
        },
      ];

      templates.forEach((template) => {
        const regex = new RegExp(template.key, 'g');
        tagName = tagName.replace(regex, template.value);
        releaseName = releaseName.replace(regex, template.value);
        body = body.replace(regex, template.value);
      });

      const releaseData = await getOrCreateRelease(
        tagName,
        releaseName || undefined,
        body,
      );
      releaseId = releaseData.id;
      core.setOutput('releaseUploadUrl', releaseData.uploadUrl);
      core.setOutput('releaseId', releaseData.id.toString());
      core.setOutput('releaseHtmlUrl', releaseData.htmlUrl);
    }

    if (releaseId) {
      await uploadReleaseAssets(releaseId, artifacts, retryAttempts);

      if (shouldUploadUpdaterJson) {
        // Once we start throwing our own errors in this function we may need some custom retry logic.
        // We can't retry just the inner asset upload as that may upload an outdated latest.json file.
        await retry(
          () =>
            uploadVersionJSON(
              info.version,
              body,
              releaseId,
              artifacts,
              info,
              info.unzippedSigs,
            ),
          // since all jobs try to upload this file it tends to conflict often so we want to retry it at least once.
          retryAttempts === 0 ? 1 : retryAttempts,
        );
      }
    } else {
      console.log('No releaseId or tagName provided, skipping all uploads...');
    }
  } catch (error) {
    // @ts-expect-error Catching errors in typescript is a headache
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    core.setFailed(error.message);
  }
}

await run();
