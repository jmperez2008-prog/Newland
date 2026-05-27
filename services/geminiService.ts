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
  },

  generateEvaluation: async (reports: Report[], questions: Question[], type: 'global' | 'individual', commercialName?: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Análisis no disponible (Falta API Key).";

    const ai = new GoogleGenAI({ apiKey });

    const totalOps = reports.length;
    let closedSales = 0;
    reports.forEach(r => {
        const saleQ = r.answers.find(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            return q && q.type === 'check' && q.text.toLowerCase().includes('venta');
        });
        if (saleQ && saleQ.value === 'Sí') closedSales++;
    });

    const conversionRate = totalOps > 0 ? ((closedSales / totalOps) * 100).toFixed(1) : '0';

    const prompt = type === 'global' 
      ? `Actúa como un director nacional de ventas. Escribe una valoración ejecutiva y concisa (max 2 párrafos cortos) valorando el trabajo global del equipo este mes. Operaciones totales: ${totalOps}. Ventas cerradas: ${closedSales}. Ratio de conversión: ${conversionRate}%. Identifica fortalezas y áreas de mejora sin inventar datos específicos, basándote en que es un buen/mal ratio según estándares de telecomunicaciones B2B.`
      : `Actúa como chief sales officer. Escribe un párrafo muy breve y directo valorando el desempeño individual de ${commercialName} este mes. Operaciones intentadas: ${totalOps}. Éxitos: ${closedSales} (${conversionRate}% conversión). Si sus datos son muy bajos, incentívalo; si son altos, felicítalo efusivamente.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "Sin valoración.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Hubo un error al conectar con la IA.";
    }
  }
};