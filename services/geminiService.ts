import { GoogleGenAI } from "@google/genai";
import { Report, Question } from "../types";

// Declare process for TypeScript in case @types/node is missing
declare const process: { env: { [key: string]: string | undefined } };

export const GeminiService = {
  analyzeReports: async (reports: Report[], questions: Question[]): Promise<string> => {
    // API key must be obtained exclusively from process.env.API_KEY
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.warn("Gemini API Key missing. Please set API_KEY in your environment.");
        return "El análisis de IA no está disponible (Falta configuración de API Key).";
    }

    const ai = new GoogleGenAI({ apiKey });

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