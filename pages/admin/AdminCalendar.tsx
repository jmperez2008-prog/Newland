import React, { useState, useEffect } from 'react';
import { Appointment, User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Trash2, MapPin } from 'lucide-react';

interface AdminCalendarProps {
    currentUser: User;
}

export const AdminCalendar: React.FC<AdminCalendarProps> = ({ currentUser }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    const [apts, allUsers] = await Promise.all([
        StorageService.getAppointments(),
        StorageService.getUsers()
    ]);
    
    setUsers(allUsers);

    let filteredApts = apts;
    if (currentUser.role !== UserRole.SUPERADMIN) {
        filteredApts = apts.filter(apt => {
            const user = allUsers.find(u => u.id === apt.userId);
            return user?.zone === currentUser.zone;
        });
    }

    filteredApts.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.timeSlot}`);
      const dateB = new Date(`${b.date}T${b.timeSlot}`);
      return dateA.getTime() - dateB.getTime();
    });
    setAppointments(filteredApts);
    setLoading(false);
  };

  const cancelAppointment = async (id: string) => {
    if (window.confirm('¿Cancelar esta cita?')) {
      await StorageService.deleteAppointment(id);
      loadData();
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando agenda...</div>;

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h3 className="text-lg font-medium text-gray-900 mb-2">Agenda de Acompañamiento</h3>
           <p className="text-sm text-gray-500">
               {currentUser.role === UserRole.SUPERADMIN 
                 ? "Reservas de visitas globales de todos los equipos."
                 : "Reservas de visitas de tu equipo comercial."}
           </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {appointments.map(apt => {
               const user = users.find(u => u.id === apt.userId);
               return (
                <div key={apt.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-[#FF7900] flex flex-col justify-between">
                    <div>
                        <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 text-[#FF7900] font-semibold">
                                    <CalendarIcon className="h-4 w-4" />
                                    {new Date(apt.date).toLocaleDateString()}
                                </div>
                                <button onClick={() => cancelAppointment(apt.id)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-gray-700">
                            <Clock className="h-4 w-4" />
                            {apt.timeSlot}
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <UserIcon className="h-4 w-4" />
                                {apt.userName}
                            </div>
                            {user?.zone && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                                    <MapPin className="h-3 w-3" />
                                    {user.zone}
                                </div>
                            )}
                        </div>
                        {apt.notes && (
                            <div className="mt-3 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                "{apt.notes}"
                            </div>
                        )}
                    </div>
                </div>
               );
           })}
           {appointments.length === 0 && (
               <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
                   No hay visitas programadas próximamente.
               </div>
           )}
       </div>
    </div>
  );
};