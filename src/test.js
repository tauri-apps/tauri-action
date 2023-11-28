import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path, { join, normalize, resolve, sep } from 'path';

import { execa } from 'execa';
import { parse as parseToml } from '@iarna/toml';
import { globbySync } from 'globby';

function findFileGlob(startingDir, fileNames) {
  console.log(startingDir);
  const files = globbySync(fileNames, {
    gitignore: true,
    cwd: startingDir,
    ignore: ['**/target/', '**/dist/**'],
  });

  console.log(JSON.stringify(files));

  if (files.length === 0) {
    return null;
  }

  const re = new RegExp('/', 'g');

  files.sort((a, b) => (a.match(re) ?? []).length - (b.match(re) ?? []).length);

  console.log(JSON.stringify(files));

  return files[0];
}

console.log(
  findFileGlob('C:/Users/Fabian-Lars/dev/fabianlars/mw-toolbox', [
    '**/tauri.conf.json',
    '**/Tauri.toml',
    '**/tauri.conf.json5',
  ]),
);
