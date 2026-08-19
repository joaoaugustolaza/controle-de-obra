import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function DashboardScreen({ navigation }) {
  const [obrasAtivas, setObrasAtivas] = useState(0);
  const [funcionarios, setFuncionarios] = useState(0);
  const [diariasMes, setDiariasMes] = useState(0);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { count: obras } = await supabase
      .from('obras')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Ativa');

    const { count: funcs } = await supabase
      .from('funcionarios')
      .select('*', { count: 'exact', head: true });

    const { count: diarias } = await supabase
      .from('pontos')
      .select('*', { count: 'exact', head: true });

    setObrasAtivas(obras || 0);
    setFuncionarios(funcs || 0);
    setDiariasMes(diarias || 0);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Dashboard</Text>
        <Text style={styles.headerSubtitulo}>Resumo geral</Text>
      </View>

      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <Ionicons name="business" size={32} color="#2563eb" />
          <Text style={styles.cardValor}>{obrasAtivas}</Text>
          <Text style={styles.cardLabel}>Obras Ativas</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="people" size={32} color="#10b981" />
          <Text style={styles.cardValor}>{funcionarios}</Text>
          <Text style={styles.cardLabel}>Funcionários</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="calendar" size={32} color="#f59e0b" />
          <Text style={styles.cardValor}>{diariasMes}</Text>
          <Text style={styles.cardLabel}>Registros</Text>
        </View>
      </View>

      <View style={styles.acoesRapidas}>
        <Text style={styles.tituloSecao}>Ações Rápidas</Text>
        
        <TouchableOpacity 
          style={styles.botaoAcao}
          onPress={() => navigation.navigate('Obras')}
        >
          <Ionicons name="add-circle" size={24} color="#2563eb" />
          <Text style={styles.botaoAcaoTexto}>Cadastrar Obra</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.botaoAcao}
          onPress={() => navigation.navigate('Funcionarios')}
        >
          <Ionicons name="person-add" size={24} color="#10b981" />
          <Text style={styles.botaoAcaoTexto}>Cadastrar Funcionário</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.botaoAcao}
          onPress={() => navigation.navigate('Ponto')}
        >
          <Ionicons name="camera" size={24} color="#f59e0b" />
          <Text style={styles.botaoAcaoTexto}>Marcar Ponto</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
  },
  headerTitulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitulo: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 5,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardValor: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 10,
  },
  cardLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 5,
    textAlign: 'center',
  },
  acoesRapidas: {
    padding: 20,
  },
  tituloSecao: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  botaoAcao: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  botaoAcaoTexto: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 15,
    fontWeight: '500',
  },
});