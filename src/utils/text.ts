/**
 * Text clean-up shared by the DOM scraper and the prompt builder.
 *
 * LinkedIn's rendered text arrives with markdown-ish mention syntax, zero-width
 * characters, "see more" tails and the occasional UI string scraped along with
 * the post. All of that used to be forwarded to the model, which is a big part
 * of why replies came back vague or unrelated to the post.
 */

const ZERO_WIDTH = /[\u200b\u200c\u200d\ufeff]/g;
const MARKDOWN_LINK = /\[([^\]]+)\]\((?:https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /https?:\/\/\S+/g;
const BOLD_MARKERS = /\*\*([^*]+)\*\*/g;
const SEE_MORE_TAIL = /\s*(?:…|\.\.\.)?\s*see more\s*/gi;

/** UI strings that get scraped along with a post and poison the context. */
const UI_NOISE = [
  /your request is being generated[^.!?]*[.!?]?/gi,
  /we appreciate your patience[.!]?/gi,
  /\bmost relevant\b/gi,
  /\bload more comments\b/gi,
  /\blike\s+comment\s+share\b/gi,
  /\bshow more\b/gi,
  // Our own injected UI: without this the model sees "Generating..." and
  // "AI Reply" in the context and replies to the placeholder instead of the post.
  /\bgenerating\s*\.{0,3}/gi,
  /\bAI (?:Reply|Note|Draft|Greeting|Generated Reply)\b/g,
  /\bRegenerate\b/g,
  /Usage: \d+\/\d+/g,
];

/**
 * Normalises scraped LinkedIn text into something worth sending to a model.
 */
export function cleanupText(raw: string): string {
  if (!raw) return "";

  let text = raw
    .replace(ZERO_WIDTH, " ")
    .replace(MARKDOWN_LINK, "$1")
    .replace(BOLD_MARKERS, "$1")
    .replace(BARE_URL, " ")
    .replace(SEE_MORE_TAIL, " ");

  UI_NOISE.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  return text.replace(/\s+/g, " ").trim();
}

/**
 * Collapses whitespace and caps length.
 */
export function truncate(text: string, maxLength: number): string {
  const cleaned = cleanupText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim();
}

/**
 * True when the text reads like a piece of news worth congratulating someone on
 * (new job, promotion, anniversary, graduation...).
 */
const NEWS_HINTS =
  /new position|new role|new job|new chapter|starting a new|started a new|joined .{0,40}\bas\b|promotion|promoted to|work anniversary|happy birthday|graduat|new company|excited to share|happy to share|thrilled to share|proud to share|delighted to share/i;

export function looksLikeNews(text: string): boolean {
  return NEWS_HINTS.test(text);
}

/**
 * Words that show up in LinkedIn chrome and would make a wrapper's text look
 * like content when it is really just buttons and labels.
 */
const UI_WORDS = new Set([
  "like", "likes", "comment", "comments", "share", "shares", "repost", "send",
  "reply", "follow", "following", "connect", "message", "more", "see", "show",
  "add", "edit", "delete", "copy", "report", "save", "cancel", "post", "posted",
  "promoted", "suggested", "sponsored", "hide", "translate", "view", "open",
  "close", "load", "loading", "previous", "next", "menu", "home", "search",
  "notifications", "jobs", "network", "messaging", "premium", "subscribe",
  "subscribe", "unsubscribe", "newsletter", "followers", "connections",
  "invite", "accept", "ignore", "pending", "withdraw", "verified", "edited",
  "reply", "react", "reactions", "commenting", "everyone", "anyone",
]);

/**
 * True when text looks like real prose rather than a pile of UI labels.
 */
export function looksLikeContent(text: string, minLength = 25): boolean {
  if (!text || text.length < minLength) return false;

  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  if (words.length < 4) return false;

  const uiWords = words.filter((word) => UI_WORDS.has(word.toLowerCase()));
  if (uiWords.length / words.length > 0.6) return false;

  const substantial = words.filter((word) => word.length >= 4);
  return substantial.length >= 3;
}
