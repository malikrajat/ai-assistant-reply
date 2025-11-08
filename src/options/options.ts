import { getSettings, saveSettings, getUsage } from "../utils/storage.js";
import { resetUsage } from "../utils/rateLimit.js";
import { UserSettings } from "../types/index.js";
import { callGeminiAPI } from "../utils/api.js";

console.log("[Options] Options page loaded");

// DOM Elements
let apiKeyInput: HTMLInputElement;
let toggleApiKeyBtn: HTMLButtonElement;
let testConnectionBtn: HTMLButtonElement;
let connectionStatus: HTMLElement;
let toneRadios: NodeListOf<HTMLInputElement>;
let maxLengthSlider: HTMLInputElement;
let maxLengthValue: HTMLElement;
let defaultActionRadios: NodeListOf<HTMLInputElement>;
let rateLimitInput: HTMLInputElement;
let rateLimitValue: HTMLElement;
let stealthModeCheckbox: HTMLInputElement;
let currentUsageEl: HTMLElement;
let usageLimitEl: HTMLElement;
let usageProgressBar: HTMLElement;
let resetTimeEl: HTMLElement;
let resetUsageBtn: HTMLButtonElement;
let saveSettingsBtn: HTMLButtonElement;
let saveStatus: HTMLElement;

/**
 * Initialize the options page
 */
async function init(): Promise<void> {
  console.log("[Options] Initializing...");

  // Get DOM elements
  getDOMElements();

  // Set up event listeners
  setupEventListeners();

  // Load settings from storage
  await loadSettingsToUI();

  // Load usage statistics
  await loadUsageStats();

  // Start usage stats update interval
  setInterval(loadUsageStats, 60000); // Update every minute

  console.log("[Options] Initialization complete");
}

/**
 * Gets references to all DOM elements
 */
function getDOMElements(): void {
  apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  toggleApiKeyBtn = document.getElementById("toggleApiKey") as HTMLButtonElement;
  testConnectionBtn = document.getElementById("testConnection") as HTMLButtonElement;
  connectionStatus = document.getElementById("connectionStatus") as HTMLElement;
  toneRadios = document.querySelectorAll('input[name="tone"]');
  maxLengthSlider = document.getElementById("maxLength") as HTMLInputElement;
  maxLengthValue = document.getElementById("maxLengthValue") as HTMLElement;
  defaultActionRadios = document.querySelectorAll('input[name="defaultAction"]');
  rateLimitInput = document.getElementById("rateLimit") as HTMLInputElement;
  rateLimitValue = document.getElementById("rateLimitValue") as HTMLElement;
  stealthModeCheckbox = document.getElementById("stealthMode") as HTMLInputElement;
  currentUsageEl = document.getElementById("currentUsage") as HTMLElement;
  usageLimitEl = document.getElementById("usageLimit") as HTMLElement;
  usageProgressBar = document.getElementById("usageProgressBar") as HTMLElement;
  resetTimeEl = document.getElementById("resetTime") as HTMLElement;
  resetUsageBtn = document.getElementById("resetUsage") as HTMLButtonElement;
  saveSettingsBtn = document.getElementById("saveSettings") as HTMLButtonElement;
  saveStatus = document.getElementById("saveStatus") as HTMLElement;
}

/**
 * Sets up event listeners for all interactive elements
 */
function setupEventListeners(): void {
  // API key toggle
  toggleApiKeyBtn.addEventListener("click", toggleApiKeyVisibility);

  // Test connection
  testConnectionBtn.addEventListener("click", testAPIConnection);

  // Max length slider
  maxLengthSlider.addEventListener("input", updateMaxLengthDisplay);

  // Rate limit input
  rateLimitInput.addEventListener("input", updateRateLimitDisplay);

  // Reset usage button
  resetUsageBtn.addEventListener("click", handleResetUsage);

  // Save settings button
  saveSettingsBtn.addEventListener("click", handleSaveSettings);

  // Enable save button when any input changes
  const inputs = [
    apiKeyInput,
    ...Array.from(toneRadios),
    maxLengthSlider,
    ...Array.from(defaultActionRadios),
    rateLimitInput,
    stealthModeCheckbox,
  ];

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      saveSettingsBtn.disabled = false;
      saveStatus.textContent = "";
    });
  });
}

/**
 * Loads settings from storage and populates the UI
 */
async function loadSettingsToUI(): Promise<void> {
  try {
    const settings = await getSettings();
    console.log("[Options] Loaded settings:", settings);

    // API key
    apiKeyInput.value = settings.apiKey || "";

    // Tone
    toneRadios.forEach((radio) => {
      if (radio.value === settings.tone) {
        radio.checked = true;
      }
    });

    // Max length
    maxLengthSlider.value = settings.maxLength.toString();
    updateMaxLengthDisplay();

    // Default action
    defaultActionRadios.forEach((radio) => {
      if (radio.value === settings.defaultAction) {
        radio.checked = true;
      }
    });

    // Rate limit
    rateLimitInput.value = settings.rateLimit.toString();
    updateRateLimitDisplay();

    // Stealth mode
    stealthModeCheckbox.checked = settings.stealthMode ?? true;

    // Disable save button initially
    saveSettingsBtn.disabled = true;
  } catch (error) {
    console.error("[Options] Error loading settings:", error);
    showNotification("Error loading settings", "error");
  }
}

