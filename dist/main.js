"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const core = __importStar(require("@actions/core"));
const execa_1 = __importDefault(require("execa"));
const path_1 = require("path");
const fs_1 = require("fs");
const upload_release_assets_1 = __importDefault(require("./upload-release-assets"));
function hasTauriDependency(root) {
    const packageJsonPath = path_1.join(root, 'package.json');
    if (fs_1.existsSync(packageJsonPath)) {
        const packageJsonString = fs_1.readFileSync(packageJsonPath).toString();
        const packageJson = JSON.parse(packageJsonString);
        if (packageJson.dependencies && packageJson.dependencies.tauri) {
            return true;
        }
    }
    return false;
}
function usesYarn(root) {
    return fs_1.existsSync(path_1.join(root, 'yarn.lock'));
}
function execCommand(command, { cwd }) {
    console.log(`running ${command}`);
    const [cmd, ...args] = command.split(' ');
    return execa_1.default(cmd, args, {
        cwd,
        shell: process.env.shell || true,
        windowsHide: true,
        stdio: 'inherit',
        env: { FORCE_COLOR: '0' },
    }).then();
}
function buildProject(root, args, { configPath, distPath }) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            if (hasTauriDependency(root)) {
                const runner = usesYarn(root) ? 'yarn tauri' : 'npx tauri';
                resolve(runner);
            }
            else {
                execCommand('npm install -g tauri', { cwd: undefined }).then(() => resolve('tauri'));
            }
        })
            .then((runner) => {
            if (fs_1.existsSync(path_1.join(root, 'src-tauri'))) {
                return runner;
            }
            else {
                return execCommand(`${runner} init`, { cwd: root }).then(() => runner);
            }
        })
            .then((runner) => {
            const tauriConfPath = path_1.join(root, 'src-tauri/tauri.conf.json');
            if (configPath !== null) {
                fs_1.copyFileSync(configPath, tauriConfPath);
            }
            if (distPath) {
                const tauriConf = JSON.parse(fs_1.readFileSync(tauriConfPath).toString());
                tauriConf.build.distDir = distPath;
                fs_1.writeFileSync(tauriConfPath, JSON.stringify(tauriConf));
            }
            return execCommand(`${runner} build` + (args.length ? ` ${args.join(' ')}` : ''), { cwd: root }).then(() => {
                const appName = 'app';
                const artifactsPath = path_1.join(root, 'src-tauri/target/release');
                switch (os_1.platform()) {
                    case 'darwin':
                        return [
                            path_1.join(artifactsPath, `bundle/dmg/${appName}.dmg`),
                            path_1.join(artifactsPath, `bundle/osx/${appName}.osx`)
                        ];
                    case 'win32':
                        return [
                            path_1.join(artifactsPath, `bundle/${appName}.msi`),
                        ];
                    default:
                        return [
                            path_1.join(artifactsPath, `bundle/deb/${appName}.deb`),
                            path_1.join(artifactsPath, `bundle/appimage/${appName}.AppImage`)
                        ];
                }
            });
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const projectPath = core.getInput('projectPath') || process.argv[2];
            const configPath = path_1.join(projectPath, core.getInput('configPath') || 'tauri.conf.json');
            const distPath = core.getInput('distPath');
            const uploadUrl = core.getInput('uploadUrl');
            const releaseId = core.getInput('releaseId');
            if ((!!uploadUrl) !== (!!releaseId)) {
                core.setFailed('To upload artifacts to a release, you need to set both `releaseId` and `uploadUrl`.');
                return;
            }
            let config = null;
            if (fs_1.existsSync(configPath)) {
                config = JSON.parse(fs_1.readFileSync(configPath).toString());
            }
            const artifacts = yield buildProject(projectPath, [], { configPath: config, distPath });
            if (uploadUrl && releaseId) {
                yield upload_release_assets_1.default(uploadUrl, Number(releaseId), artifacts);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
