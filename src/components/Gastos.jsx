// src/components/Gastos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';

function Gastos({ db, userId }) {
  const [gastos, setGastos] = useState([]);
  const [novoGasto, setNovoGasto] = useState({
    valor: '',
    descricao: '',
    categoria: 'fixo',
    data: new Date().toISOString().substr(0, 10)
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filtro, setFiltro] = useState('semana');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const fetchGastos = useCallback(async () => {
    // ... seu código existente ...
    try {
      setLoading(true);

      // Calcula datas para filtro
      const hoje = new Date();
      let dataInicio = new Date(hoje);

      switch (filtro) {
        case 'semana':
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case 'mes':
          dataInicio.setMonth(hoje.getMonth() - 1);
          break;
        case 'ano':
          dataInicio.setFullYear(hoje.getFullYear() - 1);
          break;
        default:
          dataInicio.setDate(hoje.getDate() - 7);
      }

      // Consulta ao Firestore
      const gastosRef = collection(db, 'gastos');
      const gastosQuery = query(
        gastosRef,
        where('userId', '==', userId),
        where('data', '>=', Timestamp.fromDate(dataInicio)),
        orderBy('data', 'desc')
      );

      const gastosSnapshot = await getDocs(gastosQuery);

      // Processa resultados
      const gastosArray = [];
      gastosSnapshot.forEach(doc => {
        const gasto = doc.data();
        gastosArray.push({
          id: doc.id,
          ...gasto,
          data: gasto.data.toDate()
        });
      });

      setGastos(gastosArray);
    } catch (error) {
      console.error("Erro ao buscar gastos:", error);
      setMensagem({
        texto: "Erro ao carregar os gastos. Tente novamente.",
        tipo: 'erro'
      });
    } finally {
      setLoading(false);
    }

  }, [db, userId, filtro]);

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovoGasto(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novoGasto.valor || novoGasto.valor <= 0) {
      setMensagem({
        texto: "Por favor, informe um valor válido para o gasto.",
        tipo: 'erro'
      });
      return;
    }

    if (!novoGasto.descricao.trim()) {
      setMensagem({
        texto: "Por favor, informe uma descrição para o gasto.",
        tipo: 'erro'
      });
      return;
    }

    try {
      setSubmitting(true);
      // Converte string para número
      const valorNumerico = parseFloat(novoGasto.valor);

      // Converte string de data para objeto Date
      const dataGasto = new Date(novoGasto.data);
      dataGasto.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas com fusos horários

      await addDoc(collection(db, 'gastos'), {
        userId,
        valor: valorNumerico,
        descricao: novoGasto.descricao.trim(),
        categoria: novoGasto.categoria,
        data: Timestamp.fromDate(dataGasto),
        createdAt: Timestamp.now()
      });

      // Limpa formulário
      setNovoGasto({
        valor: '',
        descricao: '',
        categoria: 'fixo',
        data: new Date().toISOString().substr(0, 10)
      });

      setMensagem({
        texto: "Gasto registrado com sucesso!",
        tipo: 'sucesso'
      });

      // Atualiza lista de gastos
      fetchGastos();
    } catch (error) {
      console.error("Erro ao registrar gasto:", error);
      setMensagem({
        texto: "Erro ao registrar o gasto. Tente novamente.",
        tipo: 'erro'
      });
    } finally {
      setSubmitting(false);

      // Limpa mensagem após 3 segundos
      setTimeout(() => {
        setMensagem({ texto: '', tipo: '' });
      }, 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este gasto?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'gastos', id));
      setMensagem({
        texto: "Gasto excluído com sucesso!",
        tipo: 'sucesso'
      });
      fetchGastos();
    } catch (error) {
      console.error("Erro ao excluir gasto:", error);
      setMensagem({
        texto: "Erro ao excluir o gasto. Tente novamente.",
        tipo: 'erro'
      });
    } finally {
      setLoading(false);

      // Limpa mensagem após 3 segundos
      setTimeout(() => {
        setMensagem({ texto: '', tipo: '' });
      }, 3000);
    }
  };

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

  return (
    <div className="pt-4 pb-20 md:pb-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Gestão de Gastos</h1>

      {mensagem.texto && (
        <div className={`p-3 rounded-md mb-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {mensagem.texto}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Registrar Novo Gasto</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="valor">
                Valor (R$) *
              </label>
              <input
                type="number"
                id="valor"
                name="valor"
                step="0.01"
                min="0"
                value={novoGasto.valor}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="descricao">
                Descrição *
              </label>
              <input
                type="text"
                id="descricao"
                name="descricao"
                value={novoGasto.descricao}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="data">
                Data
              </label>
              <input
                type="date"
                id="data"
                name="data"
                value={novoGasto.data}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Categoria
              </label>
              <div className="flex space-x-4 mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="categoria"
                    value="fixo"
                    checked={novoGasto.categoria === 'fixo'}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Fixo/Semanal</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="categoria"
                    value="emergencial"
                    checked={novoGasto.categoria === 'emergencial'}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-orange-600"
                  />
                  <span className="ml-2 text-gray-700">Emergencial</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 text-white p-2 rounded-md font-medium hover:bg-red-700 transition disabled:bg-red-400"
          >
            {submitting ? 'Registrando...' : 'Registrar Gasto'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Histórico de Gastos</h2>

          <div className="flex space-x-2">
            <button
              onClick={() => setFiltro('semana')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'semana'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              7 dias
            </button>

            <button
              onClick={() => setFiltro('mes')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'mes'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              30 dias
            </button>

            <button
              onClick={() => setFiltro('ano')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'ano'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              12 meses
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : gastos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gastos.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarData(gasto.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {gasto.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${gasto.categoria === 'fixo'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                        }`}>
                        {gasto.categoria === 'fixo' ? 'Fixo/Semanal' : 'Emergencial'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatarValor(gasto.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(gasto.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Nenhum gasto encontrado no período selecionado.</p>
        )}
      </div>
    </div>
  );
}

export default Gastos;

