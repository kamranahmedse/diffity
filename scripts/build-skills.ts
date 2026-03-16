import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readSkills, renderSkill, writeFile, cleanDir } from './lib/utils.js';
import { claudeCode } from './lib/transformers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sourceDir = join(rootDir, 'packages', 'skills');
const outputDir = join(rootDir, 'skills');
const localClaudeSkillsDir = join(rootDir, '.claude', 'skills');

const skills = readSkills(sourceDir);
console.log(`Found ${skills.length} skills`);

cleanDir(outputDir);
for (const skill of skills) {
  const content = renderSkill(skill, { binary: 'diffity' });
  writeFile(join(outputDir, skill.name, 'SKILL.md'), content);
}
console.log(`Built ${skills.length} skills to skills/`);

cleanDir(localClaudeSkillsDir);
for (const skill of skills) {
  claudeCode(skill, rootDir, { binary: 'diffity-dev', namePrefix: 'diffity-dev', slashPrefix: '/diffity-dev-', installHint: 'run `npm run dev` from the diffity repo root to link the CLI' });
}
console.log(`Synced ${skills.length} dev skills to .claude/skills/`);
