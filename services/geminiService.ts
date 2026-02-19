import { GoogleGenAI } from "@google/genai";
import { Report, Question } from "../types";

const createClient = () => {
  // Safely check for process.env to avoid ReferenceError in pure browser environments
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;
  
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  analyzeReports: async (reports: Report[], questions: Question[]): Promise<string> => {
    const ai = createClient();
    if (!ai) return "El análisis de IA no está disponible (Falta API Key).";

    // Format data for the prompt
    const reportsText = reports.map((r, i) => {
        const answersText = r.answers.map(a => {
            const q = questions.find(q => q.id === a.questionId);
            return `${q?.text || 'Pregunta desconocida'}: ${a.value}`;
        }).join('; ');
        return `Reporte ${i+1} (por ${r.userName}): ${answersText}`;
    }).join('\n');

    const prompt = `
      Actúa como un director comercial experto. Analiza los siguientes reportes comerciales breves.
      Identifica tendencias, problemas comunes y oportunidades de venta.
      Dame un resumen ejecutivo de 3 párrafos en español.
      
      Datos:
      ${reportsText}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Hubo un error al conectar con la IA para el análisis.";
    }
  }
};