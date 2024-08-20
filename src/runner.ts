import {
  execCommand,
  hasDependency,
  usesBun,
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
  ): Promise<void> {
    const args: string[] = [];

    if (this.bin === 'npm' && this.tauriScript[0] !== 'run') {
      args.push('run');
    }

    args.push(...this.tauriScript);

    args.push(...command);

    if (this.bin === 'npm' && commandOptions.length) {
      args.push('--');
    }

    args.push(...commandOptions);

    return execCommand(this.bin, args, { cwd });
  }
}

async function getRunner(
  root: string,
  tauriScript: string | null,
): Promise<Runner> {
  if (tauriScript) {
    // FIXME: This will also split file paths with spaces.
    const [runnerCommand, ...runnerArgs] = tauriScript.split(' ');
    return new Runner(runnerCommand, runnerArgs);
  }

  if (hasDependency('@tauri-apps/cli', root)) {
    if (usesYarn(root)) return new Runner('yarn', ['tauri']);
    if (usesPnpm(root)) return new Runner('pnpm', ['tauri']);
    if (usesBun(root)) return new Runner('bun', ['tauri']);
    return new Runner('npm', ['run', 'tauri']);
  }

  await execCommand('npm', ['install', '-g', '@tauri-apps/cli'], {
    cwd: undefined,
  });

  return new Runner('tauri');
}

export { Runner, getRunner };
