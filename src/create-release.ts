import fs from 'node:fs';

import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
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
}

function allReleases(
  github: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
): AsyncIterableIterator<{ data: GitHubRelease[] }> {
  const params = { per_page: 100, owner, repo };
  return github.paginate.iterator(
    github.rest.repos.listReleases.endpoint.merge(params),
  );
}

export async function createRelease(
  owner: string,
  repo: string,
  tagName: string,
  releaseName: string,
  body?: string,
  commitish?: string,
  draft = true,
  prerelease = true,
): Promise<Release> {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error('GITHUB_TOKEN is required');
  }

  // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
  const github = getOctokit(process.env.GITHUB_TOKEN);

  const bodyPath = core.getInput('body_path', { required: false });
  let bodyFileContent: string | null = null;
  if (bodyPath !== '' && !!bodyPath) {
    try {
      bodyFileContent = fs.readFileSync(bodyPath, { encoding: 'utf8' });
    } catch (error) {
      // @ts-expect-error Catching errors in typescript is a headache
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      core.setFailed(error.message);
    }
  }

  let release: GitHubRelease | null = null;
  try {
    // you can't get a an existing draft by tag
    // so we must find one in the list of all releases
    if (draft) {
      console.log(`Looking for a draft release with tag ${tagName}...`);
      for await (const response of allReleases(github, owner, repo)) {
        const releaseWithTag = response.data.find(
          (release) => release.tag_name === tagName,
        );
        if (releaseWithTag) {
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
      const createdRelease = await github.rest.repos.createRelease({
        owner,
        repo,
        tag_name: tagName,
        name: releaseName,
        body: bodyFileContent || body,
        draft,
        prerelease,
        target_commitish: commitish || context.sha,
      });

      release = createdRelease.data;
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
  }

  return {
    id: release.id,
    uploadUrl: release.upload_url,
    htmlUrl: release.html_url,
  };
}
