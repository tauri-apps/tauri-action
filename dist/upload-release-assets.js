"use strict";
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
const github_1 = require("@actions/github");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function uploadAssets(uploadUrl, assets) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.GITHUB_TOKEN === undefined) {
            throw new Error('GITHUB_TOKEN is required');
        }
        const github = new github_1.GitHub(process.env.GITHUB_TOKEN);
        // Determine content-length for header to upload asset
        const contentLength = (filePath) => fs_1.default.statSync(filePath).size;
        for (const assetPath of assets) {
            const headers = { 'content-type': 'application/zip', 'content-length': contentLength(assetPath) };
            yield github.repos.uploadReleaseAsset({
                url: uploadUrl,
                headers,
                name: path_1.default.basename(assetPath),
                data: fs_1.default.readFileSync(assetPath)
            });
        }
    });
}
exports.default = uploadAssets;
