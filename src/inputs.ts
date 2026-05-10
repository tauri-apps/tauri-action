import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import * as core from '@actions/core';
import { context } from '@actions/github';
import stringArgv from 'string-argv';

export const projectPath = resolve(
  process.cwd(),
  core.getInput('projectPath') || process.argv[2],
);

export const shouldUploadUpdaterJson =
  core.getBooleanInput('uploadUpdaterJson');

export const retryAttempts = parseInt(
  core.getInput('retryAttempts') || '0',
  10,
);

export const tauriScript = core.getInput('tauriScript') || undefined;

export const releaseAssetNamePattern =
  core.getInput('releaseAssetNamePattern') || undefined;

export const rawArgs = stringArgv(core.getInput('args'));

const parsedArgs_ = parseArgs({
  args: rawArgs,
  strict: false,
  options: {
    target: { type: 'string', short: 't' },
    config: {
      type: 'string',
      short: 'c',
      multiple: true,
    },
    debug: { type: 'boolean', short: 'd' },
  },
});

const parsedRunnerArgs_ = parseArgs({
  args: parsedArgs_.positionals,
  strict: false,
  options: { profile: { type: 'string' } },
});

export const parsedArgs = parsedArgs_.values;

export const parsedRunnerArgs = parsedRunnerArgs_.values;

export const uploadPlainBinary = core.getBooleanInput('uploadPlainBinary');

export const owner = core.getInput('owner') || context.repo.owner;

export const repo = core.getInput('repo') || context.repo.repo;

export const draft = core.getBooleanInput('releaseDraft');

export const prerelease = core.getBooleanInput('prerelease');

export const commitish = core.getInput('releaseCommitish') || context.sha;

export const githubBaseUrl =
  core.getInput('githubBaseUrl') ||
  process.env.GITHUB_API_URL ||
  'https://api.github.com';

export const generateReleaseNotes = core.getBooleanInput(
  'generateReleaseNotes',
);

export const shouldUploadWorkflowArtifacts = core.getBooleanInput(
  'uploadWorkflowArtifacts',
);

export const workflowArtifactNamePattern =
  core.getInput('workflowArtifactNamePattern') || '[platform]-[arch]-[bundle]';

export const uploadUpdaterSignatures = core.getBooleanInput(
  'uploadUpdaterSignatures',
);

export const updaterJsonPreferNsis = core.getBooleanInput(
  'updaterJsonPreferNsis',
);

export const isAndroid = core.getInput('mobile').toLowerCase() === 'android';
export const isIOS = core.getInput('mobile').toLowerCase() === 'ios';
export const isDebug = parsedArgs.debug as boolean;
