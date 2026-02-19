import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Plus, Trash2, User as UserIcon, Mail, Phone, MapPin, Shield } from 'lucide-react';

interface AdminUsersProps {
  currentUser: User;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newUser, setNewUser] = useState<Partial<User>>({ 
    name: '', 
    username: '', 
    password: '',
    role: UserRole.COMMERCIAL,
    phone: '',
    email: '',
    zone: ''
  });

  const isSuper = currentUser.role === UserRole.SUPERADMIN;

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await StorageService.getUsers();
    if (isSuper) {
        setUsers(allUsers);
    } else {
        setUsers(allUsers.filter(u => u.zone === currentUser.zone && u.role !== UserRole.SUPERADMIN));
    }
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const assignedZone = isSuper ? newUser.zone : currentUser.zone;
    
    if (!assignedZone) {
        alert("La zona es obligatoria");
        return;
    }

    const user: User = {
      id: Date.now().toString(),
      name: newUser.name!,
      username: newUser.username!,
      password: newUser.password!,
      role: newUser.role || UserRole.COMMERCIAL,
      zone: assignedZone,
      phone: newUser.phone,
      email: newUser.email
    };

    await StorageService.saveUser(user);
    setNewUser({ name: '', username: '', password: '', role: UserRole.COMMERCIAL, phone: '', email: '', zone: '' });
    setShowForm(false);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      await StorageService.deleteUser(id);
      loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
            {isSuper ? 'Gestión Global de Usuarios' : 'Mi Equipo Comercial'}
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {isSuper ? 'Nuevo Usuario' : 'Nuevo Comercial'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 animate-fade-in-down">
          <h4 className="text-sm font-bold text-gray-700 mb-4">Registrar Nuevo Usuario</h4>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <Input 
              label="Nombre Completo" 
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
              required
            />
            <Input 
              label="Usuario" 
              value={newUser.username}
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              required
            />
            <Input 
              label="Contraseña" 
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              required
            />
            <Input 
              label="Teléfono" 
              value={newUser.phone}
              onChange={e => setNewUser({...newUser, phone: e.target.value})}
              placeholder="+34 600..."
            />
            <Input 
              label="Email" 
              type="email"
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})}
              placeholder="correo@newland.com"
            />

            {isSuper && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                    >
                        <option value={UserRole.COMMERCIAL}>Comercial</option>
                        <option value={UserRole.ADMIN}>Administrador de Zona</option>
                    </select>
                </div>
            )}

            {isSuper && (
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Zona Asignada</label>
                     <Input 
                        placeholder="Ej: Zona Norte"
                        value={newUser.zone}
                        onChange={e => setNewUser({...newUser, zone: e.target.value})}
                        required
                     />
                </div>
            )}

            <div className="flex gap-2">
              <Button type="submit">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>
        ) : (
            <ul className="divide-y divide-gray-200">
            {users.map((user) => (
                <li key={user.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
                <div className="flex items-start sm:items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-[#FF7900]'}`}>
                    {user.role === UserRole.ADMIN ? <Shield className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                    </div>
                    <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.zone && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <MapPin className="h-3 w-3 mr-1" />{user.zone}
                        </span>}
                    </div>
                    <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:gap-4">
                        <span>{user.username} • {user.role}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex flex-col sm:flex-row sm:gap-4 mt-1">
                        {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {user.phone}</span>}
                        {user.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {user.email}</span>}
                    </div>
                    </div>
                </div>
                {user.role !== UserRole.SUPERADMIN && (
                    <button 
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-900 self-end sm:self-center"
                    >
                    <Trash2 className="h-5 w-5" />
                    </button>
                )}
                </li>
            ))}
            </ul>
        )}
      </div>
    </div>
  );
};