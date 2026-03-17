import { createHash } from 'crypto';
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
const renderedSkills: string[] = [];
for (const skill of skills) {
  const content = renderSkill(skill, { binary: 'diffity' });
  writeFile(join(outputDir, skill.name, 'SKILL.md'), content);
  renderedSkills.push(content);
}
console.log(`Built ${skills.length} skills to skills/`);

const skillsHash = createHash('sha256').update(renderedSkills.sort().join('')).digest('hex').slice(0, 12);
writeFile(
  join(rootDir, 'packages', 'cli', 'src', 'generated', 'skills-hash.ts'),
  `export const SKILLS_HASH = '${skillsHash}';\n`,
);
console.log(`Skills hash: ${skillsHash}`);

cleanDir(localClaudeSkillsDir);
for (const skill of skills) {
  claudeCode(skill, rootDir, { binary: 'diffity-dev', namePrefix: 'diffity-dev', slashPrefix: '/diffity-dev-', installHint: 'run `npm run dev` from the diffity repo root to link the CLI' });
}
console.log(`Synced ${skills.length} dev skills to .claude/skills/`);
