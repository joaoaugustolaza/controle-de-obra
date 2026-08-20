import { supabase } from './supabase';
import { offlineStorage } from './offlineStorage';

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncing = false;
    this.listeners = [];
    
    // Monitorar conexão
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Sincronizar a cada 30 segundos quando online
    setInterval(() => {
      if (this.isOnline && !this.syncing) {
        this.syncAll();
      }
    }, 30000);
  }

  handleOnline() {
    console.log('🟢 App voltou online');
    this.isOnline = true;
    this.notifyListeners('online');
    this.syncAll();
  }

  handleOffline() {
    console.log('🔴 App ficou offline');
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  // Adicionar listener para mudanças de status
  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status));
  }

  // Buscar dados com fallback para cache local
  async getData(table, forceRefresh = false) {
    // Se está offline, buscar apenas do cache
    if (!this.isOnline) {
      console.log(`📱 Offline - buscando ${table} do cache local`);
      return await offlineStorage.getAll(table);
    }

    // Se está online, tentar buscar do servidor
    if (!forceRefresh) {
      // Verificar se tem dados recentes no cache (menos de 5 minutos)
      const lastSync = await offlineStorage.getMetadata(`lastSync_${table}`);
      if (lastSync) {
        const tempoDesdeSync = Date.now() - new Date(lastSync).getTime();
        if (tempoDesdeSync < 5 * 60 * 1000) {
          console.log(`✅ ${table} está atualizado no cache`);
          return await offlineStorage.getAll(table);
        }
      }
    }

    try {
      console.log(`🔄 Buscando ${table} do servidor...`);
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) throw error;

      // Salvar no cache local
      await offlineStorage.clear(table);
      if (data && data.length > 0) {
        await offlineStorage.save(table, data);
      }

      // Atualizar timestamp da última sincronização
      await offlineStorage.setMetadata(`lastSync_${table}`, new Date().toISOString());

      console.log(`✅ ${table} sincronizado com sucesso`);
      return data || [];
    } catch (error) {
      console.error(`❌ Erro ao buscar ${table}:`, error);
      // Se falhar, retornar dados do cache
      return await offlineStorage.getAll(table);
    }
  }

  // Salvar dados (local + servidor)
  async saveData(table, data) {
    // Sempre salvar no cache local primeiro
    await offlineStorage.save(table, data);

    // Se está online, tentar salvar no servidor
    if (this.isOnline) {
      try {
        const { error } = await supabase
          .from(table)
          .upsert(data);

        if (error) throw error;

        console.log(`✅ ${table} salvo no servidor`);
        return { success: true, fromCache: false };
      } catch (error) {
        console.error(`❌ Erro ao salvar ${table} no servidor:`, error);
        // Adicionar na fila de sincronização
        await offlineStorage.addToSyncQueue({
          table,
          operation: 'upsert',
          data
        });
        return { success: true, fromCache: true, pending: true };
      }
    } else {
      // Se está offline, adicionar na fila de sincronização
      await offlineStorage.addToSyncQueue({
        table,
        operation: 'upsert',
        data
      });
      return { success: true, fromCache: true, pending: true };
    }
  }

  // Deletar dados (local + servidor)
  async deleteData(table, id) {
    // Sempre deletar do cache local primeiro
    await offlineStorage.delete(table, id);

    // Se está online, tentar deletar no servidor
    if (this.isOnline) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;

        console.log(`✅ ${table} deletado do servidor`);
        return { success: true, fromCache: false };
      } catch (error) {
        console.error(`❌ Erro ao deletar ${table} do servidor:`, error);
        // Adicionar na fila de sincronização
        await offlineStorage.addToSyncQueue({
          table,
          operation: 'delete',
          id
        });
        return { success: true, fromCache: true, pending: true };
      }
    } else {
      // Se está offline, adicionar na fila de sincronização
      await offlineStorage.addToSyncQueue({
        table,
        operation: 'delete',
        id
      });
      return { success: true, fromCache: true, pending: true };
    }
  }

  // Sincronizar todas as operações pendentes
  async syncAll() {
    if (this.syncing || !this.isOnline) return;

    this.syncing = true;
    console.log('🔄 Iniciando sincronização...');

    try {
      const queue = await offlineStorage.getSyncQueue();

      if (queue.length === 0) {
        console.log('✅ Nada para sincronizar');
        this.syncing = false;
        return;
      }

      console.log(`📦 ${queue.length} operações pendentes`);

      for (const item of queue) {
        try {
          if (item.operation === 'upsert') {
            const { error } = await supabase
              .from(item.table)
              .upsert(item.data);

            if (error) throw error;
          } else if (item.operation === 'delete') {
            const { error } = await supabase
              .from(item.table)
              .delete()
              .eq('id', item.id);

            if (error) throw error;
          }

          // Remover da fila após sincronizar com sucesso
          await offlineStorage.removeFromSyncQueue(item.id);
          console.log(`✅ Operação sincronizada: ${item.table}`);
        } catch (error) {
          console.error(`❌ Erro ao sincronizar operação:`, error);
          // Se falhar, tentar novamente na próxima sincronização
          break;
        }
      }

      console.log('✅ Sincronização concluída');
      this.notifyListeners('synced');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    } finally {
      this.syncing = false;
    }
  }

  // Forçar sincronização completa (recarregar tudo do servidor)
  async forceSync() {
    console.log('🔄 Forçando sincronização completa...');
    
    const tables = ['obras', 'funcionarios', 'pontos', 'vales'];
    
    for (const table of tables) {
      await this.getData(table, true);
    }

    await this.syncAll();
    
    console.log('✅ Sincronização completa concluída');
  }

  // Verificar status
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing
    };
  }
}

export const syncManager = new SyncManager();