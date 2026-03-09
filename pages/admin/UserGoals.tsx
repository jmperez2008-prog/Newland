import React, { useState, useEffect } from 'react';
import { User, UserGoal, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Save, Trash2 } from 'lucide-react';

interface UserGoalsProps {
  users: User[];
}

export const UserGoals: React.FC<UserGoalsProps> = ({ users }) => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<Partial<UserGoal>>({});

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    const g = await StorageService.getUserGoals();
    setGoals(g);
    setLoading(false);
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

    await StorageService.saveUserGoal(newGoal);
    setEditingGoal({});
    loadGoals();
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este objetivo?')) {
      await StorageService.deleteUserGoal(id);
      loadGoals();
    }
  };

  const commercials = users.filter(u => u.role === UserRole.COMMERCIAL);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando objetivos...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Asignar Objetivo Mensual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={editingGoal.userId || ''}
            onChange={(e) => setEditingGoal({ ...editingGoal, userId: e.target.value })}
          >
            <option value="">Seleccionar Comercial</option>
            {commercials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="month" value={editingGoal.month || ''} onChange={(e) => setEditingGoal({ ...editingGoal, month: e.target.value })} />
          <Input type="number" placeholder="Líneas Objetivo" value={editingGoal.goalLines ?? ''} onChange={(e) => setEditingGoal({ ...editingGoal, goalLines: Number(e.target.value) })} />
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
