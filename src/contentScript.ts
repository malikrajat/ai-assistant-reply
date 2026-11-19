import {
  createButton,
  createFloatingButton,
  setButtonLoading,
  setButtonError,
  setButtonSuccess,
} from "./components/Button.js";
import { ReplyModal } from "./components/ReplyModal.js";
import {
  describeEditables,
  commentContainerFor,
  findCommentContainers,
  findCommentTriggers,
  findComposerInContainer,
  findComposers,
  findComposerToolbar,
  getComposerContext,
  getFocusedComposer,
  getSurfaceLimit,
  hasButtonInjected,
  insertTextIntoComposer,
  openCommentEditor,
} from "./utils/composers.js";
import {
  ComposerContext,
  ComposerInfo,
  DEFAULT_SETTINGS,
  GenerateReplyRequest,
  GenerateReplyResponse,
  UserSettings,
} from "./types/index.js";

console.log("[Content Script] LinkedIn AI Reply Assistant loaded");

// Global modal instance
let currentModal: ReplyModal | null = null;

// Debounce timer for mutation observer
let debounceTimer: number | null = null;

// Cached settings so generating/inserting never waits on a round-trip
let settings: UserSettings = { ...DEFAULT_SETTINGS };

// Request that produced the modal currently on screen (used by "Regenerate")
let activeRequest: {
  payload: GenerateReplyRequest["payload"];
  composer: ComposerInfo;
  context: ComposerContext;
} | null = null;

// Floating quick button state
let floatingButton: HTMLButtonElement | null = null;
let floatingComposer: ComposerInfo | null = null;
let hideFloatingTimer: number | null = null;

// Most recent composer the user interacted with (for the keyboard shortcut)
let lastFocusedComposer: ComposerInfo | null = null;
let lastTriggerAt = 0;

/**
 * Initialize the content script
 */
function init(): void {
  console.log("[Content Script] Initializing...");

  loadSettings();
  injectButtons();
  setupMutationObserver();
  setupFloatingButton();
  setupShortcutListener();
  watchSettings();

  console.log("[Content Script] Initialization complete");
}

/**
 * Injects AI buttons into every composer currently on the page
 */
function injectButtons(): void {
  const composers = findComposers();
  let injectedCount = 0;

  composers.forEach((composer) => {
    if (alreadyHasButton(composer.container)) {
      return;
    }

    try {
      const button = createButton(composer.label);
      const insertionPoint = findInsertionPoint(composer);

      insertionPoint.appendChild(button);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        lastFocusedComposer = composer;
        void handleGenerate(composer, button);
      });
      injectedCount++;
    } catch (error) {
      console.error("[Content Script] Error injecting button:", error);
    }
  });

  // Comment boxes on the feed exist before their editor does, so they get their
  // own button - clicking it opens the editor first.
  const commentContainers = findCommentContainers();

  commentContainers.forEach((container) => {
    if (alreadyHasButton(container)) return;

    try {
      const button = createButton("AI Reply");
      findCommentInsertionPoint(container).appendChild(button);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleGenerateForCommentBox(container, button);
      });
      injectedCount++;
    } catch (error) {
      console.error("[Content Script] Error injecting comment button:", error);
    }
  });

  // Article/newsletter pages render comment areas with different class names,
  // so also anchor to any "Add a comment" control we can find.
  let triggerCount = 0;

  findCommentTriggers().forEach((trigger) => {
    const container = commentContainerFor(trigger);
    triggerCount++;

    if (alreadyHasButton(container)) return;

    try {
      const button = createButton("AI Reply");
      const target = trigger.parentElement || container;
      target.appendChild(button);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleGenerateForCommentBox(container, button);
      });
      injectedCount++;
    } catch (error) {
      console.error("[Content Script] Error injecting trigger button:", error);
    }
  });

  console.log(
    `[Content Script] Composers: ${composers.length}, comment boxes: ${commentContainers.length}, comment triggers: ${triggerCount}, buttons added: ${injectedCount}`
  );
  console.log(`[Content Script] Scan: ${describeEditables()}`);
}

/**
 * True when this area (or a nearby ancestor/descendant) already has a button,
 * so the same comment box never gets two.
 */
function alreadyHasButton(container: HTMLElement): boolean {
  if (hasButtonInjected(container)) return true;

  let node = container.parentElement;
  for (let depth = 0; depth < 3 && node && node !== document.body; depth++) {
    if (hasButtonInjected(node)) return true;
    node = node.parentElement;
  }

  return false;
}

/**
 * Placement for the comment-box button (outside the editor region).
 */
