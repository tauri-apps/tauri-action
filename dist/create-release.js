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
function createRelease(tagName, releaseName, body, commitish, draft = true, prerelease = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.env.GITHUB_TOKEN === undefined) {
            throw new Error('GITHUB_TOKEN is required');
        }
        // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
        const github = new github_1.GitHub(process.env.GITHUB_TOKEN);
        // Get owner and repo from context of payload that triggered the action
        const { owner, repo } = github_1.context.repo;
        const bodyPath = core.getInput('body_path', { required: false });
        let bodyFileContent = null;
        if (bodyPath !== '' && !!bodyPath) {
            try {
                bodyFileContent = fs_1.default.readFileSync(bodyPath, { encoding: 'utf8' });
            }
            catch (error) {
                core.setFailed(error.message);
            }
        }
        // Create a release
        // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
        // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
        const createReleaseResponse = yield github.repos.createRelease({
            owner,
            repo,
            tag_name: tagName,
            name: releaseName,
            body: bodyFileContent || body,
            draft,
            prerelease,
            target_commitish: commitish || github_1.context.sha
        });
        // Get the ID, html_url, and upload URL for the created Release from the response
        const { data: { id, html_url: htmlUrl, upload_url: uploadUrl } } = createReleaseResponse;
        return {
            id,
            htmlUrl,
            uploadUrl
        };
    });
}
exports.default = createRelease;
