import { getSettings, saveSettings, getUsage } from "../utils/storage.js";
import { resetUsage } from "../utils/rateLimit.js";
import {
  UserSettings,
  ProviderSettings,
  LLMProvider,
  DEFAULT_SETTINGS,
} from "../types/index.js";
import { callLLM, fetchProviderModels } from "../utils/api.js";
import type { ResolvedProviderConfig } from "../utils/api.js";
import { LLM_PROVIDERS, PROVIDER_GROUPS, getProvider } from "../utils/providers.js";
import { escapeHtml } from "../utils/validation.js";

console.log("[Options] Options page loaded");

// DOM Elements
let apiKeyInput: HTMLInputElement;
let toggleApiKeyBtn: HTMLButtonElement;
let testConnectionBtn: HTMLButtonElement;
let connectionStatus: HTMLElement;
let providerSelect: HTMLSelectElement;
let providerHelp: HTMLElement;
let apiKeyLabel: HTMLElement;
let apiKeyHelp: HTMLElement;
let modelInput: HTMLInputElement;
let modelSuggestions: HTMLDataListElement;
let fetchModelsBtn: HTMLButtonElement;
let modelStatus: HTMLElement;
let baseUrlGroup: HTMLElement;
let baseUrlInput: HTMLInputElement;
let toneRadios: NodeListOf<HTMLInputElement>;
let maxLengthSlider: HTMLInputElement;
let maxLengthValue: HTMLElement;
let defaultActionRadios: NodeListOf<HTMLInputElement>;
let rateLimitInput: HTMLInputElement;
let rateLimitValue: HTMLElement;
let stealthModeCheckbox: HTMLInputElement;
let floatingButtonCheckbox: HTMLInputElement;
let currentUsageEl: HTMLElement;
let usageLimitEl: HTMLElement;
let usageProgressBar: HTMLElement;
let resetTimeEl: HTMLElement;
let resetUsageBtn: HTMLButtonElement;
let saveSettingsBtn: HTMLButtonElement;
let saveStatus: HTMLElement;

