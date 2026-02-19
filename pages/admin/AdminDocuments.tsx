import React, { useState, useEffect } from 'react';
import { SharedDocument } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Upload, File, Trash2, Download } from 'lucide-react';

export const AdminDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await StorageService.getDocuments();
    setDocuments(docs.sort((a, b) => b.uploadedAt - a.uploadedAt));
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Aumentamos el límite a 15MB
    // Nota: Almacenar archivos muy grandes como base64 en la base de datos puede ser lento.
    // Si necesitas archivos más grandes, considera usar Supabase Storage Buckets.
    const maxSize = 15 * 1024 * 1024; // 15MB

    if (file.size > maxSize) {
        setError('El archivo es demasiado grande. Máximo 15MB permitidos.');
        return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64String = event.target?.result as string;
        
        const newDoc: SharedDocument = {
            id: `doc-${Date.now()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: Date.now(),
            data: base64String
        };

        try {
            await StorageService.addDocument(newDoc);
            loadDocuments();
        } catch (err: any) {
            // Manejo de error si la petición es demasiado grande para el servidor
            if (err.message && err.message.includes('413')) {
                setError('El archivo es demasiado grande para ser procesado por el servidor.');
            } else {
                setError('Error al subir: ' + err.message);
            }
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };
    
    reader.onerror = () => {
        setError('Error al leer el archivo.');
        setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('¿Eliminar este archivo?')) {
          await StorageService.deleteDocument(id);
          loadDocuments();
      }
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="text-center p-8 text-gray-500">Cargando documentos...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Carpeta Compartida</h3>
        <p className="text-sm text-gray-500 mb-4">
          Sube catálogos, listas de precios o documentos PDF para que los comerciales los descarguen.
        </p>

        <div className="flex items-center gap-4">
            <label className="relative cursor-pointer">
                <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                />
                <div className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#FF7900] hover:bg-[#E66000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7900] ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Subiendo...' : 'Subir Archivo'}
                </div>
            </label>
            {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-2">Máximo 15MB por archivo.</p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
            {documents.length === 0 && (
                <li className="px-6 py-12 text-center text-gray-500 flex flex-col items-center">
                    <File className="h-10 w-10 text-gray-300 mb-2" />
                    No hay documentos compartidos.
                </li>
            )}
            {documents.map((doc) => (
                <li key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-orange-50 flex items-center justify-center">
                            <File className="h-5 w-5 text-[#FF7900]" />
                        </div>
                        <div className="ml-4 flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{doc.name}</div>
                            <div className="text-xs text-gray-500">
                                {formatSize(doc.size)} • Subido el {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <a 
                            href={doc.data} 
                            download={doc.name}
                            className="p-2 text-gray-400 hover:text-[#FF7900] transition-colors"
                            title="Descargar"
                        >
                             <Download className="h-5 w-5" />
                        </a>
                        <button 
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
};