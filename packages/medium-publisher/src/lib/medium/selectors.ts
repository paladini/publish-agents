/** Centralized Medium UI selectors — update here when Medium changes layout. */

export const MEDIUM_URLS = {
  home: 'https://medium.com/',
  stories: 'https://medium.com/me/stories',
  import: 'https://medium.com/p/import',
  newStory: 'https://medium.com/new-story',
  signIn: 'https://medium.com/m/signin',
} as const;

/** Patterns that indicate an auth wall. */
export const LOGIN_PATTERNS = [/sign in/i, /log in/i, /create account/i, /m\/signin/i];

export const SELECTORS = {
  importUrlInput: [
    'input[type="url"]',
    'input[placeholder*="URL" i]',
    'input[placeholder*="link" i]',
    'input[name="url"]',
    'textarea[placeholder*="URL" i]',
  ],
  importButton: [
    'button:has-text("Import")',
    'button[type="submit"]',
  ],
  seeYourStory: [
    'a:has-text("See your story")',
    'button:has-text("See your story")',
  ],
  publishButton: [
    'button:has-text("Publish")',
    'button[data-testid="publishButton"]',
  ],
  publishConfirm: [
    'button:has-text("Publish now")',
    'button:has-text("Publish and send")',
  ],
  publishPreviewTitle: ['textarea[aria-label="Story preview title"]'],
  publishPreviewSubtitle: ['textarea[aria-label="Story preview subtitle"]'],
  publishTopicInput: ['input[placeholder*="topic" i]'],
  titleInput: [
    '[data-testid="editorTitleParagraph"]',
    '[data-testid="storyTitle"][contenteditable="true"]',
    'h1[contenteditable="true"]',
    'h3.graf--title',
    '[class*="graf--title"]',
    '[contenteditable="true"][data-placeholder*="Title" i]',
  ],
  editor: [
    '[data-testid="storyEditor"]',
    'div[role="textbox"]',
    '.postArticle-content',
    '[contenteditable="true"]',
  ],
  storyBody: [
    '.postArticle-content .section-inner',
    '[data-testid="storyEditor"]',
    '.postArticle-content',
    '[contenteditable="true"]',
  ],
} as const;