// Per-provider credentials the user has entered (kept in memory while editing)
let providersState: Record<string, ProviderSettings> = {};
let activeProviderId: LLMProvider = DEFAULT_SETTINGS.provider;

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
  providerSelect = document.getElementById("providerSelect") as HTMLSelectElement;
  providerHelp = document.getElementById("providerHelp") as HTMLElement;
  apiKeyLabel = document.getElementById("apiKeyLabel") as HTMLElement;
  apiKeyHelp = document.getElementById("apiKeyHelp") as HTMLElement;
  modelInput = document.getElementById("modelInput") as HTMLInputElement;
  modelSuggestions = document.getElementById("modelSuggestions") as HTMLDataListElement;
  fetchModelsBtn = document.getElementById("fetchModels") as HTMLButtonElement;
  modelStatus = document.getElementById("modelStatus") as HTMLElement;
  baseUrlGroup = document.getElementById("baseUrlGroup") as HTMLElement;
  baseUrlInput = document.getElementById("baseUrlInput") as HTMLInputElement;
  toneRadios = document.querySelectorAll('input[name="tone"]');
  maxLengthSlider = document.getElementById("maxLength") as HTMLInputElement;
  maxLengthValue = document.getElementById("maxLengthValue") as HTMLElement;
  defaultActionRadios = document.querySelectorAll('input[name="defaultAction"]');
  rateLimitInput = document.getElementById("rateLimit") as HTMLInputElement;
  rateLimitValue = document.getElementById("rateLimitValue") as HTMLElement;
  stealthModeCheckbox = document.getElementById("stealthMode") as HTMLInputElement;
  floatingButtonCheckbox = document.getElementById("floatingButton") as HTMLInputElement;
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

  // Provider switching
  providerSelect.addEventListener("change", handleProviderChange);

  // Test connection
  testConnectionBtn.addEventListener("click", testAPIConnection);

  // Discover the models served by the selected provider/local server
  fetchModelsBtn.addEventListener("click", handleFetchModels);

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
    providerSelect,
    modelInput,
    baseUrlInput,
    ...Array.from(toneRadios),
    maxLengthSlider,
    ...Array.from(defaultActionRadios),
    rateLimitInput,
    stealthModeCheckbox,
    floatingButtonCheckbox,
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

    // Providers
    populateProviders();
    providersState = JSON.parse(JSON.stringify(settings.providers || {}));
    applyProviderToForm(settings.provider || DEFAULT_SETTINGS.provider);

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

    // Floating quick button
    floatingButtonCheckbox.checked = settings.floatingButton ?? true;

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
    captureProviderInputs();

    const activeProvider = getProvider(activeProviderId);
    const allowed = await ensureProviderPermissions(
      activeProvider,
      providersState[activeProviderId] || { apiKey: "", model: "" }
    );
    if (!allowed) {
      showNotification(
        "Chrome permission for that API host was declined - requests may fail.",
        "error"
      );
    }

    const settings: UserSettings = {
      provider: activeProviderId,
      providers: providersState as UserSettings["providers"],
      // Legacy field kept in sync so older builds keep working.
      apiKey: providersState.gemini?.apiKey || "",
      tone: selectedTone,
      maxLength,
      defaultAction: selectedAction,
      rateLimit,
      stealthMode: stealthModeCheckbox.checked,
      floatingButton: floatingButtonCheckbox.checked,
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
 * Fills the provider dropdown from the provider registry, grouped so the
 * growing list of gateways and local servers stays navigable.
 */
function populateProviders(): void {
  providerSelect.innerHTML = PROVIDER_GROUPS.map((group) => {
    const options = LLM_PROVIDERS.filter((provider) => provider.group === group)
      .map(
        (provider) =>
          `<option value="${provider.id}">${provider.label}</option>`
      )
      .join("");

    return options ? `<optgroup label="${group}">${options}</optgroup>` : "";
  }).join("");
}

/**
 * Points the credential/model inputs at a provider.
 */
function applyProviderToForm(providerId: string): void {
  const provider = getProvider(providerId);
  activeProviderId = provider.id as LLMProvider;

  providerSelect.value = provider.id;
  apiKeyLabel.innerHTML = `${provider.label} API Key${
    provider.allowEmptyKey ? "" : ' <span class="required">*</span>'
  }`;
  apiKeyInput.placeholder = provider.keyHint;
  apiKeyInput.value = providersState[provider.id]?.apiKey || "";

  modelInput.value =
    providersState[provider.id]?.model || provider.defaultModel;
  modelSuggestions.innerHTML = provider.suggestedModels
    .map((model) => `<option value="${model}"></option>`)
    .join("");

  // Local servers and custom endpoints need a configurable URL (port, host,
  // tunnel). Hosted presets keep their registry URL to avoid clutter.
  const editableEndpoint = Boolean(provider.allowBaseUrlEdit);
  baseUrlGroup.style.display = editableEndpoint ? "" : "none";
  baseUrlInput.value =
    providersState[provider.id]?.baseUrl || provider.baseUrl;

  providerHelp.textContent =
    provider.help ||
    (editableEndpoint
      ? `Replies are generated by ${provider.label}. Edit the endpoint below if it runs on a different host or port.`
      : `Replies are generated by ${provider.label} using your own key.`);

  apiKeyHelp.innerHTML = provider.keyUrl
    ? `Get a key from <a href="${provider.keyUrl}" target="_blank" rel="noopener noreferrer" class="link">${provider.label}</a>. Keys are stored in Chrome sync storage on your machine.`
    : provider.allowEmptyKey
      ? "No key is needed for this local endpoint. Leave it empty."
      : "Leave the key empty if your endpoint does not require one.";
}

/**
 * Copies the current inputs back into the in-memory provider state.
 */
function captureProviderInputs(): void {
  const provider = getProvider(activeProviderId);

  providersState[activeProviderId] = {
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || provider.defaultModel,
    baseUrl: baseUrlInput.value.trim() || provider.baseUrl,
  };
}

/**
 * Switching provider swaps in that provider's saved key and model.
 */
function handleProviderChange(): void {
  captureProviderInputs();
  applyProviderToForm(providerSelect.value);
  modelStatus.textContent = "";
  modelStatus.className = "status-message";
  saveSettingsBtn.disabled = false;
  saveStatus.textContent = "";
}

/**
 * Loopback hosts are declared in the manifest, so Ollama, LM Studio and vLLM
 * work without a runtime prompt. Ollama still needs OLLAMA_ORIGINS to allow the
 * chrome-extension:// origin; that is a server-side setting, not a Chrome one.
 */
function isLoopback(url: URL): boolean {
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  );
}

/**
 * Requests host access for user-configurable endpoints in one call from the
 * click handler. Chrome requires permissions.request() to happen inside a user
 * gesture, so this does not call contains() first. Built-in hosted providers
 * already have their origins in the manifest and are skipped.
 */
