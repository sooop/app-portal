/**
 * Svelte 5 reactive store for file history management
 */

import {
    initDatabase,
    saveFileHistory,
    getFileHistory,
    getFileHistorySummaryList,
    deleteFileHistory,
    clearAllHistory
} from './indexeddb.js';

/**
 * @typedef {Object} HistorySummary
 * @property {string} id
 * @property {string} fileName
 * @property {number} fileSize
 * @property {number} uploadedAt
 */

/** @type {HistorySummary[]} */
let historyList = $state([]);

/** @type {string | null} */
let currentHistoryId = $state(null);

/** @type {boolean} */
let isLoading = $state(false);

/** @type {string | null} */
let error = $state(null);

/**
 * Initialize and load history list from IndexedDB
 * @returns {Promise<void>}
 */
export async function loadHistoryList() {
    try {
        isLoading = true;
        error = null;
        await initDatabase();
        historyList = await getFileHistorySummaryList();
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Failed to load history list:', err);
    } finally {
        isLoading = false;
    }
}

/**
 * Add a new file to history
 * @param {Object} fileData
 * @param {string} fileData.fileName
 * @param {number} fileData.fileSize
 * @param {ArrayBuffer} fileData.fileContent
 * @param {Array} fileData.structuredAttendanceData
 * @param {Array} fileData.satisfactionRawData
 * @param {Object} fileData.subjectCompletionRates
 * @returns {Promise<string>} - Created entry ID
 */
export async function addToHistory(fileData) {
    try {
        isLoading = true;
        error = null;
        const id = await saveFileHistory(fileData);
        currentHistoryId = id;
        // Reload list to reflect changes
        historyList = await getFileHistorySummaryList();
        return id;
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Failed to add to history:', err);
        throw err;
    } finally {
        isLoading = false;
    }
}

/**
 * Load a file entry from history
 * @param {string} id
 * @returns {Promise<import('./indexeddb.js').FileHistoryEntry | null>}
 */
export async function switchToEntry(id) {
    try {
        isLoading = true;
        error = null;
        const entry = await getFileHistory(id);
        if (entry) {
            currentHistoryId = id;
        }
        return entry;
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Failed to switch to entry:', err);
        throw err;
    } finally {
        isLoading = false;
    }
}

/**
 * Remove an entry from history
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removeEntry(id) {
    try {
        isLoading = true;
        error = null;
        await deleteFileHistory(id);

        // If removing current entry, clear current ID
        if (currentHistoryId === id) {
            currentHistoryId = null;
        }

        // Reload list
        historyList = await getFileHistorySummaryList();
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Failed to remove entry:', err);
        throw err;
    } finally {
        isLoading = false;
    }
}

/**
 * Clear all history entries
 * @returns {Promise<void>}
 */
export async function clearAllEntries() {
    try {
        isLoading = true;
        error = null;
        await clearAllHistory();
        currentHistoryId = null;
        historyList = [];
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error('Failed to clear all entries:', err);
        throw err;
    } finally {
        isLoading = false;
    }
}

/**
 * Clear current selection
 */
export function clearCurrentSelection() {
    currentHistoryId = null;
}

/**
 * Get reactive history list
 * @returns {HistorySummary[]}
 */
export function getHistoryList() {
    return historyList;
}

/**
 * Get current history ID
 * @returns {string | null}
 */
export function getCurrentHistoryId() {
    return currentHistoryId;
}

/**
 * Get loading state
 * @returns {boolean}
 */
export function getIsLoading() {
    return isLoading;
}
