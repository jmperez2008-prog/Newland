import React, { useState, useEffect } from 'react';
import { User, UserRole, Claim, ClaimStatus, ClaimAttachment } from '../types';
import { StorageService } from '../services/storageService';
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
  const [allegations, setAllegations] = useState('');
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
    setAllegations(claim.allegations || '');
    const atts = await StorageService.getClaimAttachments(claim.id);
    setAttachments(atts);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedClaim) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
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

  const handleSaveAllegations = async () => {
    if (!selectedClaim) return;
    const updatedClaim = { ...selectedClaim, allegations, status: ClaimStatus.RESOLVED };
    await StorageService.saveClaim(updatedClaim);
    setSelectedClaim(null);
    loadData();
  };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {claims.map(claim => (
              <tr key={claim.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claim.companyName}</td>
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
            <textarea
              className="w-full p-2 border rounded"
              placeholder="Alegaciones..."
              value={allegations}
              onChange={(e) => setAllegations(e.target.value)}
            />
            
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label>
                <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                        <a key={att.id} href={att.data} download={att.fileName} className="text-xs text-blue-600 underline">
                            {att.fileName}
                        </a>
                    ))}
                </div>
                <input type="file" onChange={handleFileUpload} className="text-sm" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveAllegations}>Guardar Alegaciones</Button>
              <Button variant="secondary" onClick={() => setSelectedClaim(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
