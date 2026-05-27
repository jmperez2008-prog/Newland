import React, { useState, useEffect } from 'react';
import { User, Report, Question, QuestionType, ReportAnswer } from '../../types';
import { StorageService } from '../../services/storageService';
import { Edit2, Save, X, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

interface HistoryViewProps {
  currentUser: User;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [editIsLostOperation, setEditIsLostOperation] = useState(false);
  const [editLostOperationReason, setEditLostOperationReason] = useState('');
  const [editIsAccepted, setEditIsAccepted] = useState(false);
  const [editIsProcessed, setEditIsProcessed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
        setLoading(true);
        const [r, q] = await Promise.all([
            StorageService.getReports(),
            StorageService.getQuestions()
        ]);
        setReports(r.filter(item => item.userId === currentUser.id).sort((a,b) => b.timestamp - a.timestamp));
        setQuestions(q);
        setLoading(false);
  };

  const startEditing = (report: Report) => {
      setEditingId(report.id);
      const initialAnswers: Record<string, string> = {};
      report.answers.forEach(a => {
          initialAnswers[a.questionId] = String(a.value);
      });
      setEditAnswers(initialAnswers);
      setEditIsLostOperation(report.isLostOperation || false);
      setEditLostOperationReason(report.lostOperationReason || '');
      setEditIsAccepted(report.isAccepted || false);
      setEditIsProcessed(report.isProcessed || false);
  };

  const cancelEditing = () => {
      setEditingId(null);
      setEditAnswers({});
      setEditIsLostOperation(false);
      setEditLostOperationReason('');
      setEditIsAccepted(false);
      setEditIsProcessed(false);
  };

  const handleEditChange = (qId: string, val: string) => {
      setEditAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const saveEdit = async (reportId: string) => {
      const originalReport = reports.find(r => r.id === reportId);
      if (!originalReport) return;

      setIsSaving(true);
      const updatedAnswers: ReportAnswer[] = Object.entries(editAnswers).map(([qId, val]) => ({
          questionId: qId,
          value: val as string | number
      }));

      // Ensure checks logic
      questions.forEach(q => {
          if (q.type === QuestionType.CHECK && !editAnswers[q.id]) {
               if (!updatedAnswers.find(a => a.questionId === q.id)) {
                   updatedAnswers.push({ questionId: q.id, value: 'No' });
               }
          }
      });

      const updatedReport: Report = {
          ...originalReport,
          answers: updatedAnswers,
          isLostOperation: editIsLostOperation,
          lostOperationReason: editIsLostOperation ? editLostOperationReason : undefined,
          isAccepted: editIsAccepted,
          isProcessed: editIsProcessed
      };

      try {
          await StorageService.updateReport(updatedReport);
          setReports(reports.map(r => r.id === reportId ? updatedReport : r));
          setIsSaving(false);
          setEditingId(null);
      } catch (error) {
          console.error("Error updating report:", error);
          alert("Hubo un error al actualizar el reporte.");
          setIsSaving(false);
      }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando historial...</div>;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
       <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Mis Reportes Enviados
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Historial de actividad comercial. Puedes editar tus reportes si cometiste un error.
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
          {reports.length === 0 && (
              <li className="px-6 py-8 text-center text-gray-500">No has enviado reportes todavía.</li>
          )}
          {reports.map((report) => {
              const isEditing = editingId === report.id;
              
              return (
              <li key={report.id} className={`px-4 py-4 sm:px-6 transition-colors ${isEditing ? 'bg-orange-50 ring-2 ring-inset ring-[#FF7900] rounded-md my-2' : 'hover:bg-gray-50'}`}>
                  <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-[#FF7900]">
                             {new Date(report.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(report.timestamp).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          
                          {!isEditing ? (
                              <button 
                                onClick={() => startEditing(report)}
                                className="text-gray-400 hover:text-[#FF7900] flex items-center text-xs gap-1 transition-colors"
                              >
                                  <Edit2 className="h-4 w-4" /> Editar
                              </button>
                          ) : (
                             <span className="text-xs font-bold text-orange-800 uppercase bg-orange-200 px-2 py-1 rounded">Editando</span>
                          )}
                      </div>

                      {/* VIEW MODE */}
                      {!isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                            {report.isLostOperation ? (
                                <div className="col-span-full bg-red-50 p-3 rounded border border-red-200 mb-2">
                                    <p className="text-sm font-bold text-red-800 flex items-center gap-1">
                                        <X className="w-4 h-4" /> Operación Perdida
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">{report.lostOperationReason}</p>
                                </div>
                            ) : report.isProcessed ? (
                                <div className="col-span-full bg-blue-50 p-3 rounded border border-blue-200 mb-2">
                                    <p className="text-sm font-bold text-blue-800 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> Propuesta Tramitada
                                    </p>
                                </div>
                            ) : report.isAccepted ? (
                                <div className="col-span-full bg-green-50 p-3 rounded border border-green-200 mb-2">
                                    <p className="text-sm font-bold text-green-800 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> Propuesta Aceptada
                                    </p>
                                </div>
                            ) : null}
                            {report.answers.map(ans => {
                                const q = questions.find(q => q.id === ans.questionId);
                                if (!q) return null;
                                
                                let displayValue = ans.value;
                                if (q.type === QuestionType.CURRENCY) {
                                    displayValue = `${ans.value} €`;
                                }

                                return (
                                    <div key={ans.questionId} className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium">{q.text}</p>
                                        <p className={`text-sm text-gray-800 ${q.type === QuestionType.CURRENCY ? 'font-mono font-semibold' : ''}`}>
                                            {displayValue}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                      )}

                      {/* EDIT MODE FORM */}
                      {isEditing && (
                          <div className="mt-4 space-y-4 bg-white p-4 rounded border border-gray-200">
                               {questions.map((q) => {
                                   if (q.type === QuestionType.CURRENCY) {
                                       return (
                                           <div key={q.id}>
                                               <label className="block text-xs font-medium text-gray-500 mb-1">{q.text}</label>
                                               <div className="relative rounded-md shadow-sm">
                                                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                       <span className="text-gray-500 sm:text-xs">€</span>
                                                   </div>
                                                   <input
                                                       type="number"
                                                       step="0.01"
                                                       className="focus:ring-[#FF7900] focus:border-[#FF7900] block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-1 border"
                                                       value={editAnswers[q.id] || ''}
                                                       onChange={(e) => handleEditChange(q.id, e.target.value)}
                                                       required={q.required}
                                                   />
                                               </div>
                                           </div>
                                       );
                                   }

                                   if (q.type === QuestionType.CHECK) {
                                       return (
                                           <div key={q.id} className="flex items-center pt-2">
                                               <input
                                                   id={`edit-${q.id}`}
                                                   type="checkbox"
                                                   className="focus:ring-[#FF7900] h-4 w-4 text-[#FF7900] border-gray-300 rounded"
                                                   checked={editAnswers[q.id] === 'Sí'}
                                                   onChange={(e) => handleEditChange(q.id, e.target.checked ? 'Sí' : 'No')}
                                               />
                                               <label htmlFor={`edit-${q.id}`} className="ml-2 text-sm text-gray-700">
                                                   {q.text}
                                               </label>
                                           </div>
                                       );
                                   }

                                   return (
                                       <div key={q.id}>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">{q.text}</label>
                                           <input
                                               type={q.type}
                                               className="focus:ring-[#FF7900] focus:border-[#FF7900] block w-full sm:text-sm border-gray-300 rounded-md py-1 px-2 border"
                                               value={editAnswers[q.id] || ''}
                                               onChange={(e) => handleEditChange(q.id, e.target.value)}
                                               required={q.required}
                                           />
                                       </div>
                                   );
                               })}

                               {/* Edit Operaciones Statuses */}
                               <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                                   <div className="flex items-center">
                                       <input
                                           id={`edit-accepted-${report.id}`}
                                           type="checkbox"
                                           className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded disabled:opacity-50"
                                           checked={editIsAccepted}
                                           onChange={(e) => {
                                               setEditIsAccepted(e.target.checked);
                                               if (e.target.checked) setEditIsLostOperation(false);
                                           }}
                                           disabled={editIsLostOperation}
                                       />
                                       <label htmlFor={`edit-accepted-${report.id}`} className={`ml-2 text-sm font-bold ${editIsLostOperation ? 'text-gray-400' : 'text-green-700'}`}>
                                           Marcar como Propuesta Aceptada
                                       </label>
                                   </div>

                                   <div className="flex items-center">
                                       <input
                                           id={`edit-processed-${report.id}`}
                                           type="checkbox"
                                           className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                                           checked={editIsProcessed}
                                           onChange={(e) => {
                                               setEditIsProcessed(e.target.checked);
                                               if (e.target.checked) {
                                                   setEditIsAccepted(true);
                                                   setEditIsLostOperation(false);
                                               }
                                           }}
                                           disabled={editIsLostOperation}
                                       />
                                       <label htmlFor={`edit-processed-${report.id}`} className={`ml-2 text-sm font-bold ${editIsLostOperation ? 'text-gray-400' : 'text-blue-700'}`}>
                                           Marcar como Propuesta Tramitada
                                       </label>
                                   </div>

                                   <div className="flex items-center border-t border-gray-100 pt-3">
                                       <input
                                           id={`edit-lost-${report.id}`}
                                           type="checkbox"
                                           className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                                           checked={editIsLostOperation}
                                           onChange={(e) => {
                                               setEditIsLostOperation(e.target.checked);
                                               if (e.target.checked) {
                                                   setEditIsAccepted(false);
                                                   setEditIsProcessed(false);
                                               }
                                           }}
                                       />
                                       <label htmlFor={`edit-lost-${report.id}`} className="ml-2 text-sm font-bold text-red-700">
                                           Marcar como Operación Perdida
                                       </label>
                                   </div>
                                   {editIsLostOperation && (
                                       <div className="mt-2 pl-6">
                                           <label className="block text-xs font-medium text-gray-700 mb-1">Motivo de la pérdida *</label>
                                           <textarea
                                               className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                               rows={2}
                                               value={editLostOperationReason}
                                               onChange={(e) => setEditLostOperationReason(e.target.value)}
                                               required={editIsLostOperation}
                                           />
                                       </div>
                                   )}
                               </div>

                               <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                   <Button size="sm" variant="secondary" onClick={cancelEditing}>
                                       <X className="h-3 w-3 mr-1" /> Cancelar
                                   </Button>
                                   <Button size="sm" onClick={() => saveEdit(report.id)} isLoading={isSaving}>
                                       <Save className="h-3 w-3 mr-1" /> Guardar
                                   </Button>
                               </div>
                          </div>
                      )}
                  </div>
              </li>
          )})}
      </ul>
    </div>
  );
};