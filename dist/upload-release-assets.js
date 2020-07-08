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
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function uploadAssets(uploadUrl, assets) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
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
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
exports.default = uploadAssets;
