import React, { useState, useEffect, useMemo } from 'react';
import { User, UserGoal, Report, QuestionType, Question, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { motion } from 'motion/react';
import { getUniqueReportsForStats } from '../../utils/reportUtils';

interface AdminGlobalGoalsProps {
  currentUser: User;
}

export const AdminGlobalGoals: React.FC<AdminGlobalGoalsProps> = ({ currentUser }) => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [g, r, q, u] = await Promise.all([
      StorageService.getUserGoals(),
      StorageService.getReports(),
      StorageService.getQuestions(),
      StorageService.getUsers()
    ]);
    
    // Filter users by zone if Admin, otherwise all users
    const relevantUsers = currentUser.role === UserRole.SUPERADMIN 
      ? u 
      : u.filter(user => user.zone === currentUser.zone);
    
    const relevantUserIds = relevantUsers.map(user => user.id);

    setGoals(g.filter(goal => relevantUserIds.includes(goal.userId)));
    setReports(r.filter(report => relevantUserIds.includes(report.userId)));
    setQuestions(q);
    setUsers(relevantUsers);
    setLoading(false);
  };

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' }); // "marzo"

  const currentGoals = goals.filter(g => g.month === currentMonth || g.month.toLowerCase() === currentMonthName.toLowerCase());

  const { totalGoalLines, signedMobileLines, daysRemaining } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let signed = 0;
    let goalLines = 0;
    let maxDeadline = now.getTime();

    currentGoals.forEach(g => {
        goalLines += g.goalLines;
        const d = new Date(g.deadlineDate).getTime();
        if (d > maxDeadline) maxDeadline = d;
    });

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

    const days = Math.max(0, Math.ceil((maxDeadline - now.getTime()) / (1000 * 60 * 60 * 24)));

    return { totalGoalLines: goalLines, signedMobileLines: signed, daysRemaining: days };
  }, [reports, questions, currentGoals]);

  if (loading) return null; // Don't show loading state to avoid flashing
  if (totalGoalLines === 0) return null; // Don't show if no goals are set

  const remainingLines = Math.max(0, totalGoalLines - signedMobileLines);
  const progress = Math.min(100, (signedMobileLines / totalGoalLines) * 100);

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF7900]/5 to-transparent" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Líneas Firmadas (Global)</h3>
        <motion.p 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="text-4xl font-black text-[#FF7900]"
        >
          {signedMobileLines}
        </motion.p>
        <p className="text-xs text-gray-500 mt-1 font-medium">de {totalGoalLines} objetivo total</p>
        
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-[#FF7900]"
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden flex flex-col justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent" />
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Tiempo Restante</h3>
        <motion.p 
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="text-4xl font-black text-gray-900"
        >
          {daysRemaining} <span className="text-xl text-gray-500 font-medium">días</span>
        </motion.p>
        <p className="text-xs text-gray-500 mt-1 font-medium">para el cierre de mes</p>
      </motion.div>
    </div>
  );
};
