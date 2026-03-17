import type { Command } from 'commander';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import pc from 'picocolors';
import { readRegistry } from '../registry.js';

dayjs.extend(relativeTime);

export function registerListCommand(program: Command) {
  program
    .command('list')
    .description('List all running diffity instances')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const entries = readRegistry();

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      if (entries.length === 0) {
        console.log(pc.dim('No running diffity instances.'));
        return;
      }

      console.log('');
      console.log(
        `  ${pc.dim('PORT')}   ${pc.dim('PID'.padEnd(8))}${pc.dim('REPO'.padEnd(22))}${pc.dim('REF'.padEnd(22))}${pc.dim('STARTED')}`,
      );

      for (const entry of entries) {
        const ago = dayjs(entry.startedAt).fromNow();
        console.log(
          `  ${String(entry.port).padEnd(7)}${String(entry.pid).padEnd(8)}${entry.repoName.slice(0, 20).padEnd(22)}${entry.ref.slice(0, 20).padEnd(22)}${pc.dim(ago)}`,
        );
      }
      console.log('');
    });
}
