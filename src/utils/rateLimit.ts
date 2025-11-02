import { UsageData } from '../types/index.js';
import { getUsage, saveUsage, resetUsageIfExpired } from './storage.js';

/**
 * Tracks usage by incrementing the counter
 * Automatically resets if the reset period has expired
 * Throws error if rate limit is exceeded
 * Returns updated usage data
 */
export async function trackUsage(): Promise<UsageData> {
  try {
    // First check if usage needs to be reset
    let usage = await resetUsageIfExpired();
    
    // Check if rate limit is reached
    if (usage.count >= usage.limit) {
      const timeUntilReset = getTimeUntilReset(usage.resetDate);
      throw new Error(
        `Rate limit reached. Resets in ${timeUntilReset}. Current usage: ${usage.count}/${usage.limit}`
      );
    }
    
    // Increment usage count
    usage.count++;
    
    // Save updated usage
    await saveUsage(usage);
    
    console.log(`[RateLimit] Usage tracked: ${usage.count}/${usage.limit}`);
    
    return usage;
  } catch (error) {
    console.error('[RateLimit] Error tracking usage:', error);
    throw error;
  }
}

/**
 * Checks if rate limit has been reached
 * Returns object with status and time until reset
 */
export async function checkRateLimit(): Promise<{
  limitReached: boolean;
  currentCount: number;
  limit: number;
  timeUntilReset: string;
  resetDate: number;
}> {
  try {
    // Check and reset if expired
    const usage = await resetUsageIfExpired();
    
    const limitReached = usage.count >= usage.limit;
    const timeUntilReset = getTimeUntilReset(usage.resetDate);
    
    return {
      limitReached,
      currentCount: usage.count,
      limit: usage.limit,
      timeUntilReset,
      resetDate: usage.resetDate
    };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    throw error;
  }
}

/**
 * Resets the usage counter manually
 * Sets a new reset date 24 hours from now
 */
export async function resetUsage(): Promise<UsageData> {
  try {
    const usage = await getUsage();
    
    const resetUsage: UsageData = {
      count: 0,
      resetDate: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      limit: usage.limit
    };
    
    await saveUsage(resetUsage);
    
    console.log('[RateLimit] Usage manually reset');
    
    return resetUsage;
  } catch (error) {
    console.error('[RateLimit] Error resetting usage:', error);
    throw error;
  }
}

/**
 * Gets remaining usage count before hitting rate limit
 */
export async function getRemainingUsage(): Promise<number> {
  try {
    const usage = await resetUsageIfExpired();
    const remaining = Math.max(0, usage.limit - usage.count);
    return remaining;
  } catch (error) {
    console.error('[RateLimit] Error getting remaining usage:', error);
    return 0;
  }
}

/**
 * Calculates time until reset in human-readable format
 */
export function getTimeUntilReset(resetDate: number): string {
  const now = Date.now();
  const diff = resetDate - now;
  
  if (diff <= 0) {
    return 'now';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s`;
  }
}

/**
 * Formats reset date as readable string
 */
export function formatResetDate(resetDate: number): string {
  const date = new Date(resetDate);
  return date.toLocaleString();
}

/**
 * Checks if a specific usage count would exceed the limit
 * Useful for pre-checking before operations
 */
export async function wouldExceedLimit(additionalUsage = 1): Promise<boolean> {
  try {
    const usage = await resetUsageIfExpired();
    return (usage.count + additionalUsage) > usage.limit;
  } catch (error) {
    console.error('[RateLimit] Error checking if would exceed limit:', error);
    return true; // Fail safe - assume it would exceed
  }
}

/**
 * Gets usage percentage (0-100)
 */
export async function getUsagePercentage(): Promise<number> {
  try {
    const usage = await resetUsageIfExpired();
    if (usage.limit === 0) return 0;
    return Math.min(100, Math.round((usage.count / usage.limit) * 100));
  } catch (error) {
    console.error('[RateLimit] Error getting usage percentage:', error);
    return 0;
  }
}

/**
 * Updates the rate limit value
 * Useful when user changes settings
 */
export async function updateRateLimit(newLimit: number): Promise<void> {
  try {
    if (newLimit < 1) {
      throw new Error('Rate limit must be at least 1');
    }
    
    const usage = await getUsage();
    usage.limit = newLimit;
    await saveUsage(usage);
    
    console.log(`[RateLimit] Rate limit updated to ${newLimit}`);
  } catch (error) {
    console.error('[RateLimit] Error updating rate limit:', error);
    throw error;
  }
}
