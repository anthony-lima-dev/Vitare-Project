const DB_NAME = "vitare-pwa-cache";
// v2: adiciona a store `outbox` (operações de emergência pendentes). A
// migração preserva o cache de respostas já persistido — nada é apagado.
const DB_VERSION = 2;
const STORE_NAME = "responses";
const OUTBOX_STORE = "outbox";

export interface IndexedDbCacheRecord<T = unknown> {
  key: string;
  scope: string;
  url: string;
  storedAt: number;
  expiresAt: number;
  data: T;
}

let databasePromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB não está disponível neste navegador."));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o IndexedDB."));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("scope", "scope", { unique: false });
        store.createIndex("expiresAt", "expiresAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        outbox.createIndex("ownerId", "ownerId", { unique: false });
        outbox.createIndex("state", "state", { unique: false });
        outbox.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
      }
    };
  });

  return databasePromise;
}

/** Abre uma transação na store informada (interno). */
export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let resultValue: T | undefined;
    const result = fn(transaction.objectStore(storeName));
    if (result) {
      result.onsuccess = () => {
        resultValue = result.result;
      };
    }
    transaction.oncomplete = () => resolve(resultValue);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Transação IndexedDB abortada."));
  });
}

export function getOutboxStoreName(): string {
  return OUTBOX_STORE;
}

export async function putIndexedDbCache<T>(record: IndexedDbCacheRecord<T>): Promise<void> {
  try {
    await withStore(STORE_NAME, "readwrite", (store) => {
      store.put(record);
    });
  } catch (error) {
    // Cache failure must never break the network-first application flow.
    console.warn("Vitare: não foi possível gravar o cache IndexedDB.", error);
  }
}

export async function getIndexedDbCache<T>(key: string): Promise<IndexedDbCacheRecord<T> | null> {
  try {
    const record = await withStore<IndexedDbCacheRecord<T>>(STORE_NAME, "readonly", (store) =>
      store.get(key),
    );
    return record ?? null;
  } catch (error) {
    console.warn("Vitare: não foi possível ler o cache IndexedDB.", error);
    return null;
  }
}

export async function deleteIndexedDbCache(key: string): Promise<void> {
  try {
    await withStore(STORE_NAME, "readwrite", (store) => {
      store.delete(key);
    });
  } catch (error) {
    console.warn("Vitare: não foi possível remover um item do cache IndexedDB.", error);
  }
}

export async function clearIndexedDbScope(scope: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.index("scope").openCursor(IDBKeyRange.only(scope));

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("Limpeza IndexedDB abortada."));
    });
  } catch (error) {
    console.warn("Vitare: não foi possível limpar o cache IndexedDB.", error);
  }
}
