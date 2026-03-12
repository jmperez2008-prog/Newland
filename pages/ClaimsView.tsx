import React, { useState, useEffect } from 'react';
import { User, UserRole, Claim, ClaimStatus, ClaimAttachment, ClaimMessage } from '../types';
import { StorageService } from '../services/storageService';
import { EmailService } from '../services/emailService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Save, Paperclip, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

interface ClaimsViewProps {
  currentUser: User;
}

export const ClaimsView: React.FC<ClaimsViewProps> = ({ currentUser }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClaim, setNewClaim] = useState<Partial<Claim>>({});
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState<ClaimAttachment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [c, u] = await Promise.all([
      StorageService.getClaims(currentUser),
      StorageService.getUsers()
    ]);
    setClaims(c);
    setUsers(u);
    setLoading(false);
  };

  const handleClaimSelect = async (claim: Claim) => {
    setSelectedClaim(claim);
    setResolution(claim.resolution || '');
    const atts = await StorageService.getClaimAttachments(claim.id);
    setAttachments(atts);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await StorageService.deleteClaimAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Error al eliminar el archivo.');
    }
  };

  const handleAddMessage = async () => {
    if (!selectedClaim || !newMessage.trim()) return;
    const message: ClaimMessage = {
      id: `msg-${Date.now()}`,
      claimId: selectedClaim.id,
      userId: currentUser.id,
      userName: currentUser.name,
      content: newMessage,
      timestamp: Date.now()
    };
    const updatedClaim = { ...selectedClaim, messages: [...selectedClaim.messages, message] };
    await StorageService.saveClaim(updatedClaim);
    setSelectedClaim(updatedClaim);
    setNewMessage('');
    loadData();
    
    // Send email
    await EmailService.sendClaimNotification(updatedClaim, newMessage, 'message');
  };

  const handleEditMessage = async (messageId: string) => {
    if (!selectedClaim) return;
    const updatedMessages = selectedClaim.messages.map(m => 
      m.id === messageId ? { ...m, content: editContent } : m
    );
    const updatedClaim = { ...selectedClaim, messages: updatedMessages };
    await StorageService.saveClaim(updatedClaim);
    setSelectedClaim(updatedClaim);
    setEditingMessageId(null);
    setEditContent('');
    loadData();
  };

  const handleCloseClaim = async () => {
    if (!selectedClaim || !resolution.trim()) {
      alert('Por favor, introduce una resolución.');
      return;
    }
    const updatedClaim = { ...selectedClaim, resolution, status: ClaimStatus.RESOLVED };
    await StorageService.saveClaim(updatedClaim);
    setSelectedClaim(null);
    setResolution('');
    loadData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedClaim) return;
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const attachment: ClaimAttachment = {
          id: `att-${Date.now()}`,
          claimId: selectedClaim.id,
          fileName: file.name,
          fileType: file.type,
          data: reader.result as string,
          uploadedBy: currentUser.id
        };
        await StorageService.addClaimAttachment(attachment);
        setAttachments(prev => [...prev, attachment]);
        
        // Send email
        try {
          await EmailService.sendClaimNotification(selectedClaim, `Archivo subido: ${file.name}`, 'file');
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        alert(`Error al subir el archivo: ${error.message || 'Error desconocido'}. Si el error es sobre tablas faltantes, asegúrate de ejecutar el script SQL en Supabase.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClaim = async () => {
    if (!newClaim.companyName || !newClaim.cif || !newClaim.problem || !newClaim.commercialId) {
      alert('Por favor, completa todos los campos.');
      return;
    }
    
    const commercial = users.find(u => u.id === newClaim.commercialId);
    
    const claim: Claim = {
      id: `claim-${Date.now()}`,
      companyName: newClaim.companyName,
      cif: newClaim.cif,
      problem: newClaim.problem,
      messages: [],
      status: ClaimStatus.OPEN,
      commercialId: newClaim.commercialId,
      adminId: currentUser.id,
      zone: commercial?.zone || currentUser.zone || 'Global',
      createdAt: Date.now()
    };

    await StorageService.saveClaim(claim);
    setNewClaim({});
    loadData();
  };

  // Removed handleSaveAllegations

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando reclamaciones...</div>;

  return (
    <div className="space-y-6">
      {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva Reclamación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Nombre Empresa" value={newClaim.companyName || ''} onChange={(e) => setNewClaim({ ...newClaim, companyName: e.target.value })} />
            <Input placeholder="CIF" value={newClaim.cif || ''} onChange={(e) => setNewClaim({ ...newClaim, cif: e.target.value })} />
            <Input placeholder="Problema" value={newClaim.problem || ''} onChange={(e) => setNewClaim({ ...newClaim, problem: e.target.value })} />
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newClaim.commercialId || ''}
              onChange={(e) => setNewClaim({ ...newClaim, commercialId: e.target.value })}
            >
              <option value="">Seleccionar Comercial</option>
              {users.filter(u => u.role === UserRole.COMMERCIAL).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <Button className="mt-4" onClick={handleCreateClaim}>Crear Reclamación</Button>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CIF</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {claims.map(claim => (
              <tr key={claim.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claim.companyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.cif}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{claim.problem}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{claim.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button variant="secondary" onClick={() => handleClaimSelect(claim)}>Ver</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-4">
            <h3 className="text-lg font-bold">Detalles de la Reclamación: {selectedClaim.companyName}</h3>
            <p><strong>Problema:</strong> {selectedClaim.problem}</p>
            
            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
              {/* Left Column: Messages */}
              <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-2 border-b font-semibold text-sm">Conversación</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                  {selectedClaim.messages.map(msg => (
                    <div key={msg.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-bold text-gray-700">{msg.userName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {editingMessageId === msg.id ? (
                        <div className="flex gap-2 mt-2">
                          <input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-1 border rounded text-sm" />
                          <Button onClick={() => handleEditMessage(msg.id)} className="py-1 px-2 text-xs">Guardar</Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start mt-1">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                          {msg.userId === currentUser.id && (
                            <button onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }} className="text-xs text-blue-600 hover:text-blue-800 ml-2">Editar</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedClaim.messages.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No hay mensajes aún.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Attachments */}
              <div className="w-full md:w-1/3 flex flex-col min-h-0 border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-2 border-b font-semibold text-sm">Archivos Adjuntos</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                  {attachments.length > 0 ? attachments.map(att => (
                    <div key={att.id} className="flex flex-col p-2 bg-gray-50 rounded border border-gray-200 gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm truncate" title={att.fileName}>{att.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <a 
                          href={att.data} 
                          download={att.fileName}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Descargar
                        </a>
                        {(currentUser.id === att.uploadedBy || currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN) && (
                          showDeleteConfirm === att.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-red-600">¿Borrar?</span>
                              <button onClick={() => handleDeleteAttachment(att.id)} className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">Sí</button>
                              <button onClick={() => setShowDeleteConfirm(null)} className="text-[10px] bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded">No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowDeleteConfirm(att.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Eliminar archivo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 text-center py-4">No hay archivos adjuntos.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            {selectedClaim.status === ClaimStatus.OPEN && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    className="flex-1 p-2 border rounded text-sm resize-none"
                    rows={2}
                    placeholder="Escribe una respuesta..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <div className="flex flex-col gap-2 justify-between">
                    <Button onClick={handleAddMessage} className="whitespace-nowrap h-10">Enviar Respuesta</Button>
                    <div className="relative">
                      <input 
                        type="file" 
                        id="file-upload"
                        onChange={(e) => {
                          handleFileUpload(e);
                          e.target.value = '';
                        }} 
                        className="hidden" 
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 h-10">
                        <Paperclip className="w-4 h-4" />
                        Subir Archivo
                      </label>
                    </div>
                  </div>
                </div>

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN) && (
                  <div className="mt-2 border-t pt-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded text-sm"
                      placeholder="Resolución final para cerrar la reclamación..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                    <Button onClick={handleCloseClaim} variant="secondary" className="whitespace-nowrap">Cerrar Reclamación</Button>
                  </div>
                )}
              </div>
            )}

            {selectedClaim.status === ClaimStatus.RESOLVED && (
              <div className="bg-green-50 text-green-800 p-3 rounded-md border border-green-200 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Reclamación Cerrada</p>
                  <p className="text-sm mt-1">{selectedClaim.resolution}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button variant="secondary" onClick={() => setSelectedClaim(null)}>Cerrar Ventana</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
