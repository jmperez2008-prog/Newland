import React, { useState, useEffect } from 'react';
import { User, TIME_SLOTS, Appointment } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Calendar } from 'lucide-react';

interface BookingProps {
  currentUser: User;
}

export const Booking: React.FC<BookingProps> = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [existingApps, setExistingApps] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    loadApps();
  }, []);

  const loadApps = async () => {
      const apps = await StorageService.getAppointments();
      setExistingApps(apps);
  };

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return;
    setLoading(true);

    const newApp: Appointment = {
      id: `apt-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      date: selectedDate,
      timeSlot: selectedSlot,
      notes: notes
    };

    await StorageService.addAppointment(newApp);
    setExistingApps([...existingApps, newApp]);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
        setSuccess(false);
        setSelectedSlot(null);
        setNotes('');
    }, 3000);
  };

  const isSlotTaken = (slot: string) => {
    return existingApps.some(a => a.date === selectedDate && a.timeSlot === slot);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Date & Note Selection */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
         <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#FF7900]" />
                1. Selecciona el Día
            </h3>
            <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                }}
                min={new Date().toISOString().split('T')[0]}
            />
         </div>

         <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
                3. Motivo de la Reunión/Visita
            </h3>
            <textarea 
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-[#FF7900] focus:border-[#FF7900]"
                rows={4}
                placeholder="Ej: Visita al cliente X para cierre de contrato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
         </div>

         <Button 
            onClick={handleBook} 
            disabled={!selectedSlot || !selectedDate || !notes} 
            className="w-full"
            size="lg"
            isLoading={loading}
         >
            Confirmar Reserva
         </Button>
         
         {success && (
             <div className="text-center text-green-600 bg-green-50 p-2 rounded">
                 ¡Reserva confirmada con éxito!
             </div>
         )}
      </div>

      {/* Slots Selection */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
         <h3 className="text-lg font-medium text-gray-900 mb-4">
            2. Selecciona la Hora
         </h3>
         {!selectedDate ? (
             <p className="text-gray-500">Selecciona una fecha primero.</p>
         ) : (
             <div className="grid grid-cols-2 gap-3">
                 {TIME_SLOTS.map(slot => {
                     const taken = isSlotTaken(slot);
                     return (
                         <button
                            key={slot}
                            disabled={taken}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                                py-3 px-4 rounded-md text-sm font-medium border transition-all
                                ${taken 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                    : selectedSlot === slot
                                        ? 'bg-[#FF7900] text-white border-[#FF7900] shadow-md transform scale-105'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#FF7900] hover:text-[#FF7900]'
                                }
                            `}
                         >
                             {slot}
                             {taken && <span className="block text-xs font-normal">Ocupado</span>}
                         </button>
                     );
                 })}
             </div>
         )}
      </div>
    </div>
  );
};