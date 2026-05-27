import React, { useState, useEffect } from 'react';
import { User, Question, Report, ReportAnswer, QuestionType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { CheckCircle, Copy, Search, X } from 'lucide-react';

interface NewReportProps {
  currentUser: User;
  onSuccess: () => void;
}

export const NewReport: React.FC<NewReportProps> = ({ currentUser, onSuccess }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLostOperation, setIsLostOperation] = useState(false);
  const [lostOperationReason, setLostOperationReason] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  
  // Duplicate Modal State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    const load = async () => {
        const q = await StorageService.getQuestions();
        setQuestions(q);
        setLoading(false);
    };
    load();
  }, []);

  const handleOpenDuplicateModal = async () => {
    setIsDuplicateModalOpen(true);
    setLoadingReports(true);
    try {
      const allReports = await StorageService.getReports();
      const myReports = allReports
        .filter(r => r.userId === currentUser.id)
        .sort((a, b) => b.timestamp - a.timestamp);
      setUserReports(myReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDuplicate = (report: Report) => {
    const newAnswers: Record<string, string> = {};
    report.answers.forEach(ans => {
      // Find the question to check if it's the "venta" question
      const q = questions.find(qu => qu.id === ans.questionId);
      
      // If it's the "venta" question (usually a checkbox containing 'venta'), reset it to 'No'
      if (q && q.type === QuestionType.CHECK && q.text.toLowerCase().includes('venta')) {
          newAnswers[ans.questionId] = 'No';
      } else {
          newAnswers[ans.questionId] = String(ans.value);
      }
    });
    setAnswers(newAnswers);
    setIsLostOperation(report.isLostOperation || false);
    setLostOperationReason(report.lostOperationReason || '');
    setIsAccepted(report.isAccepted || false);
    setIsProcessed(report.isProcessed || false);
    setIsDuplicateModalOpen(false);
    setSearchQuery('');
  };

  const filteredReports = userReports.filter(r => {
    const searchLower = searchQuery.toLowerCase();
    const dateStr = new Date(r.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const answersStr = r.answers.map(a => String(a.value).toLowerCase()).join(' ');
    return dateStr.includes(searchLower) || answersStr.includes(searchLower);
  });

  const handleChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    const reportAnswers: ReportAnswer[] = Object.entries(answers).map(([key, value]) => ({
        questionId: key,
        value: value as string
    }));

    questions.forEach(q => {
        if (q.type === QuestionType.CHECK && !answers[q.id]) {
            reportAnswers.push({ questionId: q.id, value: 'No' });
        }
    });

    const report: Report = {
        id: `rpt-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now(),
        answers: reportAnswers,
        isLostOperation,
        lostOperationReason: isLostOperation ? lostOperationReason : undefined,
        isAccepted,
        isProcessed
    };

    try {
        await StorageService.addReport(report);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setAnswers({});
            setIsLostOperation(false);
            setLostOperationReason('');
            setIsAccepted(false);
            setIsProcessed(false);
            setSending(false);
            onSuccess();
        }, 2000);
    } catch (error) {
        console.error("Error submitting report:", error);
        alert("Hubo un error al enviar el reporte. Por favor, inténtalo de nuevo.");
        setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando formulario...</div>;

  if (questions.length === 0) {
      return <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">El administrador aún no ha configurado preguntas para el reporte.</div>;
  }

  if (submitted) {
      return (
          <div className="flex flex-col items-center justify-center p-12 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-green-800">¡Reporte Enviado!</h3>
              <p className="text-green-600">Redirigiendo al historial...</p>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Nuevo Reporte Comercial</h3>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleOpenDuplicateModal}
          title="Duplicar un reporte anterior"
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicar Reporte
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q) => {
            if (q.type === QuestionType.CURRENCY) {
                return (
                    <div key={q.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{q.text}</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">€</span>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                className="focus:ring-[#FF7900] focus:border-[#FF7900] block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                                placeholder="0.00"
                                value={answers[q.id] || ''}
                                onChange={(e) => handleChange(q.id, e.target.value)}
                                required={q.required}
                            />
                        </div>
                    </div>
                );
            }

            if (q.type === QuestionType.CHECK) {
                return (
                    <div key={q.id} className="flex items-start pt-2">
                        <div className="flex items-center h-5">
                            <input
                                id={q.id}
                                type="checkbox"
                                className="focus:ring-[#FF7900] h-4 w-4 text-[#FF7900] border-gray-300 rounded"
                                checked={answers[q.id] === 'Sí'}
                                onChange={(e) => handleChange(q.id, e.target.checked ? 'Sí' : 'No')}
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor={q.id} className="font-medium text-gray-700 select-none cursor-pointer">
                                {q.text}
                            </label>
                        </div>
                    </div>
                );
            }

            // Default for text, number, date
            return (
                <div key={q.id}>
                    <Input
                        label={q.text}
                        type={q.type}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        required={q.required}
                    />
                </div>
            );
        })}

        {/* Operación Perdida Section */}
        <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="accepted-operation"
                        type="checkbox"
                        className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded disabled:opacity-50"
                        checked={isAccepted}
                        onChange={(e) => {
                            setIsAccepted(e.target.checked);
                            if (e.target.checked) setIsLostOperation(false);
                        }}
                        disabled={isLostOperation}
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="accepted-operation" className={`font-bold select-none cursor-pointer ${isLostOperation ? 'text-gray-400' : 'text-green-700'}`}>
                        Propuesta Aceptada
                    </label>
                    <p className="text-gray-500">Marca esta casilla si el cliente ha aceptado la propuesta.</p>
                </div>
            </div>

            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="processed-operation"
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                        checked={isProcessed}
                        onChange={(e) => {
                            setIsProcessed(e.target.checked);
                            if (e.target.checked) {
                                setIsAccepted(true);
                                setIsLostOperation(false);
                            }
                        }}
                        disabled={isLostOperation}
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="processed-operation" className={`font-bold select-none cursor-pointer ${isLostOperation ? 'text-gray-400' : 'text-blue-700'}`}>
                        Propuesta Tramitada
                    </label>
                    <p className="text-gray-500">Marca esta casilla si la operación ya ha sido procesada o ejecutada.</p>
                </div>
            </div>

            <div className="flex items-start border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center h-5">
                    <input
                        id="lost-operation"
                        type="checkbox"
                        className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                        checked={isLostOperation}
                        onChange={(e) => {
                            setIsLostOperation(e.target.checked);
                            if (e.target.checked) {
                                setIsAccepted(false);
                                setIsProcessed(false);
                            }
                        }}
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="lost-operation" className="font-bold text-red-700 select-none cursor-pointer">
                        Marcar como Operación Perdida
                    </label>
                    <p className="text-gray-500">Si la negociación no ha prosperado, marca esta casilla.</p>
                </div>
            </div>

            {isLostOperation && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200 pl-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo de la pérdida <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        rows={3}
                        placeholder="Explica brevemente por qué se ha perdido la operación..."
                        value={lostOperationReason}
                        onChange={(e) => setLostOperationReason(e.target.value)}
                        required={isLostOperation}
                    />
                </div>
            )}
        </div>

        <div className="pt-4">
            <Button type="submit" size="lg" className="w-full" isLoading={sending}>
                Enviar Reporte
            </Button>
        </div>
      </form>

      {/* Modal de Duplicación */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Duplicar Reporte Anterior</h3>
              <button onClick={() => setIsDuplicateModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
                  placeholder="Buscar por fecha, cliente, respuesta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingReports ? (
                <div className="text-center text-gray-500 py-8">Cargando reportes...</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No se encontraron reportes.</div>
              ) : (
                <ul className="space-y-3">
                  {filteredReports.map(report => (
                    <li 
                      key={report.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:border-[#FF7900] hover:bg-orange-50 transition-colors cursor-pointer" 
                      onClick={() => handleDuplicate(report)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-gray-900">
                          {new Date(report.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {report.isLostOperation && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Perdida
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {report.answers.map(a => {
                          const q = questions.find(q => q.id === a.questionId);
                          return q ? `${q.text}: ${a.value}` : String(a.value);
                        }).join(' | ')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};