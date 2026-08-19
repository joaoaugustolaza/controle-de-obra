import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function PontoScreen() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: funcs } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome');

    const { data: obrasData } = await supabase
      .from('obras')
      .select('*')
      .eq('status', 'Ativa');

    setFuncionarios(funcs || []);
    setObras(obrasData || []);
  }

  async function marcarPresenca(funcionarioId) {
    if (!obraSelecionada) {
      Alert.alert('Atenção', 'Selecione uma obra primeiro');
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    
    const { data: existente } = await supabase
      .from('pontos')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .eq('data', hoje)
      .single();

    if (existente) {
      Alert.alert('Atenção', 'Funcionário já registrou ponto hoje');
      return;
    }

    const { error } = await supabase.from('pontos').insert([
      {
        funcionario_id: funcionarioId,
        obra_id: obraSelecionada,
        data: hoje,
        periodo: new Date().getHours() < 12 ? 'Manhã' : 'Tarde',
      }
    ]);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Presença registrada!');
      carregarDados();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Marcar Ponto</Text>
      </View>

      <ScrollView style={styles.content}>
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

        <Text style={styles.tituloLista}>Funcionários</Text>

        {funcionarios.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.vazioTexto}>Nenhum funcionário cadastrado</Text>
          </View>
        ) : (
          funcionarios.map((func) => (
            <View key={func.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Ionicons name="person" size={24} color="#f59e0b" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNome}>{func.nome}</Text>
                  {func.cargo && <Text style={styles.cardCargo}>{func.cargo}</Text>}
                </View>
              </View>
              <TouchableOpacity
                style={styles.botaoMarcar}
                onPress={() => marcarPresenca(func.id)}
              >
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </TouchableOpacity>
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
    backgroundColor: '#f59e0b',
    padding: 20,
    paddingTop: 50,
  },
  headerTitulo: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 15 },
  selecaoObra: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  label: { fontSize: 14, color: '#64748b', marginBottom: 10 },
  obraButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  obraButtonSelecionado: {
    backgroundColor: '#f59e0b',
  },
  obraButtonText: { color: '#64748b', fontWeight: '500' },
  obraButtonTextSelecionado: { color: '#fff' },
  tituloLista: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  vazioTexto: { color: '#94a3b8', marginTop: 15, fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo: { marginLeft: 15, flex: 1 },
  cardNome: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardCargo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  botaoMarcar: {
    padding: 10,
  },
});