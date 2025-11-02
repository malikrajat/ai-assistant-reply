import { UserSettings, DEFAULT_SETTINGS, UsageData } from '../types/index.js';
import { validateSettings } from './validation.js';

/**
 * Retrieves user settings from chrome.storage.sync
 * Returns default settings merged with stored settings
 */
export async function getSettings(): Promise<UserSettings> {
  try {
    const data = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch (error) {
    console.error('[Storage] Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves user settings to chrome.storage.sync
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    // Validate settings before saving
    validateSettings(settings);
    
    await chrome.storage.sync.set({ settings });
  } catch (error) {
    console.error('[Storage] Error saving settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Retrieves usage data from chrome.storage.local
 * Returns default usage data if none exists
 */
export async function getUsage(): Promise<UsageData> {
  try {
    const data = await chrome.storage.local.get('usage');
    
    if (!data.usage) {
      // Initialize default usage data
      const defaultUsage: UsageData = {
        count: 0,
        resetDate: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        limit: DEFAULT_SETTINGS.rateLimit
      };
      return defaultUsage;
    }
    
    return data.usage as UsageData;
  } catch (error) {
    console.error('[Storage] Error getting usage:', error);
    return {
      count: 0,
      resetDate: Date.now() + 24 * 60 * 60 * 1000,
      limit: DEFAULT_SETTINGS.rateLimit
    };
  }
}

/**
 * Saves usage data to chrome.storage.local
 */
export async function saveUsage(usage: UsageData): Promise<void> {
  try {
    await chrome.storage.local.set({ usage });
  } catch (error) {
    console.error('[Storage] Error saving usage:', error);
    throw new Error('Failed to save usage data');
  }
}

/**
 * Checks if usage counter needs to be reset based on resetDate
 * If expired, resets the counter and sets new resetDate
 * Returns the updated usage data
 */
export async function resetUsageIfExpired(): Promise<UsageData> {
  try {
    const usage = await getUsage();
    const now = Date.now();
    
    // Check if reset period has expired
    if (now >= usage.resetDate) {
      const settings = await getSettings();
      const resetUsage: UsageData = {
        count: 0,
        resetDate: now + 24 * 60 * 60 * 1000, // 24 hours from now
        limit: settings.rateLimit
      };
      
      await saveUsage(resetUsage);
      console.log('[Storage] Usage counter reset');
      return resetUsage;
    }
    
    return usage;
  } catch (error) {
    console.error('[Storage] Error resetting usage:', error);
    throw error;
  }
}

/**
 * Updates the rate limit in usage data to match current settings
 * Useful when user changes rate limit in settings
 */
export async function updateUsageLimit(): Promise<void> {
  try {
    const settings = await getSettings();
    const usage = await getUsage();
    
    if (usage.limit !== settings.rateLimit) {
      usage.limit = settings.rateLimit;
      await saveUsage(usage);
      console.log('[Storage] Usage limit updated to:', settings.rateLimit);
    }
  } catch (error) {
    console.error('[Storage] Error updating usage limit:', error);
  }
}

/**
 * Clears all stored data (for testing or reset purposes)
 */
export async function clearAllData(): Promise<void> {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    console.log('[Storage] All data cleared');
  } catch (error) {
    console.error('[Storage] Error clearing data:', error);
    throw new Error('Failed to clear data');
  }
}
