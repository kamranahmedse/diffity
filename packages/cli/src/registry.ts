import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface RegistryEntry {
  pid: number;
  port: number;
  repoRoot: string;
  repoHash: string;
  repoName: string;
  ref: string;
  description: string;
  startedAt: string;
}

const DIFFITY_DIR = join(homedir(), '.diffity');
const REGISTRY_PATH = join(DIFFITY_DIR, 'registry.json');
const LOCK_PATH = join(DIFFITY_DIR, 'registry.lock');
const LOCK_STALE_MS = 5000;
const LOCK_TIMEOUT_MS = 3000;
const BASE_PORT = 5391;
const MAX_PORT_ATTEMPTS = 10;

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(): void {
  mkdirSync(DIFFITY_DIR, { recursive: true });

  const start = Date.now();
  while (true) {
    try {
      writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' });
      return;
    } catch {
      // Lock file exists — check if stale
      try {
        const stat = statSync(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          try { unlinkSync(LOCK_PATH); } catch {}
          continue;
        }
      } catch {
        // Lock disappeared between our check, retry
        continue;
      }

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        // Force remove stale lock and try once more
        try { unlinkSync(LOCK_PATH); } catch {}
        try {
          writeFileSync(LOCK_PATH, String(process.pid), { flag: 'wx' });
          return;
        } catch {
          throw new Error('Could not acquire registry lock');
        }
      }

      // Brief busy-wait
      const wait = Date.now() + 50;
      while (Date.now() < wait) {}
    }
  }
}

function releaseLock(): void {
  try { unlinkSync(LOCK_PATH); } catch {}
}

function withLock<T>(fn: () => T): T {
  acquireLock();
  try {
    return fn();
  } finally {
    releaseLock();
  }
}

function readRegistryRaw(): RegistryEntry[] {
  if (!existsSync(REGISTRY_PATH)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeRegistryRaw(entries: RegistryEntry[]): void {
  mkdirSync(DIFFITY_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2));
}

function cleanStaleEntries(entries: RegistryEntry[]): RegistryEntry[] {
  return entries.filter((entry) => isProcessAlive(entry.pid));
}

export function readRegistry(): RegistryEntry[] {
  return withLock(() => {
    const entries = readRegistryRaw();
    const clean = cleanStaleEntries(entries);
    if (clean.length !== entries.length) {
      writeRegistryRaw(clean);
    }
    return clean;
  });
}

export function registerInstance(entry: RegistryEntry): void {
  withLock(() => {
    const entries = cleanStaleEntries(readRegistryRaw());
    // Remove any existing entry for same PID (shouldn't happen, but be safe)
    const filtered = entries.filter((e) => e.pid !== entry.pid);
    filtered.push(entry);
    writeRegistryRaw(filtered);
  });
}

export function deregisterInstance(pid: number): void {
  withLock(() => {
    const entries = readRegistryRaw();
    const filtered = entries.filter((e) => e.pid !== pid);
    writeRegistryRaw(filtered);
  });
}

export function findInstanceForRepo(repoHash: string): RegistryEntry | null {
  const entries = readRegistry();
  const match = entries.find((e) => e.repoHash === repoHash);
  if (!match) {
    return null;
  }
  return match;
}

export function findAvailablePort(): number {
  const entries = readRegistry();
  const usedPorts = new Set(entries.map((e) => e.port));
  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const candidate = BASE_PORT + i;
    if (!usedPorts.has(candidate)) {
      return candidate;
    }
  }
  // Fall back to letting the OS assign
  return 0;
}
