import React, { useState, useEffect, useMemo } from 'react';
import { Report, Question, User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { GeminiService } from '../../services/geminiService';
import { Button } from '../../components/Button';
import { Download, Sparkles } from 'lucide-react';

interface AdminReportsProps {
    currentUser: User;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const isSuper = currentUser.role === UserRole.SUPERADMIN;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const [r, q, u] = await Promise.all([
          StorageService.getReports(),
          StorageService.getQuestions(),
          StorageService.getUsers()
      ]);
      setReports(r);
      setQuestions(q);
      setUsers(u);
      setLoading(false);
  };

  // Compute available zones for dropdown (only relevant for Superadmin)
  const availableZones = useMemo(() => {
      const zones = new Set<string>();
      users.forEach(u => {
          if (u.zone) zones.add(u.zone);
      });
      return Array.from(zones);
  }, [users]);

  // Filter Logic
  const filteredReports = useMemo(() => {
      return reports.filter(r => {
          const reportAuthor = users.find(u => u.id === r.userId);
          
          // 1. Zone Filter
          let matchesZone = false;
          if (isSuper) {
              if (selectedZone === 'all') matchesZone = true;
              else matchesZone = reportAuthor?.zone === selectedZone;
          } else {
              matchesZone = reportAuthor?.zone === currentUser.zone;
          }

          // 2. User Filter
          let matchesUser = false;
          if (selectedUser === 'all') matchesUser = true;
          else matchesUser = r.userId === selectedUser;

          return matchesZone && matchesUser;
      });
  }, [reports, users, selectedZone, selectedUser, isSuper, currentUser.zone]);

  const filteredUsers = useMemo(() => {
      return users.filter(u => {
          if (u.role === UserRole.SUPERADMIN || u.role === UserRole.ADMIN) return false;
          
          if (isSuper) {
              if (selectedZone === 'all') return true;
              return u.zone === selectedZone;
          } else {
              return u.zone === currentUser.zone;
          }
      });
  }, [users, selectedZone, isSuper, currentUser.zone]);


  const exportCSV = () => {
    const header = ['ID', 'Comercial', 'Zona', 'Fecha', ...questions.map(q => q.text)].join(',');
    const rows = filteredReports.map(r => {
      const author = users.find(u => u.id === r.userId);
      const zoneName = author?.zone || 'N/A';
      
      const answers = questions.map(q => {
        const ans = r.answers.find(a => a.questionId === q.id);
        const val = ans ? String(ans.value).replace(/"/g, '""') : '';
        return `"${val}"`;
      });
      const date = new Date(r.timestamp).toLocaleDateString();
      return [`"${r.id}"`, `"${r.userName}"`, `"${zoneName}"`, `"${date}"`, ...answers].join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reportes_${selectedUser}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAiAnalysis = async () => {
    setAnalyzing(true);
    const result = await GeminiService.analyzeReports(filteredReports.slice(0, 20), questions);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  if (loading) return <div className="text-center p-8 text-gray-500">Cargando reportes...</div>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          
          {isSuper && (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Zona</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="block w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
                >
                  <option value="all">Todas las Zonas</option>
                  {availableZones.map(z => (
                      <option key={z} value={z}>{z}</option>
                  ))}
                </select>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Comercial</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
            >
              <option value="all">Todos los Comerciales</option>
              {filteredUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleAiAnalysis} variant="secondary" disabled={analyzing || filteredReports.length === 0}>
             <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
             {analyzing ? 'Analizando...' : 'Analizar con IA'}
          </Button>
          <Button onClick={exportCSV} disabled={filteredReports.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel/CSV
          </Button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border border-orange-100 shadow-sm animate-fade-in-down">
          <h4 className="text-sm font-bold text-[#FF7900] flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4" />
            Análisis de Inteligencia Artificial
          </h4>
          <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
            {aiAnalysis}
          </p>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Info Comercial
              </th>
              {questions.map(q => (
                <th key={q.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {q.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReports.map((report) => {
              const author = users.find(u => u.id === report.userId);
              return (
                <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{new Date(report.timestamp).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500 font-bold">{report.userName}</div>
                    <div className="text-xs text-orange-600">{author?.zone || 'N/A'}</div>
                    </td>
                    {questions.map(q => {
                    const answer = report.answers.find(a => a.questionId === q.id);
                    return (
                        <td key={q.id} className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">
                        {answer ? answer.value : '-'}
                        </td>
                    );
                    })}
                </tr>
            );
            })}
            {filteredReports.length === 0 && (
                <tr>
                    <td colSpan={questions.length + 1} className="px-6 py-12 text-center text-gray-500">
                        No hay reportes disponibles para el filtro seleccionado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};