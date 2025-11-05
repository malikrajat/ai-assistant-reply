/// <reference types="chrome"/>
import { getSettings, saveSettings, getUsage } from "../utils/storage.js";
import { UserSettings } from "../types/index.js";

console.log("[Popup] Popup page loaded");

// DOM Elements
let currentUsageEl: HTMLElement;
let usageLimitEl: HTMLElement;
let usageProgressBar: HTMLElement;
let toneSelect: HTMLSelectElement;
let openOptionsBtn: HTMLButtonElement;

/**
 * Initialize the popup page
 */
async function init(): Promise<void> {
    console.log("[Popup] Initializing...");

    // Get DOM elements
    getDOMElements();

    // Set up event listeners
    setupEventListeners();

    // Load usage statistics
    await loadUsageStats();

    // Load quick settings
    await loadQuickSettings();

    console.log("[Popup] Initialization complete");
}

/**
 * Gets references to all DOM elements
 */
function getDOMElements(): void {
    currentUsageEl = document.getElementById("currentUsage") as HTMLElement;
    usageLimitEl = document.getElementById("usageLimit") as HTMLElement;
    usageProgressBar = document.getElementById(
        "usageProgressBar"
    ) as HTMLElement;
    toneSelect = document.getElementById("toneSelect") as HTMLSelectElement;
    openOptionsBtn = document.getElementById("openOptions") as HTMLButtonElement;
}

/**
 * Sets up event listeners
 */
function setupEventListeners(): void {
    // Tone selector change
    toneSelect.addEventListener("change", handleToneChange);

    // Open options button
    openOptionsBtn.addEventListener("click", openOptionsPage);
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

        console.log(
            `[Popup] Usage stats loaded: ${usage.count}/${usage.limit} (${percentage.toFixed(1)}%)`
        );
    } catch (error) {
        console.error("[Popup] Error loading usage stats:", error);
    }
}

/**
 * Loads quick settings (tone)
 */
async function loadQuickSettings(): Promise<void> {
    try {
        const settings = await getSettings();

        // Set tone selector
        toneSelect.value = settings.tone;

        console.log(`[Popup] Quick settings loaded: tone=${settings.tone}`);
    } catch (error) {
        console.error("[Popup] Error loading quick settings:", error);
    }
}

/**
 * Handles tone selector change
 */
async function handleToneChange(): Promise<void> {
    try {
        const newTone = toneSelect.value as UserSettings["tone"];

        // Get current settings
        const settings = await getSettings();

        // Update tone
        settings.tone = newTone;

        // Save settings
        await saveSettings(settings);

        console.log(`[Popup] Tone changed to: ${newTone}`);
    } catch (error) {
        console.error("[Popup] Error changing tone:", error);
    }
}

/**
 * Opens the options page
 */
function openOptionsPage(): void {
    if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
