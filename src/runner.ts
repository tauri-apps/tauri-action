import { projectPath, tauriScript } from './inputs';
import {
  execCommand,
  hasDependency,
  hasTauriScript,
  retry,
  usesVitePlus,
  usesBun,
  usesNpm,
  usesPnpm,
  usesYarn,
} from './utils';

class Runner {
  // Could be "npm", "yarn", "pnpm", "bun", "cargo", "path/to/tauri-cli/binary" or "tauri"
  bin: string;
  // could be ["tauri"], ["run", "tauri"], ["some package.json script"], ["run", "some package.json script"] or []
  tauriScript: string[];

  constructor(bin: string, tauriScript?: string[]) {
    this.bin = bin;
    this.tauriScript = tauriScript || [];
  }

  async execTauriCommand(
    command: string[],
    commandOptions: string[],
    cwd?: string,
    env?: Record<string, string>,
    retryAttempts: number = 0,
  ): Promise<void> {
    const args = [...this.tauriScript, ...command];

    if (this.bin === 'npm' && commandOptions.length) {
      args.push('--');
    }

    args.push(...commandOptions);

    return retry(
      () => execCommand(this.bin, args, { cwd }, env),
      retryAttempts,
    ) as Promise<void>;
  }
}

async function getRunner(): Promise<Runner> {
  if (tauriScript) {
    console.log('`tauriScript` set. Skipping cli verification.');
    // FIXME: This will also split file paths with spaces.
    const [runnerCommand, ...runnerArgs] = tauriScript.split(' ');
    return new Runner(runnerCommand, runnerArgs);
  }

  if (hasDependency('@tauri-apps/cli', projectPath)) {
    // usesX also check if the runner executable exists.
    if (usesVitePlus())
      return new Runner('vp', [
        hasTauriScript(projectPath) ? 'run' : 'exec',
        'tauri',
      ]);
    if (usesYarn(projectPath)) return new Runner('yarn', ['tauri']);
    if (usesPnpm(projectPath)) return new Runner('pnpm', ['tauri']);
    if (usesBun(projectPath)) return new Runner('bun', ['tauri']);
    // npm should always be available in a GitHub runner but we'll check for it anyway.
    if (usesNpm(projectPath))
      return new Runner('npm', [
        hasTauriScript(projectPath) ? 'run' : 'exec',
        'tauri',
      ]);
  }

  console.warn(
    'Could not detect valid `@tauri-apps/cli` installation. Proceeding to install global npm package...',
  );

  await execCommand('npm', ['install', '-g', `@tauri-apps/cli@v2`], {
    cwd: undefined,
  });

  return new Runner('tauri');
}

export { Runner, getRunner };
