import React, { useState } from 'react';
import { Contact, ContactStatus, User } from '../types';
import { Trash2, Instagram, Mail, MapPin, Briefcase, ExternalLink, Sparkles, MessageCircle, Save, X, Edit2, Lock, FileText } from 'lucide-react';
import { contactService } from '../firebase';

interface ContactTableProps {
  contacts: Contact[];
  currentUser: User;
  onDelete: (id: string) => void;
}

const statusColors: Record<ContactStatus, string> = {
  'Pendiente': 'bg-orange-100 text-orange-600 border-orange-200',
  'Contactado': 'bg-blue-100 text-blue-600 border-blue-200',
  'Respondió': 'bg-purple-100 text-purple-600 border-purple-200',
  'Interesado': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'No interesado': 'bg-red-100 text-red-600 border-red-200',
  'Cliente': 'bg-green-100 text-green-600 border-green-200'
};

const IS_NEW_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

const WHATSAPP_MESSAGE = `Hola buenas tardes cómo estás? Mi nombre es Santiago, me dedico a crear imágenes/videos para emprendimientos pero mi fuerte con más demanda es la creación de páginas web, vi que al parecer no cuentan con una página web, estoy en búsqueda de nuevos clientes, te dejo unos ejemplos y cualquier consulta estoy a su disposición,me gustaría trabajar con ustedes y así poder crecer, gracias por su tiempo y disculpe las molestias!!😁👍🏻

A continuación 2 ejemplos que actualmente están en línea y siendo utilizadas…

https://laboratoriodental.onrender.com
https://area32-z72r.onrender.com/`;

