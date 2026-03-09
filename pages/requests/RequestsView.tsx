import React, { useState, useEffect } from 'react';
import { User, UserRole, AppRequest, RequestStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { 
  Plus, MessageSquare, CheckCircle, Clock, Filter, 
  Send, X, AlertCircle 
} from 'lucide-react';

interface RequestsViewProps {
  currentUser: User;
}

export const RequestsView: React.FC<RequestsViewProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AppRequest | null>(null);
  
  // New Request Form
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetRole, setNewTargetRole] = useState<UserRole>(UserRole.SUPERADMIN);
  
  // Response Form
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const data = await StorageService.getRequests(currentUser);
    setRequests(data.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;

    const newRequest: AppRequest = {
      id: crypto.randomUUID(),
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorZone: currentUser.zone,
      targetRole: newTargetRole,
      title: newTitle,
      description: newDescription,
      status: RequestStatus.OPEN,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await StorageService.createRequest(newRequest);
    setShowNewModal(false);
    setNewTitle('');
    setNewDescription('');
    loadRequests();
  };

  const handleUpdateStatus = async (request: AppRequest, status: RequestStatus) => {
    const updated = { ...request, status, response: responseText || request.response };
    await StorageService.updateRequest(updated);
    setSelectedRequest(null);
    setResponseText('');
    loadRequests();
  };

  const getStatusBadge = (status: RequestStatus) => {
    if (status === RequestStatus.CLOSED) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" /> Realizada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" /> Pendiente
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Peticiones</h3>
          <p className="text-sm text-gray-500">Solicitudes internas y requerimientos de equipo</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-[#FF7900] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e66d00] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nueva Petición
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando peticiones...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No hay peticiones registradas</p>
          <p className="text-sm text-gray-400 mt-1">Las solicitudes que crees o que debas gestionar aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => (
            <div 
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#FF7900] transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${req.status === RequestStatus.CLOSED ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-[#FF7900]'}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-[#FF7900] transition-colors">{req.title}</h4>
                    <p className="text-xs text-gray-500">
                      De: <span className="font-medium text-gray-700">{req.creatorName}</span> ({req.creatorZone || 'Global'}) • {new Date(req.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{req.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Dirigido a: {req.targetRole === UserRole.SUPERADMIN ? 'Gerencia' : 'Administración'}
                </span>
                {req.response && (
                  <span className="text-xs text-[#FF7900] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Respuesta recibida
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Crear Nueva Petición</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF7900] focus:border-transparent outline-none"
                  placeholder="Ej: Necesidad de nuevo portátil"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dirigido a</label>
                <select
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF7900] focus:border-transparent outline-none"
                >
                  <option value={UserRole.SUPERADMIN}>Gerencia (Global)</option>
                  <option value={UserRole.ADMIN}>Administración (Zona)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF7900] focus:border-transparent outline-none resize-none"
                  placeholder="Explica detalladamente tu petición..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#FF7900] text-white font-medium rounded-lg hover:bg-[#e66d00] transition-colors shadow-sm"
                >
                  Enviar Petición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedRequest.title}</h3>
                <p className="text-sm text-gray-500">De {selectedRequest.creatorName} • {new Date(selectedRequest.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</h4>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.description}
                </div>
              </div>

              {selectedRequest.response && (
                <div>
                  <h4 className="text-xs font-bold text-[#FF7900] uppercase tracking-widest mb-2">Respuesta de Gerencia/Admin</h4>
                  <div className="bg-orange-50 p-4 rounded-xl text-gray-800 border border-orange-100 italic">
                    "{selectedRequest.response}"
                  </div>
                </div>
              )}

              {/* Action Section for Admins/Superadmins */}
              {selectedRequest.status === RequestStatus.OPEN && 
               (currentUser.role === UserRole.SUPERADMIN || 
                (currentUser.role === UserRole.ADMIN && selectedRequest.targetRole === UserRole.ADMIN)) && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Responder y Gestionar</h4>
                  <textarea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF7900] focus:border-transparent outline-none resize-none mb-4"
                    placeholder="Escribe una respuesta o comentario..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest, RequestStatus.CLOSED)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Marcar como Realizada
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedRequest, RequestStatus.OPEN)}
                      disabled={!responseText}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" /> Solo Responder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
