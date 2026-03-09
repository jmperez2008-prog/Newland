import React from 'react';
import { useGoal } from '../context/GoalContext';
import { Target, Calendar } from 'lucide-react';

export const GoalCounter: React.FC = () => {
  const { currentGoal, remainingLines, daysRemaining, loading } = useGoal();

  if (loading || !currentGoal) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <div className="bg-white border border-gray-200 rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
        <Target className="w-4 h-4 text-[#FF7900]" />
        <span className="text-sm font-bold text-gray-900">{remainingLines}</span>
        <span className="text-xs text-gray-500">pendientes</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-bold text-gray-900">{daysRemaining}</span>
        <span className="text-xs text-gray-500">días</span>
      </div>
    </div>
  );
};
