import type { GeneratedAsset, PromptHistoryItem } from '@/types';

const STORAGE_KEY = 'canvas-generated-assets';
const HISTORY_KEY = 'canvas-prompt-history';

interface StoredAssets {
  [cardId: string]: GeneratedAsset[];
}

interface StoredHistory {
  [cardId: string]: PromptHistoryItem[];
}

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Save a generated asset to local storage
 */
export function saveAsset(cardId: string, asset: GeneratedAsset): void {
  if (!isBrowser) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const assets: StoredAssets = stored ? JSON.parse(stored) : {};

    if (!assets[cardId]) {
      assets[cardId] = [];
    }

    // Add or update the asset
    const existingIndex = assets[cardId].findIndex((a) => a.id === asset.id);
    if (existingIndex >= 0) {
      assets[cardId][existingIndex] = asset;
    } else {
      assets[cardId].push(asset);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Failed to save asset to localStorage:', error);
  }
}

/**
 * Get all assets for a specific card
 */
export function getAssets(cardId: string): GeneratedAsset[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const assets: StoredAssets = JSON.parse(stored);
    return assets[cardId] || [];
  } catch (error) {
    console.error('Failed to get assets from localStorage:', error);
    return [];
  }
}

/**
 * Get the latest asset for a card
 */
export function getLatestAsset(cardId: string): GeneratedAsset | null {
  const assets = getAssets(cardId);
  return assets.length > 0 ? assets[assets.length - 1] : null;
}

/**
 * Delete an asset from storage
 */
export function deleteAsset(cardId: string, assetId: string): void {
  if (!isBrowser) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const assets: StoredAssets = JSON.parse(stored);
    if (assets[cardId]) {
      assets[cardId] = assets[cardId].filter((a) => a.id !== assetId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    }
  } catch (error) {
    console.error('Failed to delete asset from localStorage:', error);
  }
}

/**
 * Clear all assets for a card
 */
export function clearCardAssets(cardId: string): void {
  if (!isBrowser) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const assets: StoredAssets = JSON.parse(stored);
    delete assets[cardId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Failed to clear card assets from localStorage:', error);
  }
}

/**
 * Save prompt history for a card
 */
export function savePromptHistory(cardId: string, history: PromptHistoryItem[]): void {
  if (!isBrowser) return;

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    const allHistory: StoredHistory = stored ? JSON.parse(stored) : {};
    allHistory[cardId] = history;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  } catch (error) {
    console.error('Failed to save prompt history to localStorage:', error);
  }
}

/**
 * Get prompt history for a card
 */
export function getPromptHistory(cardId: string): PromptHistoryItem[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    const allHistory: StoredHistory = JSON.parse(stored);
    return allHistory[cardId] || [];
  } catch (error) {
    console.error('Failed to get prompt history from localStorage:', error);
    return [];
  }
}

/**
 * Add a prompt to history
 */
export function addToPromptHistory(cardId: string, item: PromptHistoryItem): void {
  if (!isBrowser) return;

  try {
    const history = getPromptHistory(cardId);
    history.push(item);
    savePromptHistory(cardId, history);
  } catch (error) {
    console.error('Failed to add to prompt history:', error);
  }
}

/**
 * Clear all stored data
 */
export function clearAllStoredData(): void {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}

/**
 * Get storage size info (for debugging)
 */
export function getStorageInfo(): { assetsSize: number; historySize: number } {
  if (!isBrowser) return { assetsSize: 0, historySize: 0 };

  try {
    const assetsData = localStorage.getItem(STORAGE_KEY) || '';
    const historyData = localStorage.getItem(HISTORY_KEY) || '';

    return {
      assetsSize: new Blob([assetsData]).size,
      historySize: new Blob([historyData]).size,
    };
  } catch {
    return { assetsSize: 0, historySize: 0 };
  }
}
