import {
  ComposerContext,
  ComposerInfo,
  ComposerSurface,
} from "../types/index.js";
import { SELECTORS, extractPostData, findPostText } from "./dom.js";
import {
  insertIntoContentEditable,
  insertTextIntoFormControl,
} from "./typing.js";
import { looksLikeContent, truncate } from "./text.js";

/**
 * LinkedIn text boxes we can attach to.
 *
 * Instead of hard-coding one surface (comment boxes), we scan every editable
 * element on the page and classify it. That makes the assistant work in the
 * feed, in messaging, in connection-request notes, and in any other composer
 * LinkedIn happens to render.
 */
const EDITABLE_SELECTOR = [
  "div[contenteditable='true']",
  "div[contenteditable='']",
  "[role='textbox'][contenteditable='true']",
  "textarea",
].join(",");

/** Selectors that identify a surface, most specific first. */
export const SURFACE_SELECTORS: Record<
  Exclude<ComposerSurface, "generic" | "greeting">,
  string[]
> = {
  message: [
    ".msg-form__contenteditable",
    ".msg-form__msg-content-container",
    ".msg-overlay-conversation-bubble",
    "[class*='msg-form'] [contenteditable='true']",
    "[class*='msg-form__']",
  ],
  invite: [
    "textarea#custom-message",
    ".connect-button-send-invite__custom-message",
    ".send-invite__custom-message",
    "textarea[name='message']",
    "[class*='send-invite'] textarea",
  ],
  comment: [
    ".comments-comment-box",
    ".comments-comment-texteditor",
    ".comments-comment-box__form",
    "[class*='comments-comment'] [contenteditable='true']",
    "[class*='comment'] [contenteditable='true']",
    "[class*='comment-box']",
    "[class*='reader-comment']",
    "[class*='comment-texteditor']",
  ],
  post: [
    ".share-creation-state__text-editor",
    ".share-box-feed-entry__closed-share-box",
    "[class*='share-creation-state'] [contenteditable='true']",
    "[class*='article-editor'] [contenteditable='true']",
  ],
};

/** Containers we never want to touch (navigation, search, profile edit forms). */
const EXCLUDED_ANCESTORS = [
  "[class*='global-nav']",
  "[class*='search']",
  "[class*='typeahead']",
  "[class*='onboarding']",
  "[class*='profile-edit']",
  "[class*='edit-form']",
  "[class*='people-search']",
  ".ai-reply-modal-container",
];

const SURFACE_LABELS: Record<ComposerSurface, string> = {
  comment: "AI Reply",
  message: "AI Reply",
  invite: "AI Note",
  greeting: "AI Greeting",
  post: "AI Draft",
  generic: "AI Reply",
};

/**
 * "Catch up" opens a modal for birthdays, work anniversaries, new jobs and
 * education updates. The composer there looks like a generic text box, so we
 * recognise the occasion from the surrounding text instead.
 */
const GREETING_HINTS =
  /happy birthday|birthday|work anniversary|anniversary|congratulat|say congrats|new job|new position|new role|started a new|new company|promotion|promoted|celebrat|new school|education|graduat|joined .{0,40} as /i;

/** LinkedIn's own character cap for connection-request notes. */
export const INVITE_CHAR_LIMIT = 300;

/**
 * Returns the character budget for a surface.
 */
export function getSurfaceLimit(
  surface: ComposerSurface,
  configuredMaxLength: number
): number {
  if (surface === "invite") {
    return Math.min(configuredMaxLength, INVITE_CHAR_LIMIT);
  }
  return configuredMaxLength;
}

/**
 * Reads the current text of an editable element.
 */
export function getEditableText(element: HTMLElement): string {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    return element.value || "";
  }
  return element.innerText || element.textContent || "";
}

function cleanText(text: string | undefined | null, maxLength = 4000): string {
  if (!text) return "";
  // Shares the noise filter with the prompt builder, so our own button labels
  // ("AI Reply", "Generating...") never become the model's context.
  return truncate(text, maxLength);
}

/**
 * Text the user has selected on the page. Last-resort context for composers we
 * cannot read reliably: select the post text, press the shortcut, done.
 */
export function getSelectionText(maxLength = 2000): string {
  try {
    const selection = window.getSelection();
    return cleanText(selection ? selection.toString() : "", maxLength);
  } catch {
    return "";
  }
}

