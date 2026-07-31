export const LINKEDIN_URLS = {
  feed: 'https://www.linkedin.com/feed/',
  newArticle: 'https://www.linkedin.com/article/new/',
  drafts: 'https://www.linkedin.com/article/manage/drafts',
  login: 'https://www.linkedin.com/login',
} as const;

export const LOGIN_PATTERNS = [
  /linkedin\.com\/login/i,
  /linkedin\.com\/uas\/login/i,
  /linkedin\.com\/checkpoint/i,
] as const;

export const SELECTORS = {
  title: [
    'input[placeholder*="Title" i]',
    'textarea[placeholder*="Title" i]',
    '[data-placeholder*="Title" i]',
    '.article-editor-title',
    'h1[contenteditable="true"]',
  ],
  editor: [
    '.article-editor-content [contenteditable="true"]',
    '.ql-editor',
    '[role="textbox"][contenteditable="true"]',
    '.article-editor-content',
  ],
  coverButton: [
    'button:has-text("Add a cover image")',
    'button:has-text("cover image")',
    '[aria-label*="cover" i]',
    '.article-editor-cover-image button',
  ],
  coverInput: [
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ],
  savedIndicator: [
    'text=Saved',
    'text=Draft saved',
    '[aria-label*="Saved" i]',
  ],
  publishButton: [
    'button:has-text("Publish")',
    'button:has-text("Next")',
  ],
} as const;
