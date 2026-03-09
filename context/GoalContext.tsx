import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, UserGoal, Report, Question, QuestionType } from '../types';
import { StorageService } from '../services/storageService';

interface GoalContextType {
  currentGoal: UserGoal | null;
  remainingLines: number;
  daysRemaining: number;
  loading: boolean;
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export const GoalProvider: React.FC<{ currentUser: User; children: React.ReactNode }> = ({ currentUser, children }) => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [g, r, q] = await Promise.all([
        StorageService.getUserGoals(),
        StorageService.getReports(),
        StorageService.getQuestions()
      ]);
      setGoals(g.filter(goal => goal.userId === currentUser.id));
      setReports(r.filter(report => report.userId === currentUser.id));
      setQuestions(q);
      setLoading(false);
    };
    loadData();
  }, [currentUser.id]);

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });
  const currentGoal = useMemo(() => 
    goals.find(g => g.month === currentMonth || g.month.toLowerCase() === currentMonthName.toLowerCase()) || null
  , [goals, currentMonth, currentMonthName]);

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

  const remainingLines = currentGoal ? Math.max(0, currentGoal.goalLines - signedMobileLines) : 0;
  const daysRemaining = currentGoal ? Math.max(0, Math.ceil((new Date(currentGoal.deadlineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <GoalContext.Provider value={{ currentGoal, remainingLines, daysRemaining, loading }}>
      {children}
    </GoalContext.Provider>
  );
};

export const useGoal = () => {
  const context = useContext(GoalContext);
  if (!context) throw new Error('useGoal must be used within a GoalProvider');
  return context;
};
