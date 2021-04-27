'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const github_1 = require("@actions/github");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
function uploadAssets(releaseId, assets) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (process.env.GITHUB_TOKEN === undefined) {
            throw new Error('GITHUB_TOKEN is required');
        }
        const github = github_1.getOctokit(process.env.GITHUB_TOKEN);
        // Determine content-length for header to upload asset
        const contentLength = (filePath) => fs_1.default.statSync(filePath).size;
        for (const assetPath of assets) {
            const headers = {
                'content-type': 'application/zip',
                'content-length': contentLength(assetPath)
            };
            const ext = path_1.default.extname(assetPath);
            const filename = path_1.default.basename(assetPath).replace(ext, '');
            const assetName = path_1.default.dirname(assetPath).includes(`target${path_1.default.sep}debug`)
                ? `${filename}-debug${ext}`
                : `${filename}${ext}`;
            console.log(`Uploading ${assetName}...`);
            yield github.repos.uploadReleaseAsset({
                headers,
                name: assetName,
                // https://github.com/tauri-apps/tauri-action/pull/45
                // @ts-ignore error TS2322: Type 'Buffer' is not assignable to type 'string'.
                data: fs_1.default.readFileSync(assetPath),
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                release_id: releaseId
            });
        }
    });
}
exports.default = uploadAssets;