function findCommentInsertionPoint(container: HTMLElement): HTMLElement {
  const toolbar = findComposerToolbar(container);

  if (
    !toolbar.closest("[contenteditable='true']") &&
    !toolbar.matches("button, [role='button'], a")
  ) {
    return toolbar;
  }

  const form = container.querySelector<HTMLElement>("form");
  if (
    form &&
    !form.closest("[contenteditable='true']") &&
    !form.matches("button, [role='button'], a")
  ) {
    return form;
  }

  return container.matches("button, [role='button'], a")
    ? container.parentElement || container
    : container;
}

/**
 * Generates a reply for a comment box, opening the editor first if needed.
 */
async function handleGenerateForCommentBox(
  container: HTMLElement,
  button: HTMLButtonElement
): Promise<void> {
  try {
    let composer = findComposerInContainer(container);

    if (!composer) {
      setButtonLoading(button, true);
      composer = await openCommentEditor(container);
      setButtonLoading(button, false);
    }

    if (!composer) {
      showNotification(
        "Click the comment box once to open it, then press AI Reply.",
        "error"
      );
      return;
    }

    lastFocusedComposer = composer;
    await handleGenerate(composer, button);
  } catch (error) {
    setButtonLoading(button, false);
    console.error("[Content Script] Error opening comment box:", error);
    showNotification("Could not open the comment box.", "error");
  }
}

/**
 * Where to place the inline button so it shows up next to the field's actions.
 */
function findInsertionPoint(composer: ComposerInfo): HTMLElement {
  const toolbar = findComposerToolbar(composer.container);

  // Safety net: the button must never land inside an editable region, or it
  // would be typed into the message.
  if (composer.element.contains(toolbar)) {
    const editableAncestor = toolbar.closest<HTMLElement>(
      "[contenteditable='true']"
    );
    const escapeFrom = editableAncestor || composer.element;
    return escapeFrom.parentElement || composer.container;
  }

  if (
    toolbar === composer.container &&
    (composer.surface === "invite" || composer.surface === "greeting") &&
    composer.element.parentElement
  ) {
    // Note/greeting boxes have no toolbar - sit right under the box instead.
    return composer.element.parentElement;
  }

  return toolbar;
}

/**
 * Sets up mutation observer to watch for dynamically loaded content
 */
function setupMutationObserver(): void {
  const observer = new MutationObserver(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      injectButtons();
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[Content Script] Mutation observer set up");
}

/**
 * Adds the floating quick button that follows the focused text box.
 */
function setupFloatingButton(): void {
  floatingButton = createFloatingButton();
  floatingButton.style.display = "none";
  floatingButton.addEventListener("mousedown", (event) => {
    // Keep the text box focused so insertion still targets the right field.
    event.preventDefault();
  });
  floatingButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const composer = floatingComposer ?? lastFocusedComposer;
    if (composer && floatingButton) {
      lastFocusedComposer = composer;
      void handleGenerate(composer, floatingButton);
    }
  });
  document.body.appendChild(floatingButton);

  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("focusout", handleFocusOut, true);
  window.addEventListener("scroll", repositionFloatingButton, true);
  window.addEventListener("resize", repositionFloatingButton);
}

function handleFocusIn(event: FocusEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (floatingButton && target === floatingButton) return;

  const composer = getFocusedComposer();
  if (!composer) {
    hideFloatingButton();
    return;
  }

  lastFocusedComposer = composer;

  if (hideFloatingTimer) {
    clearTimeout(hideFloatingTimer);
    hideFloatingTimer = null;
  }

  if (!settings.floatingButton || !floatingButton) {
    return;
  }

  // Don't stack a second button on a composer that already has an inline one.
  if (hasButtonInjected(composer.container)) {
    hideFloatingButton();
    return;
  }

  floatingComposer = composer;
  floatingButton.dataset.aiLabel = composer.label;
  floatingButton.setAttribute("title", `${composer.label} (Alt+Shift+G)`);
  floatingButton.style.display = "flex";
  repositionFloatingButton();
}

function handleFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as HTMLElement | null;
  if (floatingButton && next === floatingButton) return;

  if (hideFloatingTimer) clearTimeout(hideFloatingTimer);
  hideFloatingTimer = window.setTimeout(() => {
    const focused = document.activeElement as HTMLElement | null;
    if (focused && floatingButton && focused === floatingButton) return;
    hideFloatingButton();
  }, 200);
}

