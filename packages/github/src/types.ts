export interface GitHubInfo {
  owner: string;
  repo: string;
  prNumber: number | null;
  prUrl: string | null;
  headSha: string | null;
}

export interface PrComment {
  filePath: string;
  side: 'LEFT' | 'RIGHT';
  startLine: number | null;
  endLine: number;
  body: string;
}

export interface PushResult {
  pushed: number;
  skipped: number;
  failed: number;
  errors: string[];
}