/**
 * Walks up from an element until it finds a block with real text.
 *
 * Composer wrappers often contain nothing but the (empty) editor and our own
 * button, so reading just the immediate container used to come back empty and
 * block generation entirely.
 */
export function collectNearbyText(
  element: HTMLElement,
  minChars = 40,
  maxLevels = 6,
  includePageFallback = false
): string {
  let node = element.parentElement;
  let fallback = "";

  for (let level = 0; level < maxLevels && node && node !== document.body; level++) {
    const text = cleanText(getEditableText(node), 2500);
    if (text.length >= minChars) return text;
    if (text.length > fallback.length) fallback = text;
    node = node.parentElement;
  }

  if (fallback.length > 0) return fallback;

  // Page-wide text is only used when the caller explicitly asks for it: the
  // whole feed is not a useful thing to reply to.
  if (!includePageFallback) return "";

  const main = document.querySelector<HTMLElement>("main") || document.body;
  return cleanText(getEditableText(main), 1200);
}

/**
 * Decides which surface an editable element belongs to.
 */
export function classifySurface(element: HTMLElement): ComposerSurface {
  // Order matters: post editors also render a Quill `.ql-editor`, so the
  // share/post selectors have to win before the comment fallbacks.
  for (const surface of ["message", "invite", "post", "comment"] as const) {
    const selectors = SURFACE_SELECTORS[surface];
    const matches = selectors.some((selector) => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
    if (matches) return surface;
  }

  // Class names change often; the aria-label / placeholder rarely does.
  const byAttribute = classifyByAttributes(element);
  if (byAttribute) return byAttribute;

  if (looksLikeGreeting(element)) return "greeting";

  return "generic";
}

/**
 * Reads the intent out of labels LinkedIn puts on the field or its dialog.
 */
function classifyByAttributes(element: HTMLElement): ComposerSurface | null {
  const dialog = element.closest<HTMLElement>(".artdeco-modal, [role='dialog']");
  const heading = dialog?.querySelector<HTMLElement>("h1, h2, h3, h4");

  const hint = [
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("data-placeholder"),
    dialog?.getAttribute("aria-label"),
    heading ? getEditableText(heading) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!hint.trim()) return null;

  if (/add a note|invitation|invite|connect with/.test(hint)) return "invite";
  if (/say congrats|congratulat|birthday|anniversary/.test(hint)) return "greeting";
  if (/comment|reply to/.test(hint)) return "comment";
  if (/message|inmail|chat|write a message/.test(hint)) return "message";
  if (/start a post|create a post|what do you want to talk about|share your/.test(hint)) {
    return "post";
  }

  return null;
}

/**
 * "Catch up" cards (birthdays, work anniversaries, new jobs, education) open a
 * modal whose composer looks like any other text box. The occasion is only
 * visible in the surrounding copy, so we sniff the nearest dialog/card text.
 */
function looksLikeGreeting(element: HTMLElement): boolean {
  const scope =
    element.closest<HTMLElement>(
      ".artdeco-modal, [role='dialog'], [class*='catch-up'], [class*='congrat']"
    ) ||
    element.closest<HTMLElement>("form") ||
    element.parentElement;

  if (!scope) return false;

  const text = cleanText(getEditableText(scope), 600);
  return text.length > 0 && GREETING_HINTS.test(text);
}

/**
 * How permissive the check should be.
 *
 * "auto"  - used when we inject buttons into everything on the page, so we skip
 *           navigation, search and form fields to avoid littering the UI.
 * "focus" - used when the user explicitly focused a text box or pressed the
 *           shortcut, so anything editable is fair game.
 */
type EligibilityMode = "auto" | "focus";

/**
 * True when the element is a text box the user could reasonably want help with.
 */
function isEligibleEditable(
  element: HTMLElement,
  mode: EligibilityMode = "auto"
): boolean {
  // Our own UI lives in the DOM too - skip it.
  if (element.closest(".ai-reply-modal-container")) return false;

  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) return false;

    // Never auto-inject into inputs (search, filters, form fields), but allow
    // them when the user explicitly asked for help in one.
    if (mode === "auto") return false;

    const type = (element.getAttribute("type") || "text").toLowerCase();
    if (type && type !== "text" && type !== "search") return false;
  }
  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) return false;
  } else if (
    !(element instanceof HTMLInputElement) &&
    element.getAttribute("contenteditable") !== "true"
  ) {
    return false;
  }

  // Ignore boxes that are not rendered or far too small to be a composer.
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  if (mode === "focus") return true;

  const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
  const placeholder = (
    element.getAttribute("placeholder") ||
    element.getAttribute("data-placeholder") ||
    ""
  ).toLowerCase();
  if (/search|filter|type to|find /.test(`${ariaLabel} ${placeholder}`)) {
    return false;
  }

  for (const selector of EXCLUDED_ANCESTORS) {
    try {
      if (element.closest(selector)) return false;
    } catch {
      // Ignore invalid selector for this browser.
    }
  }

  return true;
}

