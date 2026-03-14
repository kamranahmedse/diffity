const SUGGESTION_REGEX = /```suggestion\n([\s\S]*?)```/;

export interface ParsedSuggestion {
  before: string;
  suggestion: string;
  after: string;
}

export function parseSuggestion(body: string): ParsedSuggestion | null {
  const match = body.match(SUGGESTION_REGEX);
  if (!match) return null;
  return {
    before: body.slice(0, match.index!).trim(),
    suggestion: match[1].replace(/\n$/, ''),
    after: body.slice(match.index! + match[0].length).trim(),
  };
}

export function hasSuggestion(body: string): boolean {
  return SUGGESTION_REGEX.test(body);
}
