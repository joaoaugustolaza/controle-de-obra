import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Platform, Modal, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { syncManager } from '../services/syncManager';
import { supabase } from '../services/supabase';

export default function ObrasScreen() {
  const [obras, setObras] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Ativa');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isOnline, setIsOnline] = useState(syncManager.getStatus().isOnline);
  const [capturandoLocalizacao, setCapturandoLocalizacao] = useState(false);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [mostrarPresenca, setMostrarPresenca] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [presencas, setPresencas] = useState({});
  const [dataHoje, setDataHoje] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarObras();
    
    const listener = (status) => {
      setIsOnline(status === 'online' || status === 'synced');
    };
    syncManager.addListener(listener);
    
    return () => {};
  }, []);

  useEffect(() => {
    if (obraSelecionada && mostrarPresenca) {
      carregarFuncionariosObra();
      carregarPresencas();
    }
  }, [obraSelecionada, mostrarPresenca, dataHoje]);

  async function carregarObras() {
    const data = await syncManager.getData('obras');
    setObras(data || []);
  }

  async function carregarFuncionariosObra() {
    if (!obraSelecionada) return;

    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('obra_id', obraSelecionada.id)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar funcionários:', error);
    } else {
      setFuncionarios(data || []);
    }
  }

  async function carregarPresencas() {
    if (!obraSelecionada) return;

    const { data, error } = await supabase
      .from('pontos')
      .select('*')
      .eq('obra_id', obraSelecionada.id)
      .eq('data', dataHoje);

    if (error) {
      console.error('Erro ao carregar presenças:', error);
    } else {
      const presencasMap = {};
      (data || []).forEach(ponto => {
        const key = `${ponto.funcionario_id}_${ponto.periodo}`;
        presencasMap[key] = true;
      });
      setPresencas(presencasMap);
    }
  }

  async function marcarPresenca(funcionarioId, periodo) {
    const key = `${funcionarioId}_${periodo}`;
    const jaMarcado = presencas[key];

    if (jaMarcado) {
      const { error } = await supabase
        .from('pontos')
        .delete()
        .eq('funcionario_id', funcionarioId)
        .eq('obra_id', obraSelecionada.id)
        .eq('data', dataHoje)
        .eq('periodo', periodo);

      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        const novasPresencas = { ...presencas };
        delete novasPresencas[key];
        setPresencas(novasPresencas);
      }
    } else {
      const { error } = await supabase
        .from('pontos')
        .insert([{
          funcionario_id: funcionarioId,
          obra_id: obraSelecionada.id,
          data: dataHoje,
          periodo: periodo
        }]);

      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        const novasPresencas = { ...presencas, [key]: true };
        setPresencas(novasPresencas);
      }
    }
  }

  function abrirMarcacaoPresenca(obra) {
    setObraSelecionada(obra);
    setMostrarPresenca(true);
  }

  function limparFormulario() {
    setNome('');
    setEndereco('');
    setResponsavel('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setStatus('Ativa');
    setLatitude(null);
    setLongitude(null);
    setEditando(null);
    setMostrarFormulario(false);
  }

  function iniciarEdicao(obra) {
    setEditando(obra);
    setNome(obra.nome);
    setEndereco(obra.endereco || '');
    setResponsavel(obra.responsavel || '');
    setDataInicio(obra.data_inicio || new Date().toISOString().split('T')[0]);
    setStatus(obra.status || 'Ativa');
    setLatitude(obra.latitude || null);
    setLongitude(obra.longitude || null);
    setMostrarFormulario(true);
  }

  async function capturarLocalizacaoAtual() {
    setCapturandoLocalizacao(true);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Permissão negada: Não foi possível acessar a localização');
        setCapturandoLocalizacao(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      
      alert('Sucesso: Localização capturada!');
    } catch (error) {
      console.error('Erro ao capturar localização:', error);
      alert('Erro: Não foi possível capturar a localização - ' + error.message);
    } finally {
      setCapturandoLocalizacao(false);
    }
  }

  async function salvarObra() {
    if (!nome.trim()) {
      alert('Atenção: Informe o nome da obra');
      return;
    }

    const obraData = {
      nome: nome.trim(),
      endereco: endereco.trim(),
      responsavel: responsavel.trim(),
      data_inicio: dataInicio,
      status: status,
      latitude: latitude,
      longitude: longitude
    };

    if (editando) {
      const result = await syncManager.saveData('obras', {
        ...editando,
        ...obraData
      });
      
      if (result.success) {
        alert('Sucesso: Obra atualizada!');
        limparFormulario();
        carregarObras();
      }
    } else {
      const result = await syncManager.saveData('obras', {
        ...obraData,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      });
      
      if (result.success) {
        alert('Sucesso: Obra cadastrada!');
        limparFormulario();
        carregarObras();
      }
    }
  }

  async function excluirObra(id) {
    const confirmar = window.confirm('Deseja realmente excluir esta obra?');
    if (!confirmar) return;

    const result = await syncManager.deleteData('obras', id);
    
    if (result.success) {
      alert('Sucesso: Obra excluída!');
      carregarObras();
    }
  }

  function abrirMapa(obra) {
    if (!obra.latitude || !obra.longitude) {
      alert('Atenção: Esta obra não tem localização registrada');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${obra.latitude},${obra.longitude}`;
    Linking.openURL(url);
  }

  function mudarData(dias) {
    const novaData = new Date(dataHoje);
    novaData.setDate(novaData.getDate() + dias);
    setDataHoje(novaData.toISOString().split('T')[0]);
  }

  function formatarData(data) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitulo}>Obras</Text>
            <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
              <Ionicons 
                name={isOnline ? 'wifi' : 'wifi-outline'} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitulo}>Gerencie suas obras</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.botaoNovaObra}
            onPress={() => setMostrarFormulario(!mostrarFormulario)}
          >
            <Ionicons name={mostrarFormulario ? 'close' : 'add'} size={24} color="#fff" />
            <Text style={styles.botaoNovaObraTexto}>
              {mostrarFormulario ? 'Cancelar' : 'Nova Obra'}
            </Text>
          </TouchableOpacity>

          {mostrarFormulario && (
            <View style={styles.formulario}>
              <Text style={styles.formularioTitulo}>
                {editando ? 'Editar Obra' : 'Nova Obra'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Obra *</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Residencial Nova Esperança"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Endereço</Text>
                <TextInput
                  style={styles.input}
                  value={endereco}
                  onChangeText={setEndereco}
                  placeholder="Ex: Rua das Flores, 123"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Responsável</Text>
                <TextInput
                  style={styles.input}
                  value={responsavel}
                  onChangeText={setResponsavel}
                  placeholder="Nome do responsável"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data de Início</Text>
                <TextInput
                  style={styles.input}
                  value={dataInicio}
                  onChangeText={setDataInicio}
                  placeholder="AAAA-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.statusButtons}>
                  {['Ativa', 'Paralisada', 'Concluída'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusButton,
                        status === s && styles.statusButtonSelecionado
                      ]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        status === s && styles.statusButtonTextSelecionado
                      ]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Localização (GPS)</Text>
                
                <TouchableOpacity 
                  style={styles.botaoLocalizacao}
                  onPress={capturarLocalizacaoAtual}
                  disabled={capturandoLocalizacao}
                >
                  <Ionicons 
                    name={capturandoLocalizacao ? 'hourglass' : 'location'} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.botaoLocalizacaoTexto}>
                    {capturandoLocalizacao ? 'Capturando...' : 'Capturar Localização Atual'}
                  </Text>
                </TouchableOpacity>

                {(latitude && longitude) && (
                  <View style={styles.localizacaoInfo}>
                    <View style={styles.coordenadasContainer}>
                      <Text style={styles.coordenadasLabel}>Latitude:</Text>
                      <Text style={styles.coordenadasValor}>{latitude.toFixed(6)}</Text>
                    </View>
                    <View style={styles.coordenadasContainer}>
                      <Text style={styles.coordenadasLabel}>Longitude:</Text>
                      <Text style={styles.coordenadasValor}>{longitude.toFixed(6)}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.botaoVerMapa}
                      onPress={() => abrirMapa({ latitude, longitude, nome })}
                    >
                      <Ionicons name="map" size={16} color="#2563eb" />
                      <Text style={styles.botaoVerMapaTexto}>Ver no Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.botaoSalvar}
                onPress={salvarObra}
              >
                <Text style={styles.botaoSalvarTexto}>
                  {editando ? 'Atualizar Obra' : 'Salvar Obra'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.listaObras}>
            <Text style={styles.listaTitulo}>Obras Cadastradas ({obras.length})</Text>

            {obras.length === 0 ? (
              <View style={styles.vazio}>
                <Ionicons name="business-outline" size={48} color="#cbd5e1" />
                <Text style={styles.vazioTexto}>Nenhuma obra cadastrada</Text>
              </View>
            ) : (
              obras.map((obra) => (
                <TouchableOpacity
                  key={obra.id}
                  style={styles.obraCard}
                  onPress={() => abrirMarcacaoPresenca(obra)}
                >
                  <View style={styles.obraHeader}>
                    <Text style={styles.obraNome}>{obra.nome}</Text>
                    <View style={[
                      styles.obraStatus,
                      obra.status === 'Ativa' && styles.statusAtiva,
                      obra.status === 'Paralisada' && styles.statusParalisada,
                      obra.status === 'Concluída' && styles.statusConcluida
                    ]}>
                      <Text style={styles.obraStatusTexto}>{obra.status}</Text>
                    </View>
                  </View>

                  {obra.endereco && (
                    <View style={styles.obraInfo}>
                      <Ionicons name="location" size={14} color="#64748b" />
                      <Text style={styles.obraInfoTexto}>{obra.endereco}</Text>
                    </View>
                  )}

                  {obra.responsavel && (
                    <View style={styles.obraInfo}>
                      <Ionicons name="person" size={14} color="#64748b" />
                      <Text style={styles.obraInfoTexto}>{obra.responsavel}</Text>
                    </View>
                  )}

                  {obra.data_inicio && (
                    <View style={styles.obraInfo}>
                      <Ionicons name="calendar" size={14} color="#64748b" />
                      <Text style={styles.obraInfoTexto}>
                        Início: {obra.data_inicio.split('-').reverse().join('/')}
                      </Text>
                    </View>
                  )}

                  {obra.latitude && obra.longitude && (
                    <View style={styles.obraInfo}>
                      <Ionicons name="navigate" size={14} color="#10b981" />
                      <Text style={styles.obraInfoTexto}>Localização registrada</Text>
                    </View>
                  )}

                  <View style={styles.obraAcoes}>
                    <TouchableOpacity 
                      style={styles.botaoEditar}
                      onPress={() => iniciarEdicao(obra)}
                    >
                      <Ionicons name="create" size={18} color="#2563eb" />
                      <Text style={styles.botaoEditarTexto}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.botaoExcluir}
                      onPress={() => excluirObra(obra.id)}
                    >
                      <Ionicons name="trash" size={18} color="#ef4444" />
                      <Text style={styles.botaoExcluirTexto}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal Fullscreen de Marcação de Presença */}
      <Modal
        visible={mostrarPresenca}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMostrarPresenca(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.botaoVoltar}
              onPress={() => setMostrarPresenca(false)}
            >
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitulo}>Marcar Presença</Text>
              <Text style={styles.modalSubtitulo}>{obraSelecionada?.nome}</Text>
            </View>
          </View>

          <View style={styles.dataContainer}>
            <TouchableOpacity onPress={() => mudarData(-1)} style={styles.botaoData}>
              <Ionicons name="chevron-back" size={24} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.dataTexto}>{formatarData(dataHoje)}</Text>
            <TouchableOpacity onPress={() => mudarData(1)} style={styles.botaoData}>
              <Ionicons name="chevron-forward" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {funcionarios.length === 0 ? (
              <View style={styles.vazioModal}>
                <Ionicons name="people-outline" size={64} color="#cbd5e1" />
                <Text style={styles.vazioModalTexto}>Nenhum funcionário nesta obra</Text>
                <Text style={styles.vazioModalSubtexto}>
                  Vá em "Funcionários" para vincular funcionários a esta obra
                </Text>
              </View>
            ) : (
              funcionarios.map((func) => {
                const manhaKey = `${func.id}_Manhã`;
                const tardeKey = `${func.id}_Tarde`;
                const manhaMarcado = presencas[manhaKey];
                const tardeMarcado = presencas[tardeKey];

                return (
                  <View key={func.id} style={styles.funcionarioCard}>
                    <View style={styles.funcionarioHeader}>
                      <Ionicons name="person" size={24} color="#2563eb" />
                      <View style={styles.funcionarioInfo}>
                        <Text style={styles.funcionarioNome}>{func.nome}</Text>
                        {func.cargo && <Text style={styles.funcionarioCargo}>{func.cargo}</Text>}
                      </View>
                    </View>

                    <View style={styles.botoesContainer}>
                      <TouchableOpacity
                        style={[
                          styles.botaoPeriodo,
                          manhaMarcado && styles.botaoMarcado
                        ]}
                        onPress={() => marcarPresenca(func.id, 'Manhã')}
                      >
                        <Ionicons
                          name={manhaMarcado ? 'checkmark-circle' : 'sunny'}
                          size={20}
                          color={manhaMarcado ? '#fff' : '#f59e0b'}
                        />
                        <Text style={[
                          styles.botaoPeriodoTexto,
                          manhaMarcado && styles.botaoPeriodoTextoMarcado
                        ]}>
                          {manhaMarcado ? 'Manhã ✓' : 'Manhã'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.botaoPeriodo,
                          tardeMarcado && styles.botaoMarcado
                        ]}
                        onPress={() => marcarPresenca(func.id, 'Tarde')}
                      >
                        <Ionicons
                          name={tardeMarcado ? 'checkmark-circle' : 'cloudy'}
                          size={20}
                          color={tardeMarcado ? '#fff' : '#64748b'}
                        />
                        <Text style={[
                          styles.botaoPeriodoTexto,
                          tardeMarcado && styles.botaoPeriodoTextoMarcado
                        ]}>
                          {tardeMarcado ? 'Tarde ✓' : 'Tarde'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statusContainer}>
                      {manhaMarcado && tardeMarcado && (
                        <Text style={styles.statusCompleto}>✓ Dia Completo</Text>
                      )}
                      {(manhaMarcado || tardeMarcado) && !(manhaMarcado && tardeMarcado) && (
                        <Text style={styles.statusParcial}>½ Meio Período</Text>
                      )}
                      {!manhaMarcado && !tardeMarcado && (
                        <Text style={styles.statusAusente}>○ Ausente</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitulo: { fontSize: 14, color: '#bfdbfe', marginTop: 5 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusOnline: { backgroundColor: '#10b981' },
  statusOffline: { backgroundColor: '#ef4444' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  content: { padding: 15 },
  botaoNovaObra: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  botaoNovaObraTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  formulario: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  formularioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 12, color: '#64748b', marginBottom: 5 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonSelecionado: { backgroundColor: '#2563eb' },
  statusButtonText: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  statusButtonTextSelecionado: { color: '#fff' },
  botaoLocalizacao: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  botaoLocalizacaoTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  localizacaoInfo: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  coordenadasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  coordenadasLabel: { fontSize: 11, color: '#64748b' },
  coordenadasValor: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  botaoVerMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  botaoVerMapaTexto: { color: '#2563eb', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  botaoSalvar: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listaObras: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  listaTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  vazio: {
    alignItems: 'center',
    padding: 30,
  },
  vazioTexto: { fontSize: 14, color: '#94a3b8', marginTop: 10 },
  obraCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  obraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  obraNome: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  obraStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAtiva: { backgroundColor: '#dcfce7' },
  statusParalisada: { backgroundColor: '#fef3c7' },
  statusConcluida: { backgroundColor: '#dbeafe' },
  obraStatusTexto: { fontSize: 11, fontWeight: 'bold' },
  obraInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  obraInfoTexto: { fontSize: 12, color: '#64748b', marginLeft: 5 },
  obraAcoes: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  botaoEditar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 6,
  },
  botaoEditarTexto: { color: '#2563eb', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  botaoExcluir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
  },
  botaoExcluirTexto: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoVoltar: {
    padding: 10,
    marginRight: 10,
  },
  modalHeaderInfo: { flex: 1 },
  modalTitulo: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  modalSubtitulo: { fontSize: 14, color: '#bfdbfe', marginTop: 2 },
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  botaoData: { padding: 10 },
  dataTexto: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginHorizontal: 20 },
  modalBody: {
    flex: 1,
    padding: 15,
  },
  vazioModal: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  vazioModalTexto: { fontSize: 16, color: '#94a3b8', marginTop: 15 },
  vazioModalSubtexto: { fontSize: 12, color: '#cbd5e1', marginTop: 5, textAlign: 'center' },
  funcionarioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  funcionarioHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  funcionarioInfo: { marginLeft: 10, flex: 1 },
  funcionarioNome: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  funcionarioCargo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  botoesContainer: { flexDirection: 'row', gap: 10 },
  botaoPeriodo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  botaoMarcado: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  botaoPeriodoTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 8,
  },
  botaoPeriodoTextoMarcado: {
    color: '#fff',
  },
  statusContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  statusCompleto: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  statusParcial: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold' },
  statusAusente: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
});