function repositionFloatingButton(): void {
  if (!floatingButton || !floatingComposer) return;
  if (floatingButton.style.display === "none") return;

  const rect = floatingComposer.element.getBoundingClientRect();

  // Hide while the composer is scrolled out of view.
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    floatingButton.style.visibility = "hidden";
    return;
  }

  const size = 32;
  const top = Math.min(
    Math.max(rect.bottom - size - 6, 4),
    window.innerHeight - size - 4
  );
  const left = Math.min(
    Math.max(rect.right - size - 8, 4),
    window.innerWidth - size - 4
  );

  floatingButton.style.position = "fixed";
  floatingButton.style.top = `${top}px`;
  floatingButton.style.left = `${left}px`;
  floatingButton.style.visibility = "visible";
}

function hideFloatingButton(): void {
  if (!floatingButton) return;
  floatingButton.style.display = "none";
  floatingButton.style.visibility = "visible";
  floatingComposer = null;
}

/**
 * Listens for the keyboard shortcut forwarded by the service worker.
 */
function setupShortcutListener(): void {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "TRIGGER_REPLY") {
      void triggerForActiveComposer();
    }
  });

  // Fallback: if the browser did not register the command, catch the key combo here.
  document.addEventListener(
    "keydown",
    (event) => {
      const isPrimary = event.altKey && event.shiftKey && event.code === "KeyG";
      // Alt+Shift is the Windows keyboard-layout switch, which can swallow the
      // combo, so Alt+G works as a quieter alternative.
      const isAlternative =
        event.altKey && !event.shiftKey && !event.ctrlKey && event.code === "KeyG";

      if (isPrimary || isAlternative) {
        event.preventDefault();
        void triggerForActiveComposer();
      }
    },
    true
  );
}

async function triggerForActiveComposer(): Promise<void> {
  // Guard against the command and the keydown fallback both firing.
  const now = Date.now();
  if (now - lastTriggerAt < 800) return;
  lastTriggerAt = now;

  const composer = getFocusedComposer() ?? lastFocusedComposer;
  if (!composer) {
    showNotification("Click into a LinkedIn text box first, then press Alt+Shift+G.", "error");
    return;
  }

  lastFocusedComposer = composer;
  await handleGenerate(composer);
}

/**
 * Generates a reply/draft for a composer and shows it in the modal.
 */
async function handleGenerate(
  composer: ComposerInfo,
  button?: HTMLButtonElement
): Promise<void> {
  try {
    // Read the context BEFORE switching the button to "Generating..." - the
    // button lives inside the composer we scrape, so its label used to leak into
    // the prompt (the model then replied to the placeholder instead of the post).
    const context = getComposerContext(composer);

    if (context.error && !context.contextText) {
      throw new Error(context.error);
    }

    if (button) setButtonLoading(button, true);

    const payload: GenerateReplyRequest["payload"] = {
      postText: context.contextText,
      authorName: context.authorName,
      surface: context.surface,
      mode: context.mode,
      recipientName: context.recipientName,
      draft: context.draft,
    };

    console.log(
      `[Content Script] Generating for surface=${context.surface} mode=${context.mode} (${context.contextText.length} chars)`
    );

    const response = await sendGenerateReplyMessage(payload);

    if (button) setButtonLoading(button, false);

    if (response.success && response.reply) {
      activeRequest = { payload, composer, context };
      displayReply(response.reply, response.usageCount || 0, composer, context);
      if (button) setButtonSuccess(button);
    } else {
      const errorMessage = response.error || "Failed to generate reply";
      console.error("[Content Script] Error:", errorMessage);
      if (button) setButtonError(button, true);
      showNotification(errorMessage, "error");
    }
  } catch (error) {
    if (button) {
      setButtonLoading(button, false);
      setButtonError(button, true);
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("[Content Script] Error in handleGenerate:", error);
    showNotification(errorMessage, "error");
  }
}

/**
 * Sends a message to the service worker to generate a reply
 * Includes retry logic for when service worker is inactive
 */
function sendGenerateReplyMessage(
  payload: GenerateReplyRequest["payload"],
  retryCount = 0
): Promise<GenerateReplyResponse> {
  return new Promise((resolve, reject) => {
    const message: GenerateReplyRequest = {
      type: "GENERATE_REPLY",
      payload,
    };

    chrome.runtime.sendMessage(message, (response: GenerateReplyResponse) => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError.message || "Unknown error";

        // If service worker is inactive and we haven't retried too many times
        if (error.includes("Could not establish connection") && retryCount < 2) {
          console.log(
            `[Content Script] Service worker inactive, retrying... (${retryCount + 1}/2)`
          );

          setTimeout(() => {
            sendGenerateReplyMessage(payload, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 500);
          return;
        }

        reject(new Error(error));
        return;
      }

      resolve(response);
    });
  });
}

/**
 * Displays the generated reply in a modal
 */
function displayReply(
  reply: string,
  usageCount: number,
  composer: ComposerInfo,
  context: ComposerContext
): void {
  if (currentModal) {
    currentModal.hide();
    currentModal = null;
  }

  const charLimit = getSurfaceLimit(context.surface, settings.maxLength);
  const modal = new ReplyModal();
  currentModal = modal;

  modal.show(reply, usageCount, settings.rateLimit, {
    label: composer.label,
    charLimit,
  });

  modal.onAction((action, text) => {
    console.log(`[Content Script] Modal action: ${action}`);

    if (action === "copy") {
      void handleCopyAction(text);
      closeModal();
    } else if (action === "insert") {
      void handleInsertAction(text, composer);
      closeModal();
    } else if (action === "regenerate") {
      void handleRegenerate(modal);
    }
  });

  // "Manual copy" users get the text on the clipboard straight away.
  if (settings.defaultAction === "copy") {
    void navigator.clipboard
      .writeText(reply)
      .then(() => showNotification("Reply copied to clipboard!", "success"))
      .catch(() => {
        /* The Copy button is still there if the clipboard is blocked. */
      });
  }
}

function closeModal(): void {
  if (currentModal) {
    currentModal.hide();
    currentModal = null;
  }
}

async function handleRegenerate(modal: ReplyModal): Promise<void> {
  if (!activeRequest) return;

  modal.setLoading(true);
  try {
    const response = await sendGenerateReplyMessage(activeRequest.payload);

    if (response.success && response.reply) {
      modal.setText(response.reply);
      modal.hideError();
      modal.setLoading(false);
    } else {
      modal.setLoading(false);
      modal.showError(response.error || "Failed to generate a new reply");
    }
  } catch (error) {
    modal.setLoading(false);
    modal.showError(
      error instanceof Error ? error.message : "Failed to generate a new reply"
    );
  }
}

/**
 * Handles the copy action - copies reply text to clipboard
 */
async function handleCopyAction(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showNotification("Reply copied to clipboard!", "success");
  } catch (error) {
    console.error("[Content Script] Error copying to clipboard:", error);

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      showNotification("Reply copied to clipboard!", "success");
    } catch (fallbackError) {
      console.error("[Content Script] Fallback copy failed:", fallbackError);
      showNotification("Failed to copy to clipboard", "error");
    }
  }
}

