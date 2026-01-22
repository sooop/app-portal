/**
 * IndexedDB CRUD wrapper for file history management
 * Database: app-portal-history
 * Store: fileHistory
 */

const DB_NAME = 'app-portal-history';
const DB_VERSION = 1;
const STORE_NAME = 'fileHistory';
const MAX_ENTRIES = 20;

/** @type {IDBDatabase | null} */
let db = null;

/**
 * Generate UUID v4
 * @returns {string}
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function initDatabase() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('IndexedDB 초기화 실패: ' + request.error?.message));
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = /** @type {IDBOpenDBRequest} */ (event.target).result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                store.createIndex('fileName', 'fileName', { unique: false });
            }
        };
    });
}

/**
 * Get database instance (initialize if needed)
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
    if (!db) {
        await initDatabase();
    }
    return /** @type {IDBDatabase} */ (db);
}

/**
 * @typedef {Object} FileHistoryEntry
 * @property {string} id - UUID primary key
 * @property {string} fileName - 파일명
 * @property {number} fileSize - 파일 크기 (bytes)
 * @property {number} uploadedAt - 타임스탬프
 * @property {ArrayBuffer} fileContent - 원본 파일
 * @property {Array} structuredAttendanceData - 출석 원본 데이터
 * @property {Array} satisfactionRawData - 만족도 원본 데이터
 * @property {Object} subjectCompletionRates - 이수 기준 설정
 */

/**
 * Save file history entry
 * @param {Omit<FileHistoryEntry, 'id' | 'uploadedAt'>} entry
 * @returns {Promise<string>} - Created entry ID
 */
export async function saveFileHistory(entry) {
    const database = await getDB();

    // Enforce storage limit before adding
    await enforceStorageLimit(MAX_ENTRIES - 1);

    const id = generateUUID();
    const fullEntry = {
        ...entry,
        id,
        uploadedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(fullEntry);

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(new Error('파일 저장 실패: ' + request.error?.message));
    });
}

/**
 * Get file history entry by ID
 * @param {string} id
 * @returns {Promise<FileHistoryEntry | null>}
 */
export async function getFileHistory(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('파일 불러오기 실패: ' + request.error?.message));
    });
}

/**
 * Get all file history entries (sorted by uploadedAt descending)
 * @returns {Promise<FileHistoryEntry[]>}
 */
export async function getAllFileHistory() {
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('uploadedAt');
        const request = index.openCursor(null, 'prev'); // Descending order

        /** @type {FileHistoryEntry[]} */
        const entries = [];

        request.onsuccess = (event) => {
            const cursor = /** @type {IDBRequest<IDBCursorWithValue>} */ (event.target).result;
            if (cursor) {
                entries.push(cursor.value);
                cursor.continue();
            } else {
                resolve(entries);
            }
        };

        request.onerror = () => reject(new Error('이력 조회 실패: ' + request.error?.message));
    });
}

/**
 * Delete file history entry by ID
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteFileHistory(id) {
    const database = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('파일 삭제 실패: ' + request.error?.message));
    });
}

/**
 * Enforce storage limit by removing oldest entries
 * @param {number} max - Maximum number of entries to keep
 * @returns {Promise<void>}
 */
export async function enforceStorageLimit(max = MAX_ENTRIES) {
    const entries = await getAllFileHistory();

    if (entries.length <= max) return;

    // Remove oldest entries (entries are already sorted by uploadedAt desc)
    const entriesToDelete = entries.slice(max);

    for (const entry of entriesToDelete) {
        await deleteFileHistory(entry.id);
    }
}

/**
 * Get summary list (without heavy data like fileContent)
 * @returns {Promise<Array<{id: string, fileName: string, fileSize: number, uploadedAt: number}>>}
 */
export async function getFileHistorySummaryList() {
    const entries = await getAllFileHistory();
    return entries.map(({ id, fileName, fileSize, uploadedAt }) => ({
        id,
        fileName,
        fileSize,
        uploadedAt
    }));
}
