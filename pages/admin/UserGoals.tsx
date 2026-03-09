import React, { useState, useEffect } from 'react';
import { User, UserGoal, UserRole, Report, Question, QuestionType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Save, Trash2 } from 'lucide-react';

interface UserGoalsProps {
  users: User[];
}

export const UserGoals: React.FC<UserGoalsProps> = ({ users }) => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<Partial<UserGoal>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [g, r, q] = await Promise.all([
      StorageService.getUserGoals(),
      StorageService.getReports(),
      StorageService.getQuestions()
    ]);
    setGoals(g);
    setReports(r);
    setQuestions(q);
    setLoading(false);
  };

  const getProgressForGoal = (goal: UserGoal) => {
    const [year, month] = goal.month.split('-').map(Number);
    
    let signed = 0;

    console.log(`Debug Goal: ${goal.month}, User: ${goal.userId}`);
    console.log(`Total Reports: ${reports.length}`);

    const filteredReports = reports.filter(r => {
      // r.timestamp is a number (milliseconds).
      const d = new Date(r.timestamp);
      
      const reportMonth = d.getMonth() + 1;
      const reportYear = d.getFullYear();
      
      console.log(`Report ${r.id} date: ${d.toISOString()}, Target: ${year}-${month}, Match: ${reportMonth === month && reportYear === year}, r.userId: ${r.userId}, goal.userId: ${goal.userId}`);
      
      return reportMonth === month && reportYear === year && r.userId === goal.userId;
    });
    
    console.log(`Reports found for goal: ${filteredReports.length}`);

    filteredReports.forEach(r => {
        let isSaleClosed = false;
        console.log(`Report ${r.id} answers:`, r.answers);
        
        const saleQ = r.answers.find((a: any) => {
            const q = questions.find(qu => qu.id === a.questionId);
            console.log(`Checking answer ${a.questionId}:`, q?.text, q?.type, a.value);
            return q && q.type === QuestionType.CHECK && q.text.toLowerCase().includes('venta');
        });
        
        const normalizedValue = saleQ?.value?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (saleQ && (normalizedValue === 'si' || (saleQ.value as any) === true)) isSaleClosed = true;

        console.log(`Report: ${r.id}, isSaleClosed: ${isSaleClosed}, Raw Value: ${saleQ?.value}`);

        if (isSaleClosed) {
            r.answers.forEach((a: any) => {
                const q = questions.find(qu => qu.id === a.questionId);
                if (!q) return;
                const val = typeof a.value === 'string' ? parseFloat(a.value) : Number(a.value);
                if (isNaN(val)) return;
                const text = q.text.toLowerCase();
                console.log(`Checking question for lines: ${q.text}, val: ${val}`);
                if (text.includes('movil') || text.includes('móvil')) {
                    console.log(`Adding ${val} from question ${q.text}`);
                    signed += val;
                }
            });
        }
    });
    return signed;
  };

  const handleSaveGoal = async () => {
    if (!editingGoal.userId || !editingGoal.month || editingGoal.goalLines === undefined || !editingGoal.deadlineDate) {
      alert('Por favor, completa todos los campos.');
      return;
    }
    
    const newGoal: UserGoal = {
      id: editingGoal.id || `goal-${Date.now()}`,
      userId: editingGoal.userId,
      month: editingGoal.month,
      goalLines: Number(editingGoal.goalLines),
      deadlineDate: editingGoal.deadlineDate
    };

    console.log('Attempting to save goal:', newGoal);
    try {
        await StorageService.saveUserGoal(newGoal);
        console.log('Goal saved successfully');
        setEditingGoal({});
        loadData();
    } catch (e) {
        console.error('Failed to save goal:', e);
        alert('Error al guardar el objetivo. Revisa la consola.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este objetivo?')) {
      await StorageService.deleteUserGoal(id);
      loadData();
    }
  };

  const commercials = users.filter(u => u.role === UserRole.COMMERCIAL);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando objetivos...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Asignar Objetivo Mensual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Comercial</label>
            <select
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900]"
              value={editingGoal.userId || ''}
              onChange={(e) => setEditingGoal({ ...editingGoal, userId: e.target.value })}
            >
              <option value="">Seleccionar Comercial</option>
              {commercials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900]"
              value={editingGoal.month || ''}
              onChange={(e) => setEditingGoal({ ...editingGoal, month: e.target.value })}
            >
              <option value="">Seleccionar Mes</option>
              {['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Input type="number" label="Líneas Objetivo" placeholder="Líneas Objetivo" value={editingGoal.goalLines ?? ''} onChange={(e) => setEditingGoal({ ...editingGoal, goalLines: Number(e.target.value) })} />
          <Input type="date" label="Fecha Límite" value={editingGoal.deadlineDate || ''} onChange={(e) => setEditingGoal({ ...editingGoal, deadlineDate: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={handleSaveGoal}>
          <Save className="w-4 h-4 mr-2" /> Guardar Objetivo
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comercial</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objetivo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cumplido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Límite</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {goals.map(goal => {
              const user = commercials.find(c => c.id === goal.userId);
              return (
                <tr key={goal.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user?.name || 'Desconocido'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.goalLines}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{getProgressForGoal(goal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{goal.deadlineDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
