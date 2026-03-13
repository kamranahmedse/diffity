import { useState, useEffect, useCallback } from 'react';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

const LANG_MAP: Record<string, BundledLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  sql: 'sql',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  toml: 'toml',
  ini: 'ini',
  lua: 'lua',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  vue: 'vue',
  svelte: 'svelte',
  php: 'php',
  r: 'r',
  scss: 'scss',
  less: 'less',
};

function getLang(filePath: string): BundledLanguage | null {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';

  if (fileName === 'dockerfile') {
    return 'dockerfile';
  }
  if (fileName === 'makefile') {
    return 'makefile';
  }

  return LANG_MAP[ext] || null;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'css', 'html',
        'markdown', 'python', 'bash', 'yaml'],
    });
  }
  return highlighterPromise;
}

export interface HighlightedTokens {
  tokens: { text: string; color?: string }[];
}

export function useHighlighter() {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    getHighlighter().then(setHighlighter);
  }, []);

  const highlight = useCallback((code: string, filePath: string, theme: 'light' | 'dark'): HighlightedTokens[] | null => {
    if (!highlighter) {
      return null;
    }

    const lang = getLang(filePath);
    if (!lang) {
      return null;
    }

    const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light';

    try {
      if (!highlighter.getLoadedLanguages().includes(lang)) {
        return null;
      }

      const result = highlighter.codeToTokens(code, {
        lang,
        theme: shikiTheme,
      });

      return result.tokens.map(line => ({
        tokens: line.map(token => ({
          text: token.content,
          color: token.color,
        })),
      }));
    } catch {
      return null;
    }
  }, [highlighter]);

  return { highlight, ready: highlighter !== null };
}
