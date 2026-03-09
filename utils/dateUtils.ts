export const getWeekNumber = (d: Date): number => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

export const getWeekRange = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const start = new Date(date.setDate(diff));
    const end = new Date(date.setDate(start.getDate() + 6));
    
    return {
        start: start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        end: end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
};

export const isSameWeek = (date1: Date, date2: Date) => {
    return getWeekNumber(date1) === getWeekNumber(date2) && date1.getFullYear() === date2.getFullYear();
};

export const getMonthName = (monthIndex: number) => {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
};