/**
 * Finds the wrapper we inject into and de-duplicate against.
 */
function findContainer(
  element: HTMLElement,
  surface: ComposerSurface
): HTMLElement {
  const containerSelectors: Record<ComposerSurface, string[]> = {
    comment: [
      ".comments-comment-box__form",
      ".comments-comment-box",
      ".comments-comment-texteditor",
    ],
    message: ["[class*='msg-form']", ".msg-overlay-conversation-bubble"],
    invite: [
      ".connect-button-send-invite",
      "[class*='send-invite']",
      ".artdeco-modal",
    ],
    greeting: [
      ".artdeco-modal",
      "[role='dialog']",
      "[class*='catch-up']",
      "[class*='congrat']",
    ],
    post: ["[class*='share-creation-state']", ".share-box-feed-entry__closed-share-box"],
    generic: ["form", ".artdeco-modal", "[class*='editor']"],
  };

  for (const selector of containerSelectors[surface]) {
    const match = element.closest<HTMLElement>(selector);
    // Never treat the editable itself as its own container - the button would
    // be injected into the text the user is typing.
    if (match && match !== element) return match;
  }

  return element.parentElement || element;
}

/**
 * Finds every composer worth attaching to on the page.
 */
export function findComposers(): ComposerInfo[] {
  const editables = Array.from(
    document.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)
  );

  const composers: ComposerInfo[] = [];
  const seen = new Set<HTMLElement>();

  for (const element of editables) {
    if (seen.has(element) || !isEligibleEditable(element)) continue;

    // LinkedIn nests contenteditable wrappers; keep the innermost one.
    if (element.querySelector(EDITABLE_SELECTOR)) continue;

    seen.add(element);

    const surface = classifySurface(element);
    composers.push({
      element,
      container: findContainer(element, surface),
      surface,
      label: SURFACE_LABELS[surface],
    });
  }

  return composers;
}

/**
 * Compact summary of what the scanner saw, logged so a missing button can be
 * diagnosed from the page console.
 */
export function describeEditables(): string {
  const editables = Array.from(
    document.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)
  );

  let accepted = 0;
  const skipped: Record<string, number> = {};

  const note = (reason: string) => {
    skipped[reason] = (skipped[reason] || 0) + 1;
  };

  for (const element of editables) {
    if (element.closest(".ai-reply-modal-container")) {
      note("our-ui");
    } else if (element instanceof HTMLInputElement) {
      note("input");
    } else if (isEligibleEditable(element)) {
      if (element.querySelector(EDITABLE_SELECTOR)) {
        note("wrapper");
      } else {
        accepted++;
      }
    } else {
      note("filtered");
    }
  }

  const skippedText = Object.entries(skipped)
    .map(([reason, count]) => `${reason}:${count}`)
    .join(", ");

  return `editables seen: ${editables.length}, accepted: ${accepted}${
    skippedText ? `, skipped (${skippedText})` : ""
  }`;
}

/**
 * Where the inline button goes inside a container.
 */
export function findComposerToolbar(container: HTMLElement): HTMLElement {
  const toolbarSelectors = [
    ".comments-comment-box__toolbar",
    ".comments-comment-box-comment__text-editor-actions",
    ".msg-form__footer",
    "[class*='share-creation-state__footer']",
    ".artdeco-modal__actionbar",
  ];

  for (const selector of toolbarSelectors) {
    const toolbar = container.querySelector<HTMLElement>(selector);
    if (toolbar) return toolbar;
  }

  return container;
}

/**
 * The text box that currently has focus, if it is one we support.
 */
export function getFocusedComposer(): ComposerInfo | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return null;

  if (!isEligibleEditable(active, "focus")) {
    // Sometimes focus sits on a wrapper around the real editable.
    const nested = active.querySelector<HTMLElement>(EDITABLE_SELECTOR);
    if (!nested || !isEligibleEditable(nested, "focus")) return null;
    return composerFromElement(nested);
  }

  return composerFromElement(active);
}

