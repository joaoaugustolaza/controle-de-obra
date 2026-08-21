import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function ObrasScreen() {
  const [obras, setObras] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [funcionariosObra, setFuncionariosObra] = useState([]);
  const [todosFuncionarios, setTodosFuncionarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const [dataSelecionada, setDataSelecionada] = useState(criarDataLocal());
  const [registrosDia, setRegistrosDia] = useState({});
  
  const [mostrarEditar, setMostrarEditar] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [funcionarioHistorico, setFuncionarioHistorico] = useState(null);
  const [historicoRegistros, setHistoricoRegistros] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  useEffect(() => {
    carregarObras();
  }, []);

  useEffect(() => {
    if (obraSelecionada && mostrarModal && !mostrarHistorico) {
      carregarDadosObra();
    }
  }, [obraSelecionada, dataSelecionada, mostrarModal, mostrarHistorico]);

  function criarDataLocal() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    return hoje;
  }

  function formatarDataISO(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarDataDisplay(date) {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  async function carregarObras() {
    const { data } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    setObras(data || []);
  }

  async function salvarObra() {
    if (!nome || !endereco) {
      Alert.alert('Erro', 'Preencha nome e endereço');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.from('obras').insert([
      { nome, endereco, responsavel, status: 'Ativa' }
    ]);
    setCarregando(false);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Obra cadastrada!');
      setNome('');
      setEndereco('');
      setResponsavel('');
      setMostrarForm(false);
      carregarObras();
    }
  }

  async function abrirObra(obra) {
    setObraSelecionada(obra);
    setDataSelecionada(criarDataLocal());
    setMostrarModal(true);
  }

  async function carregarDadosObra() {
    if (!obraSelecionada) return;

    const { data: funcsObra } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('obra_id', obraSelecionada.id)
      .order('nome');

    const { data: todosFuncs } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome');

    setFuncionariosObra(funcsObra || []);
    setTodosFuncionarios(todosFuncs || []);

    const dataStr = formatarDataISO(dataSelecionada);
    const { data: pontos } = await supabase
      .from('pontos')
      .select('*')
      .eq('obra_id', obraSelecionada.id)
      .eq('data', dataStr);

    const registros = {};
    (pontos || []).forEach(p => {
      if (!registros[p.funcionario_id]) {
        registros[p.funcionario_id] = { manha: false, tarde: false };
      }
      if (p.periodo === 'Manhã') registros[p.funcionario_id].manha = true;
      if (p.periodo === 'Tarde') registros[p.funcionario_id].tarde = true;
    });
    setRegistrosDia(registros);
  }

  async function adicionarFuncionario(funcionarioId) {
    const { error } = await supabase
      .from('funcionarios')
      .update({ obra_id: obraSelecionada.id })
      .eq('id', funcionarioId);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      await carregarDadosObra();
    }
  }

  async function removerFuncionario(funcionarioId) {
    Alert.alert(
      'Confirmar',
      'Remover este funcionário da obra? (Ele volta para a lista geral)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('funcionarios')
              .update({ obra_id: null })
              .eq('id', funcionarioId);

            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              await carregarDadosObra();
            }
          }
        }
      ]
    );
  }

  function abrirEditarFuncionario(func) {
    setFuncionarioEditando(func);
    setEditNome(func.nome);
    setEditCpf(func.cpf || '');
    setEditCargo(func.cargo || '');
    setEditTelefone(func.telefone || '');
    setMostrarEditar(true);
  }

  async function salvarEdicao() {
    if (!editNome) {
      Alert.alert('Erro', 'Preencha o nome');
      return;
    }

    const { error } = await supabase
      .from('funcionarios')
      .update({
        nome: editNome,
        cpf: editCpf,
        cargo: editCargo,
        telefone: editTelefone,
      })
      .eq('id', funcionarioEditando.id);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Funcionário atualizado!');
      setMostrarEditar(false);
      await carregarDadosObra();
    }
  }

  async function abrirHistorico(func) {
    setFuncionarioHistorico(func);
    setCarregandoHistorico(true);
    setMostrarHistorico(true);
    
    await carregarHistoricoFuncionario(func.id);
  }

  async function carregarHistoricoFuncionario(funcionarioId) {
    console.log('Carregando histórico para funcionário:', funcionarioId);
    
    const { data: pontos, error } = await supabase
      .from('pontos')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .eq('obra_id', obraSelecionada.id)
      .order('data', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico: ' + error.message);
      setHistoricoRegistros([]);
    } else {
      console.log('Histórico carregado:', pontos?.length || 0, 'registros');
      setHistoricoRegistros(pontos || []);
    }
    setCarregandoHistorico(false);
  }

  async function fecharHistorico() {
    setMostrarHistorico(false);
    setFuncionarioHistorico(null);
    setHistoricoRegistros([]);
    await carregarDadosObra();
  }

  async function editarData(pontoId, novaData) {
    const { error } = await supabase
      .from('pontos')
      .update({ data: novaData })
      .eq('id', pontoId);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Data alterada!');
      await carregarHistoricoFuncionario(funcionarioHistorico.id);
      await carregarDadosObra();
    }
  }

  async function alternarPeriodo(pontoId, periodoAtual, novoPeriodo) {
    if (periodoAtual === novoPeriodo) {
      await removerRegistro(pontoId);
    } else {
      const { error } = await supabase
        .from('pontos')
        .update({ periodo: novoPeriodo })
        .eq('id', pontoId);

      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Sucesso', `Alterado para ${novoPeriodo}!`);
        await carregarHistoricoFuncionario(funcionarioHistorico.id);
        await carregarDadosObra();
      }
    }
  }

  async function removerRegistro(pontoId) {
    Alert.alert(
      'Confirmar',
      'Remover este registro de presença?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            console.log('Removendo registro ID:', pontoId);
            
            const { error } = await supabase
              .from('pontos')
              .delete()
              .eq('id', pontoId);

            if (error) {
              console.error('Erro ao remover:', error);
              Alert.alert('Erro', 'Não foi possível remover: ' + error.message);
            } else {
              console.log('Registro removido com sucesso');
              Alert.alert('Sucesso', 'Registro removido!');
              await carregarHistoricoFuncionario(funcionarioHistorico.id);
              await carregarDadosObra();
            }
          }
        }
      ]
    );
  }

  async function limparTodosRegistros() {
    Alert.alert(
      '⚠️ Confirmar Limpeza',
      `ATENÇÃO: Esta ação irá APAGAR TODOS os registros de presença de ${funcionarioHistorico.nome} nesta obra.\n\nEsta ação NÃO pode ser desfeita.\n\nDeseja realmente continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            console.log('=== INICIANDO LIMPEZA ===');
            console.log('Funcionário ID:', funcionarioHistorico.id);
            console.log('Obra ID:', obraSelecionada.id);

            const { error } = await supabase
              .from('pontos')
              .delete()
              .eq('funcionario_id', funcionarioHistorico.id)
              .eq('obra_id', obraSelecionada.id);

            if (error) {
              console.error('Erro ao limpar:', error);
              Alert.alert('Erro', 'Não foi possível limpar: ' + error.message);
            } else {
              console.log('Limpeza executada, recarregando histórico...');
              Alert.alert('Sucesso', 'Registros apagados!');
              setHistoricoRegistros([]);
              await carregarHistoricoFuncionario(funcionarioHistorico.id);
              await carregarDadosObra();
            }
          }
        }
      ]
    );
  }

  async function marcarPresenca(funcionarioId, periodo) {
    const registroAtual = registrosDia[funcionarioId] || { manha: false, tarde: false };
    
    const novoRegistro = {
      manha: periodo === 'manha' ? !registroAtual.manha : registroAtual.manha,
      tarde: periodo === 'tarde' ? !registroAtual.tarde : registroAtual.tarde,
    };

    const dataStr = formatarDataISO(dataSelecionada);

    await supabase
      .from('pontos')
      .delete()
      .eq('funcionario_id', funcionarioId)
      .eq('obra_id', obraSelecionada.id)
      .eq('data', dataStr);

    if (novoRegistro.manha) {
      await supabase.from('pontos').insert([{
        funcionario_id: funcionarioId,
        obra_id: obraSelecionada.id,
        data: dataStr,
        periodo: 'Manhã',
      }]);
    }

    if (novoRegistro.tarde) {
      await supabase.from('pontos').insert([{
        funcionario_id: funcionarioId,
        obra_id: obraSelecionada.id,
        data: dataStr,
        periodo: 'Tarde',
      }]);
    }

    await carregarDadosObra();
  }

  function mudarData(dias) {
    const novaData = new Date(dataSelecionada);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData);
  }

  const funcionariosDisponiveis = todosFuncionarios.filter(f => !f.obra_id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Obras</Text>
        <TouchableOpacity onPress={() => setMostrarForm(!mostrarForm)}>
          <Ionicons name={mostrarForm ? "close" : "add"} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {mostrarForm && (
          <View style={styles.form}>
            <Text style={styles.formTitulo}>Cadastrar Nova Obra</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da Obra"
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Endereço"
              value={endereco}
              onChangeText={setEndereco}
            />
            <TextInput
              style={styles.input}
              placeholder="Responsável"
              value={responsavel}
              onChangeText={setResponsavel}
            />
            <TouchableOpacity 
              style={styles.botaoSalvar}
              onPress={salvarObra}
              disabled={carregando}
            >
              <Text style={styles.botaoSalvarTexto}>
                {carregando ? 'Salvando...' : 'Salvar Obra'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {obras.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="business-outline" size={64} color="#cbd5e1" />
            <Text style={styles.vazioTexto}>Nenhuma obra cadastrada</Text>
          </View>
        ) : (
          obras.map((obra) => (
            <TouchableOpacity 
              key={obra.id} 
              style={styles.card}
              onPress={() => abrirObra(obra)}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="business" size={24} color="#2563eb" />
                <Text style={styles.cardTitulo}>{obra.nome}</Text>
              </View>
              <Text style={styles.cardInfo}>{obra.endereco}</Text>
              <View style={styles.cardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.statusText, { color: '#16a34a' }]}>{obra.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={mostrarModal && !mostrarHistorico}
        animationType="slide"
        onRequestClose={() => setMostrarModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostrarModal(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>{obraSelecionada?.nome}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.obraInfo}>
              <Text style={styles.obraInfoLabel}>Endereço:</Text>
              <Text style={styles.obraInfoValor}>{obraSelecionada?.endereco}</Text>
            </View>

            <View style={styles.selecaoData}>
              <TouchableOpacity onPress={() => mudarData(-1)} style={styles.botaoData}>
                <Ionicons name="chevron-back" size={24} color="#2563eb" />
              </TouchableOpacity>
              <View style={styles.dataDisplay}>
                <Text style={styles.dataTexto}>{formatarDataDisplay(dataSelecionada)}</Text>
                <Text style={styles.dataSubtexto}>
                  {dataSelecionada.toLocaleDateString('pt-BR', { weekday: 'long' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => mudarData(1)} style={styles.botaoData}>
                <Ionicons name="chevron-forward" size={24} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <Text style={styles.secaoTitulo}>
              Funcionários na Obra ({funcionariosObra.length})
            </Text>
            
            {funcionariosObra.length === 0 ? (
              <View style={styles.vazioPequeno}>
                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                <Text style={styles.vazioTexto}>Nenhum funcionário nesta obra</Text>
                <Text style={styles.vazioSubtexto}>
                  Adicione funcionários abaixo
                </Text>
              </View>
            ) : (
              funcionariosObra.map((func) => {
                const registro = registrosDia[func.id] || { manha: false, tarde: false };
                return (
                  <View key={func.id} style={styles.funcionarioCard}>
                    <View style={styles.funcionarioHeader}>
                      <View style={styles.funcionarioInfo}>
                        <Ionicons name="person" size={20} color="#10b981" />
                        <View style={styles.funcionarioTexto}>
                          <Text style={styles.funcionarioNome}>{func.nome}</Text>
                          {func.cargo && <Text style={styles.funcionarioCargo}>{func.cargo}</Text>}
                        </View>
                      </View>
                      <View style={styles.botoesAcao}>
                        <TouchableOpacity 
                          onPress={() => abrirHistorico(func)}
                          style={styles.botaoAcao}
                        >
                          <Ionicons name="time" size={22} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => abrirEditarFuncionario(func)}
                          style={styles.botaoAcao}
                        >
                          <Ionicons name="create" size={22} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => removerFuncionario(func.id)}
                          style={styles.botaoAcao}
                        >
                          <Ionicons name="remove-circle" size={22} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.periodosContainer}>
                      <TouchableOpacity
                        style={[
                          styles.periodoButton,
                          registro.manha && styles.periodoButtonAtivo
                        ]}
                        onPress={() => marcarPresenca(func.id, 'manha')}
                      >
                        <Ionicons 
                          name="sunny" 
                          size={18} 
                          color={registro.manha ? "#fff" : "#f59e0b"} 
                        />
                        <Text style={[
                          styles.periodoTexto,
                          registro.manha && styles.periodoTextoAtivo
                        ]}>
                          Manhã
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.periodoButton,
                          registro.tarde && styles.periodoButtonAtivo
                        ]}
                        onPress={() => marcarPresenca(func.id, 'tarde')}
                      >
                        <Ionicons 
                          name="partly-sunny" 
                          size={18} 
                          color={registro.tarde ? "#fff" : "#f59e0b"} 
                        />
                        <Text style={[
                          styles.periodoTexto,
                          registro.tarde && styles.periodoTextoAtivo
                        ]}>
                          Tarde
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {funcionariosDisponiveis.length > 0 && (
              &lt;>
                <Text style={styles.secaoTitulo}>
                  Adicionar Funcionário ({funcionariosDisponiveis.length} disponíveis)
                </Text>
                {funcionariosDisponiveis.map((func) => (
                  <View key={func.id} style={styles.funcionarioCardDisponivel}>
                    <View style={styles.funcionarioInfo}>
                      <Ionicons name="person-add" size={20} color="#2563eb" />
                      <View style={styles.funcionarioTexto}>
                        <Text style={styles.funcionarioNome}>{func.nome}</Text>
                        {func.cargo && <Text style={styles.funcionarioCargo}>{func.cargo}</Text>}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => adicionarFuncionario(func.id)}>
                      <Ionicons name="add-circle" size={28} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={mostrarHistorico}
        animationType="slide"
        onRequestClose={() => fecharHistorico()}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => fecharHistorico()}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>Histórico - {funcionarioHistorico?.nome}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.botaoLimparTudo}
              onPress={limparTodosRegistros}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.botaoLimparTexto}>Limpar Todos os Registros</Text>
            </TouchableOpacity>

            {carregandoHistorico ? (
              <View style={styles.carregandoContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.carregandoTexto}>Carregando histórico...</Text>
              </View>
            ) : historicoRegistros.length === 0 ? (
              <View style={styles.vazioPequeno}>
                <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                <Text style={styles.vazioTexto}>Nenhum registro de presença</Text>
              </View>
            ) : (
              historicoRegistros.map((registro) => {
                const isManha = registro.periodo === 'Manhã';
                const isTarde = registro.periodo === 'Tarde';
                
                return (
                  <View key={registro.id} style={styles.registroCard}>
                    <View style={styles.registroHeader}>
                      <View style={styles.registroInfo}>
                        <Ionicons name="calendar" size={18} color="#8b5cf6" />
                        <Text style={styles.registroData}>
                          {new Date(registro.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </Text>
                        <Text style={styles.registroDiaSemana}>
                          {new Date(registro.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removerRegistro(registro.id)}>
                        <Ionicons name="trash" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.editarDataContainer}>
                      <Text style={styles.editarDataLabel}>Editar Data:</Text>
                      <TouchableOpacity 
                        style={styles.editarDataButton}
                        onPress={() => {
                          const novaData = prompt('Digite a nova data (AAAA-MM-DD):', registro.data);
                          if (novaData && /^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
                            editarData(registro.id, novaData);
                          } else if (novaData) {
                            Alert.alert('Erro', 'Formato inválido. Use AAAA-MM-DD');
                          }
                        }}
                      >
                        <Ionicons name="create" size={16} color="#2563eb" />
                        <Text style={styles.editarDataTexto}>Alterar Data</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.registroInstrucao}>
                      Toque para alternar período:
                    </Text>

                    <View style={styles.registroPeriodos}>
                      <TouchableOpacity
                        style={[
                          styles.registroPeriodoButton,
                          isManha && styles.registroPeriodoAtivo
                        ]}
                        onPress={() => alternarPeriodo(registro.id, registro.periodo, 'Manhã')}
                      >
                        <Ionicons 
                          name="sunny" 
                          size={16} 
                          color={isManha ? "#fff" : "#f59e0b"} 
                        />
                        <Text style={[
                          styles.registroPeriodoTexto,
                          isManha && styles.registroPeriodoTextoAtivo
                        ]}>
                          {isManha ? 'Manhã ✓' : 'Manhã'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.registroPeriodoButton,
                          isTarde && styles.registroPeriodoAtivo
                        ]}
                        onPress={() => alternarPeriodo(registro.id, registro.periodo, 'Tarde')}
                      >
                        <Ionicons 
                          name="partly-sunny" 
                          size={16} 
                          color={isTarde ? "#fff" : "#f59e0b"} 
                        />
                        <Text style={[
                          styles.registroPeriodoTexto,
                          isTarde && styles.registroPeriodoTextoAtivo
                        ]}>
                          {isTarde ? 'Tarde ✓' : 'Tarde'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.registroAtual}>
                      Status: <Text style={styles.registroAtualValor}>{registro.periodo}</Text>
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={mostrarEditar}
        animationType="slide"
        onRequestClose={() => setMostrarEditar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostrarEditar(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>Editar Funcionário</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nome Completo"
                value={editNome}
                onChangeText={setEditNome}
              />
              <TextInput
                style={styles.input}
                placeholder="CPF"
                value={editCpf}
                onChangeText={setEditCpf}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Cargo"
                value={editCargo}
                onChangeText={setEditCargo}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                value={editTelefone}
                onChangeText={setEditTelefone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity 
                style={styles.botaoSalvar}
                onPress={salvarEdicao}
              >
                <Text style={styles.botaoSalvarTexto}>Salvar Alterações</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  formTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  botaoSalvar: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  vazioTexto: { color: '#94a3b8', marginTop: 15, fontSize: 16 },
  card: {
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 10 },
  cardInfo: { fontSize: 14, color: '#64748b', marginBottom: 5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  modalContent: { flex: 1, padding: 15 },
  obraInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  obraInfoLabel: { fontSize: 12, color: '#64748b' },
  obraInfoValor: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  selecaoData: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botaoData: { padding: 10 },
  dataDisplay: { alignItems: 'center' },
  dataTexto: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  dataSubtexto: { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, marginTop: 10 },
  vazioPequeno: { padding: 30, alignItems: 'center' },
  vazioSubtexto: { color: '#cbd5e1', marginTop: 5, fontSize: 12, textAlign: 'center' },
  funcionarioCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  funcionarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  funcionarioInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  funcionarioTexto: { marginLeft: 10, flex: 1 },
  funcionarioNome: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  funcionarioCargo: { fontSize: 11, color: '#64748b', marginTop: 2 },
  botoesAcao: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botaoAcao: { padding: 4 },
  periodosContainer: { flexDirection: 'row', gap: 10 },
  periodoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  periodoButtonAtivo: { backgroundColor: '#10b981' },
  periodoTexto: { color: '#92400e', fontWeight: '500', fontSize: 13 },
  periodoTextoAtivo: { color: '#fff' },
  funcionarioCardDisponivel: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botaoLimparTudo: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botaoLimparTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  carregandoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  carregandoTexto: {
    marginTop: 15,
    fontSize: 14,
    color: '#64748b',
  },
  registroCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  registroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  registroInfo: { flexDirection: 'row', alignItems: 'center' },
  registroData: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginLeft: 8 },
  registroDiaSemana: { fontSize: 12, color: '#64748b', marginLeft: 5, textTransform: 'capitalize' },
  editarDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  editarDataLabel: { fontSize: 12, color: '#64748b', marginRight: 8 },
  editarDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editarDataTexto: { fontSize: 12, color: '#2563eb', fontWeight: '500' },
  registroInstrucao: { fontSize: 11, color: '#64748b', marginBottom: 8, fontStyle: 'italic' },
  registroPeriodos: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  registroPeriodoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  registroPeriodoAtivo: { backgroundColor: '#10b981' },
  registroPeriodoTexto: { color: '#92400e', fontWeight: '500', fontSize: 12 },
  registroPeriodoTextoAtivo: { color: '#fff' },
  registroAtual: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  registroAtualValor: { fontWeight: 'bold', color: '#8b5cf6' },
});