import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';

export default function ValesScreen() {
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [vales, setVales] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [valeEditando, setValeEditando] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarObras();
    }, [])
  );

  useEffect(() => {
    if (obraSelecionada) {
      carregarFuncionarios();
      carregarVales();
    }
  }, [obraSelecionada]);

  async function carregarObras() {
    const { data } = await supabase
      .from('obras')
      .select('*')
      .eq('status', 'Ativa')
      .order('nome');
    setObras(data || []);
  }

  async function carregarFuncionarios() {
    const { data } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('obra_id', obraSelecionada)
      .order('nome');
    setFuncionarios(data || []);
  }

  async function carregarVales() {
    const { data } = await supabase
      .from('vales')
      .select(`
        *,
        funcionarios:funcionario_id (nome, cargo)
      `)
      .eq('obra_id', obraSelecionada)
      .order('data', { ascending: false });
    setVales(data || []);
  }

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatarData(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  async function salvarVale() {
    if (!obraSelecionada) {
      alert('Atenção: Selecione uma obra');
      return;
    }
    if (!funcionarioSelecionado) {
      alert('Atenção: Selecione um funcionário');
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      alert('Atenção: Informe um valor válido');
      return;
    }
    if (!data) {
      alert('Atenção: Informe a data');
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from('vales')
      .insert([{
        obra_id: obraSelecionada,
        funcionario_id: funcionarioSelecionado,
        valor: parseFloat(valor),
        data: data,
        descricao: descricao || null
      }]);

    if (error) {
      alert('Erro: Não foi possível salvar o vale - ' + error.message);
    } else {
      alert('Sucesso: Vale registrado com sucesso!');
      setValor('');
      setDescricao('');
      setFuncionarioSelecionado(null);
      carregarVales();
    }

    setSalvando(false);
  }

  function iniciarEdicao(vale) {
    setEditando(vale.id);
    setValeEditando(vale);
    setFuncionarioSelecionado(vale.funcionario_id);
    setValor(vale.valor.toString());
    setData(vale.data);
    setDescricao(vale.descricao || '');
  }

  function cancelarEdicao() {
    setEditando(null);
    setValeEditando(null);
    setFuncionarioSelecionado(null);
    setValor('');
    setData(new Date().toISOString().split('T')[0]);
    setDescricao('');
  }

  async function atualizarVale() {
    if (!funcionarioSelecionado) {
      alert('Atenção: Selecione um funcionário');
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      alert('Atenção: Informe um valor válido');
      return;
    }
    if (!data) {
      alert('Atenção: Informe a data');
      return;
    }

    setSalvando(true);

    const { error } = await supabase
      .from('vales')
      .update({
        funcionario_id: funcionarioSelecionado,
        valor: parseFloat(valor),
        data: data,
        descricao: descricao || null
      })
      .eq('id', valeEditando.id);

    if (error) {
      alert('Erro: Não foi possível atualizar o vale - ' + error.message);
    } else {
      alert('Sucesso: Vale atualizado com sucesso!');
      cancelarEdicao();
      carregarVales();
    }

    setSalvando(false);
  }

  async function excluirVale(id) {
    const confirmar = window.confirm('Deseja realmente excluir este vale?');
    if (!confirmar) {
      return;
    }

    const { error } = await supabase
      .from('vales')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro: Não foi possível excluir - ' + error.message);
    } else {
      alert('Sucesso: Vale excluído!');
      carregarVales();
    }
  }

  const totalVales = vales.reduce((acc, vale) => acc + vale.valor, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Vales e Adiantamentos</Text>
        <Text style={styles.headerSubtitulo}>Registre vales por funcionário</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.selecaoObra}>
          <Text style={styles.label}>Selecione a Obra:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {obras.map((obra) => (
              <TouchableOpacity
                key={obra.id}
                style={[
                  styles.obraButton,
                  obraSelecionada === obra.id && styles.obraButtonSelecionado
                ]}
                onPress={() => setObraSelecionada(obra.id)}
              >
                <Text style={[
                  styles.obraButtonText,
                  obraSelecionada === obra.id && styles.obraButtonTextSelecionado
                ]}>
                  {obra.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {obraSelecionada && (
          <>
            <View style={styles.formulario}>
              <Text style={styles.formularioTitulo}>
                {editando ? 'Editar Vale' : 'Novo Vale'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Funcionário:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {funcionarios.map((func) => (
                    <TouchableOpacity
                      key={func.id}
                      style={[
                        styles.funcionarioButton,
                        funcionarioSelecionado === func.id && styles.funcionarioButtonSelecionado
                      ]}
                      onPress={() => setFuncionarioSelecionado(func.id)}
                    >
                      <Text style={[
                        styles.funcionarioButtonText,
                        funcionarioSelecionado === func.id && styles.funcionarioButtonTextSelecionado
                      ]}>
                        {func.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Valor (R$):</Text>
                <TextInput
                  style={styles.input}
                  value={valor}
                  onChangeText={setValor}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data:</Text>
                <TextInput
                  style={styles.input}
                  value={data}
                  onChangeText={setData}
                  placeholder="AAAA-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descrição (opcional):</Text>
                <TextInput
                  style={styles.input}
                  value={descricao}
                  onChangeText={setDescricao}
                  placeholder="Ex: Adiantamento quinzenal"
                />
              </View>

              <View style={styles.botoesContainer}>
                {editando ? (
                  <>
                    <TouchableOpacity 
                      style={styles.botaoCancelar}
                      onPress={cancelarEdicao}
                    >
                      <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.botaoAtualizar}
                      onPress={atualizarVale}
                      disabled={salvando}
                    >
                      <Text style={styles.botaoSalvarTexto}>
                        {salvando ? 'Salvando...' : 'Atualizar Vale'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={styles.botaoSalvar}
                    onPress={salvarVale}
                    disabled={salvando}
                  >
                    <Text style={styles.botaoSalvarTexto}>
                      {salvando ? 'Salvando...' : 'Salvar Vale'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.listaVales}>
              <View style={styles.listaHeader}>
                <Text style={styles.listaTitulo}>Vales Registrados</Text>
                <Text style={styles.totalTexto}>Total: {formatarMoeda(totalVales)}</Text>
              </View>

              {vales.length === 0 ? (
                <View style={styles.vazio}>
                  <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.vazioTexto}>Nenhum vale registrado</Text>
                </View>
              ) : (
                vales.map((vale) => (
                  <View key={vale.id} style={styles.valeCard}>
                    <View style={styles.valeHeader}>
                      <Text style={styles.valeNome}>{vale.funcionarios?.nome}</Text>
                      <View style={styles.valeAcoes}>
                        <TouchableOpacity onPress={() => iniciarEdicao(vale)}>
                          <Ionicons name="create" size={20} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => excluirVale(vale.id)} style={{ marginLeft: 15 }}>
                          <Ionicons name="trash" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.valeCargo}>{vale.funcionarios?.cargo}</Text>
                    <View style={styles.valeInfo}>
                      <View style={styles.valeInfoItem}>
                        <Text style={styles.valeInfoLabel}>Valor:</Text>
                        <Text style={styles.valeInfoValor}>{formatarMoeda(vale.valor)}</Text>
                      </View>
                      <View style={styles.valeInfoItem}>
                        <Text style={styles.valeInfoLabel}>Data:</Text>
                        <Text style={styles.valeInfoValor}>{formatarData(vale.data)}</Text>
                      </View>
                    </View>
                    {vale.descricao && (
                      <Text style={styles.valeDescricao}>{vale.descricao}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 20,
    paddingTop: 50,
  },
  headerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitulo: { fontSize: 14, color: '#ddd6fe', marginTop: 5 },
  content: { padding: 15 },
  selecaoObra: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  label: { fontSize: 14, color: '#64748b', marginBottom: 10 },
  obraButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  obraButtonSelecionado: { backgroundColor: '#8b5cf6' },
  obraButtonText: { color: '#64748b', fontWeight: '500' },
  obraButtonTextSelecionado: { color: '#fff' },
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
  funcionarioButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 8,
  },
  funcionarioButtonSelecionado: { backgroundColor: '#8b5cf6' },
  funcionarioButtonText: { color: '#64748b', fontSize: 13 },
  funcionarioButtonTextSelecionado: { color: '#fff' },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  botaoSalvar: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
  },
  botaoAtualizar: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  botaoCancelar: {
    backgroundColor: '#64748b',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  botaoSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botaoCancelarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  listaVales: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  listaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  listaTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  totalTexto: { fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' },
  vazio: {
    alignItems: 'center',
    padding: 30,
  },
  vazioTexto: { fontSize: 14, color: '#94a3b8', marginTop: 10 },
  valeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  valeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valeNome: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  valeCargo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  valeAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valeInfo: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  valeInfoItem: { flex: 1 },
  valeInfoLabel: { fontSize: 11, color: '#64748b' },
  valeInfoValor: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  valeDescricao: { fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' },
});