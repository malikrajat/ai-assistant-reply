import { LinkedInSelectors, PostData } from "../types/index.js";

/**
 * LinkedIn DOM selectors
 * Note: These may need updates if LinkedIn changes their DOM structure
 */
export const SELECTORS: LinkedInSelectors = {
  postContainer: "div.feed-shared-update-v2",
  commentBox: ".comments-comment-box__form, .comments-comment-box",
  commentTextarea: ".ql-editor[contenteditable='true']",
  postContent:
    ".feed-shared-update-v2__description, .feed-shared-inline-show-more-text",
  authorName: ".update-components-actor__name, .update-components-actor__title",
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
    return text.trim();
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
    return name.trim() || undefined;
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
    return date.trim() || undefined;
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
