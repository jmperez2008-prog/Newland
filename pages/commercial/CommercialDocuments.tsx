import React, { useState, useEffect } from 'react';
import { SharedDocument } from '../../types';
import { StorageService } from '../../services/storageService';
import { File, Download, FolderOpen } from 'lucide-react';

export const CommercialDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        const docs = await StorageService.getDocuments();
        setDocuments(docs.sort((a, b) => b.uploadedAt - a.uploadedAt));
        setLoading(false);
    };
    load();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando documentos...</div>;

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
               <FolderOpen className="h-5 w-5 text-[#FF7900]" />
               Documentos Corporativos
           </h3>
           <p className="text-sm text-gray-500">
               Descarga aquí material de apoyo, listas de precios y catálogos actualizados por administración.
           </p>
       </div>

       <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
            {documents.length === 0 && (
                <li className="px-6 py-12 text-center text-gray-500 flex flex-col items-center">
                    <File className="h-10 w-10 text-gray-300 mb-2" />
                    No hay documentos disponibles.
                </li>
            )}
            {documents.map((doc) => (
                <li key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-orange-50 flex items-center justify-center">
                            <File className="h-5 w-5 text-[#FF7900]" />
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                            <div className="text-xs text-gray-500">
                                {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    <div>
                         <a 
                            href={doc.data} 
                            download={doc.name}
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7900]"
                        >
                             <Download className="h-4 w-4 mr-2" />
                             Descargar
                        </a>
                    </div>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
};