async function ensureProviderPermissions(
  provider: ReturnType<typeof getProvider>,
  config: ProviderSettings
): Promise<boolean> {
  const origins = new Set<string>();
  const urls = [config.baseUrl || provider.baseUrl, provider.modelListUrl];

  for (const url of urls) {
    if (!url) continue;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    if (isLoopback(parsed)) continue;
    if (!provider.allowBaseUrlEdit && url === provider.baseUrl) continue;
    if (provider.modelListUrl && url === provider.modelListUrl) continue;

    origins.add(`${parsed.origin}/*`);
  }

  if (origins.size === 0) return true;

  try {
    return await chrome.permissions.request({ origins: [...origins] });
  } catch (error) {
    console.warn("[Options] Could not request host permission:", error);
    return true;
  }
}

/**
 * Tests the API connection with the provided API key
 */
async function testAPIConnection(): Promise<void> {
  try {
    captureProviderInputs();
    const provider = getProvider(activeProviderId);
    const config = providersState[activeProviderId];

    if (!config?.apiKey && !provider.allowEmptyKey) {
      showConnectionStatus(`Please enter your ${provider.label} API key`, "error");
      return;
    }

    await ensureProviderPermissions(provider, config || { apiKey: "", model: "" });

    // Disable button and show loading
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = "Testing...";
    showConnectionStatus(`Testing ${provider.label}...`, "loading");

    const testSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      provider: activeProviderId,
      providers: providersState as UserSettings["providers"],
      apiKey: providersState.gemini?.apiKey || "",
      tone: "professional",
      maxLength: 200,
      defaultAction: "insert",
      rateLimit: 50,
      stealthMode: true,
      floatingButton: true,
    };

    // Make a test API call
    const reply = await callLLM(
      "I am happy to share that I am starting a new position as a Senior Software Engineer at Apple!",
      testSettings,
      { surface: "comment", mode: "reply", charLimit: 200 }
    );

    // Success
    showConnectionStatus(
      `Connection successful! ✓ Sample: "${reply.slice(0, 80)}${
        reply.length > 80 ? "..." : ""
      }"`,
      "success"
    );
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
 * Loads the live model list from the selected provider (including a local
 * Ollama server) into the Model field's suggestions.
 */
async function handleFetchModels(): Promise<void> {
  try {
    captureProviderInputs();

    const provider = getProvider(activeProviderId);
    const config: ResolvedProviderConfig = {
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value.trim() || provider.defaultModel,
      baseUrl: baseUrlInput.value.trim() || provider.baseUrl,
    };

    if (!config.baseUrl) {
      showModelStatus("Set a base URL before fetching models.", "error");
      return;
    }

    if (!config.apiKey && !provider.allowEmptyKey) {
      showModelStatus(`Enter your ${provider.label} API key first.`, "error");
      return;
    }

    const allowed = await ensureProviderPermissions(provider, {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
    if (!allowed) {
      showModelStatus("Chrome permission for that host was declined.", "error");
      return;
    }

    fetchModelsBtn.disabled = true;
    fetchModelsBtn.textContent = "Fetching...";
    showModelStatus(`Fetching models from ${provider.label}...`, "loading");

    const models = await fetchProviderModels(provider.id, config);
    modelSuggestions.innerHTML = models
      .map((model) => `<option value="${escapeHtml(model)}"></option>`)
      .join("");

    if (models.length === 0) {
      showModelStatus(
        "No chat models were returned. Check the endpoint and key.",
        "error"
      );
      return;
    }

    if (!modelInput.value.trim()) {
      modelInput.value = models[0];
    }

    showModelStatus(`Found ${models.length} models. Pick one from the list.`, "success");
    saveSettingsBtn.disabled = false;
    saveStatus.textContent = "";
  } catch (error) {
    console.error("[Options] Model fetch failed:", error);
    const message =
      error instanceof Error ? error.message : "Could not fetch models";
    showModelStatus(`Could not fetch models: ${message}`, "error");
  } finally {
    fetchModelsBtn.disabled = false;
    fetchModelsBtn.textContent = "Fetch models";
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

/**
 * Shows the result of a model-list request.
 */
function showModelStatus(
  message: string,
  type: "success" | "error" | "loading"
): void {
  modelStatus.textContent = message;
  modelStatus.className = `status-message status-message--${type}`;

  if (type !== "loading") {
    setTimeout(() => {
      modelStatus.textContent = "";
      modelStatus.className = "status-message";
    }, 8000);
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
