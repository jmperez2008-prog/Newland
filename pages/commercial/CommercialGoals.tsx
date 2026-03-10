import React, { useState, useEffect, useMemo } from 'react';
import { User, UserGoal, Report, QuestionType, Question } from '../../types';
import { StorageService } from '../../services/storageService';
import { motion } from 'motion/react';
import { getUniqueReportsForStats } from '../../utils/reportUtils';

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
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' }); // "marzo"
  const currentGoal = goals.find(g => g.month === currentMonth || g.month.toLowerCase() === currentMonthName.toLowerCase());

  const signedMobileLines = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let signed = 0;

    const uniqueReports = getUniqueReportsForStats(reports, questions);

    uniqueReports.filter(r => {
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
  const progress = Math.min(100, (signedMobileLines / currentGoal.goalLines) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF7900]/5 to-transparent" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Líneas Firmadas</h3>
        <motion.p 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="text-6xl font-black text-[#FF7900]"
        >
          {signedMobileLines}
        </motion.p>
        <p className="text-sm text-gray-500 mt-2 font-medium">de {currentGoal.goalLines} objetivo total</p>
        
        <div className="mt-6 h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-[#FF7900]"
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/5 to-transparent" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Días para el cierre</h3>
        <motion.p 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-6xl font-black text-gray-900"
        >
          {daysRemaining}
        </motion.p>
        <p className="text-sm text-gray-500 mt-2 font-medium">fecha límite: {currentGoal.deadlineDate}</p>
      </motion.div>
    </div>
  );
};
