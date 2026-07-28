import type { StoryExtract } from './extract-story.js';

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /gho_[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
];

export type SecurityCheckResult = {
  ok: boolean;
  issues: string[];
};

export function securityCheck(sourceMarkdown: string, extract: StoryExtract): SecurityCheckResult {
  const issues: string[] = [];
  const extractText = extract.blocks.map((b) => b.text).join('\n');

  for (const pattern of SECRET_PATTERNS) {
    const match = extractText.match(pattern);
    if (match && !sourceMarkdown.includes(match[0])) {
      issues.push(`Unexpected secret-like content in Medium not present in DEV.to source`);
    }
  }

  const linkPattern = /https?:\/\/[^\s)]+/g;
  const extractLinks = new Set(extractText.match(linkPattern) ?? []);
  const sourceLinks = new Set(sourceMarkdown.match(linkPattern) ?? []);

  for (const link of extractLinks) {
    if (!sourceLinks.has(link) && /bit\.ly|tinyurl|t\.co/i.test(link)) {
      issues.push(`Unexpected short link in Medium: ${link}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
