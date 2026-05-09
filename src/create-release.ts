import fs from 'node:fs';

import * as core from '@actions/core';
import { getOctokit } from '@actions/github';

import {
  commitish,
  draft,
  generateReleaseNotes,
  githubBaseUrl,
  owner,
  prerelease,
  repo,
} from './inputs';

import type { GitHub } from '@actions/github/lib/utils';

interface Release {
  id: number;
  uploadUrl: string;
  htmlUrl: string;
}

interface GitHubRelease {
  id: number;
  upload_url: string;
  html_url: string;
  tag_name: string;
  draft: boolean;
}

function allReleases(
  github: InstanceType<typeof GitHub>,
): AsyncIterable<{ data: GitHubRelease[] }> {
  const params = { per_page: 100, owner, repo };
  return github.paginate.iterator(github.rest.repos.listReleases, params);
}

/// Try to get release by tag. If there's none, releaseName is required to create one.
export async function getOrCreateRelease(
  tagName: string,
  releaseName?: string,
  body?: string,
): Promise<Release> {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required');
  }

  // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
  const github = getOctokit(process.env.GITHUB_TOKEN, {
    baseUrl: githubBaseUrl,
  });

  const bodyPath = core.getInput('body_path', { required: false });
  let bodyFileContent: string | null = null;
  if (bodyPath && bodyPath !== '') {
    try {
      bodyFileContent = fs.readFileSync(bodyPath, { encoding: 'utf8' });
    } catch (error) {
      // @ts-expect-error Catching errors in typescript is a headache
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      core.setFailed(error.message);
    }
  }

  let release: GitHubRelease | null = null;
  let isNewRelease = false;

  try {
    // you can't get a an existing draft by tag
    // so we must find one in the list of all releases
    if (draft) {
      console.log(`Looking for a draft release with tag ${tagName}...`);
      for await (const response of allReleases(github)) {
        const releaseWithTag = response.data.find(
          (release) => release.tag_name === tagName,
        );
        if (releaseWithTag) {
          if (!releaseWithTag.draft) {
            console.warn(
              `Found release with tag ${tagName} but it's NOT a draft!`,
            );
            break;
          }
          release = releaseWithTag;
          console.log(
            `Found draft release with tag ${tagName} on the release list.`,
          );
          break;
        }
      }
      if (!release) {
        throw new Error('release not found');
      }
    } else {
      const foundRelease = await github.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });
      release = foundRelease.data;

      console.log(`Found release with tag ${tagName}.`);
    }
  } catch (error) {
    // @ts-expect-error Catching errors in typescript is a headache
    if (error.status === 404 || error.message === 'release not found') {
      console.log(`Couldn't find release with tag ${tagName}. Creating one.`);

      if (!releaseName) {
        console.error('"releaseName" not set but required to create release.');
      } else {
        const createdRelease = await github.rest.repos.createRelease({
          owner,
          repo,
          tag_name: tagName,
          name: releaseName,
          body: bodyFileContent || body,
          draft,
          prerelease,
          target_commitish: commitish,
          generate_release_notes: generateReleaseNotes,
        });

        isNewRelease = true;
        release = createdRelease.data;
      }
    } else {
      console.log(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `⚠️ Unexpected error fetching GitHub release for tag ${tagName}: ${error}`,
      );
      throw error;
    }
  }

  if (!release) {
    throw new Error('Release not found or created.');
  } else if (!isNewRelease && !release.draft) {
    // updateRelease changes the tags of draft releases, creating duplicate releases.
    // Therefore we only update published releases.
    console.log('Updating name and body of existing release...');
    await github.rest.repos.updateRelease({
      owner,
      repo,
      release_id: release.id,
      name: releaseName,
      body: bodyFileContent || body,
      generate_release_notes: generateReleaseNotes,
    });
  }

  return {
    id: release.id,
    uploadUrl: release.upload_url,
    htmlUrl: release.html_url,
  };
}
