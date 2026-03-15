import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readSkills, cleanDir } from './lib/utils.js';
import { claudeCode, cursor, codex } from './lib/transformers/index.js';
import type { Skill, TransformOptions } from './lib/utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourceDir = join(rootDir, 'packages', 'skills');
const outputDir = join(rootDir, 'dist', 'skills');
const localClaudeSkillsDir = join(rootDir, '.claude', 'skills');

const transformers: { name: string; fn: (skill: Skill, outputDir: string, options: TransformOptions) => void }[] = [
  { name: 'claude-code', fn: claudeCode },
  { name: 'cursor', fn: cursor },
  { name: 'codex', fn: codex },
];

const skills = readSkills(sourceDir);
console.log(`Found ${skills.length} skills`);

cleanDir(outputDir);

for (const transformer of transformers) {
  const providerDir = join(outputDir, transformer.name);
  for (const skill of skills) {
    transformer.fn(skill, providerDir, { binary: 'diffity' });
  }
  console.log(`Built ${skills.length} skills for ${transformer.name}`);
}

cleanDir(localClaudeSkillsDir);
for (const skill of skills) {
  claudeCode(skill, rootDir, { binary: 'diffity-dev', namePrefix: 'diffity-dev' });
}
console.log(`Synced ${skills.length} dev skills to .claude/skills/`);
