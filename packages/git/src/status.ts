import { execLines } from './exec.js';

export function getStagedFiles(): string[] {
  return execLines('git diff --staged --name-only');
}

export function getUnstagedFiles(): string[] {
  return execLines('git diff --name-only');
}
