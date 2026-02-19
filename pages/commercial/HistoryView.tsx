import React, { useState, useEffect } from 'react';
import { User, Report, Question } from '../../types';
import { StorageService } from '../../services/storageService';

interface HistoryViewProps {
  currentUser: User;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        const [r, q] = await Promise.all([
            StorageService.getReports(),
            StorageService.getQuestions()
        ]);
        setReports(r.filter(item => item.userId === currentUser.id));
        setQuestions(q);
        setLoading(false);
    };
    load();
  }, [currentUser.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando historial...</div>;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
       <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Mis Reportes Enviados
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Historial de actividad comercial.
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
          {reports.length === 0 && (
              <li className="px-6 py-8 text-center text-gray-500">No has enviado reportes todavía.</li>
          )}
          {reports.map((report) => (
              <li key={report.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                          <span className="text-sm font-bold text-[#FF7900]">
                             {new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">ID: {report.id}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                          {report.answers.map(ans => {
                              const q = questions.find(q => q.id === ans.questionId);
                              if (!q) return null;
                              return (
                                  <div key={ans.questionId} className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <p className="text-xs text-gray-500 font-medium">{q.text}</p>
                                      <p className="text-sm text-gray-800">{ans.value}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </li>
          ))}
      </ul>
    </div>
  );
};