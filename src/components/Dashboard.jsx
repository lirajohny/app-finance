// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

function Dashboard({ db, userId }) {
  const [resumoSemanal, setResumoSemanal] = useState(null);
  const [ultimasVendas, setUltimasVendas] = useState([]);
  const [ultimosGastos, setUltimosGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {


    const fetchDashboardData = async () => {
      try {
        // Calcula datas para filtro
        const hoje = new Date();
        const inicioSemana = new Date(hoje);
        // Ajusta para segunda-feira: se for domingo (0), subtrai 6 dias, senão subtrai (dia - 1)
        const diasParaSegunda = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1;
        inicioSemana.setDate(hoje.getDate() - diasParaSegunda);
        inicioSemana.setHours(0, 0, 0, 0);

        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6); // Domingo (6 dias após segunda)
        fimSemana.setHours(23, 59, 59, 999);

        // Consulta vendas da semana
        const vendasRef = collection(db, 'vendas');
        const vendasQuery = query(
          vendasRef,
          where('userId', '==', userId),
          where('data', '>=', Timestamp.fromDate(inicioSemana)),
          where('data', '<=', Timestamp.fromDate(fimSemana)),
          orderBy('data', 'desc')
        );

        // Consulta gastos da semana
        const gastosRef = collection(db, 'gastos');
        const gastosQuery = query(
          gastosRef,
          where('userId', '==', userId),
          where('data', '>=', Timestamp.fromDate(inicioSemana)),
          where('data', '<=', Timestamp.fromDate(fimSemana)),
          orderBy('data', 'desc')
        );

        // Consulta últimas 5 vendas
        const ultimasVendasQuery = query(
          vendasRef,
          where('userId', '==', userId),
          orderBy('data', 'desc'),
          limit(5)
        );

        // Consulta últimos 5 gastos
        const ultimosGastosQuery = query(
          gastosRef,
          where('userId', '==', userId),
          orderBy('data', 'desc'),
          limit(5)
        );

        // Executa as consultas
        const [vendasSnapshot, gastosSnapshot, ultimasVendasSnapshot, ultimosGastosSnapshot] = await Promise.all([
          getDocs(vendasQuery),
          getDocs(gastosQuery),
          getDocs(ultimasVendasQuery),
          getDocs(ultimosGastosQuery)
        ]);

        // Processa resultados
        let totalVendas = 0;
        vendasSnapshot.forEach(doc => {
          totalVendas += doc.data().valor;
        });

        let totalGastos = 0;
        let gastoFixo = 0;
        let gastoEmergencial = 0;

        gastosSnapshot.forEach(doc => {
          const gasto = doc.data();
          totalGastos += gasto.valor;

          if (gasto.categoria === 'fixo') {
            gastoFixo += gasto.valor;
          } else {
            gastoEmergencial += gasto.valor;
          }
        });

        // Formata últimas vendas
        const ultimasVendasArray = [];
        ultimasVendasSnapshot.forEach(doc => {
          const venda = doc.data();
          ultimasVendasArray.push({
            id: doc.id,
            ...venda,
            data: venda.data.toDate()
          });
        });

        // Formata últimos gastos
        const ultimosGastosArray = [];
        ultimosGastosSnapshot.forEach(doc => {
          const gasto = doc.data();
          ultimosGastosArray.push({
            id: doc.id,
            ...gasto,
            data: gasto.data.toDate()
          });
        });

        // Atualiza estados
        setResumoSemanal({
          totalVendas,
          totalGastos,
          gastoFixo,
          gastoEmergencial,
          lucroLiquido: totalVendas - totalGastos,
          inicioSemana: inicioSemana,
          fimSemana: fimSemana
        });

        setUltimasVendas(ultimasVendasArray);
        setUltimosGastos(ultimosGastosArray);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [db, userId]);

  const formatarData = (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Dados para o gráfico
  const dadosGrafico = [
    { name: 'Vendas', valor: resumoSemanal?.totalVendas || 0 },
    { name: 'Gastos', valor: resumoSemanal?.totalGastos || 0 },
    { name: 'Lucro', valor: resumoSemanal?.lucroLiquido || 0 }
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="pt-4 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {resumoSemanal && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Resumo Semanal ({formatarData(resumoSemanal.inicioSemana)} a {formatarData(resumoSemanal.fimSemana)})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Vendas</h3>
              <p className="text-2xl font-bold text-green-600">{formatarValor(resumoSemanal.totalVendas)}</p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Gastos</h3>
              <p className="text-2xl font-bold text-red-600">{formatarValor(resumoSemanal.totalGastos)}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Lucro Líquido</h3>
              <p className={`text-2xl font-bold ${resumoSemanal.lucroLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatarValor(resumoSemanal.lucroLiquido)}
              </p>
            </div>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatarValor(value)} />
                <Line type="monotone" dataKey="valor" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Últimas Vendas</h2>
            <Link to="/vendas" className="text-green-600 hover:text-green-700 text-sm font-medium">
              Ver todas
            </Link>
          </div>

          {ultimasVendas.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {ultimasVendas.map((venda) => (
                <li key={venda.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {venda.produto || 'Venda'}
                        {venda.tipoVenda === 'ifood' && ' (iFood)'}
                      </p>
                      <p className="text-xs text-gray-500">{formatarData(venda.data)}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">{formatarValor(venda.valor)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhuma venda registrada</p>
          )}

          <div className="mt-4">
            <Link
              to="/vendas"
              className="block w-full bg-green-600 text-white text-center py-2 rounded-md hover:bg-green-700 transition"
            >
              Adicionar Nova Venda
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Últimos Gastos</h2>
            <Link to="/gastos" className="text-red-600 hover:text-red-700 text-sm font-medium">
              Ver todos
            </Link>
          </div>

          {ultimosGastos.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {ultimosGastos.map((gasto) => (
                <li key={gasto.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{gasto.descricao}</p>
                      <p className="text-xs text-gray-500">
                        {formatarData(gasto.data)} •
                        <span className={`ml-1 ${gasto.categoria === 'fixo' ? 'text-blue-600' : 'text-orange-600'}`}>
                          {gasto.categoria === 'fixo' ? 'Fixo' : 'Emergencial'}
                        </span>
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-red-600">{formatarValor(gasto.valor)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhum gasto registrado</p>
          )}

          <div className="mt-4">
            <Link
              to="/gastos"
              className="block w-full bg-red-600 text-white text-center py-2 rounded-md hover:bg-red-700 transition"
            >
              Adicionar Novo Gasto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

