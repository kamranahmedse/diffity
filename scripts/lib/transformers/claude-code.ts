import { join } from 'path';
import { renderSkill, writeFile, type Skill, type TransformOptions } from '../utils.js';

export function transform(skill: Skill, outputDir: string, options: TransformOptions): void {
  const content = renderSkill(skill, options);
  const dirName = options.namePrefix
    ? skill.name.replace('diffity-', `${options.namePrefix}-`)
    : skill.name;
  const outputPath = join(outputDir, '.claude', 'skills', dirName, 'SKILL.md');
  writeFile(outputPath, content);
}
