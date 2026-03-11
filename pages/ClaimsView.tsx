import React, { useState, useEffect } from 'react';
import { User, UserRole, Claim, ClaimStatus, ClaimAttachment, ClaimMessage } from '../types';
import { StorageService } from '../services/storageService';
import { EmailService } from '../services/emailService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Save, Paperclip, AlertCircle, CheckCircle2 } from 'lucide-react';

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
        setAttachments([...attachments, attachment]);
        
        // Send email
        await EmailService.sendClaimNotification(selectedClaim, `Archivo subido: ${file.name}`, 'file');
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error al subir el archivo. Es posible que sea demasiado grande.');
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold">Detalles de la Reclamación: {selectedClaim.companyName}</h3>
            <p><strong>Problema:</strong> {selectedClaim.problem}</p>
            
            <div className="space-y-4 max-h-60 overflow-y-auto border p-2 rounded">
              {selectedClaim.messages.map(msg => (
                <div key={msg.id} className="p-2 bg-gray-100 rounded">
                  <p className="text-xs font-bold">{msg.userName}</p>
                  {editingMessageId === msg.id ? (
                    <div className="flex gap-2">
                      <input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-1 border rounded" />
                      <Button onClick={() => handleEditMessage(msg.id)}>Guardar</Button>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <p>{msg.content}</p>
                      {msg.userId === currentUser.id && (
                        <Button variant="secondary" onClick={() => { setEditingMessageId(msg.id); setEditContent(msg.content); }}>Editar</Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedClaim.status === ClaimStatus.OPEN && (
              <>
                <textarea
                  className="w-full p-2 border rounded"
                  placeholder="Nueva respuesta..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                
                <input type="file" onChange={handleFileUpload} className="text-sm" />

                <Button onClick={handleAddMessage}>Enviar Respuesta</Button>

                {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN) && (
                  <div className="mt-4 border-t pt-4">
                    <textarea
                      className="w-full p-2 border rounded"
                      placeholder="Resolución final..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                    <Button className="mt-2" onClick={handleCloseClaim}>Cerrar Reclamación</Button>
                  </div>
                )}
              </>
            )}

            {selectedClaim.status === ClaimStatus.RESOLVED && (
              <p className="text-sm text-gray-500 italic">Reclamación cerrada. Resolución: {selectedClaim.resolution}</p>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelectedClaim(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
