import { execCommand, hasDependency, usesPnpm, usesYarn } from './utils';

class Runner {
  // Could be "npm", "yarn", "pnpm", "cargo", "path/to/tauri-cli/binary" or "tauri"
  bin: string;
  // could be ["tauri"], ["run", "tauri"], ["some package.json script"], ["run", "some package.json script"] or []
  tauriScript: string[];
  // vue-cli-plugin-tauri uses `tauri:build` instead of `tauri build`
  vueCli: boolean;

  constructor(bin: string, tauriScript?: string[], vueCli?: boolean) {
    this.bin = bin;
    this.tauriScript = tauriScript || [];
    this.vueCli = !!vueCli;
  }

  async execTauriCommand(
    command: string[],
    commandOptions: string[],
    cwd?: string
  ): Promise<void> {
    const args: string[] = [];

    if (this.bin === 'npm' && this.tauriScript[0] !== 'run') {
      args.push('run');
    }

    if (!(this.vueCli && command[0] === 'tauri:build')) {
      args.push(...this.tauriScript);
    }

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
  tauriScript: string | null
): Promise<Runner> {
  if (tauriScript) {
    // FIXME: This will also split file paths with spaces.
    const [runnerCommand, ...runnerArgs] = tauriScript.split(' ');
    return new Runner(runnerCommand, runnerArgs);
  }

  const vueCli = hasDependency('vue-cli-plugin-tauri', root);
  if (hasDependency('@tauri-apps/cli', root) || vueCli) {
    if (usesYarn(root)) return new Runner('yarn', ['tauri'], vueCli);
    if (usesPnpm(root)) return new Runner('pnpm', ['tauri'], vueCli);
    return new Runner('npm', ['run', 'tauri'], vueCli);
  }

  await execCommand('npm', ['install', '-g', '@tauri-apps/cli'], {
    cwd: undefined,
  });

  return new Runner('tauri');
}

export { Runner, getRunner };