/**
 * Collects settings from UI and saves to storage
 */
async function saveSettingsFromUI(): Promise<void> {
  try {
    // Get selected tone
    const selectedTone = Array.from(toneRadios).find((r) => r.checked)?.value as
      | UserSettings["tone"]
      | undefined;

    // Get selected default action
    const selectedAction = Array.from(defaultActionRadios).find((r) => r.checked)
      ?.value as UserSettings["defaultAction"] | undefined;

    // Validate inputs
    if (!selectedTone) {
      throw new Error("Please select a tone");
    }

    if (!selectedAction) {
      throw new Error("Please select a default action");
    }

    const maxLength = parseInt(maxLengthSlider.value);
    const rateLimit = parseInt(rateLimitInput.value);

    if (maxLength < 100 || maxLength > 1000) {
      throw new Error("Max length must be between 100 and 1000");
    }

    if (rateLimit < 1) {
      throw new Error("Rate limit must be at least 1");
    }

    // Build settings object
    const settings: UserSettings = {
      apiKey: apiKeyInput.value.trim(),
      tone: selectedTone,
      maxLength,
      defaultAction: selectedAction,
      rateLimit,
      stealthMode: stealthModeCheckbox.checked,
    };

    // Save to storage
    await saveSettings(settings);

    console.log("[Options] Settings saved successfully");
    showNotification("Settings saved successfully!", "success");

    // Disable save button
    saveSettingsBtn.disabled = true;

    // Reload usage stats to update limit
    await loadUsageStats();
  } catch (error) {
    console.error("[Options] Error saving settings:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    showNotification(message, "error");
  }
}

/**
 * Toggles API key visibility
 */
function toggleApiKeyVisibility(): void {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    toggleApiKeyBtn.setAttribute("aria-label", "Hide API key");
  } else {
    apiKeyInput.type = "password";
    toggleApiKeyBtn.setAttribute("aria-label", "Show API key");
  }
}

/**
 * Tests the API connection with the provided API key
 */
async function testAPIConnection(): Promise<void> {
  try {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showConnectionStatus("Please enter an API key", "error");
      return;
    }

    // Disable button and show loading
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = "Testing...";
    showConnectionStatus("Testing connection...", "loading");

    // Create a test settings object
    const testSettings: UserSettings = {
      apiKey,
      tone: "professional",
      maxLength: 100,
      defaultAction: "insert",
      rateLimit: 50,
      stealthMode: true,
    };

    // Make a test API call
    await callGeminiAPI("Hello, this is a test.", testSettings);

    // Success
    showConnectionStatus("Connection successful! ✓", "success");
  } catch (error) {
    console.error("[Options] Connection test failed:", error);
    const message =
      error instanceof Error ? error.message : "Connection failed";
    showConnectionStatus(`Connection failed: ${message}`, "error");
  } finally {
    // Re-enable button
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = "Test Connection";
  }
}

/**
 * Updates the max length display value
 */
function updateMaxLengthDisplay(): void {
  maxLengthValue.textContent = maxLengthSlider.value;
}

/**
 * Updates the rate limit display value
 */
function updateRateLimitDisplay(): void {
  rateLimitValue.textContent = rateLimitInput.value;
}

/**
 * Loads and displays usage statistics
 */
async function loadUsageStats(): Promise<void> {
  try {
    const usage = await getUsage();

    // Update current usage
    currentUsageEl.textContent = usage.count.toString();
    usageLimitEl.textContent = usage.limit.toString();

    // Update progress bar
    const percentage = usage.limit > 0 ? (usage.count / usage.limit) * 100 : 0;
    usageProgressBar.style.width = `${Math.min(percentage, 100)}%`;

    // Update reset time
    const now = Date.now();
    const timeUntilReset = usage.resetDate - now;

    if (timeUntilReset <= 0) {
      resetTimeEl.textContent = "Resetting...";
    } else {
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)
      );
      resetTimeEl.textContent = `${hours}h ${minutes}m`;
    }
  } catch (error) {
    console.error("[Options] Error loading usage stats:", error);
  }
}

/**
 * Handles the reset usage button click
 */
async function handleResetUsage(): Promise<void> {
  try {
    if (!confirm("Are you sure you want to reset the usage counter?")) {
      return;
    }

    await resetUsage();
    await loadUsageStats();

    showNotification("Usage counter reset successfully!", "success");
  } catch (error) {
    console.error("[Options] Error resetting usage:", error);
    showNotification("Failed to reset usage counter", "error");
  }
}

/**
 * Handles the save settings button click
 */
async function handleSaveSettings(): Promise<void> {
  await saveSettingsFromUI();
}

/**
 * Shows a notification message
 */
function showNotification(message: string, type: "success" | "error"): void {
  saveStatus.textContent = message;
  saveStatus.className = `save-status save-status--${type}`;

  // Clear after 5 seconds
  setTimeout(() => {
    saveStatus.textContent = "";
    saveStatus.className = "save-status";
  }, 5000);
}

/**
 * Shows connection status message
 */
function showConnectionStatus(
  message: string,
  type: "success" | "error" | "loading"
): void {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-message status-message--${type}`;

  // Clear after 5 seconds (except for loading)
  if (type !== "loading") {
    setTimeout(() => {
      connectionStatus.textContent = "";
      connectionStatus.className = "status-message";
    }, 5000);
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
