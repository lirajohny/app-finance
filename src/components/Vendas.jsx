import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';

function Vendas({ db, userId }) {
  const [vendas, setVendas] = useState([]);
  const [novaVenda, setNovaVenda] = useState({
    valor: '',
    produto: '',
    data: new Date().toISOString().substr(0, 16),
    tipoVenda: 'normal'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filtro, setFiltro] = useState('semana');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const fetchVendas = useCallback(async () => {
    try {
      setLoading(true);
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
      const vendasRef = collection(db, 'vendas');
      const vendasQuery = query(
        vendasRef,
        where('userId', '==', userId),
        where('data', '>=', Timestamp.fromDate(dataInicio)),
        orderBy('data', 'desc')
      );

      const vendasSnapshot = await getDocs(vendasQuery);
      // Processa resultados
      const vendasArray = [];
      vendasSnapshot.forEach(doc => {
        const venda = doc.data();
        vendasArray.push({
          id: doc.id,
          ...venda,
          data: venda.data.toDate()
        });
      });

      setVendas(vendasArray);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
      setMensagem({
        texto: "Erro ao carregar as vendas. Tente novamente.",
        tipo: 'erro'
      });
    } finally {
      setLoading(false);
    }
  }, [db, userId, filtro]); // Dependências do callback

  useEffect(() => {
    fetchVendas();
  }, [filtro, fetchVendas]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovaVenda(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novaVenda.valor || novaVenda.valor <= 0) {
      setMensagem({
        texto: "Por favor, informe um valor válido para a venda.",
        tipo: 'erro'
      });
      return;
    }

    try {
      setSubmitting(true);
      // Converte string para número
      const valorNumerico = parseFloat(novaVenda.valor);

      // Converte string de data para objeto Date
      const dataVenda = new Date(novaVenda.data);

      await addDoc(collection(db, 'vendas'), {
        userId,
        valor: valorNumerico,
        produto: novaVenda.produto.trim() || (novaVenda.tipoVenda === 'ifood' ? 'Repasse iFood' : 'Venda direta'),
        data: Timestamp.fromDate(dataVenda),
        tipoVenda: novaVenda.tipoVenda,
        createdAt: Timestamp.now()
      });

      // Limpa formulário
      setNovaVenda({
        valor: '',
        produto: '',
        data: new Date().toISOString().substr(0, 16),
        tipoVenda: 'normal'
      });

      setMensagem({
        texto: "Venda registrada com sucesso!",
        tipo: 'sucesso'
      });

      // Atualiza lista de vendas
      fetchVendas();
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      setMensagem({
        texto: "Erro ao registrar a venda. Tente novamente.",
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
    if (!window.confirm("Tem certeza que deseja excluir esta venda?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'vendas', id));
      setMensagem({
        texto: "Venda excluída com sucesso!",
        tipo: 'sucesso'
      });
      fetchVendas();
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      setMensagem({
        texto: "Erro ao excluir a venda. Tente novamente.",
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Gestão de Vendas</h1>

      {mensagem.texto && (
        <div className={`p-3 rounded-md mb-4 ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {mensagem.texto}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Registrar Nova Venda</h2>

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
                value={novaVenda.valor}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="produto">
                Produto (opcional)
              </label>
              <input
                type="text"
                id="produto"
                name="produto"
                value={novaVenda.produto}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="data">
                Data/Hora
              </label>
              <input
                type="datetime-local"
                id="data"
                name="data"
                value={novaVenda.data}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">
                Tipo de Venda
              </label>
              <div className="flex space-x-4 mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="tipoVenda"
                    value="normal"
                    checked={novaVenda.tipoVenda === 'normal'}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-gray-700">Venda Normal</span>
                </label>

                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="tipoVenda"
                    value="ifood"
                    checked={novaVenda.tipoVenda === 'ifood'}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-gray-700">Repasse iFood</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white p-2 rounded-md font-medium hover:bg-green-700 transition disabled:bg-green-400"
          >
            {submitting ? 'Registrando...' : 'Registrar Venda'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Histórico de Vendas</h2>

          <div className="flex space-x-2">
            <button
              onClick={() => setFiltro('semana')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'semana'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              7 dias
            </button>

            <button
              onClick={() => setFiltro('mes')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'mes'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              30 dias
            </button>

            <button
              onClick={() => setFiltro('ano')}
              className={`px-3 py-1 text-sm rounded-md ${filtro === 'ano'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              12 meses
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : vendas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
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
                {vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarData(venda.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {venda.produto || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${venda.tipoVenda === 'ifood'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {venda.tipoVenda === 'ifood' ? 'iFood' : 'Direta'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatarValor(venda.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(venda.id)}
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
          <p className="text-gray-500 text-center py-8">Nenhuma venda encontrada no período selecionado.</p>
        )}
      </div>
    </div>
  );
}

export default Vendas;
