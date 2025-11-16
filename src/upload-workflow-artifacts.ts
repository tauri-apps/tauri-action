import { dirname } from 'node:path';
import GHArtifact from '@actions/artifact';

import { globbySync } from 'globby';
import { Artifact } from './types';
import { getAssetName, retry } from './utils';

export async function uploadWorkflowArtifacts(
  artifacts: Artifact[],
  pattern: string | true,
  retryAttempts: number,
) {
  for (const artifact of artifacts) {
    if (artifact.workflowArtifactName) {
      let workflowArtifactName = artifact.workflowArtifactName;
      if (typeof pattern === 'string') {
        workflowArtifactName = getAssetName(artifact, pattern);
      }

      let paths = [artifact.path];
      if (artifact.ext === '.app') {
        paths = globbySync('**/*', { cwd: artifact.path, absolute: true });
      }
      console.log(
        "Handing it off to GitHub's uploadArtifact function. This will print a few unmanaged logs.",
      );
      await retry(
        () =>
          GHArtifact.uploadArtifact(
            workflowArtifactName,
            paths,
            dirname(artifact.path),
            {
              compressionLevel: artifact.ext === '.app' ? 6 : 0,
            },
          ),
        retryAttempts,
      );
      console.log('Workflow artifacts uploads DONE!');
    }
  }
}
