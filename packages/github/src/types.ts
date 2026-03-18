export interface GitHubRemote {
  owner: string;
  repo: string;
}

export interface GitHubDetails {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  prCreatedAt: string;
  headSha: string;
  commentCount: number;
}

export interface PulledComment {
  filePath: string;
  side: 'old' | 'new';
  startLine: number;
  endLine: number;
  body: string;
  authorName: string;
  authorType: 'user' | 'agent';
  createdAt: string;
}

export interface PullResult {
  pulled: number;
  skipped: number;
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
