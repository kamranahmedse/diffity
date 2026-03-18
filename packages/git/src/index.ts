export type { Commit, RepoInfo } from './types.js';
export type { RefCapabilities } from './repo.js';
export { isGitRepo, getRepoRoot, getRepoName, getCurrentBranch, getRepoInfo, getHeadHash, getDiffityDir, getDiffityDirPath, getRefCapabilities, isValidGitRef } from './repo.js';
export { getDiff, getDiffFiles, getDiffStat, getDiffStatForRef, getUntrackedFiles, getUntrackedDiff, getFileContent, getFileLineCount, getMergeBase, normalizeRef, resolveBaseRef, resolveDiffArgs, resolveRef, revertFile, revertHunk, WORKING_TREE_REFS } from './diff.js';
export type { RefDiffArgs } from './diff.js';
export { getStagedFiles, getUnstagedFiles, isDirty } from './status.js';
export { getRecentCommits } from './commits.js';