/**
 * Builds composer metadata for an editable element we already know about.
 */
export function composerFromElement(element: HTMLElement): ComposerInfo {
  const surface = classifySurface(element);
  return {
    element,
    container: findContainer(element, surface),
    surface,
    label: SURFACE_LABELS[surface],
  };
}

/**
 * Comment areas exist on the feed before the editor does - LinkedIn only
 * creates the contenteditable once the user starts a comment. These containers
 * are therefore a separate injection target from `findComposers()`.
 */
export function findCommentContainers(): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        ".comments-comment-box",
        ".comments-comment-box__form",
        ".comments-comment-texteditor",
        "[class*='comment-box']",
        "[class*='comment-texteditor']",
        "[class*='reader-comment']",
        "[class*='comment-section']",
      ].join(",")
    )
  );

  const containers: HTMLElement[] = [];

  for (const node of nodes) {
    // The "Add a comment" control also has "comment-box" in its class name, but
    // it is a button, not a container - never inject inside it.
    if (node.matches("button, [role='button'], a")) continue;
    if (node.closest(".ai-reply-modal-container")) continue;

    // Prefer the outermost comment box so we inject once per post.
    const outer = node.closest<HTMLElement>(".comments-comment-box") || node;
    if (!containers.includes(outer)) containers.push(outer);
  }

  return containers;
}

/**
 * Any "Add a comment" control on the page. Newsletters and article pages render
 * comment areas with different class names than the feed, so we locate the
 * control by what it says rather than by where it lives.
 */
export function findCommentTriggers(): HTMLElement[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, [role='button'], [class*='comment-box__trigger']"
    )
  );

  return nodes.filter((node) => {
    if (node.closest(".ai-reply-modal-container")) return false;

    const label = `${node.getAttribute("aria-label") || ""} ${
      node.textContent || ""
    }`.trim();

    if (!/add a comment|write a comment|comment on this|join the conversation/i.test(label)) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  });
}

/**
 * The block a comment trigger belongs to, used as an injection target.
 */
export function commentContainerFor(trigger: HTMLElement): HTMLElement {
  let node = trigger.parentElement;

  while (node && node !== document.body) {
    const isCommentArea =
      node.matches(
        "[class*='comment-box'], [class*='comment'], [class*='social-details'], form, section, .artdeco-card"
      );

    if (isCommentArea) return node;
    node = node.parentElement;
  }

  return trigger.parentElement || trigger;
}

/**
 * Finds the editor inside a comment container, if it is already open.
 */
export function findComposerInContainer(
  container: HTMLElement
): ComposerInfo | null {
  const editable = container.querySelector<HTMLElement>(EDITABLE_SELECTOR);
  if (editable && isEligibleEditable(editable, "focus")) {
    return composerFromElement(editable);
  }
  return null;
}

/**
 * Opens a collapsed comment editor (by clicking "Add a comment") and returns it
 * once LinkedIn has rendered the editable. LinkedIn usually swaps the collapsed
 * box for a new node, so we re-query by post container instead of reusing the
 * old element.
 */
export async function openCommentEditor(
  container: HTMLElement,
  timeout = 2500
): Promise<ComposerInfo | null> {
  const existing = findComposerInContainer(container);
  if (existing) return existing;

  const postContainer =
    container.closest<HTMLElement>(SELECTORS.postContainer) ||
    container.parentElement;

  findCommentTrigger(container)?.click();

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await sleep(100);

    for (const scope of [container, postContainer]) {
      if (!scope) continue;
      const composer = findComposerInContainer(scope);
      if (composer) return composer;
    }
  }

  console.warn("[Composers] Comment editor did not open in time");
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Finds the "Add a comment" control without accidentally clicking an editor
 * toolbar button (emoji picker, image upload, ...).
 */
function findCommentTrigger(container: HTMLElement): HTMLElement | null {
  const direct = container.querySelector<HTMLElement>(
    [
      "button.comments-comment-box__trigger",
      ".comments-comment-box__trigger",
      ".comments-comment-box__comment-box-placeholder",
      "button[aria-label*='Add a comment' i]",
      "button[aria-label*='Comment' i]",
    ].join(",")
  );

  if (direct) return direct;

  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>("button, [role='button']")
  );

  return (
    candidates.find((candidate) =>
      /add a comment|comment/i.test(
        `${candidate.getAttribute("aria-label") || ""} ${
          candidate.textContent || ""
        }`
      )
    ) || null
  );
}

