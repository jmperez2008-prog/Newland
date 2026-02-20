import React, { useState, useEffect, useRef } from 'react';
import { User, ChatChannel, ChatMessage, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { MessageSquare, Users, User as UserIcon, Send, Plus, Lock, Globe, MapPin } from 'lucide-react';

interface ChatViewProps {
  currentUser: User;
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser }) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New Chat Modal State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatType, setNewChatType] = useState<'global' | 'zone' | 'direct'>('direct');
  const [newChatName, setNewChatName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannels();
    loadUsers();
  }, []);

  // Polling for messages in active channel
  useEffect(() => {
      let interval: any;
      if (activeChannelId) {
          loadMessages(activeChannelId); // Initial load
          interval = setInterval(() => {
              loadMessages(activeChannelId);
          }, 3000); // Poll every 3 seconds
      }
      return () => clearInterval(interval);
  }, [activeChannelId]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChannels = async () => {
      const ch = await StorageService.getChannels(currentUser);
      setChannels(ch.sort((a,b) => b.createdAt - a.createdAt));
  };

  const loadUsers = async () => {
      const u = await StorageService.getUsers();
      // Filter logic for user selector based on permissions
      if (currentUser.role === UserRole.SUPERADMIN) {
          setUsers(u);
      } else if (currentUser.role === UserRole.ADMIN) {
          // Admin sees only users in their zone + Superadmins (optional, but let's stick to zone)
          setUsers(u.filter(usr => usr.zone === currentUser.zone || usr.role === UserRole.SUPERADMIN));
      } else {
          // Commercials don't create chats, but we load users for name resolution if needed
          setUsers(u);
      }
      setLoading(false);
  };

  const loadMessages = async (channelId: string) => {
      const msgs = await StorageService.getMessages(channelId);
      // Only update if length changed to avoid jitter, or simple set
      // For simplicity in React, check length or just set.
      setMessages(prev => {
          if (prev.length !== msgs.length) return msgs;
          // Deep check could be better but this is sufficient for demo
          if (prev.length > 0 && msgs.length > 0 && prev[prev.length-1].id !== msgs[msgs.length-1].id) return msgs;
          return prev;
      });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !activeChannelId) return;

      const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          channelId: activeChannelId,
          userId: currentUser.id,
          userName: currentUser.name,
          content: newMessage,
          timestamp: Date.now()
      };

      await StorageService.sendMessage(msg);
      setMessages([...messages, msg]);
      setNewMessage('');
  };

  const handleCreateChannel = async () => {
      if (!newChatName && newChatType !== 'direct') {
          alert("El nombre es obligatorio");
          return;
      }
      if (newChatType === 'direct' && selectedParticipants.length === 0) {
          alert("Selecciona al menos un usuario");
          return;
      }

      // Determine participants
      let participants = [currentUser.id];
      if (newChatType === 'direct') {
          participants = [...participants, ...selectedParticipants];
      }

      // For direct chats, auto-generate name if empty
      let finalName = newChatName;
      if (newChatType === 'direct') {
          const names = users.filter(u => selectedParticipants.includes(u.id)).map(u => u.name);
          finalName = names.join(', ');
      }

      const newChannel: ChatChannel = {
          id: `ch-${Date.now()}`,
          name: finalName,
          type: newChatType,
          zone: newChatType === 'zone' ? currentUser.zone : undefined,
          participantIds: participants,
          createdBy: currentUser.id,
          createdAt: Date.now()
      };

      await StorageService.createChannel(newChannel);
      setChannels([newChannel, ...channels]);
      setShowNewChatModal(false);
      setActiveChannelId(newChannel.id);
      
      // Reset form
      setNewChatName('');
      setSelectedParticipants([]);
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Permission check for creation
  const canCreateChat = currentUser.role === UserRole.SUPERADMIN || currentUser.role === UserRole.ADMIN;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-1/3 md:w-1/4 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Chats</h3>
                {canCreateChat && (
                    <button onClick={() => setShowNewChatModal(true)} className="p-1 text-[#FF7900] hover:bg-orange-100 rounded">
                        <Plus className="h-5 w-5" />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {channels.length === 0 && <p className="p-4 text-gray-400 text-sm">No hay chats activos.</p>}
                {channels.map(channel => (
                    <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`w-full text-left p-3 border-b border-gray-100 hover:bg-white transition-colors flex items-center gap-3 ${activeChannelId === channel.id ? 'bg-white border-l-4 border-l-[#FF7900]' : ''}`}
                    >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 
                            ${channel.type === 'global' ? 'bg-purple-100 text-purple-600' : 
                              channel.type === 'zone' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {channel.type === 'global' ? <Globe className="h-5 w-5" /> : 
                             channel.type === 'zone' ? <MapPin className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{channel.name}</p>
                            <p className="text-xs text-gray-500 uppercase">{channel.type === 'zone' ? `Zona ${channel.zone}` : channel.type}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 flex flex-col bg-white">
            {activeChannel ? (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-gray-50">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {activeChannel.type === 'direct' ? <UserIcon className="h-4 w-4 text-gray-600"/> : <Users className="h-4 w-4 text-gray-600"/>}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{activeChannel.name}</h3>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                {activeChannel.type === 'global' && <Globe className="h-3 w-3"/>}
                                {activeChannel.type === 'zone' && <MapPin className="h-3 w-3"/>}
                                {activeChannel.type === 'global' ? 'Canal Global' : activeChannel.type === 'zone' ? `Canal Zona ${activeChannel.zone}` : 'Chat Directo'}
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Inicio de la conversación.</p>}
                        {messages.map(msg => {
                            const isMe = msg.userId === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${isMe ? 'bg-[#FF7900] text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'}`}>
                                        {!isMe && <p className="text-xs font-bold text-gray-400 mb-1">{msg.userName}</p>}
                                        <p className="text-sm">{msg.content}</p>
                                        <p className={`text-[10px] text-right mt-1 ${isMe ? 'text-orange-200' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex gap-2">
                        <Input 
                            value={newMessage} 
                            onChange={(e) => setNewMessage(e.target.value)} 
                            placeholder="Escribe un mensaje..."
                            className="flex-1"
                        />
                        <Button type="submit" disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>Selecciona un chat para comenzar</p>
                </div>
            )}
        </div>

        {/* CREATE MODAL */}
        {showNewChatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Nuevo Chat</h3>
                        <button onClick={() => setShowNewChatModal(false)}><Lock className="h-4 w-4 text-gray-400" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Chat</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setNewChatType('direct')}
                                    className={`flex-1 py-2 text-sm border rounded ${newChatType === 'direct' ? 'bg-orange-50 border-[#FF7900] text-[#FF7900]' : 'border-gray-200'}`}
                                >
                                    Individual
                                </button>
                                {currentUser.role !== UserRole.COMMERCIAL && (
                                    <button 
                                        onClick={() => setNewChatType('zone')}
                                        className={`flex-1 py-2 text-sm border rounded ${newChatType === 'zone' ? 'bg-orange-50 border-[#FF7900] text-[#FF7900]' : 'border-gray-200'}`}
                                    >
                                        Grupo Zona
                                    </button>
                                )}
                                {currentUser.role === UserRole.SUPERADMIN && (
                                    <button 
                                        onClick={() => setNewChatType('global')}
                                        className={`flex-1 py-2 text-sm border rounded ${newChatType === 'global' ? 'bg-orange-50 border-[#FF7900] text-[#FF7900]' : 'border-gray-200'}`}
                                    >
                                        Global
                                    </button>
                                )}
                            </div>
                        </div>

                        {newChatType !== 'direct' && (
                            <Input 
                                label="Nombre del Grupo"
                                value={newChatName}
                                onChange={(e) => setNewChatName(e.target.value)}
                                placeholder={`Ej: Equipo ${currentUser.zone || 'Ventas'}`}
                            />
                        )}

                        {newChatType === 'direct' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Usuario</label>
                                <select 
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#FF7900] focus:border-[#FF7900] sm:text-sm"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setSelectedParticipants([e.target.value]);
                                        }
                                    }}
                                >
                                    <option value="">-- Selecciona --</option>
                                    {users.filter(u => u.id !== currentUser.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-2">
                             <Button variant="secondary" onClick={() => setShowNewChatModal(false)}>Cancelar</Button>
                             <Button onClick={handleCreateChannel}>Crear Chat</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
