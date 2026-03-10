import { Report, Question } from '../types';

export const getClientName = (report: Report, questions: Question[]): string => {
    const clientQ = questions.find(q => {
        const text = q.text.toLowerCase();
        return text.includes('cliente') || text.includes('empresa') || text.includes('nombre');
    });

    if (clientQ) {
        const ans = report.answers.find(a => a.questionId === clientQ.id);
        if (ans && ans.value) {
            return String(ans.value).trim().toLowerCase();
        }
    }
    return report.id; // Fallback to report ID if no client name found
};

export const getUniqueReportsForStats = (reports: Report[], questions: Question[]): Report[] => {
    // Sort reports by timestamp descending so we process the newest first
    const sortedReports = [...reports].sort((a, b) => b.timestamp - a.timestamp);
    
    const uniqueReportsMap = new Map<string, Report>();

    sortedReports.forEach(report => {
        const date = new Date(report.timestamp);
        const month = date.getMonth();
        const year = date.getFullYear();
        const clientName = getClientName(report, questions);
        
        // Create a unique key for: Commercial + Month + Year + Client Name
        const key = `${report.userId}_${year}_${month}_${clientName}`;

        // Since we sorted descending, the first one we encounter is the newest.
        // We only keep the newest report for that client in that month.
        if (!uniqueReportsMap.has(key)) {
            uniqueReportsMap.set(key, report);
        }
    });

    return Array.from(uniqueReportsMap.values());
};
