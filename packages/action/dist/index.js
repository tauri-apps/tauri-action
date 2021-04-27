'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os_1 = require("os");
const core = tslib_1.__importStar(require("@actions/core"));
const path_1 = require("path");
const fs_1 = require("fs");
const upload_release_assets_1 = tslib_1.__importDefault(require("./upload-release-assets"));
const create_release_1 = tslib_1.__importDefault(require("./create-release"));
const action_core_1 = require("@tauri-apps/action-core");
function run() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const preferGlobal = core.getInput('preferGlobal') === 'true';
            const projectPath = path_1.resolve(process.cwd(), core.getInput('projectPath') || process.argv[2]);
            const configPath = path_1.join(projectPath, core.getInput('configPath') || 'tauri.conf.json');
            const distPath = core.getInput('distPath');
            const iconPath = core.getInput('iconPath');
            const includeDebug = core.getInput('includeDebug') === 'true';
            const npmScript = core.getInput('npmScript');
            let tagName = core.getInput('tagName').replace('refs/tags/', '');
            let releaseName = core.getInput('releaseName').replace('refs/tags/', '');
            let body = core.getInput('releaseBody');
            const draft = core.getInput('releaseDraft') === 'true';
            const prerelease = core.getInput('prerelease') === 'true';
            const commitish = core.getInput('releaseCommitish') || null;
            if (Boolean(tagName) !== Boolean(releaseName)) {
                throw new Error('`tag` is required along with `releaseName` when creating a release.');
            }
            const options = {
                configPath: fs_1.existsSync(configPath) ? configPath : null,
                distPath,
                iconPath,
                npmScript
            };
            const artifacts = yield action_core_1.buildProject(preferGlobal, projectPath, false, options);
            if (includeDebug) {
                const debugArtifacts = yield action_core_1.buildProject(preferGlobal, projectPath, true, options);
                artifacts.push(...debugArtifacts);
            }
            if (artifacts.length === 0) {
                throw new Error('No artifacts were found.');
            }
            console.log(`Artifacts: ${artifacts}.`);
            let releaseId;
            if (tagName) {
                const packageJson = action_core_1.getPackageJson(projectPath);
                const templates = [
                    {
                        key: '__VERSION__',
                        value: packageJson === null || packageJson === void 0 ? void 0 : packageJson.version
                    }
                ];
                templates.forEach(template => {
                    const regex = new RegExp(template.key, 'g');
                    tagName = tagName.replace(regex, template.value);
                    releaseName = releaseName.replace(regex, template.value);
                    body = body.replace(regex, template.value);
                });
                const releaseData = yield create_release_1.default(tagName, releaseName, body, commitish || undefined, draft, prerelease);
                releaseId = releaseData.id;
                core.setOutput('releaseUploadUrl', releaseData.uploadUrl);
                core.setOutput('releaseId', releaseData.id.toString());
                core.setOutput('releaseHtmlUrl', releaseData.htmlUrl);
            }
            else {
                releaseId = Number(core.getInput('releaseId') || 0);
            }
            if (releaseId) {
                if (os_1.platform() === 'darwin') {
                    let i = 0;
                    for (const artifact of artifacts) {
                        if (artifact.endsWith('.app')) {
                            yield action_core_1.execCommand(`tar -czf ${artifact}.tgz ${artifact}`, {
                                cwd: undefined
                            });
                            artifacts[i] += '.tgz';
                        }
                        i++;
                    }
                }
                yield upload_release_assets_1.default(releaseId, artifacts);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
