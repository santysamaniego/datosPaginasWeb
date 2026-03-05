import React from 'react';
import { Contact, ContactStatus, SECTOR_CATEGORIES, User } from '../types';
import { X, Globe } from 'lucide-react';

interface ContactFormProps {
  onSubmit: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  initialData?: Contact;
  onClose: () => void;
  currentUser: User;
}

const STATUS_OPTIONS: ContactStatus[] = [
  'Pendiente',
  'Contactado',
  'Respondió',
  'Interesado',
  'No interesado',
  'Cliente'
];

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmit, initialData, onClose, currentUser }) => {
  const [formData, setFormData] = React.useState<Omit<Contact, 'id' | 'createdAt'>>({
  businessName: initialData?.businessName || '',
  sector: initialData?.sector || '',
  category: initialData?.category || '',
  zone: initialData?.zone || '',
  instagram: initialData?.instagram || '',
  phone: initialData?.phone || '',
  email: initialData?.email || '',
  status: initialData?.status || 'Pendiente',
  firstContactDate: initialData?.firstContactDate || new Date().toISOString().split('T')[0],
  observations: initialData?.observations || '',
  websiteUrl: initialData?.websiteUrl || '',
  salePrice: initialData?.salePrice ??  0,
  saleDate: initialData?.saleDate || new Date().toISOString().split('T')[0],
  createdBy: initialData?.createdBy || currentUser.id 
});

  const [isCustomSector, setIsCustomSector] = React.useState(false);
  const [customSector, setCustomSector] = React.useState('');

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'OTRO') {
      setIsCustomSector(true);
      setFormData({ ...formData, sector: '', category: 'Otros' });
    } else {
      setIsCustomSector(false);
      // Find category for the selected sector
      let foundCategory = 'Otros';
      for (const [cat, sectors] of Object.entries(SECTOR_CATEGORIES)) {
        if ((sectors as readonly string[]).includes(value)) {
          foundCategory = cat;
          break;
        }
      }
      setFormData({ ...formData, sector: value, category: foundCategory });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData: any = {
      ...formData,
      sector: isCustomSector ? customSector : formData.sector
    };
    
    if (finalData.salePrice === undefined) {
      delete finalData.salePrice;
    }
    
    onSubmit(finalData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">
            {initialData ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre del Negocio *</label>
              <input
                required
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ej: Panadería El Sol"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rubro / Sector *</label>
              {!isCustomSector ? (
                <select
                  required
                  value={formData.sector}
                  onChange={handleSectorChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Seleccionar rubro...</option>
                  {Object.entries(SECTOR_CATEGORIES).map(([category, sectors]) => (
                    <optgroup key={category} label={category}>
                      {(sectors as readonly string[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="OTRO">OTRO (Especificar...)</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    value={customSector}
                    onChange={e => setCustomSector(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Especificar rubro..."
                  />
                  <button 
                    type="button"
                    onClick={() => setIsCustomSector(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors text-xs font-bold"
                  >
                    VOLVER
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zona</label>
              <input
                type="text"
                value={formData.zone}
                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ej: Palermo, CABA"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="@usuario"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="+54 11 ..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="contacto@negocio.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as ContactStatus })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</label>
              <input
                type="date"
                value={formData.firstContactDate}
                onChange={e => setFormData({ ...formData, firstContactDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {formData.status === 'Cliente' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <Globe size={12} /> Link de la Web
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="https://..."
                />
              </div>
              {currentUser.role === 'Admin' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      $ Precio de Venta
                    </label>
                    <input
                      type="number"
                      value={formData.salePrice || ''}
                      onChange={e => setFormData({
                        ...formData,
                        salePrice: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Ej: 50000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                      Fecha de Venta
                    </label>
                    <input
                      type="date"
                      value={formData.saleDate}
                      onChange={e => setFormData({ ...formData, saleDate: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4 space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observaciones</label>
            <textarea
              value={formData.observations}
              onChange={e => setFormData({ ...formData, observations: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {initialData ? 'Guardar Cambios' : 'Crear Contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