export const ContactTable: React.FC<ContactTableProps> = ({ contacts, currentUser, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Contact>>({});

  if (contacts.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-gray-400 font-medium">No se encontraron contactos en esta lista.</p>
      </div>
    );
  }

  const isNew = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt < IS_NEW_THRESHOLD;
  };

  const handleWhatsAppClick = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id);
    setEditValues(contact);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    if (editValues.businessName) {
      const isDuplicate = contacts.some(c => 
        c.id !== id && c.businessName.toLowerCase() === editValues.businessName?.toLowerCase()
      );
      if (isDuplicate) {
        alert(`Error: Ya existe un negocio con el nombre "${editValues.businessName}".`);
        return;
      }
    }
    await contactService.updateContact(id, editValues);
    setEditingId(null);
    setEditValues({});
  };

  const handleInputChange = (field: keyof Contact, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Negocio</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto / Redes</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
              {currentUser.role === 'Admin' && (
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cargado por</th>
              )}
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contacts.map((contact) => {
              const newlyAdded = isNew(contact.createdAt);
              const isEditing = editingId === contact.id;
              const canEdit = currentUser.role === 'Admin' || contact.createdBy === currentUser.email;

              return (
                <tr 
                  key={contact.id} 
                  className={`hover:bg-gray-50/50 transition-colors group ${
                    contact.status === 'Cliente' 
                      ? 'bg-green-100/60 hover:bg-green-200/60' 
                      : newlyAdded 
                        ? 'bg-green-50/30' 
                        : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {newlyAdded && (
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-md animate-pulse">
                            <Sparkles size={10} /> NUEVO
                          </span>
                        )}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.businessName || ''}
                            onChange={(e) => handleInputChange('businessName', e.target.value)}
                            className="font-bold text-gray-900 border-b border-blue-500 outline-none bg-transparent w-full"
                          />
                        ) : (
                          <span 
                            className={`font-bold text-gray-900 ${canEdit ? 'cursor-pointer' : ''}`} 
                            onClick={() => canEdit && startEditing(contact)}
                          >
                            {contact.businessName}
                          </span>
                        )}
                        {contact.websiteUrl && !isEditing && (
                          <a 
                            href={contact.websiteUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            title="Ver sitio web"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={editValues.sector || ''}
                              placeholder="Rubro"
                              onChange={(e) => handleInputChange('sector', e.target.value)}
                              className="text-xs text-blue-600 font-bold border-b border-blue-200 outline-none bg-transparent"
                            />
                            <input
                              type="text"
                              value={editValues.zone || ''}
                              placeholder="Zona"
                              onChange={(e) => handleInputChange('zone', e.target.value)}
                              className="text-xs text-gray-500 border-b border-gray-200 outline-none bg-transparent"
                            />
                            <textarea
                              value={editValues.observations || ''}
                              placeholder="Observaciones"
                              onChange={(e) => handleInputChange('observations', e.target.value)}
                              className="text-xs text-gray-500 border-b border-gray-200 outline-none bg-transparent resize-none"
                              rows={1}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            {contact.sector && (
                              <span className={`flex items-center gap-1 ${canEdit ? 'cursor-pointer' : ''}`} onClick={() => canEdit && startEditing(contact)}>
                                <Briefcase size={12} /> {contact.sector}
                              </span>
                            )}
                            {contact.zone && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} /> {contact.zone}
                              </span>
                            )}
                            {contact.observations && (
                              <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded italic">
                                <FileText size={12} className="text-gray-400" /> {contact.observations}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Instagram size={14} className="text-pink-500" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.instagram || ''}
                            placeholder="Instagram"
                            onChange={(e) => handleInputChange('instagram', e.target.value)}
                            className="text-sm text-gray-600 border-b border-gray-200 outline-none bg-transparent flex-1"
                          />
                        ) : (
                          <a 
                            href={`https://instagram.com/${contact.instagram?.replace('@', '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-sm text-gray-600 hover:text-pink-600 font-medium"
                          >
                            {contact.instagram || 'Sin Instagram'}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <MessageCircle size={14} className="text-emerald-500" />
                            <input
                              type="text"
                              value={editValues.phone || ''}
                              placeholder="Teléfono"
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              className="text-sm text-gray-600 border-b border-gray-200 outline-none bg-transparent flex-1"
                            />
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            {contact.phone ? (
                              <>
                                <button
                                  onClick={() => handleWhatsAppClick(contact.phone)}
                                  className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </button>
                                <span className="text-sm text-gray-600 font-medium">
                                  {contact.phone}
                                </span>
                              </>
                            ) : (
                              <>
                                <MessageCircle size={14} className="text-gray-300" />
                                <span className="text-sm text-gray-400 font-medium">
                                  Sin teléfono
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select
                        value={editValues.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="text-xs font-bold border-2 border-blue-500 rounded-full px-2 py-1 outline-none bg-white shadow-sm"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Contactado">Contactado</option>
                        <option value="Respondió">Respondió</option>
                        <option value="Interesado">Interesado</option>
                        <option value="No interesado">No interesado</option>
                        <option value="Cliente">Cliente</option>
                      </select>
                    ) : (
                      <span 
                        onClick={() => canEdit && startEditing(contact)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${canEdit ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity ${statusColors[contact.status]}`}
                      >
                        {contact.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editValues.firstContactDate}
                        onChange={(e) => handleInputChange('firstContactDate', e.target.value)}
                        className="text-xs border-b border-blue-500 outline-none bg-transparent"
                      />
                    ) : (
                      new Date(contact.firstContactDate).toLocaleDateString()
                    )}
                  </td>
                  {currentUser.role === 'Admin' && (
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={contact.createdBy || 'Desconocido'}>
                          {contact.createdBy === currentUser.email ? 'Yo' : (contact.createdBy?.split('@')[0] || 'Desconocido')}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          {contact.createdBy || 'Carga antigua'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(contact.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Guardar"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && (
                            <button
                              onClick={() => startEditing(contact)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {(currentUser.role === 'Admin' || contact.createdBy === currentUser.email) && (
                            <button
                              onClick={() => onDelete(contact.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
