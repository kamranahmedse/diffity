export type { Commit, RepoInfo } from './types.js';
export type { RefCapabilities } from './repo.js';
export { isGitRepo, getRepoRoot, getRepoName, getCurrentBranch, getRepoInfo, getHeadHash, getDiffityDir, getDiffityDirPath, getRefCapabilities, isValidGitRef } from './repo.js';
export { getDiff, getDiffStat, getUntrackedFiles, getUntrackedDiff, getFileContent, getFileLineCount, getMergeBase, normalizeRef, resolveBaseRef, resolveRef, revertFile, revertHunk } from './diff.js';
export { getStagedFiles, getUnstagedFiles, isDirty } from './status.js';
export { getRecentCommits } from './commits.js';
