import { Report, Question } from "../types";

export const GeminiService = {
  analyzeReports: async (reports: Report[], questions: Question[]): Promise<string> => {
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
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error && data.error.includes("API key not valid")) {
           return "Error: La API Key configurada no es válida. Por favor, revísala en los ajustes.";
        }
        throw new Error(data.error || 'Server error');
      }
      return data.text || "No se pudo generar el análisis.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Hubo un error al conectar con la IA para el análisis.";
    }
  },

  generateEvaluation: async (reports: Report[], questions: Question[], type: 'global' | 'individual', commercialName?: string): Promise<string> => {
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
      const response = await fetch('/api/gemini/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error && data.error.includes("API key not valid")) {
           return "Error: La API Key configurada no es válida. Por favor, revísala en los ajustes.";
        }
        throw new Error(data.error || 'Server error');
      }
      return data.text || "Sin valoración.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Hubo un error al conectar con la IA.";
    }
  }
};