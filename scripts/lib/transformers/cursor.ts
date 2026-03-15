import { join } from 'path';
import matter from 'gray-matter';
import { writeFile, type Skill, type TransformOptions } from '../utils.js';

export function transform(skill: Skill, outputDir: string, options: TransformOptions): void {
  const body = skill.content.replaceAll('{{binary}}', options.binary);
  const data = {
    name: skill.data.name,
    description: skill.data.description,
  };
  if (options.namePrefix) {
    data.name = data.name.replace('diffity-', `${options.namePrefix}-`);
  }
  const content = matter.stringify(body, data);
  const outputPath = join(outputDir, '.cursor', 'skills', skill.name, 'SKILL.md');
  writeFile(outputPath, content);
}
