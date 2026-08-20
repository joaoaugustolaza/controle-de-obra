// Sistema de cache local com IndexedDB
const DB_NAME = 'ObraPontoOfflineDB';
const DB_VERSION = 1;

class OfflineStorage {
  constructor() {
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Criar stores para cada tabela
        if (!db.objectStoreNames.contains('obras')) {
          db.createObjectStore('obras', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('funcionarios')) {
          db.createObjectStore('funcionarios', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pontos')) {
          db.createObjectStore('pontos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vales')) {
          db.createObjectStore('vales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async waitForDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  // Salvar dados no cache local
  async save(table, data) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      
      if (Array.isArray(data)) {
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Buscar dados do cache local
  async getAll(table) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Buscar um item específico
  async get(table, id) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Deletar item do cache
  async delete(table, id) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Limpar tabela inteira
  async clear(table) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Adicionar operação na fila de sincronização
  async addToSyncQueue(operation) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add({
        ...operation,
        timestamp: new Date().toISOString()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Buscar todas as operações pendentes
  async getSyncQueue() {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Remover operação da fila após sincronizar
  async removeFromSyncQueue(id) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Salvar metadados (ex: última sincronização)
  async setMetadata(key, value) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Buscar metadados
  async getMetadata(key) {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();