/**
 * Handles the insert action - writes the reply into the composer it came from
 */
async function handleInsertAction(
  text: string,
  composer: ComposerInfo
): Promise<void> {
  try {
    // LinkedIn often re-renders a composer after the modal opens, which detaches
    // the element we captured when the button was clicked.
    const target = resolveLiveComposer(composer);

    if (!target) {
      showNotification(
        "Could not find the text box any more. Click into it and press Alt+Shift+G.",
        "error"
      );
      return;
    }

    const success = await insertTextIntoComposer(
      target.element,
      text,
      settings.stealthMode
    );

    if (success) {
      showNotification("Reply inserted! You can edit before sending.", "success");
    } else {
      showNotification(
        "LinkedIn did not accept the text. Copy it and paste with Ctrl+V instead.",
        "error"
      );
    }
  } catch (error) {
    console.error("[Content Script] Error inserting text:", error);
    showNotification("Failed to insert reply. Please copy instead.", "error");
  }
}

/**
 * Re-resolves a composer if LinkedIn swapped the DOM node out from under us.
 */
function resolveLiveComposer(composer: ComposerInfo): ComposerInfo | null {
  if (composer.element.isConnected) return composer;

  console.log("[Content Script] Composer was re-rendered, looking for a live one");

  const focused = getFocusedComposer();
  if (focused) return focused;

  return (
    findComposers().find((candidate) => candidate.surface === composer.surface) ??
    null
  );
}

/**
 * Loads settings once and keeps them in sync with the options page.
 */
function loadSettings(): void {
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(
        "[Content Script] Could not load settings:",
        chrome.runtime.lastError.message
      );
      return;
    }
    if (response?.settings) {
      settings = { ...DEFAULT_SETTINGS, ...response.settings };
    }
  });
}

function watchSettings(): void {
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.settings) return;

    settings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };

    if (!settings.floatingButton) {
      hideFloatingButton();
    }
  });
}

/**
 * Shows a toast notification to the user
 */
function showNotification(
  message: string,
  type: "success" | "error"
): void {
  const isError = type === "error";

  const toast = document.createElement("div");
  toast.className = isError
    ? "ai-reply-error-toast"
    : "ai-reply-success-toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${
      isError
        ? "linear-gradient(135deg, #f56565 0%, #c53030 100%)"
        : "linear-gradient(135deg, #48bb78 0%, #38a169 100%)"
    };
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    max-width: 400px;
    animation: slideInRight 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, isError ? 5000 : 3000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
