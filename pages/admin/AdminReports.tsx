import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, Question, User, UserRole, QuestionType, ReportAnswer } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { getWeekNumber, getWeekRange, isSameWeek, getMonthName } from '../../utils/dateUtils';
import { Download, TrendingUp, Smartphone, Phone, Euro, CheckCircle2, Folder, Calendar, PieChart, Edit2, X, Save, Briefcase, Wifi } from 'lucide-react';

interface AdminReportsProps {
    currentUser: User;
}

type ViewMode = 'current' | 'archive' | 'monthly';

export const AdminReports: React.FC<AdminReportsProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View Control
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedArchiveWeek, setSelectedArchiveWeek] = useState<string | null>(null);

  // Filters
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  
  // Editing State
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isSuper = currentUser.role === UserRole.SUPERADMIN;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const [r, q, u] = await Promise.all([
          StorageService.getReports(),
          StorageService.getQuestions(),
          StorageService.getUsers()
      ]);
      setReports(r.sort((a,b) => b.timestamp - a.timestamp));
      setQuestions(q);
      setUsers(u);
      setLoading(false);
  };

  // --- FILTERING LOGIC ---

  // 1. Basic User/Zone Filtering
  const baseFilteredReports = useMemo(() => {
      return reports.filter(r => {
          const reportAuthor = users.find(u => u.id === r.userId);
          
          let matchesZone = false;
          if (isSuper) {
              if (selectedZone === 'all') matchesZone = true;
              else matchesZone = reportAuthor?.zone === selectedZone;
          } else {
              matchesZone = reportAuthor?.zone === currentUser.zone;
          }

          let matchesUser = false;
          if (selectedUser === 'all') matchesUser = true;
          else matchesUser = r.userId === selectedUser;

          return matchesZone && matchesUser;
      });
  }, [reports, users, selectedZone, selectedUser, isSuper, currentUser.zone]);

  // 2. View Mode Filtering
  const displayedReports = useMemo(() => {
      const now = new Date();

      if (viewMode === 'current') {
          // Show only reports from current week
          return baseFilteredReports.filter(r => isSameWeek(new Date(r.timestamp), now));
      } 
      
      if (viewMode === 'archive' && selectedArchiveWeek) {
          // Show reports from selected historical week
          const [year, week] = selectedArchiveWeek.split('-').map(Number);
          return baseFilteredReports.filter(r => {
              const d = new Date(r.timestamp);
              return d.getFullYear() === year && getWeekNumber(d) === week;
          });
      }

      // Monthly view uses a different data structure, so for the table list we might return all or none
      // But we will handle Monthly rendering separately.
      return baseFilteredReports;
  }, [baseFilteredReports, viewMode, selectedArchiveWeek]);


  // --- AGGREGATION LOGIC (For Monthly View & Archive Folders) ---

  const archiveFolders = useMemo(() => {
      const folders: Record<string, { year: number, week: number, count: number, start: string, end: string }> = {};
      
      baseFilteredReports.forEach(r => {
          const d = new Date(r.timestamp);
          const year = d.getFullYear();
          const week = getWeekNumber(d);
          const key = `${year}-${week}`;

          // Don't include current week in archive
          if (isSameWeek(d, new Date())) return;

          if (!folders[key]) {
              const range = getWeekRange(new Date(d));
              folders[key] = { year, week, count: 0, start: range.start, end: range.end };
          }
          folders[key].count++;
      });

      return Object.values(folders).sort((a,b) => (b.year * 100 + b.week) - (a.year * 100 + a.week));
  }, [baseFilteredReports]);

  const monthlyStats = useMemo(() => {
      const stats: Record<string, { 
          month: number, year: number, 
          mobile: number, fixed: number, margin: number, 
          totalOps: number, closedOps: number 
      }> = {};

      baseFilteredReports.forEach(r => {
          const d = new Date(r.timestamp);
          const key = `${d.getFullYear()}-${d.getMonth()}`;

          if (!stats[key]) {
              stats[key] = { 
                  month: d.getMonth(), year: d.getFullYear(), 
                  mobile: 0, fixed: 0, margin: 0, 
                  totalOps: 0, closedOps: 0 
              };
          }

          const s = stats[key];
          s.totalOps++;
          
          // Check closed sale
          let isClosed = false;
          const saleQ = r.answers.find(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            return q && q.type === QuestionType.CHECK && q.text.toLowerCase().includes('venta');
          });
          if (saleQ && saleQ.value === 'Sí') {
              isClosed = true;
              s.closedOps++;
          }

          // Sum values
          r.answers.forEach(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            if (!q) return;
            const val = typeof a.value === 'string' ? parseFloat(a.value) : Number(a.value);
            if (isNaN(val)) return;

            const text = q.text.toLowerCase();
            if (text.includes('movil') || text.includes('móvil')) s.mobile += val;
            else if (text.includes('fibra')) s.fixed += val; 
            else if (text.includes('margen')) s.margin += val;
          });
      });

      return Object.values(stats).sort((a,b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
  }, [baseFilteredReports, questions]);


  // --- KPI CALCULATIONS (For Current View) ---
  const currentViewStats = useMemo(() => {
    let mobilePipeline = 0; // Líneas móviles en marcha
    let mobileSigned = 0;   // Líneas móviles firmadas
    let fiberPipeline = 0;  // Fibras en marcha
    let fiberSigned = 0;    // Fibras firmadas
    let totalMargin = 0;
    let closedCount = 0;
    
    // Determine which dataset to use for KPIs
    const dataset = viewMode === 'monthly' ? baseFilteredReports : displayedReports;

    dataset.forEach(r => {
        let isSaleClosed = false;
        const saleQ = r.answers.find(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            return q && q.type === QuestionType.CHECK && q.text.toLowerCase().includes('venta');
        });

        if (saleQ && saleQ.value === 'Sí') {
            isSaleClosed = true;
            closedCount++;
        }

        r.answers.forEach(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            if (!q) return;
            const val = typeof a.value === 'string' ? parseFloat(a.value) : Number(a.value);
            if (isNaN(val)) return;
            const text = q.text.toLowerCase();
            
            // Logic Split
            if (text.includes('movil') || text.includes('móvil')) {
                if (isSaleClosed) {
                    mobileSigned += val;
                } else {
                    mobilePipeline += val;
                }
            }
            else if (text.includes('fibra')) { 
                if (isSaleClosed) {
                    fiberSigned += val;
                } else {
                    fiberPipeline += val;
                }
            }
            else if (text.includes('margen')) {
                totalMargin += val;
            }
        });
    });

    const totalOps = dataset.length;
    const conversionRate = totalOps > 0 ? ((closedCount / totalOps) * 100).toFixed(1) : '0';

    return { mobilePipeline, mobileSigned, fiberPipeline, fiberSigned, totalMargin, totalOps, closedCount, conversionRate };
  }, [displayedReports, baseFilteredReports, questions, viewMode]);


  // --- HANDLERS ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Title & Metadata
    doc.setFontSize(18);
    doc.setTextColor(255, 121, 0); // #FF7900
    doc.text('Reporte Comercial - Newland Telecom', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const viewLabel = viewMode === 'current' ? 'Semana Actual' : viewMode === 'monthly' ? 'Resumen Mensual' : `Archivo: ${selectedArchiveWeek}`;
    doc.text(`Vista: ${viewLabel}`, 14, 28);
    doc.text(`Fecha de emisión: ${dateStr}`, 14, 33);
    doc.text(`Zona: ${selectedZone === 'all' ? 'Todas' : selectedZone}`, 14, 38);

    // 2. Statistics Summary
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen Estadístico', 14, 50);

    const statsData = [
      ['Móvil (Marcha)', currentViewStats.mobilePipeline],
      ['Móvil (Firmado)', currentViewStats.mobileSigned],
      ['Fibra (Marcha)', currentViewStats.fiberPipeline],
      ['Fibra (Firmado)', currentViewStats.fiberSigned],
      ['Margen Total', `${currentViewStats.totalMargin.toLocaleString('es-ES')} €`],
      ['Operaciones Totales', currentViewStats.totalOps],
      ['Ventas Cerradas', currentViewStats.closedCount],
      ['Ratio de Conversión', `${currentViewStats.conversionRate}%`]
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Métrica', 'Valor']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [255, 121, 0] },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: 14, right: 100 } // Compact table on the left
    });

    // 3. Detailed Reports Table
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.text('Detalle de Reportes', 14, finalY + 15);

    const tableHead = [['Fecha', 'Comercial', 'Zona', ...questions.map(q => q.text)]];
    const tableBody = displayedReports.map(r => {
        const author = users.find(u => u.id === r.userId);
        const zoneName = author?.zone || 'N/A';
        const date = new Date(r.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        const answers = questions.map(q => {
            const ans = r.answers.find(a => a.questionId === q.id);
            let val = ans ? String(ans.value) : '-';
            if (q.type === QuestionType.CURRENCY && ans) val += ' €';
            return val;
        });

        return [date, r.userName, zoneName, ...answers];
    });

    autoTable(doc, {
      startY: finalY + 20,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [60, 60, 60] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 
          0: { cellWidth: 15 }, // Fecha
          1: { cellWidth: 20 }, // Comercial
          2: { cellWidth: 15 }  // Zona
      }
    });

    doc.save(`reporte_${viewMode}_${now.toISOString().slice(0,10)}.pdf`);
  };

  // --- EDITING HANDLERS ---
  const startEditing = (report: Report) => {
      setEditingReport(report);
      // Map existing answers to object for easy form binding
      const initialAnswers: Record<string, string> = {};
      
      // Populate with existing answers
      report.answers.forEach(a => {
          initialAnswers[a.questionId] = String(a.value);
      });

      setEditAnswers(initialAnswers);
  };

  const handleEditChange = (qId: string, val: string) => {
      setEditAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const saveEdit = async () => {
      if (!editingReport) return;
      setIsSaving(true);

      const updatedAnswers: ReportAnswer[] = Object.entries(editAnswers).map(([qId, val]) => ({
          questionId: qId,
          value: val as string | number
      }));

      // Ensure required checks are present if missing
      questions.forEach(q => {
          if (q.type === QuestionType.CHECK && !editAnswers[q.id]) {
               // If existing answer was "Sí", it's in editAnswers. If it was "No" or missing, ensure it's "No"
               // Check if it was already in the update
               if (!updatedAnswers.find(a => a.questionId === q.id)) {
                   updatedAnswers.push({ questionId: q.id, value: 'No' });
               }
          }
      });

      const updatedReport: Report = {
          ...editingReport,
          answers: updatedAnswers
      };

      await StorageService.updateReport(updatedReport);
      
      // Update local state
      setReports(reports.map(r => r.id === updatedReport.id ? updatedReport : r));
      
      setIsSaving(false);
      setEditingReport(null);
  };

  const availableZones = useMemo(() => {
      const zones = new Set<string>();
      users.forEach(u => { if (u.zone) zones.add(u.zone); });
      return Array.from(zones);
  }, [users]);

  const filteredUsersList = useMemo(() => {
      return users.filter(u => {
          if (u.role === UserRole.SUPERADMIN || u.role === UserRole.ADMIN) return false;
          if (isSuper) return selectedZone === 'all' ? true : u.zone === selectedZone;
          return u.zone === currentUser.zone;
      });
  }, [users, selectedZone, isSuper, currentUser.zone]);

  if (loading) return <div className="text-center p-8 text-gray-500">Cargando datos...</div>;

  return (
    <div className="space-y-6">
      {/* 1. Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {/* Main Filters Row */}
          <div className="flex flex-col md:flex-row gap-4">
             {isSuper && (
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zona</label>
                   <select
                     value={selectedZone}
                     onChange={(e) => setSelectedZone(e.target.value)}
                     className="block w-full md:w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#FF7900] focus:border-[#FF7900]"
                   >
                     <option value="all">Todas</option>
                     {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                   </select>
                </div>
             )}
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comercial</label>
               <select
                 value={selectedUser}
                 onChange={(e) => setSelectedUser(e.target.value)}
                 className="block w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#FF7900] focus:border-[#FF7900]"
               >
                 <option value="all">Todos</option>
                 {filteredUsersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => { setViewMode('current'); setSelectedArchiveWeek(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'current' ? 'bg-white text-[#FF7900] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Semana Actual
            </button>
            <button
                onClick={() => { setViewMode('archive'); setSelectedArchiveWeek(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'archive' ? 'bg-white text-[#FF7900] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Archivo Semanal
            </button>
            <button
                onClick={() => { setViewMode('monthly'); setSelectedArchiveWeek(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'monthly' ? 'bg-white text-[#FF7900] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Resumen Mensual
            </button>
        </div>
      </div>

      {/* 2. KPI Statistics (Context Aware) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Pipeline Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> 
                  {viewMode === 'current' ? 'Resultados Semana Actual' : viewMode === 'monthly' ? 'Acumulado Total (Vista)' : 'Resultados Históricos'}
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center divide-x divide-gray-100">
                  <div>
                      <p className="text-xs text-gray-400 mb-1 flex justify-center items-center gap-1" title="Líneas Móviles (Operación en Marcha)"><Briefcase className="h-3 w-3"/> Móvil (Marcha)</p>
                      <p className="text-xl font-bold text-gray-700">{currentViewStats.mobilePipeline}</p>
                  </div>
                  <div>
                      <p className="text-xs text-green-600 mb-1 flex justify-center items-center gap-1" title="Líneas Móviles (Firmadas)"><CheckCircle2 className="h-3 w-3"/> Móvil (Firm.)</p>
                      <p className="text-xl font-bold text-green-600">{currentViewStats.mobileSigned}</p>
                  </div>
                  <div>
                      <p className="text-xs text-gray-400 mb-1 flex justify-center items-center gap-1" title="Fibras (Operación en Marcha)"><Wifi className="h-3 w-3"/> Fibra (Marcha)</p>
                      <p className="text-xl font-bold text-gray-700">{currentViewStats.fiberPipeline}</p>
                  </div>
                  <div>
                      <p className="text-xs text-green-600 mb-1 flex justify-center items-center gap-1" title="Fibras (Firmadas)"><CheckCircle2 className="h-3 w-3"/> Fibra (Firm.)</p>
                      <p className="text-xl font-bold text-green-600">{currentViewStats.fiberSigned}</p>
                  </div>
                  <div>
                      <p className="text-xs text-gray-400 mb-1 flex justify-center items-center gap-1"><Euro className="h-3 w-3"/> Margen</p>
                      <p className="text-xl font-bold text-blue-600">{currentViewStats.totalMargin.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</p>
                  </div>
              </div>
          </div>

          {/* Success/Ratio Stats */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg shadow-sm border border-green-200 p-5">
              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <PieChart className="h-4 w-4" /> Estadística de Éxito
              </h4>
              <div className="flex items-center justify-between px-4">
                   <div className="text-center">
                       <p className="text-xs text-green-600 mb-1">Operaciones en Marcha</p>
                       <p className="text-2xl font-bold text-gray-800">{currentViewStats.totalOps - currentViewStats.closedCount}</p>
                   </div>
                   <div className="h-10 w-px bg-green-200"></div>
                   <div className="text-center">
                       <p className="text-xs text-green-600 mb-1">Ventas Cerradas</p>
                       <p className="text-2xl font-bold text-green-600">{currentViewStats.closedCount}</p>
                   </div>
                   <div className="h-10 w-px bg-green-200"></div>
                   <div className="text-center">
                       <p className="text-xs text-green-600 mb-1">Ratio de Conversión</p>
                       <div className="flex items-center justify-center gap-1">
                           <p className="text-3xl font-black text-green-700">{currentViewStats.conversionRate}%</p>
                           {Number(currentViewStats.conversionRate) > 0 && <CheckCircle2 className="h-5 w-5 text-green-500"/>}
                       </div>
                   </div>
              </div>
          </div>
      </div>

      {/* 3. Main Content Area */}
      
      {/* VIEW: ARCHIVE FOLDERS LIST */}
      {viewMode === 'archive' && !selectedArchiveWeek && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5 text-[#FF7900]" />
                  Carpetas Semanales Archivadas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archiveFolders.length === 0 && <p className="text-gray-500 col-span-full">No hay reportes archivados de semanas anteriores.</p>}
                  {archiveFolders.map((folder) => (
                      <button 
                        key={`${folder.year}-${folder.week}`}
                        onClick={() => setSelectedArchiveWeek(`${folder.year}-${folder.week}`)}
                        className="flex flex-col p-4 border border-gray-200 rounded-lg hover:border-[#FF7900] hover:bg-orange-50 transition-all text-left group"
                      >
                          <div className="flex justify-between items-center w-full mb-2">
                              <span className="text-xs font-bold text-gray-400 uppercase">Semana {folder.week}, {folder.year}</span>
                              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full group-hover:bg-white">{folder.count} Reportes</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                              <Calendar className="h-4 w-4 text-[#FF7900]" />
                              {folder.start} - {folder.end}
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* VIEW: MONTHLY SUMMARY TABLE */}
      {viewMode === 'monthly' && (
           <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Resumen Mensual Agregado</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes / Año</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Reportes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Móvil</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fibras</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Margen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas Cerradas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Éxito</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {monthlyStats.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No hay datos suficientes.</td></tr>
                        )}
                        {monthlyStats.map((stat) => (
                            <tr key={`${stat.year}-${stat.month}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {getMonthName(stat.month)} {stat.year}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.totalOps}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.mobile}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.fixed}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{stat.margin.toLocaleString()} €</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">{stat.closedOps}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {stat.totalOps > 0 ? ((stat.closedOps / stat.totalOps) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
           </div>
      )}

      {/* VIEW: TABLE LIST (Used for 'current' and specific 'archive' week) */}
      {(viewMode === 'current' || (viewMode === 'archive' && selectedArchiveWeek)) && (
          <>
            {/* View Header with Back Button if Archive */}
            {viewMode === 'archive' && (
                <div className="flex items-center gap-4 mb-2">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedArchiveWeek(null)}>
                        ← Volver a Carpetas
                    </Button>
                    <h3 className="text-lg font-bold text-gray-800">
                        Detalle Semana: {selectedArchiveWeek}
                    </h3>
                </div>
            )}

            <div className="flex justify-end gap-2 mb-4">
                <Button onClick={exportPDF} disabled={displayedReports.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Informe (PDF)
                </Button>
            </div>

            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info Comercial</th>
                    {questions.map(q => (
                        <th key={q.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{q.text}</th>
                    ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {displayedReports.length === 0 && (
                         <tr><td colSpan={questions.length + 2} className="px-6 py-12 text-center text-gray-500">No hay reportes en esta vista.</td></tr>
                    )}
                    {displayedReports.map((report) => {
                    const author = users.find(u => u.id === report.userId);
                    return (
                        <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                    onClick={() => startEditing(report)}
                                    className="text-gray-400 hover:text-[#FF7900] transition-colors"
                                    title="Editar reporte"
                                >
                                    <Edit2 className="h-5 w-5" />
                                </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{new Date(report.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                            <div className="text-xs text-gray-500 font-bold">{report.userName}</div>
                            <div className="text-xs text-orange-600">{author?.zone || 'N/A'}</div>
                            </td>
                            {questions.map(q => {
                            const answer = report.answers.find(a => a.questionId === q.id);
                            let displayVal = answer ? answer.value : '-';
                            if (q.type === QuestionType.CURRENCY && answer) displayVal = `${answer.value} €`;
                            return (
                                <td key={q.id} className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">{displayVal}</td>
                            );
                            })}
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
          </>
      )}

      {/* EDIT MODAL */}
      {editingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
                      <h3 className="text-lg font-bold text-gray-900">Editar Reporte</h3>
                      <button onClick={() => setEditingReport(null)} className="text-gray-400 hover:text-gray-500">
                          <X className="h-6 w-6" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 mb-4">
                          <p><strong>Comercial:</strong> {editingReport.userName}</p>
                          <p><strong>Fecha:</strong> {new Date(editingReport.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      
                      <form id="edit-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4">
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
                                    <div key={q.id} className="flex items-start pt-2">
                                        <div className="flex items-center h-5">
                                            <input
                                                id={`edit-${q.id}`}
                                                type="checkbox"
                                                className="focus:ring-[#FF7900] h-4 w-4 text-[#FF7900] border-gray-300 rounded"
                                                checked={editAnswers[q.id] === 'Sí'}
                                                onChange={(e) => handleEditChange(q.id, e.target.checked ? 'Sí' : 'No')}
                                            />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor={`edit-${q.id}`} className="font-medium text-gray-700 select-none cursor-pointer">
                                                {q.text}
                                            </label>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={q.id}>
                                    <Input
                                        label={q.text}
                                        type={q.type}
                                        value={editAnswers[q.id] || ''}
                                        onChange={(e) => handleEditChange(q.id, e.target.value)}
                                        required={q.required}
                                    />
                                </div>
                            );
                        })}
                      </form>
                  </div>
                  <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                      <Button variant="secondary" onClick={() => setEditingReport(null)}>Cancelar</Button>
                      <Button onClick={saveEdit} isLoading={isSaving}>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Cambios
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};