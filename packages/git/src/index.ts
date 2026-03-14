export type { Commit, RepoInfo } from './types.js';
export { isGitRepo, getRepoRoot, getRepoName, getCurrentBranch, getRepoInfo } from './repo.js';
export { getDiff, getUntrackedFiles, getUntrackedDiff, getFileContent, getFileLineCount, getMergeBase, resolveRef, revertFile, revertHunk, applySuggestion } from './diff.js';
export { getStagedFiles, getUnstagedFiles } from './status.js';
export { getRecentCommits } from './commits.js';
