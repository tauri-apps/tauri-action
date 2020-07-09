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
const create_release_1 = __importDefault(require("./create-release"));
const toml_1 = __importDefault(require("@iarna/toml"));
function getPackageJson(root) {
    const packageJsonPath = path_1.join(root, 'package.json');
    if (fs_1.existsSync(packageJsonPath)) {
        const packageJsonString = fs_1.readFileSync(packageJsonPath).toString();
        const packageJson = JSON.parse(packageJsonString);
        return packageJson;
    }
    return null;
}
function hasTauriDependency(root) {
    const packageJson = getPackageJson(root);
    return packageJson && packageJson.dependencies && packageJson.dependencies.tauri;
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
function buildProject(root, debug, { configPath, distPath }) {
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
            const manifestPath = path_1.join(root, 'src-tauri/Cargo.toml');
            if (fs_1.existsSync(manifestPath)) {
                const cargoManifest = toml_1.default.parse(fs_1.readFileSync(manifestPath).toString());
                return {
                    runner,
                    name: cargoManifest.package.name,
                    version: cargoManifest.package.version
                };
            }
            else {
                return execCommand(`${runner} init`, { cwd: root }).then(() => {
                    const cargoManifest = toml_1.default.parse(fs_1.readFileSync(manifestPath).toString());
                    const packageJson = getPackageJson(root);
                    const appName = packageJson ? (packageJson.displayName || packageJson.name) : 'app';
                    const version = packageJson ? packageJson.version : '0.1.0';
                    cargoManifest.package.name = appName;
                    cargoManifest.package.version = version;
                    fs_1.writeFileSync(manifestPath, toml_1.default.stringify(cargoManifest));
                    return {
                        runner,
                        name: appName,
                        version
                    };
                });
            }
        })
            .then((app) => {
            const tauriConfPath = path_1.join(root, 'src-tauri/tauri.conf.json');
            if (configPath !== null) {
                fs_1.copyFileSync(configPath, tauriConfPath);
            }
            if (distPath) {
                const tauriConf = JSON.parse(fs_1.readFileSync(tauriConfPath).toString());
                tauriConf.build.distDir = distPath;
                fs_1.writeFileSync(tauriConfPath, JSON.stringify(tauriConf));
            }
            const args = debug ? ['--debug'] : [];
            return execCommand(`${app.runner} build` + (args.length ? ` ${args.join(' ')}` : ''), { cwd: root }).then(() => {
                const appName = app.name;
                const artifactsPath = path_1.join(root, `src-tauri/target/${debug ? 'debug' : 'release'}`);
                switch (os_1.platform()) {
                    case 'darwin':
                        return [
                            path_1.join(artifactsPath, `bundle/dmg/${appName}.dmg`),
                            path_1.join(artifactsPath, `bundle/osx/${appName}.app`)
                        ];
                    case 'win32':
                        return [
                            path_1.join(artifactsPath, `bundle/${appName}.msi`),
                        ];
                    default:
                        return [
                            path_1.join(artifactsPath, `bundle/deb/${appName}_${app.version}_amd64.deb`),
                            path_1.join(artifactsPath, `bundle/appimage/${appName}.AppImage`)
                        ];
                }
            }).then(paths => paths.filter(p => fs_1.existsSync(p)));
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const projectPath = path_1.resolve(process.cwd(), core.getInput('projectPath') || process.argv[2]);
            const configPath = path_1.join(projectPath, core.getInput('configPath') || 'tauri.conf.json');
            const distPath = core.getInput('distPath');
            let tagName = core.getInput('tagName').replace('refs/tags/', '');
            let releaseName = core.getInput('releaseName').replace('refs/tags/', '');
            let body = core.getInput('releaseBody');
            const draft = core.getInput('releaseDraft') === 'true';
            const prerelease = core.getInput('prerelease') === 'true';
            const commitish = core.getInput('releaseCommitish') || null;
            if (Boolean(tagName) !== Boolean(releaseName)) {
                throw new Error('`tag` is required along with `releaseName` when creating a release.');
            }
            const artifacts = yield buildProject(projectPath, false, { configPath: fs_1.existsSync(configPath) ? configPath : null, distPath });
            let uploadUrl;
            if (tagName) {
                const packageJson = getPackageJson(projectPath);
                const templates = [{
                        key: '__VERSION__',
                        value: packageJson === null || packageJson === void 0 ? void 0 : packageJson.version
                    }];
                templates.forEach(template => {
                    const regex = new RegExp(template.key, 'g');
                    tagName = tagName.replace(regex, template.value);
                    releaseName = tagName.replace(releaseName, template.value);
                    body = tagName.replace(body, template.value);
                });
                const releaseData = yield create_release_1.default(tagName, releaseName, body, commitish || undefined, draft, prerelease);
                uploadUrl = releaseData.uploadUrl;
                core.setOutput('releaseUploadUrl', uploadUrl);
                core.setOutput('releaseId', releaseData.id);
                core.setOutput('releaseHtmlUrl', releaseData.htmlUrl);
            }
            else {
                uploadUrl = core.getInput('uploadUrl');
            }
            if (uploadUrl) {
                if (os_1.platform() === 'darwin') {
                    let index = -1;
                    let i = 0;
                    for (const artifact of artifacts) {
                        if (artifact.endsWith('.app')) {
                            index = i;
                            yield execCommand(`tar -czf ${artifact}.tgz ${artifact}`, { cwd: undefined });
                        }
                        i++;
                    }
                    if (index >= 0) {
                        artifacts[index] = artifacts[index] + '.tgz';
                    }
                }
                yield upload_release_assets_1.default(uploadUrl, artifacts);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
