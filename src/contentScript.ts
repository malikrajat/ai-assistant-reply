import { createButton, setButtonLoading, setButtonError } from "./components/Button.js";
import { ReplyModal } from "./components/ReplyModal.js";
import {
    findCommentBoxes,
    extractPostData,
    findInsertionPoint,
    hasButtonInjected,
    insertTextIntoCommentBox,
} from "./utils/dom.js";
import { GenerateReplyRequest, GenerateReplyResponse } from "./types/index.js";

console.log("[Content Script] LinkedIn AI Reply Assistant loaded");

// Global modal instance
let currentModal: ReplyModal | null = null;

// Debounce timer for mutation observer
let debounceTimer: number | null = null;

/**
 * Initialize the content script
 */
function init(): void {
    console.log("[Content Script] Initializing...");

    // Inject buttons into existing comment boxes
    injectButtons();

    // Set up mutation observer for dynamically loaded content
    setupMutationObserver();

    console.log("[Content Script] Initialization complete");
}

/**
 * Injects AI reply buttons into all comment boxes on the page
 */
function injectButtons(): void {
    const commentBoxes = findCommentBoxes();
    console.log(`[Content Script] Found ${commentBoxes.length} comment boxes`);

    let injectedCount = 0;

    commentBoxes.forEach((commentBox) => {
        // Check if button already exists
        if (hasButtonInjected(commentBox)) {
            return;
        }

        try {
            // Create button
            const button = createButton();

            // Find insertion point
            const insertionPoint = findInsertionPoint(commentBox);

            // Inject button
            insertionPoint.appendChild(button);

            // Attach click handler
            button.addEventListener("click", () => handleButtonClick(button, commentBox));

            injectedCount++;
        } catch (error) {
            console.error("[Content Script] Error injecting button:", error);
        }
    });

    if (injectedCount > 0) {
        console.log(`[Content Script] Injected ${injectedCount} buttons`);
    }
}

/**
 * Sets up mutation observer to watch for dynamically loaded content
 */
function setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
        // Debounce to avoid excessive processing
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
            injectButtons();
        }, 300);
    });

    // Observe the entire document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log("[Content Script] Mutation observer set up");
}

/**
 * Handles button click event
 */
async function handleButtonClick(
    button: HTMLButtonElement,
    commentBox: HTMLElement
): Promise<void> {
    console.log("[Content Script] Button clicked");

    try {
        // Show loading state
        setButtonLoading(button, true);

        // Extract post data
        const postData = extractPostData(commentBox);

        if (!postData.postText || postData.postText.trim().length === 0) {
            throw new Error("Could not extract post text");
        }

        console.log(
            `[Content Script] Extracted post data: ${postData.postText.substring(0, 100)}...`
        );

        // Send message to service worker
        const response = await sendGenerateReplyMessage(postData);

        // Hide loading state
        setButtonLoading(button, false);

        // Handle response
        if (response.success && response.reply) {
            console.log("[Content Script] Reply generated successfully");
            displayReply(response.reply, response.usageCount || 0, commentBox);
        } else {
            // Handle error
            const errorMessage = response.error || "Failed to generate reply";
            console.error("[Content Script] Error:", errorMessage);

            setButtonError(button, true);
            showErrorNotification(errorMessage);
        }
    } catch (error) {
        console.error("[Content Script] Error in handleButtonClick:", error);
        setButtonLoading(button, false);
        setButtonError(button, true);

        const errorMessage =
            error instanceof Error ? error.message : "An unexpected error occurred";
        showErrorNotification(errorMessage);
    }
}

/**
 * Sends a message to the service worker to generate a reply
 */
function sendGenerateReplyMessage(postData: {
    postText: string;
    authorName?: string;
    postDate?: string;
}): Promise<GenerateReplyResponse> {
    return new Promise((resolve, reject) => {
        const message: GenerateReplyRequest = {
            type: "GENERATE_REPLY",
            payload: postData,
        };

        chrome.runtime.sendMessage(message, (response: GenerateReplyResponse) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
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
    commentBox: HTMLElement
): void {
    // Close existing modal if any
    if (currentModal) {
        currentModal.hide();
    }

    // Create new modal
    currentModal = new ReplyModal();

    // Show modal with reply
    currentModal.show(reply, usageCount, 50, commentBox);

    // Set up action handler
    currentModal.onAction((action, text) => {
        console.log(`[Content Script] Modal action: ${action}`);

        if (action === "copy") {
            handleCopyAction(text);
        } else if (action === "insert") {
            handleInsertAction(text, commentBox);
        }

        // Close modal after action
        if (currentModal) {
            currentModal.hide();
            currentModal = null;
        }
    });
}

/**
 * Handles the copy action - copies reply text to clipboard
 */
async function handleCopyAction(text: string): Promise<void> {
    try {
        // Use the Clipboard API
        await navigator.clipboard.writeText(text);

        console.log("[Content Script] Text copied to clipboard");
        showSuccessNotification("Reply copied to clipboard!");
    } catch (error) {
        console.error("[Content Script] Error copying to clipboard:", error);

        // Fallback: try using the old execCommand method
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);

            console.log("[Content Script] Text copied using fallback method");
            showSuccessNotification("Reply copied to clipboard!");
        } catch (fallbackError) {
            console.error("[Content Script] Fallback copy failed:", fallbackError);
            showErrorNotification("Failed to copy to clipboard");
        }
    }
}

/**
 * Handles the insert action - inserts reply text into LinkedIn comment box
 */
async function handleInsertAction(text: string, commentBox: HTMLElement): Promise<void> {
    try {
        // Get user settings to check stealth mode
        const settings = await getUserSettings();
        const useStealthMode = settings?.stealthMode ?? true;

        const success = await insertTextIntoCommentBox(commentBox, text, useStealthMode);

        if (success) {
            console.log("[Content Script] Text inserted into comment box");
            showSuccessNotification("Reply inserted! You can edit before posting.");
        } else {
            console.error("[Content Script] Failed to insert text");
            showErrorNotification("Failed to insert reply. Please try copying instead.");
        }
    } catch (error) {
        console.error("[Content Script] Error inserting text:", error);
        showErrorNotification("Failed to insert reply. Please try copying instead.");
    }
}

/**
 * Gets user settings from storage
 */
function getUserSettings(): Promise<any> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("[Content Script] Error getting settings:", chrome.runtime.lastError);
                resolve(null);
                return;
            }
            resolve(response?.settings || null);
        });
    });
}

/**
 * Shows an error notification to the user
 */
function showErrorNotification(message: string): void {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.className = "ai-reply-error-toast";
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
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

    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

/**
 * Shows a success notification to the user
 */
function showSuccessNotification(message: string): void {
    const toast = document.createElement("div");
    toast.className = "ai-reply-success-toast";
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
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

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    // DOM is already ready
    init();
}
