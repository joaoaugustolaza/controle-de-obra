import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../services/supabase';

export default function RelatoriosScreen() {
  const [obras, setObras] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [limpando, setLimpando] = useState(false);
  
  const [dataInicio, setDataInicio] = useState(null);
  const [dataFim, setDataFim] = useState(null);

  useEffect(() => {
    carregarObras();
    const quinzena = calcularQuinzena();
    setDataInicio(quinzena.inicio);
    setDataFim(quinzena.fim);
  }, []);

  function calcularQuinzena() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    
    const diaSemana = hoje.getDay();
    const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const segundaSemanaAtual = new Date(hoje);
    segundaSemanaAtual.setDate(hoje.getDate() - diasDesdeSegunda);
    
    const inicioQuinzena = new Date(segundaSemanaAtual);
    inicioQuinzena.setDate(segundaSemanaAtual.getDate() - 7);
    
    const fimQuinzena = new Date(segundaSemanaAtual);
    fimQuinzena.setDate(segundaSemanaAtual.getDate() + 4);
    
    return { inicio: inicioQuinzena, fim: fimQuinzena };
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
      .eq('status', 'Ativa')
      .order('nome');

    setObras(data || []);
  }

  function mudarDataInicio(dias) {
    const novaData = new Date(dataInicio);
    novaData.setDate(novaData.getDate() + dias);
    setDataInicio(novaData);
  }

  function mudarDataFim(dias) {
    const novaData = new Date(dataFim);
    novaData.setDate(novaData.getDate() + dias);
    setDataFim(novaData);
  }

  function resetarQuinzena() {
    const quinzena = calcularQuinzena();
    setDataInicio(quinzena.inicio);
    setDataFim(quinzena.fim);
  }

  function gerarDiasUteis(inicio, fim) {
    const dias = [];
    const atual = new Date(inicio);
    atual.setHours(12, 0, 0, 0);
    const fimDate = new Date(fim);
    fimDate.setHours(12, 0, 0, 0);

    while (atual <= fimDate) {
      const diaSemana = atual.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        dias.push(new Date(atual));
      }
      atual.setDate(atual.getDate() + 1);
    }
    return dias;
  }

  async function gerarRelatorio() {
    if (!obraSelecionada) {
      Alert.alert('Atenção', 'Selecione uma obra');
      return;
    }

    if (!dataInicio || !dataFim) {
      Alert.alert('Atenção', 'Selecione o período');
      return;
    }

    if (dataInicio > dataFim) {
      Alert.alert('Atenção', 'A data inicial deve ser menor que a data final');
      return;
    }

    setCarregando(true);

    const diasUteis = gerarDiasUteis(dataInicio, dataFim);
    const dataInicioStr = formatarDataISO(dataInicio);
    const dataFimStr = formatarDataISO(dataFim);

    const { data: funcionarios } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('obra_id', obraSelecionada)
      .order('nome');

    const { data: pontos } = await supabase
      .from('pontos')
      .select('*')
      .eq('obra_id', obraSelecionada)
      .gte('data', dataInicioStr)
      .lte('data', dataFimStr);

    const { data: obra } = await supabase
      .from('obras')
      .select('nome')
      .eq('id', obraSelecionada)
      .single();

    const relatorioData = {
      obra: obra?.nome || 'Obra',
      periodo: `${formatarDataDisplay(dataInicio)} a ${formatarDataDisplay(dataFim)}`,
      diasUteis: diasUteis,
      totalDiasUteis: diasUteis.length,
      funcionarios: (funcionarios || []).map(func => {
        const registrosFunc = (pontos || []).filter(p => p.funcionario_id === func.id);
        
        const dias = diasUteis.map(dia => {
          const dataStr = formatarDataISO(dia);
          const registroManha = registrosFunc.find(r => r.data === dataStr && r.periodo === 'Manhã');
          const registroTarde = registrosFunc.find(r => r.data === dataStr && r.periodo === 'Tarde');
          
          return {
            data: dataStr,
            diaSemana: dia.toLocaleDateString('pt-BR', { weekday: 'short' }),
            dia: dia.getDate(),
            mes: String(dia.getMonth() + 1).padStart(2, '0'),
            manha: !!registroManha,
            tarde: !!registroTarde,
            completo: !!registroManha && !!registroTarde,
            meioPeriodo: (!!registroManha || !!registroTarde) && !(!!registroManha && !!registroTarde),
            ausente: !registroManha && !registroTarde,
          };
        });

        const diasCompletos = dias.filter(d => d.completo).length;
        const diasMeioPeriodo = dias.filter(d => d.meioPeriodo).length;
        const diasAusentes = dias.filter(d => d.ausente).length;

        return {
          nome: func.nome,
          cargo: func.cargo,
          dias,
          diasCompletos,
          diasMeioPeriodo,
          diasAusentes,
          totalDias: dias.length,
        };
      }),
    };

    setRelatorio(relatorioData);
    setCarregando(false);
  }

  function confirmarLimpeza() {
    if (!obraSelecionada) {
      Alert.alert('Atenção', 'Selecione uma obra');
      return;
    }

    if (!dataInicio || !dataFim) {
      Alert.alert('Atenção', 'Selecione o período');
      return;
    }

    const obra = obras.find(o => o.id === obraSelecionada);
    const periodoTexto = `${formatarDataDisplay(dataInicio)} a ${formatarDataDisplay(dataFim)}`;

    Alert.alert(
      '⚠️ Confirmar Limpeza',
      `ATENÇÃO: Esta ação irá APAGAR todos os registros de presença da obra "${obra?.nome}" no período de ${periodoTexto}.\n\nEsta ação NÃO pode ser desfeita.\n\nDeseja realmente continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Limpar Dados',
          style: 'destructive',
          onPress: () => limparDados(),
        }
      ]
    );
  }

  async function limparDados() {
    setLimpando(true);

    const dataInicioStr = formatarDataISO(dataInicio);
    const dataFimStr = formatarDataISO(dataFim);

    const { error } = await supabase
      .from('pontos')
      .delete()
      .eq('obra_id', obraSelecionada)
      .gte('data', dataInicioStr)
      .lte('data', dataFimStr);

    if (error) {
      Alert.alert('Erro', 'Não foi possível limpar os dados: ' + error.message);
    } else {
      Alert.alert('Sucesso', 'Todos os registros de presença foram apagados!');
      setRelatorio(null);
    }

    setLimpando(false);
  }

  async function gerarPDF() {
    if (!relatorio) {
      Alert.alert('Atenção', 'Gere o relatório primeiro');
      return;
    }

    setGerandoPdf(true);

    try {
      const html = gerarHTMLRelatorio(relatorio);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Salvar Relatório PDF',
      });

      Alert.alert('Sucesso', 'PDF gerado e compartilhado!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF: ' + error.message);
    } finally {
      setGerandoPdf(false);
    }
  }

  function gerarHTMLRelatorio(rel) {
    const dataGeracao = new Date().toLocaleDateString('pt-BR');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${rel.obra}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8b5cf6; padding-bottom: 15px; }
          .header h1 { color: #8b5cf6; margin: 0; font-size: 28px; }
          .header p { margin: 5px 0; color: #64748b; font-size: 14px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8b5cf6; }
          .funcionario { margin-bottom: 30px; page-break-inside: avoid; }
          .funcionario-header { background: #8b5cf6; color: white; padding: 10px 15px; border-radius: 8px 8px 0 0; font-size: 18px; font-weight: bold; }
          .funcionario-cargo { font-size: 12px; font-weight: normal; opacity: 0.9; }
          .resumo { display: flex; justify-content: space-around; background: #f1f5f9; padding: 15px; border-radius: 0 0 8px 8px; margin-bottom: 15px; }
          .resumo-item { text-align: center; }
          .resumo-valor { font-size: 24px; font-weight: bold; color: #8b5cf6; }
          .resumo-label { font-size: 11px; color: #64748b; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #8b5cf6; color: white; padding: 8px 5px; text-align: center; font-weight: bold; }
          td { border: 1px solid #e2e8f0; padding: 8px 5px; text-align: center; }
          .dia-completo { background: #10b981; color: white; font-weight: bold; font-size: 16px; }
          .dia-meio { background: #f59e0b; color: white; font-weight: bold; font-size: 14px; }
          .dia-ausente { background: #fee2e2; color: #dc2626; font-weight: bold; font-size: 16px; }
          .legenda { margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 12px; }
          .legenda h3 { margin: 0 0 10px 0; color: #1e293b; }
          .legenda-item { display: flex; align-items: center; margin: 5px 0; }
          .legenda-cor { width: 20px; height: 20px; border-radius: 10px; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Presença</h1>
          <p><strong>${rel.obra}</strong></p>
          <p>Período: ${rel.periodo}</p>
          <p>${rel.totalDiasUteis} dias úteis</p>
        </div>
        <div class="info-box">
          <strong>Total de Funcionários:</strong> ${rel.funcionarios.length}<br>
          <strong>Data de Geração:</strong> ${dataGeracao}
        </div>
    `;

    rel.funcionarios.forEach(func => {
      html += `
        <div class="funcionario">
          <div class="funcionario-header">
            ${func.nome}
            ${func.cargo ? `<span class="funcionario-cargo"> - ${func.cargo}</span>` : ''}
          </div>
          <div class="resumo">
            <div class="resumo-item"><div class="resumo-valor">${func.diasCompletos}</div><div class="resumo-label">Dias Completos</div></div>
            <div class="resumo-item"><div class="resumo-valor">${func.diasMeioPeriodo}</div><div class="resumo-label">Meio Período</div></div>
            <div class="resumo-item"><div class="resumo-valor">${func.diasAusentes}</div><div class="resumo-label">Ausências</div></div>
          </div>
          <table>
            <thead><tr>
      `;

      func.dias.forEach(dia => {
        html += `<th>${dia.diaSemana}<br>${dia.dia}/${dia.mes}</th>`;
      });

      html += `</tr></thead><tbody><tr>`;

      func.dias.forEach(dia => {
        let classe = 'dia-ausente';
        let texto = '○';
        if (dia.completo) { classe = 'dia-completo'; texto = 'X'; }
        else if (dia.meioPeriodo) { classe = 'dia-meio'; texto = '1/2'; }
        html += `<td class="${classe}">${texto}</td>`;
      });

      html += `</tr></tbody></table></div>`;
    });

    html += `
        <div class="legenda">
          <h3>Legenda:</h3>
          <div class="legenda-item"><div class="legenda-cor" style="background: #10b981; color: white;">X</div><span><strong>X</strong> = Dia Completo (Manhã + Tarde)</span></div>
          <div class="legenda-item"><div class="legenda-cor" style="background: #f59e0b; color: white;">½</div><span><strong>1/2</strong> = Meio Período (Manhã ou Tarde)</span></div>
          <div class="legenda-item"><div class="legenda-cor" style="background: #fee2e2; color: #dc2626;">○</div><span><strong>○</strong> = Ausente (Não trabalhou)</span></div>
        </div>
        <div class="footer">Relatório gerado automaticamente pelo sistema ObraPonto em ${dataGeracao}</div>
      </body></html>
    `;

    return html;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Relatórios</Text>
        <Text style={styles.headerSubtitulo}>Relatório por obra e período</Text>
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

        <View style={styles.selecaoPeriodo}>
          <View style={styles.periodoHeader}>
            <Text style={styles.periodoTitulo}>Período do Relatório</Text>
            <TouchableOpacity onPress={resetarQuinzena}>
              <Text style={styles.resetarTexto}>Usar quinzena atual</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selecaoDataContainer}>
            <Text style={styles.dataLabel}>Data Inicial:</Text>
            <View style={styles.dataRow}>
              <TouchableOpacity onPress={() => mudarDataInicio(-1)} style={styles.botaoData}>
                <Ionicons name="chevron-back" size={22} color="#8b5cf6" />
              </TouchableOpacity>
              <View style={styles.dataDisplay}>
                <Text style={styles.dataTexto}>{dataInicio ? formatarDataDisplay(dataInicio) : '--/--/----'}</Text>
                <Text style={styles.dataSubtexto}>
                  {dataInicio ? dataInicio.toLocaleDateString('pt-BR', { weekday: 'short' }) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => mudarDataInicio(1)} style={styles.botaoData}>
                <Ionicons name="chevron-forward" size={22} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selecaoDataContainer}>
            <Text style={styles.dataLabel}>Data Final:</Text>
            <View style={styles.dataRow}>
              <TouchableOpacity onPress={() => mudarDataFim(-1)} style={styles.botaoData}>
                <Ionicons name="chevron-back" size={22} color="#8b5cf6" />
              </TouchableOpacity>
              <View style={styles.dataDisplay}>
                <Text style={styles.dataTexto}>{dataFim ? formatarDataDisplay(dataFim) : '--/--/----'}</Text>
                <Text style={styles.dataSubtexto}>
                  {dataFim ? dataFim.toLocaleDateString('pt-BR', { weekday: 'short' }) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => mudarDataFim(1)} style={styles.botaoData}>
                <Ionicons name="chevron-forward" size={22} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.botaoGerar}
            onPress={gerarRelatorio}
            disabled={carregando}
          >
            <Text style={styles.botaoGerarTexto}>
              {carregando ? 'Gerando...' : 'Gerar Relatório'}
            </Text>
          </TouchableOpacity>
        </View>

        {relatorio && (
          <View style={styles.relatorioContainer}>
            <View style={styles.relatorioHeader}>
              <Text style={styles.relatorioTitulo}>{relatorio.obra}</Text>
              <Text style={styles.relatorioPeriodo}>{relatorio.periodo}</Text>
              <Text style={styles.relatorioSubtitulo}>{relatorio.totalDiasUteis} dias úteis</Text>
            </View>

            <View style={styles.botoesContainer}>
              <TouchableOpacity 
                style={styles.botaoPDF}
                onPress={gerarPDF}
                disabled={gerandoPdf}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.botaoPDFTexto}>
                  {gerandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoLimpar}
                onPress={confirmarLimpeza}
                disabled={limpando}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.botaoLimparTexto}>
                  {limpando ? 'Limpando...' : 'Limpar Dados'}
                </Text>
              </TouchableOpacity>
            </View>

            {relatorio.funcionarios.map((func, index) => (
              <View key={index} style={styles.funcionarioCard}>
                <View style={styles.funcionarioHeader}>
                  <Text style={styles.funcionarioNome}>{func.nome}</Text>
                  {func.cargo && <Text style={styles.funcionarioCargo}>{func.cargo}</Text>}
                </View>

                <View style={styles.resumoContainer}>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoValor}>{func.diasCompletos}</Text>
                    <Text style={styles.resumoLabel}>Completos</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoValor}>{func.diasMeioPeriodo}</Text>
                    <Text style={styles.resumoLabel}>Meio Período</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoValor}>{func.diasAusentes}</Text>
                    <Text style={styles.resumoLabel}>Ausências</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasContainer}>
                  {func.dias.map((dia, idx) => (
                    <View key={idx} style={styles.diaCell}>
                      <Text style={styles.diaSemana}>{dia.diaSemana}</Text>
                      <Text style={styles.diaData}>{dia.dia}/{dia.mes}</Text>
                      <View style={[
                        styles.diaStatus,
                        dia.completo && styles.diaCompleto,
                        dia.meioPeriodo && styles.diaMeioPeriodo,
                        dia.ausente && styles.diaAusente
                      ]}>
                        <Text style={[
                          styles.diaStatusTexto,
                          (dia.completo || dia.meioPeriodo) && styles.diaStatusTextoClaro
                        ]}>
                          {dia.completo ? 'X' : dia.meioPeriodo ? '1/2' : '○'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}

            <View style={styles.legenda}>
              <Text style={styles.legendaTitulo}>Legenda:</Text>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaCompleto]}>
                  <Text style={styles.legendaCorTexto}>X</Text>
                </View>
                <Text style={styles.legendaTexto}>X = Dia Completo (Manhã + Tarde)</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaMeioPeriodo]}>
                  <Text style={styles.legendaCorTexto}>½</Text>
                </View>
                <Text style={styles.legendaTexto}>1/2 = Meio Período (Manhã ou Tarde)</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, styles.legendaAusente]}>
                  <Text style={styles.legendaCorTextoAusente}>○</Text>
                </View>
                <Text style={styles.legendaTexto}>○ = Ausente (Não trabalhou)</Text>
              </View>
            </View>
          </View>
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
  selecaoPeriodo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  periodoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  periodoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  resetarTexto: { fontSize: 12, color: '#8b5cf6', fontWeight: '500' },
  selecaoDataContainer: { marginBottom: 12 },
  dataLabel: { fontSize: 12, color: '#64748b', marginBottom: 5 },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 5,
  },
  botaoData: { padding: 8 },
  dataDisplay: { alignItems: 'center', flex: 1 },
  dataTexto: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  dataSubtexto: { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
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
  botaoGerar: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoGerarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botoesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  botaoPDF: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botaoPDFTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  botaoLimpar: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botaoLimparTexto: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  relatorioContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  relatorioHeader: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  relatorioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  relatorioPeriodo: { fontSize: 14, color: '#64748b', marginTop: 5 },
  relatorioSubtitulo: { fontSize: 12, color: '#94a3b8', marginTop: 3, fontStyle: 'italic' },
  funcionarioCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  funcionarioHeader: { marginBottom: 10 },
  funcionarioNome: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  funcionarioCargo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resumoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  resumoItem: { alignItems: 'center' },
  resumoValor: { fontSize: 24, fontWeight: 'bold', color: '#8b5cf6' },
  resumoLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textAlign: 'center' },
  diasContainer: { marginTop: 10 },
  diaCell: { alignItems: 'center', marginRight: 8, minWidth: 50 },
  diaSemana: { fontSize: 10, color: '#64748b', textTransform: 'capitalize' },
  diaData: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginVertical: 2 },
  diaStatus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  diaCompleto: { backgroundColor: '#10b981' },
  diaMeioPeriodo: { backgroundColor: '#f59e0b' },
  diaAusente: { backgroundColor: '#fee2e2' },
  diaStatusTexto: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  diaStatusTextoClaro: { color: '#fff' },
  legenda: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  legendaTitulo: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  legendaCor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendaCompleto: { backgroundColor: '#10b981' },
  legendaMeioPeriodo: { backgroundColor: '#f59e0b' },
  legendaAusente: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  legendaCorTexto: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  legendaCorTextoAusente: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },
  legendaTexto: { fontSize: 12, color: '#64748b' },
});