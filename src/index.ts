import { existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';

import * as core from '@actions/core';
import { context } from '@actions/github';
import stringArgv from 'string-argv';

import { createRelease } from './create-release';
import { uploadAssets as uploadReleaseAssets } from './upload-release-assets';
import { uploadVersionJSON } from './upload-version-json';
import { buildProject } from './build';
import { execCommand, getInfo, getPackageJson, getTargetInfo } from './utils';

import type { Artifact, BuildOptions } from './types';

async function run(): Promise<void> {
  try {
    const projectPath = resolve(
      process.cwd(),
      core.getInput('projectPath') || process.argv[2]
    );
    const distPath = core.getInput('distPath');
    const iconPath = core.getInput('iconPath');
    const includeRelease = core.getBooleanInput('includeRelease');
    const includeDebug = core.getBooleanInput('includeDebug');
    const includeUpdaterJson = core.getBooleanInput('includeUpdaterJson');
    const updaterJsonKeepUniversal = core.getBooleanInput(
      'updaterJsonKeepUniversal'
    );
    const tauriScript = core.getInput('tauriScript');
    const args = stringArgv(core.getInput('args'));
    const bundleIdentifier = core.getInput('bundleIdentifier');

    let tagName = core.getInput('tagName').replace('refs/tags/', '');
    let releaseId = Number(core.getInput('releaseId'));
    let releaseName = core.getInput('releaseName').replace('refs/tags/', '');
    let body = core.getInput('releaseBody');
    const owner = core.getInput('owner') || context.repo.owner;
    const repo = core.getInput('repo') || context.repo.repo;
    const draft = core.getBooleanInput('releaseDraft');
    const prerelease = core.getBooleanInput('prerelease');
    const commitish = core.getInput('releaseCommitish') || null;

    // TODO: Change its default to true for v2 apps
    // Not using getBooleanInput so we can differentiate between true,false,unset later.
    const updaterJsonPreferNsis =
      core.getInput('updaterJsonPreferNsis')?.toLowerCase() === 'true';

    if (!releaseId) {
      if (Boolean(tagName) !== Boolean(releaseName)) {
        throw new Error(
          '`tagName` is required along with `releaseName` when creating a release.'
        );
      }
    }

    const options: BuildOptions = {
      distPath,
      iconPath,
      tauriScript,
      args,
      bundleIdentifier,
    };

    const targetArgIdx = [...args].findIndex(
      (e) => e === '-t' || e === '--target'
    );
    const targetPath =
      targetArgIdx >= 0 ? [...args][targetArgIdx + 1] : undefined;

    const configArgIdx = [...args].findIndex(
      (e) => e === '-c' || e === '--config'
    );
    const configArg =
      configArgIdx >= 0 ? [...args][configArgIdx + 1] : undefined;

    const targetInfo = getTargetInfo(targetPath);
    const info = getInfo(projectPath, targetInfo, configArg);

    const releaseArtifacts: Artifact[] = [];
    const debugArtifacts: Artifact[] = [];
    if (includeRelease) {
      releaseArtifacts.push(
        ...(await buildProject(projectPath, false, options))
      );
    }
    if (includeDebug) {
      debugArtifacts.push(...(await buildProject(projectPath, true, options)));
    }
    const artifacts = releaseArtifacts.concat(debugArtifacts);

    if (artifacts.length === 0) {
      throw new Error('No artifacts were found.');
    }

    console.log(`Found artifacts:\n${artifacts.map((a) => a.path).join('\n')}`);
    core.setOutput(
      'artifactPaths',
      JSON.stringify(artifacts.map((a) => a.path))
    );

    if (tagName && !releaseId) {
      const packageJson = getPackageJson(projectPath);
      const templates = [
        {
          key: '__VERSION__',
          value: info.version || packageJson.version,
        },
      ];

      templates.forEach((template) => {
        const regex = new RegExp(template.key, 'g');
        tagName = tagName.replace(regex, template.value);
        releaseName = releaseName.replace(regex, template.value);
        body = body.replace(regex, template.value);
      });

      const releaseData = await createRelease(
        owner,
        repo,
        tagName,
        releaseName,
        body,
        commitish || undefined,
        draft,
        prerelease
      );
      releaseId = releaseData.id;
      core.setOutput('releaseUploadUrl', releaseData.uploadUrl);
      core.setOutput('releaseId', releaseData.id.toString());
      core.setOutput('releaseHtmlUrl', releaseData.htmlUrl);
    }

    if (releaseId) {
      if (targetInfo.platform === 'macos') {
        let i = 0;
        for (const artifact of artifacts) {
          // updater provide a .tar.gz, this will prevent duplicate and overwriting of
          // signed archive
          if (
            artifact.path.endsWith('.app') &&
            !existsSync(`${artifact.path}.tar.gz`)
          ) {
            await execCommand('tar', [
              'czf',
              `${artifact.path}.tar.gz`,
              '-C',
              dirname(artifact.path),
              basename(artifact.path),
            ]);
            artifact.path += '.tar.gz';
          } else if (artifact.path.endsWith('.app')) {
            // we can't upload a directory
            artifacts.splice(i, 1);
          }
          i++;
        }
      }

      await uploadReleaseAssets(owner, repo, releaseId, artifacts);

      if (includeUpdaterJson) {
        await uploadVersionJSON({
          owner,
          repo,
          version: info.version,
          notes: body,
          tagName,
          releaseId,
          artifacts:
            releaseArtifacts.length !== 0 ? releaseArtifacts : debugArtifacts,
          targetInfo,
          updaterJsonPreferNsis,
          updaterJsonKeepUniversal,
        });
      }
    }
  } catch (error) {
    // @ts-ignore
    core.setFailed(error.message);
  }
}

run();
