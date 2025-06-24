'use client';

import { useState } from 'react';

interface TournamentData {
  tournamentId: string;
  tournamentName: string;
  buyIn: number;
  reEntries: number;
  totalBuyIn: number;
  position: number;
  totalPlayers: number;
  topPercentage: number;
  winnings: number;
}

interface ApiResponse {
  success: boolean;
  totalTournaments: number;
  tournaments: TournamentData[];
  summary: {
    totalWinnings: number;
    totalBuyIns: number;
    netProfit: number;
    tournamentsWithWinnings: number;
    winRate: number;
  };
  buyInCategories: { [key: string]: { tournaments: TournamentData[], totalBuyIn: number, totalWinnings: number, count: number } };
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [summary, setSummary] = useState<{ totalWinnings: number; totalBuyIns: number; netProfit: number; tournamentsWithWinnings: number; winRate: number } | null>(null);
  const [buyInCategories, setBuyInCategories] = useState<{ [key: string]: { tournaments: TournamentData[], totalBuyIn: number, totalWinnings: number, count: number } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Por favor selecciona un archivo .zip');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        setTournaments(data.tournaments);
        setSummary(data.summary);
        setBuyInCategories(data.buyInCategories);
      } else {
        setError(data.error || 'Error al procesar el archivo');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Análisis de Torneos de Poker
          </h1>
          <p className="text-lg text-gray-600">
            Sube un archivo ZIP con datos de torneos y obtén estadísticas detalladas
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo ZIP con datos de torneos
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>

            {file && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-green-800">
                  <strong>Archivo seleccionado:</strong> {file.name}
                </p>
                <p className="text-green-600 text-sm">
                  Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Procesando torneos...' : 'Analizar Torneos'}
            </button>
          </div>
        </div>

        {summary && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Resumen General</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Buy-ins</h3>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.totalBuyIns)}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Total Ganancias</h3>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.totalWinnings)}</p>
              </div>
              <div className={`p-6 rounded-lg ${summary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className={`text-lg font-semibold mb-2 ${summary.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  Ganancia/Perdida
                </h3>
                <p className={`text-3xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netProfit)}
                </p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Torneos Ganados</h3>
                <p className="text-3xl font-bold text-purple-600">{summary.tournamentsWithWinnings}</p>
                <p className="text-sm text-purple-600">de {tournaments.length} total</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">% de Victoria</h3>
                <p className="text-3xl font-bold text-orange-600">{summary.winRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {Object.keys(buyInCategories).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Análisis por Categoría de Buy-in</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buy-in
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad de Torneos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Buy-ins
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Ganancias
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ganancia/Perdida
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(buyInCategories).map(([buyIn, data]) => {
                    const netProfit = data.totalWinnings - data.totalBuyIn;
                    return (
                      <tr key={buyIn} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {buyIn}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.count}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.totalBuyIn)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.totalWinnings)}
                        </td>
                        <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                          netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(netProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tournaments.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Detalle de Torneos
              </h2>
              <p className="text-gray-600">
                Total de torneos procesados: <strong>{tournaments.length}</strong>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tournament ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre del Torneo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buy-in
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Re-entries
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Buy-in
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Puesto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top %
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ganancias
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tournaments.map((tournament, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${
                      tournament.winnings > 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{tournament.tournamentId}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {tournament.tournamentName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(tournament.buyIn)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tournament.reEntries}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(tournament.totalBuyIn)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tournament.position}º / {tournament.totalPlayers}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(tournament.topPercentage)}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        tournament.winnings > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {formatCurrency(tournament.winnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
