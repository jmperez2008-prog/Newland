import React, { useState, useEffect, useMemo } from 'react';
import { User, UserGoal, Report, QuestionType, Question } from '../../types';
import { StorageService } from '../../services/storageService';

interface CommercialGoalsProps {
  currentUser: User;
}

export const CommercialGoals: React.FC<CommercialGoalsProps> = ({ currentUser }) => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

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
    setGoals(g.filter(g => g.userId === currentUser.id));
    setReports(r.filter(r => r.userId === currentUser.id));
    setQuestions(q);
    setLoading(false);
  };

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentGoal = goals.find(g => g.month === currentMonth);

  const signedMobileLines = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let signed = 0;

    reports.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === month && d.getFullYear() === year;
    }).forEach(r => {
        let isSaleClosed = false;
        const saleQ = r.answers.find(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            return q && q.type === QuestionType.CHECK && q.text.toLowerCase().includes('venta');
        });
        if (saleQ && saleQ.value === 'Sí') isSaleClosed = true;

        if (isSaleClosed) {
            r.answers.forEach(a => {
                const q = questions.find(qu => qu.id === a.questionId);
                if (!q) return;
                const val = typeof a.value === 'string' ? parseFloat(a.value) : Number(a.value);
                if (isNaN(val)) return;
                const text = q.text.toLowerCase();
                if (text.includes('movil') || text.includes('móvil')) {
                    signed += val;
                }
            });
        }
    });
    return signed;
  }, [reports, questions]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando objetivos...</div>;
  if (!currentGoal) return <div className="p-8 text-center text-gray-500">No tienes objetivos asignados para este mes.</div>;

  const remainingLines = Math.max(0, currentGoal.goalLines - signedMobileLines);
  const daysRemaining = Math.max(0, Math.ceil((new Date(currentGoal.deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Líneas Pendientes</h3>
        <p className="text-5xl font-black text-[#FF7900]">{remainingLines}</p>
        <p className="text-sm text-gray-500 mt-2">de {currentGoal.goalLines} objetivo total</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
        <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Días para el cierre</h3>
        <p className="text-5xl font-black text-gray-900">{daysRemaining}</p>
        <p className="text-sm text-gray-500 mt-2">fecha límite: {currentGoal.deadlineDate}</p>
      </div>
    </div>
  );
};
