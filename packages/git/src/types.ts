export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  relativeDate: string;
}

export interface RepoInfo {
  name: string;
  branch: string;
  root: string;
}
