import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function FuncionariosScreen() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarFuncionarios();
  }, []);

  async function carregarFuncionarios() {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .is('obra_id', null)
      .order('nome');

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      setFuncionarios(data || []);
    }
  }

  async function salvarFuncionario() {
    if (!nome || !cpf) {
      Alert.alert('Erro', 'Preencha nome e CPF');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.from('funcionarios').insert([
      { nome, cpf, cargo, telefone, obra_id: null }
    ]);
    setCarregando(false);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Funcionário cadastrado!');
      setNome('');
      setCpf('');
      setCargo('');
      setTelefone('');
      setMostrarForm(false);
      carregarFuncionarios();
    }
  }

  async function removerFuncionario(id) {
    Alert.alert(
      'Confirmar',
      'Deseja realmente remover este funcionário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('funcionarios').delete().eq('id', id);
            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              Alert.alert('Sucesso', 'Funcionário removido!');
              carregarFuncionarios();
            }
          }
        }
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Funcionários</Text>
        <TouchableOpacity onPress={() => setMostrarForm(!mostrarForm)}>
          <Ionicons name={mostrarForm ? "close" : "add"} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {mostrarForm && (
          <View style={styles.form}>
            <Text style={styles.formTitulo}>Cadastrar Funcionário</Text>
            <Text style={styles.formInfo}>
              Após cadastrar, vá em "Obras" para vincular este funcionário a uma obra
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome Completo"
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="CPF"
              value={cpf}
              onChangeText={setCpf}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Cargo"
              value={cargo}
              onChangeText={setCargo}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity 
              style={styles.botaoSalvar}
              onPress={salvarFuncionario}
              disabled={carregando}
            >
              <Text style={styles.botaoSalvarTexto}>
                {carregando ? 'Salvando...' : 'Salvar Funcionário'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {funcionarios.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.vazioTexto}>Nenhum funcionário disponível</Text>
            <Text style={styles.vazioSubtexto}>
              Cadastre funcionários para depois vinculá-los às obras
            </Text>
          </View>
        ) : (
          funcionarios.map((func) => (
            <View key={func.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person" size={24} color="#10b981" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitulo}>{func.nome}</Text>
                  {func.cargo && <Text style={styles.cardSubtitulo}>{func.cargo}</Text>}
                </View>
                <TouchableOpacity onPress={() => removerFuncionario(func.id)}>
                  <Ionicons name="trash" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
              {func.cpf && <Text style={styles.cardTexto}>CPF: {func.cpf}</Text>}
              {func.telefone && <Text style={styles.cardTexto}>Tel: {func.telefone}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#10b981',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#1e293b' },
  formInfo: { fontSize: 12, color: '#64748b', marginBottom: 15, fontStyle: 'italic' },
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
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  vazioTexto: { color: '#94a3b8', marginTop: 15, fontSize: 16 },
  vazioSubtexto: { color: '#cbd5e1', marginTop: 5, fontSize: 12, textAlign: 'center' },
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
  cardInfo: { marginLeft: 10, flex: 1 },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardSubtitulo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardTexto: { fontSize: 13, color: '#64748b', marginBottom: 3 },
});