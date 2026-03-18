import { execSync } from 'node:child_process';

export function exec(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export function execJson<T>(cmd: string): T | null {
  try {
    const raw = exec(cmd);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function execSilent(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