/**
 * Pulls the conversation text out of a messaging thread.
 */
function extractMessageThread(element: HTMLElement): {
  contextText: string;
  recipientName?: string;
} {
  const root =
    element.closest<HTMLElement>(
      "[class*='msg-overlay-conversation-bubble'], .msg-thread, [class*='msg-conversations-container__convo-item'], [class*='msg-conversation'], [class*='msg-s-message-list']"
    ) ||
    element.closest<HTMLElement>("[class*='msg-form']")?.parentElement ||
    element.parentElement;

  if (!root) return { contextText: "" };

  // LinkedIn has used a few different body classes for messages over time.
  const bodies = Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        ".msg-s-event-listitem__body",
        "[class*='msg-s-event-listitem__body']",
        "[class*='event-listitem__body']",
        ".msg-s-message-list__event .msg-s-event-listitem",
        "[class*='msg-s-event-listitem'] [class*='message-bubble']",
        "[class*='msg-s-message-group__message']",
      ].join(", ")
    )
  )
    .map((node) => cleanText(getEditableText(node), 800))
    .filter((text) => text.length > 0);

  // Only the tail of the conversation matters for a reply.
  let contextText = bodies.slice(-6).join("\n---\n");

  const nameSelectors = [
    ".msg-overlay-bubble-header__title",
    ".msg-thread__link-to-profile .artdeco-entity-lockup__title",
    ".msg-entity-lockup__entity-title",
    ".artdeco-entity-lockup__title",
    "[class*='msg-overlay-bubble-header'] h2",
    "[class*='msg-conversations-container__title']",
    "[class*='msg-thread__link-to-profile']",
  ];
  let recipientName: string | undefined;
  for (const selector of nameSelectors) {
    const node = root.querySelector<HTMLElement>(selector);
    const name = cleanText(node ? getEditableText(node) : "", 80);
    if (name) {
      recipientName = name;
      break;
    }
  }

  // Last resort: the conversation pane itself always has readable text.
  if (!contextText) {
    contextText = cleanText(getEditableText(root), 1500);
  }

  return { contextText, recipientName };
}

/**
 * Pulls the profile details shown while writing a connection note.
 */
function extractInviteContext(element: HTMLElement): {
  contextText: string;
  recipientName?: string;
} {
  const scope: HTMLElement =
    element.closest<HTMLElement>(".artdeco-modal") ||
    element.closest<HTMLElement>("form") ||
    document.body;

  const nameSelectors = [
    ".send-invite__title",
    ".artdeco-modal__header h2",
    "h1.text-heading-xlarge",
    ".pv-text-details__left-panel h1",
  ];
  const headlineSelectors = [
    ".send-invite__subtitle",
    ".artdeco-modal__header h3",
    ".text-body-medium.break-words",
    ".pv-text-details__left-panel .text-body-medium",
  ];

  const firstMatch = (selectors: string[]): string => {
    for (const selector of selectors) {
      const node = scope.querySelector<HTMLElement>(selector);
      const text = cleanText(node ? getEditableText(node) : "", 200);
      if (text) return text;
    }
    return "";
  };

  const recipientName = firstMatch(nameSelectors);
  const headline = firstMatch(headlineSelectors);

  let contextText = cleanText(
    [recipientName, headline].filter(Boolean).join(" - "),
    400
  );

  // The specific selectors change between profile, search and "My Network"
  // surfaces, so fall back to the dialog copy: it always carries the name and
  // the "Add a note to your invitation" wording.
  if (!contextText) {
    contextText = cleanText(getEditableText(scope), 400);
  }

  return { contextText, recipientName: recipientName || undefined };
}

/**
 * Gathers the context needed to generate a good reply for a composer.
 */
