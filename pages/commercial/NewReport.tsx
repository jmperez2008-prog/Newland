import React, { useState, useEffect } from 'react';
import { User, Question, Report, ReportAnswer, QuestionType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { CheckCircle, Copy } from 'lucide-react';

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
  const [loadingLastReport, setLoadingLastReport] = useState(false);

  useEffect(() => {
    const load = async () => {
        const q = await StorageService.getQuestions();
        setQuestions(q);
        setLoading(false);
    };
    load();
  }, []);

  const handleDuplicateLastReport = async () => {
    setLoadingLastReport(true);
    try {
      const allReports = await StorageService.getReports();
      const userReports = allReports
        .filter(r => r.userId === currentUser.id)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (userReports.length > 0) {
        const lastReport = userReports[0];
        const newAnswers: Record<string, string> = {};
        lastReport.answers.forEach(ans => {
          newAnswers[ans.questionId] = String(ans.value);
        });
        setAnswers(newAnswers);
        setIsLostOperation(lastReport.isLostOperation || false);
        setLostOperationReason(lastReport.lostOperationReason || '');
      } else {
        alert('No tienes reportes anteriores para duplicar.');
      }
    } catch (error) {
      console.error('Error duplicando reporte:', error);
      alert('Hubo un error al intentar duplicar el reporte.');
    } finally {
      setLoadingLastReport(false);
    }
  };

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

    // Asegurar que las preguntas requeridas tipo Check que no fueron tocadas (undefined) se envíen si es necesario,
    // o simplemente confiar en que el usuario debe interactuar. 
    // Para checkbox, si no está en answers, asumimos "No" si queremos ser estrictos, 
    // pero aquí solo enviamos lo que el usuario ha tocado explícitamente o rellenamos por defecto.
    
    // Rellenar respuestas de checkbox no marcados como 'No' si no existen en el estado
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
        lostOperationReason: isLostOperation ? lostOperationReason : undefined
    };

    await StorageService.addReport(report);
    setSubmitted(true);
    setTimeout(() => {
        setSubmitted(false);
        setAnswers({});
        setIsLostOperation(false);
        setLostOperationReason('');
        setSending(false);
        onSuccess();
    }, 2000);
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
          onClick={handleDuplicateLastReport}
          isLoading={loadingLastReport}
          title="Duplicar el último reporte enviado"
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicar Último
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
        <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        id="lost-operation"
                        type="checkbox"
                        className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                        checked={isLostOperation}
                        onChange={(e) => setIsLostOperation(e.target.checked)}
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
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
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
    </div>
  );
};