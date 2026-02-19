import React, { useState, useEffect } from 'react';
import { Question, QuestionType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';

export const AdminForms: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>(QuestionType.TEXT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
      setLoading(true);
      const q = await StorageService.getQuestions();
      // Aseguramos que el orden se mantiene tal cual viene del servicio
      setQuestions(q);
      setLoading(false);
  };

  const saveQuestions = async (updated: Question[]) => {
    setQuestions(updated); // Optimistic update
    await StorageService.saveQuestions(updated);
  };

  const addQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText) return;

    const newQ: Question = {
      id: `q${Date.now()}`,
      text: newQuestionText,
      type: newQuestionType,
      required: true
    };

    saveQuestions([...questions, newQ]);
    setNewQuestionText('');
    setNewQuestionType(QuestionType.TEXT);
  };

  const removeQuestion = (id: string) => {
    saveQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Verificar límites
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    // Intercambiar elementos
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

    saveQuestions(newQuestions);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* List of Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Estructura del Reporte</h3>
        <p className="text-sm text-gray-500">
            Define y ordena las preguntas que los comerciales deberán responder.
        </p>
        
        <div className="bg-white shadow rounded-md overflow-hidden">
          {loading ? (
             <div className="p-8 text-center text-gray-500">Cargando formulario...</div>
          ) : (
            <ul className="divide-y divide-gray-200">
                {questions.length === 0 && (
                <div className="p-8 text-center text-gray-500">No hay preguntas configuradas.</div>
                )}
                {questions.map((q, index) => (
                <li key={q.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        {/* Reorder Controls */}
                        <div className="flex flex-col gap-1 mr-2">
                            <button 
                                onClick={() => moveQuestion(index, 'up')}
                                disabled={index === 0}
                                className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-[#FF7900]'}`}
                                title="Mover arriba"
                            >
                                <ArrowUp className="h-3 w-3" />
                            </button>
                            <button 
                                onClick={() => moveQuestion(index, 'down')}
                                disabled={index === questions.length - 1}
                                className={`p-1 rounded hover:bg-gray-200 ${index === questions.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-[#FF7900]'}`}
                                title="Mover abajo"
                            >
                                <ArrowDown className="h-3 w-3" />
                            </button>
                        </div>

                        <span className="text-gray-400 font-mono text-xs w-6 text-center">{index + 1}.</span>
                        
                        <div>
                            <p className="text-sm font-medium text-gray-900">{q.text}</p>
                            <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>
                                {q.type === 'currency' ? 'Moneda (€)' : q.type === 'check' ? 'Check' : q.type}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => removeQuestion(q.id)}
                        className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                        title="Eliminar pregunta"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add New Question */}
      <div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 sticky top-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Añadir Pregunta</h3>
          <form onSubmit={addQuestion} className="space-y-4">
            <Input
              label="Texto de la Pregunta"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Ej: ¿Importe de la oferta? o ¿Cliente interesado?"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Respuesta</label>
              <select
                value={newQuestionType}
                onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
              >
                <option value={QuestionType.TEXT}>Texto Libre</option>
                <option value={QuestionType.NUMBER}>Número (Simple)</option>
                <option value={QuestionType.DATE}>Fecha</option>
                <option value={QuestionType.CHECK}>Casilla de Verificación (Sí/No)</option>
                <option value={QuestionType.CURRENCY}>Moneda (€)</option>
              </select>
            </div>

            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Añadir al Reporte
            </Button>
          </form>

            <div className="mt-6 bg-orange-50 p-4 rounded-md border border-orange-100">
            <h4 className="text-sm font-bold text-[#FF7900]">Información</h4>
            <p className="text-xs text-orange-600 mt-1">
                Utiliza las flechas en la lista de la izquierda para cambiar el orden en que aparecen las preguntas en el reporte.
            </p>
            </div>
        </div>
      </div>
    </div>
  );
};