export function getComposerContext(composer: ComposerInfo): ComposerContext {
  const { element, container, surface } = composer;
  const draft = cleanText(getEditableText(element), 1500);

  if (surface === "invite") {
    const { contextText, recipientName } = extractInviteContext(element);
    const fallback = contextText || draft || getSelectionText(600);
    if (!fallback) {
      return {
        contextText: "",
        surface,
        mode: "compose",
        error:
          "Could not read this profile or dialog. Select the person's name and headline, then generate again.",
      };
    }
    return {
      contextText: fallback,
      surface,
      mode: "compose",
      recipientName,
      draft: draft || undefined,
    };
  }

  if (surface === "message") {
    const { contextText, recipientName } = extractMessageThread(element);
    const selection = contextText ? "" : getSelectionText(1500);

    if (!contextText && !recipientName && !selection && !draft) {
      return {
        contextText: "",
        surface,
        mode: "compose",
        error:
          "Could not read this conversation. Open the thread (or select the message you are replying to) and try again.",
      };
    }
    return {
      contextText: contextText || selection || draft,
      surface,
      mode: contextText || draft ? "reply" : "compose",
      recipientName,
      draft: draft || undefined,
    };
  }

  if (surface === "post") {
    if (!draft) {
      return {
        contextText: "",
        surface,
        mode: "compose",
        error:
          "Type a topic or a few notes in the post box, then generate a draft.",
      };
    }
    return { contextText: draft, surface, mode: "compose", draft };
  }

  if (surface === "greeting") {
    // Birthdays, work anniversaries, new jobs, education updates: the occasion
    // and the person's name live in the surrounding card/dialog copy.
    const scope =
      element.closest<HTMLElement>(
        ".artdeco-modal, [role='dialog'], [class*='catch-up'], [class*='congrat']"
      ) || container;
    const contextText = cleanText(getEditableText(scope), 600) || draft;
    const fallback = contextText || getSelectionText(600);

    return {
      contextText: fallback,
      surface,
      mode: "compose",
      draft: draft || undefined,
      error: fallback
        ? undefined
        : "Could not read the card. Select the card text, then generate again.",
    };
  }

  if (surface === "comment") {
    const postData = extractPostData(element);
    const selection = getSelectionText();

    // Order: the post itself, then whatever the user selected, then a prose
    // block found by walking up from the comment box. UI chrome is rejected
    // rather than sent to the model.
    const discovered = postData.postText
      ? { text: postData.postText, source: "post container" }
      : findPostText(element);

    const nearby = discovered.text
      ? discovered.text
      : collectNearbyText(element, 40);

    const contextText =
      (looksLikeContent(nearby) ? nearby : "") ||
      (looksLikeContent(selection) ? selection : "");

    console.log(
      `[Composers] Comment context: ${contextText.length} chars (source: ${
        discovered.text
          ? discovered.source
          : nearby === contextText
          ? "nearby block"
          : contextText
          ? "page selection"
          : "none"
      })`
    );

    return {
      contextText,
      surface,
      mode: "reply",
      authorName: postData.authorName ? cleanText(postData.authorName, 120) : undefined,
      draft: draft || undefined,
      error: contextText
        ? undefined
        : "Could not read the post text. Select the text of the post (or the comment you are replying to), then press Alt+G.",
    };
  }

  // Generic surface: prefer whatever the user already typed, then the nearest
  // block with real text, then whatever they selected on the page.
  const selection = getSelectionText();
  const surrounding = collectNearbyText(element);
  const contextText =
    draft || (selection.length >= 20 ? selection : "") || surrounding;

  console.log(
    `[Composers] Generic composer context - draft: ${draft.length}, selection: ${selection.length}, nearby: ${surrounding.length}`
  );

  return {
    contextText,
    surface: "generic",
    mode: draft ? "compose" : "reply",
    draft: draft || undefined,
    error: contextText
      ? undefined
      : "Could not read any text near this box. Select the text you want answered, or type a few words, then generate again.",
  };
}

/**
 * Inserts generated text into any supported composer.
 */
export async function insertTextIntoComposer(
  element: HTMLElement,
  text: string,
  useTypingSimulation: boolean
): Promise<boolean> {
  try {
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement
    ) {
      return insertTextIntoFormControl(element, text);
    }

    return await insertIntoContentEditable(element, text, {
      minDelay: 8,
      maxDelay: 22,
      initialDelay: 120,
      maxDuration: 4000,
      simulate: useTypingSimulation,
    });
  } catch (error) {
    console.error("[Composers] Error inserting text:", error);
    return false;
  }
}

/**
 * Checks whether the assistant already injected a button for this composer.
 */
export function hasButtonInjected(container: HTMLElement): boolean {
  // The floating quick button lives on <body>, so it must not count as an
  // already-injected button for whatever page section we are inspecting.
  return container.querySelector(".ai-reply-btn:not(.ai-reply-float-btn)") !== null;
}
