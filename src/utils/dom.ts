import { LinkedInSelectors, PostData } from "../types/index.js";
import { cleanupText, looksLikeContent } from "./text.js";

/**
 * LinkedIn DOM selectors
 * Note: These may need updates if LinkedIn changes their DOM structure
 */
export const SELECTORS: LinkedInSelectors = {
  postContainer:
    "div.feed-shared-update-v2, [data-urn*='urn:li:activity'], [data-urn*='urn:li:share'], [class*='update-components-update-v2'], [class*='feed-shared-update'], [class*='main-feed-activity-card'], [role='article'], article",
  commentBox: ".comments-comment-box__form, .comments-comment-box",
  commentTextarea: ".ql-editor[contenteditable='true']",
  // LinkedIn has moved the post body around over the years, so we try the
  // modern containers first and fall back to the older class names.
  postContent: [
    "[data-test-id='main-feed-activity-card__commentary']",
    ".update-components-update-v2__commentary",
    "[class*='update-components-text']",
    "[class*='attributed-text-segment-list']",
    ".feed-shared-update-v2__description",
    ".feed-shared-inline-show-more-text",
    ".feed-shared-text",
    "[class*='commentary']",
  ].join(", "),
  authorName:
    ".update-components-actor__name, .update-components-actor__title, .update-components-actor__title span, .feed-shared-actor__name",
  postDate:
    ".update-components-actor__sub-description, .feed-shared-actor__sub-description",
};

/**
 * Finds all comment boxes on the current page
 */
export function findCommentBoxes(): HTMLElement[] {
  const commentBoxes = document.querySelectorAll<HTMLElement>(
    SELECTORS.commentBox
  );
  return Array.from(commentBoxes);
}

/**
 * Extracts post text from a post element
 * Traverses up the DOM to find the post container
 */
export function extractPostText(element: HTMLElement): string {
  try {
    // Find the post container by traversing up
    const postContainer = element.closest(SELECTORS.postContainer);

    if (!postContainer) {
      console.warn("[DOM] Could not find post container");
      return "";
    }

    // Find post content within the container
    const postContentElement = postContainer.querySelector<HTMLElement>(
      SELECTORS.postContent
    );

    if (!postContentElement) {
      console.warn("[DOM] Could not find post content");
      return "";
    }

    // Get text content and clean it
    const text = postContentElement.innerText || postContentElement.textContent || "";
    return cleanupText(text);
  } catch (error) {
    console.error("[DOM] Error extracting post text:", error);
    return "";
  }
}

/**
 * Extracts author name from a post element
 */
export function extractAuthorName(element: HTMLElement): string | undefined {
  try {
    const postContainer = element.closest(SELECTORS.postContainer);

    if (!postContainer) {
      return undefined;
    }

    const authorElement = postContainer.querySelector<HTMLElement>(
      SELECTORS.authorName
    );

    if (!authorElement) {
      return undefined;
    }

    const name = authorElement.innerText || authorElement.textContent || "";
    return cleanupText(name) || undefined;
  } catch (error) {
    console.error("[DOM] Error extracting author name:", error);
    return undefined;
  }
}

/**
 * Extracts post date from a post element
 */
export function extractPostDate(element: HTMLElement): string | undefined {
  try {
    const postContainer = element.closest(SELECTORS.postContainer);

    if (!postContainer) {
      return undefined;
    }

    const dateElement = postContainer.querySelector<HTMLElement>(
      SELECTORS.postDate
    );

    if (!dateElement) {
      return undefined;
    }

    const date = dateElement.innerText || dateElement.textContent || "";
    return cleanupText(date) || undefined;
  } catch (error) {
    console.error("[DOM] Error extracting post date:", error);
    return undefined;
  }
}

/**
 * Extracts all post data (text, author, date) from an element
 */
export function extractPostData(element: HTMLElement): PostData {
  return {
    postText: extractPostText(element),
    authorName: extractAuthorName(element),
    postDate: extractPostDate(element),
  };
}

/** Sections that never contain the post being replied to. */
const NON_POST_SECTIONS = [
  "[class*='comment']",
  "[class*='reply']",
  "[class*='nav']",
  "nav",
  "header",
  "footer",
  "aside",
  "[role='navigation']",
  "[role='banner']",
  ".ai-reply-modal-container",
  ".ai-reply-btn",
].join(", ");

/** Only these are examined when hunting for the post body text. */
const TEXT_BLOCK_SELECTOR = [
  "p",
  "article",
  "h1",
  "h2",
  "h3",
  "li",
  "[class*='commentary']",
  "[class*='update-components-text']",
  "[class*='attributed-text']",
  "[class*='feed-shared-text']",
  "[class*='description']",
  "span",
  "div",
].join(", ");

