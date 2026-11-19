import {
  GenerateReplyRequest,
  GenerateReplyResponse,
  MessageToBackground,
} from "./types/index.js";
import { getSettings } from "./utils/storage.js";
import { callLLM, resolveProviderConfig, sanitizePostText } from "./utils/api.js";
import { getSurfaceLimit } from "./utils/composers.js";
import { trackUsage } from "./utils/rateLimit.js";
import { validatePostText } from "./utils/validation.js";

console.log("[Service Worker] LinkedIn AI Reply Assistant loaded");

/**
 * Keep service worker alive by responding to keep-alive pings
 */
let keepAliveInterval: number | null = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker alive
    });
  }, 20000) as unknown as number; // Ping every 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Start keep-alive when service worker loads
startKeepAlive();

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure service worker stays alive during message processing
  startKeepAlive();
  console.log("[Service Worker] Received message:", message.type);

  // Handle different message types
  if (message.type === "GENERATE_REPLY") {
    handleGenerateReply(message as GenerateReplyRequest)
      .then(sendResponse)
      .catch((error) => {
        console.error("[Service Worker] Error in handleGenerateReply:", error);
        sendResponse({
          success: false,
          error: error.message || "Unknown error occurred",
          rateLimitReached: error.message?.includes("Rate limit") || false,
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  if (message.type === "GET_SETTINGS") {
    getSettings()
      .then((settings) => {
        sendResponse({ type: "SETTINGS_RESPONSE", settings });
      })
      .catch((error) => {
        console.error("[Service Worker] Error getting settings:", error);
        sendResponse({ error: error.message });
      });

    return true;
  }

  // Unknown message type
  console.warn("[Service Worker] Unknown message type:", message.type);
  return false;
});

/**
 * Handles reply generation requests from content script
 */
async function handleGenerateReply(
  request: GenerateReplyRequest
): Promise<GenerateReplyResponse> {
  const startTime = Date.now();

  try {
    console.log("[Service Worker] Starting reply generation...");

    // Extract payload
    const {
      postText,
      authorName,
      surface = "comment",
      mode = "reply",
      recipientName,
      draft,
    } = request.payload;

    // Validate post text
    validatePostText(postText);

    // Sanitize post text
    const sanitizedText = sanitizePostText(postText);
    console.log(
      `[Service Worker] Post text sanitized (${sanitizedText.length} chars)`
    );

    // The user's own draft (or LinkedIn placeholder text) is context too, so it
    // goes through the same clean-up instead of being forwarded verbatim.
    const sanitizedDraft = draft ? sanitizePostText(draft, 800) : undefined;

    // Get user settings
    const settings = await getSettings();
    console.log(
      `[Service Worker] Settings loaded: tone=${settings.tone}, maxLength=${settings.maxLength}`
    );

    // Check that the selected provider is ready to use
    const { provider, config } = resolveProviderConfig(settings);
    if (!config.apiKey && !provider.allowEmptyKey) {
      throw new Error(
        `${provider.label} API key is not configured. Open the extension settings and add it.`
      );
    }

    // Track usage and check rate limit
    let usage;
    try {
      usage = await trackUsage();
      console.log(
        `[Service Worker] Usage tracked: ${usage.count}/${usage.limit}`
      );
    } catch (error) {
      // Rate limit error
      console.error("[Service Worker] Rate limit error:", error);
      throw error;
    }

    // Call Gemini API
    const charLimit = getSurfaceLimit(surface, settings.maxLength);
    console.log(
      `[Service Worker] Calling Gemini API... (surface=${surface}, mode=${mode}, limit=${charLimit})`
    );
    const reply = await callLLM(sanitizedText, settings, {
      surface,
      mode,
      authorName,
      recipientName: recipientName?.slice(0, 120),
      draft: sanitizedDraft,
      charLimit,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[Service Worker] Reply generated successfully in ${duration}ms (${reply.length} chars)`
    );

    // Return success response
    return {
      success: true,
      reply,
      usageCount: usage.count,
      rateLimitReached: false,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Service Worker] Error generating reply after ${duration}ms:`,
      error
    );

    // Determine if it's a rate limit error
    const isRateLimitError =
      error instanceof Error && error.message.includes("Rate limit");

    // Return error response
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      rateLimitReached: isRateLimitError,
    };
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Service Worker] Extension installed:", details.reason);

  if (details.reason === "install") {
    // First time installation
    console.log("[Service Worker] First time installation");

    // Open options page to configure API key
    chrome.runtime.openOptionsPage();
  } else if (details.reason === "update") {
    // Extension updated
    console.log(
      "[Service Worker] Extension updated to version:",
      chrome.runtime.getManifest().version
    );
  }
});

/**
 * Restart keep-alive on browser startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log("[Service Worker] Browser started, service worker active");
  startKeepAlive();
});

/**
 * Keyboard shortcut (remappable at chrome://extensions/shortcuts).
 * Asks the tab that has focus to generate for whatever text box is focused.
 */
chrome.commands?.onCommand.addListener((command, tab) => {
  if (command !== "generate-ai-reply") return;

  const tabId = tab?.id;
  if (typeof tabId !== "number") return;

  chrome.tabs.sendMessage(tabId, { type: "TRIGGER_REPLY" }, () => {
    // Reading lastError avoids an "Unchecked runtime.lastError" console warning
    // when the shortcut is pressed on a page without our content script.
    void chrome.runtime.lastError;
  });
});

/**
 * Handle errors
 */
self.addEventListener("error", (event) => {
  console.error("[Service Worker] Uncaught error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("[Service Worker] Unhandled promise rejection:", event.reason);
});
