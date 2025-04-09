// src/components/Relatorios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit // Adicione essa importação
} from 'firebase/firestore';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function Relatorios({ db, userId }) {
  const [periodo, setPeriodo] = useState('semana');
  const [tipoGrafico, setTipoGrafico] = useState('linha');
  const [dadosCarregados, setDadosCarregados] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [semanas, setSemanas] = useState([]);
  const [semanaEspecifica, setSemanaEspecifica] = useState(null);
  const [modoFiltro, setModoFiltro] = useState('padrao'); // 'padrao' ou 'semanaEspecifica'


  // Dados dos relatórios
  const [resumo, setResumo] = useState({
    totalVendas: 0,
    totalGastos: 0,
    lucroLiquido: 0,
    gastoFixo: 0,
    gastoEmergencial: 0
  });

  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [dadosGastosCategoria, setDadosGastosCategoria] = useState([]);
  const [periodoLabel, setPeriodoLabel] = useState('');

  // Cores para os gráficos
  const CORES_GRAFICO = ['#4CAF50', '#F44336', '#2196F3'];
  const CORES_PIZZA = ['#2196F3', '#FF9800'];

  // Defina carregarDados com useCallback ANTES do useEffect

  const alternarModoFiltro = (modo) => {
    setModoFiltro(modo);
    // Limpa a mensagem de erro ao mudar o modo
    setErro('');
  };

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro('');

      // Calcula datas para filtro
      const hoje = new Date();
      let dataInicio = new Date(hoje);
      let dataFim = new Date(hoje);
      let intervalos = [];

      if (modoFiltro === 'semanaEspecifica' && semanaEspecifica) {
        // Usar datas da semana específica
        dataInicio = semanaEspecifica.inicio;
        dataFim = semanaEspecifica.fim;

        // Criar intervalos diários para a semana específica
        intervalos = Array.from({ length: 7 }, (_, i) => {
          const inicio = new Date(dataInicio);
          inicio.setDate(dataInicio.getDate() + i);
          inicio.setHours(0, 0, 0, 0);

          const fim = new Date(inicio);
          fim.setHours(23, 59, 59, 999);

          return {
            inicio,
            fim,
            label: `${inicio.getDate()}/${inicio.getMonth() + 1}`
          };
        });

        setPeriodoLabel(`Semana ${semanaEspecifica.id} (${formatarData(dataInicio)} - ${formatarData(dataFim)})`);
      } else {
        // Usar lógica original para períodos padrão
        switch (periodo) {
          case 'semana':
            dataInicio.setDate(hoje.getDate() - 7);
            // Gera intervalos diários para o gráfico
            intervalos = Array.from({ length: 7 }, (_, i) => {
              const data = new Date(hoje);
              data.setDate(hoje.getDate() - (6 - i));
              return {
                inicio: new Date(data.setHours(0, 0, 0, 0)),
                fim: new Date(data.setHours(23, 59, 59, 999)),
                label: `${data.getDate()}/${data.getMonth() + 1}`
              };
            });
            setPeriodoLabel('Últimos 7 dias');
            break;

          case 'mes':
            dataInicio.setMonth(hoje.getMonth() - 1);
            // Gera intervalos semanais para o gráfico
            const diasAtras = 30;
            const semanasAtras = Math.ceil(diasAtras / 7);

            intervalos = Array.from({ length: semanasAtras }, (_, i) => {
              const inicioSemana = new Date(hoje);
              inicioSemana.setDate(hoje.getDate() - (diasAtras - (i * 7)));
              inicioSemana.setHours(0, 0, 0, 0);

              const fimSemana = new Date(inicioSemana);
              fimSemana.setDate(inicioSemana.getDate() + 6);
              fimSemana.setHours(23, 59, 59, 999);

              if (fimSemana > hoje) {
                fimSemana.setTime(hoje.getTime());
              }

              return {
                inicio: inicioSemana,
                fim: fimSemana,
                label: `Semana ${i + 1}`
              };
            });
            setPeriodoLabel('Últimos 30 dias');
            break;

          case 'ano':
            dataInicio.setFullYear(hoje.getFullYear() - 1);
            // Gera intervalos mensais para o gráfico
            intervalos = Array.from({ length: 12 }, (_, i) => {
              const data = new Date(hoje);
              data.setMonth(hoje.getMonth() - (11 - i));

              const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1);
              const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999);

              return {
                inicio: inicioMes,
                fim: fimMes,
                label: inicioMes.toLocaleString('pt-BR', { month: 'short' })
              };
            });
            setPeriodoLabel('Últimos 12 meses');
            break;

          default:
            dataInicio.setDate(hoje.getDate() - 7);
            setPeriodoLabel('Últimos 7 dias');
        }

        // Define dataFim como hoje para os filtros padrão
        dataFim = hoje;
      }

      // Consulta ao Firestore - Vendas total do período
      const vendasRef = collection(db, 'vendas');
      const vendasQuery = query(
        vendasRef,
        where('userId', '==', userId),
        where('data', '>=', Timestamp.fromDate(dataInicio)),
        where('data', '<=', Timestamp.fromDate(dataFim)),
        orderBy('data', 'desc')
      );

      // Consulta ao Firestore - Gastos total do período
      const gastosRef = collection(db, 'gastos');
      const gastosQuery = query(
        gastosRef,
        where('userId', '==', userId),
        where('data', '>=', Timestamp.fromDate(dataInicio)),
        where('data', '<=', Timestamp.fromDate(dataFim)),
        orderBy('data', 'desc')
      );

      // Executa consultas
      const [vendasSnapshot, gastosSnapshot] = await Promise.all([
        getDocs(vendasQuery),
        getDocs(gastosQuery)
      ]);

      // Processa vendas
      let totalVendas = 0;
      const vendas = [];
      vendasSnapshot.forEach(doc => {
        const venda = doc.data();
        totalVendas += venda.valor;
        vendas.push({
          id: doc.id,
          ...venda,
          data: venda.data.toDate()
        });
      });

      // Processa gastos
      let totalGastos = 0;
      let gastoFixo = 0;
      let gastoEmergencial = 0;
      const gastos = [];

      gastosSnapshot.forEach(doc => {
        const gasto = doc.data();
        totalGastos += gasto.valor;

        if (gasto.categoria === 'fixo') {
          gastoFixo += gasto.valor;
        } else {
          gastoEmergencial += gasto.valor;
        }

        gastos.push({
          id: doc.id,
          ...gasto,
          data: gasto.data.toDate()
        });
      });

      // Calcula lucro líquido
      const lucroLiquido = totalVendas - totalGastos;

      // Prepara dados para o gráfico por intervalos
      const dadosGraficoTemp = intervalos.map(intervalo => {
        // Filtra vendas do intervalo
        const vendasIntervalo = vendas.filter(
          venda => venda.data >= intervalo.inicio && venda.data <= intervalo.fim
        );

        // Filtra gastos do intervalo
        const gastosIntervalo = gastos.filter(
          gasto => gasto.data >= intervalo.inicio && gasto.data <= intervalo.fim
        );

        // Calcula totais do intervalo
        const totalVendasIntervalo = vendasIntervalo.reduce((acc, venda) => acc + venda.valor, 0);
        const totalGastosIntervalo = gastosIntervalo.reduce((acc, gasto) => acc + gasto.valor, 0);
        const lucroIntervalo = totalVendasIntervalo - totalGastosIntervalo;

        return {
          nome: intervalo.label,
          vendas: totalVendasIntervalo,
          gastos: totalGastosIntervalo,
          lucro: lucroIntervalo
        };
      });

      // Prepara dados para o gráfico de categorias de gastos
      const dadosGastosCategoriaTemp = [
        { nome: 'Fixo/Semanal', valor: gastoFixo },
        { nome: 'Emergencial', valor: gastoEmergencial }
      ];

      // Atualiza estados
      setResumo({
        totalVendas,
        totalGastos,
        lucroLiquido,
        gastoFixo,
        gastoEmergencial,
        dataInicio,
        dataFim
      });

      setDadosGrafico(dadosGraficoTemp);
      setDadosGastosCategoria(dadosGastosCategoriaTemp);
      setDadosCarregados(true);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setErro('Erro ao carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [db, userId, periodo, modoFiltro, semanaEspecifica, formatarData]);


  const carregarSemanasDisponiveis = useCallback(async () => {
    try {
      // Buscar o registro mais antigo para determinar a data inicial
      const vendasRef = collection(db, 'vendas');
      const gastosRef = collection(db, 'gastos');

      const [vendasPrimeiroSnapshot, gastosPrimeiroSnapshot] = await Promise.all([
        getDocs(query(vendasRef, where('userId', '==', userId), orderBy('data', 'asc'), limit(1))),
        getDocs(query(gastosRef, where('userId', '==', userId), orderBy('data', 'asc'), limit(1)))
      ]);

      // Encontrar a data mais antiga
      let dataInicial = new Date();

      vendasPrimeiroSnapshot.forEach(doc => {
        const data = doc.data().data.toDate();
        if (data < dataInicial) dataInicial = data;
      });

      gastosPrimeiroSnapshot.forEach(doc => {
        const data = doc.data().data.toDate();
        if (data < dataInicial) dataInicial = data;
      });

      // Ajustar para o início da semana (domingo)
      const inicioSemana = new Date(dataInicial);
      inicioSemana.setDate(dataInicial.getDate() - dataInicial.getDay());
      inicioSemana.setHours(0, 0, 0, 0);

      // Calcular todas as semanas até hoje
      const hoje = new Date();
      const semanasArray = [];
      let dataAtual = new Date(inicioSemana);

      let numeroSemana = 1;
      while (dataAtual <= hoje) {
        const inicioSemanaAtual = new Date(dataAtual);

        const fimSemanaAtual = new Date(dataAtual);
        fimSemanaAtual.setDate(fimSemanaAtual.getDate() + 6);
        fimSemanaAtual.setHours(23, 59, 59, 999);

        semanasArray.push({
          id: numeroSemana,
          inicio: inicioSemanaAtual,
          fim: fimSemanaAtual,
          label: `Semana ${numeroSemana} (${formatarData(inicioSemanaAtual)} - ${formatarData(fimSemanaAtual)})`
        });

        // Avançar para próxima semana
        dataAtual.setDate(dataAtual.getDate() + 7);
        numeroSemana++;
      }

      // Atualizar o estado com as semanas disponíveis
      setSemanas(semanasArray);

      // Se não houver semana selecionada, selecionar a mais recente
      if (!semanaEspecifica && semanasArray.length > 0) {
        setSemanaEspecifica(semanasArray[semanasArray.length - 1]);
      }

    } catch (error) {
      console.error("Erro ao carregar semanas disponíveis:", error);
    }
  }, [db, userId, formatarData, semanaEspecifica]);

  // Agora use o useEffect com a função já definida
  useEffect(() => {
    carregarDados();
    carregarSemanasDisponiveis();
  }, [carregarDados], [carregarSemanasDisponiveis]);

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const exportarPDF = async () => {
    try {
      const relatorioElement = document.getElementById('relatorio-container');
      const canvas = await html2canvas(relatorioElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_PastaFinance_${formatarData(new Date())}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      setErro('Erro ao exportar o relatório. Tente novamente.');
    }
  };

  return (
    <div className="pt-4 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Relatórios Financeiros</h1>

      {erro && (
        <div className="p-3 rounded-md mb-4 bg-red-100 text-red-700">
          {erro}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-grow space-y-2">
          <label className="block text-gray-700 text-sm font-medium">Período</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3 py-1 text-sm rounded-md ${periodo === 'semana'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Semanal
            </button>

            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1 text-sm rounded-md ${periodo === 'mes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Mensal
            </button>

            <button
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-1 text-sm rounded-md ${periodo === 'ano'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Anual
            </button>
          </div>
        </div>



        / Adicionar na parte de interface, após os botões de período
        <div className="mt-4">
          <label className="block text-gray-700 text-sm font-medium mb-2">Modo de Filtro</label>
          <div className="flex space-x-3 mb-4">
            <button
              onClick={() => alternarModoFiltro('padrao')}
              className={`px-3 py-1 text-sm rounded-md ${modoFiltro === 'padrao'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Períodos Padrão
            </button>

            <button
              onClick={() => alternarModoFiltro('semanaEspecifica')}
              className={`px-3 py-1 text-sm rounded-md ${modoFiltro === 'semanaEspecifica'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Semana Específica
            </button>
          </div>

          {modoFiltro === 'padrao' ? (
            // Os botões de período padrão que já existem (semana/mês/ano)
            <div className="flex space-x-2">
              {/* Seus botões de período existentes */}
            </div>
          ) : (
            // Seletor de semana específica
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Selecione a Semana</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={semanaEspecifica?.id || ''}
                onChange={(e) => {
                  const semanaId = parseInt(e.target.value);
                  const semana = semanas.find(s => s.id === semanaId);
                  setSemanaEspecifica(semana);
                }}
              >
                {semanas.map(semana => (
                  <option key={semana.id} value={semana.id}>
                    {semana.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>


        <div className="flex-grow space-y-2">
          <label className="block text-gray-700 text-sm font-medium">Tipo de Gráfico</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setTipoGrafico('linha')}
              className={`px-3 py-1 text-sm rounded-md ${tipoGrafico === 'linha'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Linha
            </button>

            <button
              onClick={() => setTipoGrafico('barra')}
              className={`px-3 py-1 text-sm rounded-md ${tipoGrafico === 'barra'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Barras
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : dadosCarregados ? (
        <div id="relatorio-container" className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Resumo Financeiro - {periodoLabel}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Total de Vendas</h3>
                <p className="text-2xl font-bold text-green-600">{formatarValor(resumo.totalVendas)}</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Total de Gastos</h3>
                <p className="text-2xl font-bold text-red-600">{formatarValor(resumo.totalGastos)}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Lucro Líquido</h3>
                <p className={`text-2xl font-bold ${resumo.lucroLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatarValor(resumo.lucroLiquido)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">Gastos por Categoria</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-500">Fixo/Semanal</h4>
                    <p className="text-lg font-semibold text-blue-600">{formatarValor(resumo.gastoFixo)}</p>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-500">Emergencial</h4>
                    <p className="text-lg font-semibold text-orange-600">{formatarValor(resumo.gastoEmergencial)}</p>
                  </div>
                </div>

                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGastosCategoria}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="valor"
                        nameKey="nome"
                        label={({ nome, percent }) => `${nome}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {dadosGastosCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES_PIZZA[index % CORES_PIZZA.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatarValor(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  Evolução Financeira
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {tipoGrafico === 'linha' ? (
                      <LineChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatarValor(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="vendas" name="Vendas" stroke={CORES_GRAFICO[0]} strokeWidth={2} />
                        <Line type="monotone" dataKey="gastos" name="Gastos" stroke={CORES_GRAFICO[1]} strokeWidth={2} />
                        <Line type="monotone" dataKey="lucro" name="Lucro" stroke={CORES_GRAFICO[2]} strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatarValor(value)} />
                        <Legend />
                        <Bar dataKey="vendas" name="Vendas" fill={CORES_GRAFICO[0]} />
                        <Bar dataKey="gastos" name="Gastos" fill={CORES_GRAFICO[1]} />
                        <Bar dataKey="lucro" name="Lucro" fill={CORES_GRAFICO[2]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-6">
              <p>Relatório gerado em: {formatarData(new Date())}</p>
              <p>Período: {resumo.dataInicio ? formatarData(resumo.dataInicio) : ''} até {resumo.dataFim ? formatarData(resumo.dataFim) : ''}</p>
            </div>
          </div>

          <button
            onClick={exportarPDF}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-medium hover:bg-blue-700 transition flex justify-center items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar como PDF
          </button>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
          <button
            onClick={carregarDados}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

export default Relatorios;