/**
 * Finds the post text for a composer, without depending on LinkedIn's
 * container class names being stable.
 *
 * 1. the recognised post containers
 * 2. walking up from the composer looking for a prose block that is not part of
 *    a comment thread, a navigation bar or our own UI
 */
export function findPostText(element: HTMLElement): {
  text: string;
  source: string;
} {
  // 1) Known container
  const container = element.closest<HTMLElement>(SELECTORS.postContainer);
  if (container) {
    const block = container.querySelector<HTMLElement>(SELECTORS.postContent);
    const text = cleanupText(
      (block?.innerText || block?.textContent || "").trim()
    );
    if (looksLikeContent(text)) {
      return { text, source: "post container" };
    }
  }

  // 2) Walk up and look for prose near the composer
  let node = element.parentElement;

  for (let level = 0; level < 8 && node && node !== document.body; level++) {
    let candidates: HTMLElement[];

    try {
      candidates = Array.from(
        node.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR)
      ).slice(0, 400);
    } catch {
      candidates = [];
    }

    const qualifying = candidates.filter((candidate) => {
      // Never the composer itself, its wrappers, or anything inside a
      // comment/nav section.
      if (candidate.contains(element)) return false;
      if (candidate.closest(NON_POST_SECTIONS)) return false;

      // Prefer the innermost block that already has enough text.
      const hasQualifyingChild = Array.from(candidate.children).some(
        (child) =>
          !child.contains(element) &&
          looksLikeContent(cleanupText(child.textContent || ""))
      );
      if (hasQualifyingChild) return false;

      return looksLikeContent(cleanupText(candidate.textContent || ""));
    });

    if (qualifying.length > 0) {
      // The longest block at the closest level is the best guess.
      const best = qualifying.reduce((a, b) =>
        (a.textContent || "").length >= (b.textContent || "").length ? a : b
      );

      return {
        text: cleanupText((best.textContent || "").trim()),
        source: `nearby block (level ${level + 1})`,
      };
    }

    node = node.parentElement;
  }

  return { text: "", source: "not found" };
}

/**
 * Finds the appropriate insertion point for the AI reply button
 * Looks for toolbar or action area within the comment box
 */
export function findInsertionPoint(commentBox: HTMLElement): HTMLElement {
  // Try to find existing toolbar or action area
  const toolbar = commentBox.querySelector<HTMLElement>(
    ".comments-comment-box__toolbar, .comments-comment-box-comment__text-editor-actions"
  );

  if (toolbar) {
    return toolbar;
  }

  // Try to find the form element
  const form = commentBox.querySelector<HTMLElement>("form");

  if (form) {
    return form;
  }

  // Fallback: return the comment box itself
  return commentBox;
}

/**
 * Inserts text into LinkedIn's comment box
 * LinkedIn uses a contenteditable div (Quill editor)
 */
export async function insertTextIntoCommentBox(
  commentBox: HTMLElement,
  text: string,
  useTypingSimulation: boolean = true
): Promise<boolean> {
  try {
    // Find the contenteditable textarea
    const textarea = commentBox.querySelector<HTMLElement>(
      SELECTORS.commentTextarea
    );

    if (!textarea) {
      console.error("[DOM] Could not find comment textarea");
      return false;
    }

    if (useTypingSimulation) {
      // Use typing simulation for more natural insertion
      const { simulateTyping } = await import("./typing.js");
      await simulateTyping(textarea, text, {
        minDelay: 30,
        maxDelay: 100,
        initialDelay: 200,
      });
    } else {
      // Fast insert mode
      const { fastInsert } = await import("./typing.js");
      fastInsert(textarea, text);
    }

    console.log("[DOM] Text inserted into comment box");
    return true;
  } catch (error) {
    console.error("[DOM] Error inserting text into comment box:", error);
    return false;
  }
}

/**
 * Checks if an element is visible in the viewport
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Waits for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector<HTMLElement>(selector);

    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Gets the position of an element relative to the viewport
 */
export function getElementPosition(element: HTMLElement): {
  top: number;
  left: number;
  bottom: number;
  right: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right,
  };
}

/**
 * Scrolls an element into view smoothly
 */
export function scrollToElement(element: HTMLElement): void {
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/**
 * Checks if a button has already been injected into a comment box
 */
export function hasButtonInjected(commentBox: HTMLElement): boolean {
  return commentBox.querySelector(".ai-reply-btn") !== null;
}

/**
 * Finds the closest comment box parent for a given element
 */
export function findClosestCommentBox(
  element: HTMLElement
): HTMLElement | null {
  return element.closest<HTMLElement>(SELECTORS.commentBox);
}
