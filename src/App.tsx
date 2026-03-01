import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Contact, ContactStatus, SECTOR_CATEGORIES, User, UserRole } from './types';
import { contactService, userService } from './firebase';
import { ContactForm } from './components/ContactForm';
import { ContactTable } from './components/ContactTable';
import { Stats } from './components/Stats';
import { Plus, Search, ChevronRight, ArrowLeft, Briefcase, CheckCircle, AlertCircle, History, Download, Upload, FileJson, Sparkles, LogIn, Shield, Eye, EyeOff, User as UserIcon, LogOut, TrendingUp, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

type ViewState = 
  | { type: 'CATEGORIES' }
  | { type: 'SECTOR_LIST', sector: string, category: string }
  | { type: 'FINISHED_JOBS' }
  | { type: 'HISTORY' }
  | { type: 'ADMIN_PANEL' };

const IS_NEW_THRESHOLD = 24 * 60 * 60 * 1000;

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [newCoAdminEmail, setNewCoAdminEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-new' | 'date-old'>('date-new');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ type: 'CATEGORIES' });
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeContacts = contactService.subscribeToContacts((data) => {
      setContacts(data);
    });
    const unsubscribeUsers = userService.subscribeToUsers((data) => {
      setUsers(data);
    });
    return () => {
      unsubscribeContacts();
      unsubscribeUsers();
    };
  }, []);

  // Update current user if permissions change in DB
  useEffect(() => {
    if (currentUser) {
      const updatedUser = users.find(u => u.email === currentUser.email);
      if (updatedUser && (updatedUser.role !== currentUser.role || updatedUser.canSeeAll !== currentUser.canSeeAll)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) return;
    setIsLoggingIn(true);
    try {
      const user = await userService.getOrCreateUser(loginEmail.toLowerCase().trim());
      setCurrentUser(user);
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Error al iniciar sesión: ${error.message || 'Error desconocido'}. Revisa las reglas de Firestore.`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail('');
    setView({ type: 'CATEGORIES' });
  };

  const handleAddCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoAdminEmail) return;
    try {
      await userService.getOrCreateUser(newCoAdminEmail.toLowerCase().trim());
      setNewCoAdminEmail('');
      alert('CoAdmin agregado con éxito');
    } catch (error) {
      alert('Error al agregar CoAdmin');
    }
  };

  const stats = useMemo(() => {
    const visibleContacts = contacts.filter(c => 
      currentUser?.role === 'Admin' || currentUser?.canSeeAll || c.createdBy === currentUser?.email
    );
    return {
      total: visibleContacts.length,
      closed: visibleContacts.filter(c => c.status === 'Cliente').length
    };
  }, [contacts, currentUser]);

  const isNew = (createdAt: number) => Date.now() - createdAt < IS_NEW_THRESHOLD;

  const filteredContacts = useMemo(() => {
    let result = contacts.filter(contact => {
      const isOwner = contact.createdBy === currentUser?.email;
      const isAdmin = currentUser?.role === 'Admin';
      const hasSeeAll = currentUser?.canSeeAll;

      // Lógica de Privacidad:
      // 1. Si es el HISTORIAL, es estrictamente individual para CoAdmins.
      if (view.type === 'HISTORY') {
        if (!isAdmin && !isOwner) return false;
      } else {
        // 2. Para el resto de vistas, respetamos el permiso 'canSeeAll'.
        const canSee = isAdmin || hasSeeAll || isOwner;
        if (!canSee) return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        contact.businessName.toLowerCase().includes(searchLower) ||
        contact.sector.toLowerCase().includes(searchLower) ||
        contact.zone.toLowerCase().includes(searchLower) ||
        contact.observations.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'Todos' || contact.status === statusFilter;

      if (view.type === 'HISTORY') {
        return matchesSearch && matchesStatus && isNew(contact.createdAt);
      }

      if (view.type === 'FINISHED_JOBS') {
        return matchesSearch && matchesStatus && contact.status === 'Cliente';
      }
      
      if (view.type === 'SECTOR_LIST') {
        return matchesSearch && matchesStatus && contact.sector === view.sector;
      }

      return false;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.businessName.localeCompare(b.businessName);
        case 'name-desc':
          return b.businessName.localeCompare(a.businessName);
        case 'date-new':
          return b.createdAt - a.createdAt;
        case 'date-old':
          return a.createdAt - b.createdAt;
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, searchTerm, view, statusFilter, sortBy, currentUser]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, Record<string, { count: number, hasNew: boolean }>> = {};
    
    contacts.forEach(c => {
      // Aplicar el mismo filtro de privacidad a las estadísticas de las categorías
      const canSee = currentUser?.role === 'Admin' || currentUser?.canSeeAll || c.createdBy === currentUser?.email;
      if (!canSee) return;
      
      if (!stats[c.category]) stats[c.category] = {};
      if (!stats[c.category][c.sector]) stats[c.category][c.sector] = { count: 0, hasNew: false };
      
      stats[c.category][c.sector].count++;
      if (isNew(c.createdAt)) {
        stats[c.category][c.sector].hasNew = true;
      }
    });

    return stats;
  }, [contacts, currentUser]);

  const revenueData = useMemo(() => {
    const monthlyRevenue: Record<string, number> = {};
    const closedContacts = contacts.filter(c => 
      c.status === 'Cliente' && c.salePrice && c.saleDate &&
      (currentUser?.role === 'Admin' || currentUser?.canSeeAll || c.createdBy === currentUser?.email)
    );

    closedContacts.forEach(c => {
      const date = new Date(c.saleDate!);
      const monthYear = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + (c.salePrice || 0);
    });

    return Object.entries(monthlyRevenue)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split(' ');
        const [bMonth, bYear] = b.name.split(' ');
        return new Date(`${aMonth} 20${aYear}`).getTime() - new Date(`${bMonth} 20${bYear}`).getTime();
      });
  }, [contacts, currentUser]);

  const totalRevenue = useMemo(() => {
    return revenueData.reduce((sum, item) => sum + item.total, 0);
  }, [revenueData]);

  const handleAddOrUpdate = async (formData: Omit<Contact, 'id' | 'createdAt'>) => {
    const isDuplicate = contacts.some(c => 
      c.businessName.toLowerCase() === formData.businessName.toLowerCase()
    );

    if (isDuplicate) {
      setDuplicateError(`Ya existe un negocio con el nombre "${formData.businessName}".`);
      return;
    }

    await contactService.addContact(formData, currentUser!.email);
    setIsFormOpen(false);
    setDuplicateError(null);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await contactService.deleteContact(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const exportData = (type: 'ALL' | 'CATEGORY' | 'SECTOR') => {
    let dataToExport = contacts;
    let filename = 'crm_full_backup.json';

    if (type === 'CATEGORY' && view.type === 'SECTOR_LIST') {
      dataToExport = contacts.filter(c => c.category === view.category);
      filename = `crm_category_${view.category.toLowerCase().replace(/\s+/g, '_')}.json`;
    } else if (type === 'SECTOR' && view.type === 'SECTOR_LIST') {
      dataToExport = contacts.filter(c => c.sector === view.sector);
      filename = `crm_sector_${view.sector.toLowerCase().replace(/\s+/g, '_')}.json`;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedContacts = JSON.parse(event.target?.result as string) as Contact[];
        if (!Array.isArray(importedContacts)) throw new Error('Formato inválido');

        // Import one by one to handle duplicates or just bulk add
        for (const contact of importedContacts) {
          const { id, createdAt, ...rest } = contact;
          // Check if already exists by business name
          const exists = contacts.some(c => c.businessName.toLowerCase() === rest.businessName.toLowerCase());
          if (!exists) {
            await contactService.addContact(rest, currentUser!.email);
          }
        }
        alert('Importación completada con éxito.');
      } catch (err) {
        alert('Error al importar el archivo. Asegúrate de que sea un JSON válido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 cursor-pointer" onClick={() => setView({ type: 'CATEGORIES' })}>WebDev CRM</h1>
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser?.role === 'Admin' && (
                <button 
                  onClick={() => setView({ type: 'ADMIN_PANEL' })}
                  className={`p-2 rounded-xl font-medium flex items-center gap-2 transition-all ${view.type === 'ADMIN_PANEL' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Panel de Administración"
                >
                  <Shield size={20} />
                  <span className="hidden lg:inline">Admin</span>
                </button>
              )}
              <button 
                onClick={() => setView({ type: 'HISTORY' })}
                className={`p-2 rounded-xl font-medium flex items-center gap-2 transition-all ${view.type === 'HISTORY' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Historial 24h"
              >
                <History size={20} />
                <span className="hidden lg:inline">Historial</span>
              </button>
              <button 
                onClick={() => setView({ type: 'FINISHED_JOBS' })}
                className={`p-2 rounded-xl font-medium flex items-center gap-2 transition-all ${view.type === 'FINISHED_JOBS' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Trabajos Terminados"
              >
                <CheckCircle size={20} />
                <span className="hidden lg:inline">Terminados</span>
              </button>
              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
              <button 
                onClick={() => {
                  setIsFormOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Stats total={stats.total} closed={stats.closed} totalRevenue={currentUser?.role === 'Admin' ? totalRevenue : undefined} />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, rubro, zona o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-full flex items-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap"
              >
                <Download size={18} /> Exportar
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-40"
                  >
                    <button onClick={() => exportData('ALL')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                      <FileJson size={14} /> Toda la página
                    </button>
                    {view.type === 'SECTOR_LIST' && (
                      <>
                        <button onClick={() => exportData('CATEGORY')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <FileJson size={14} /> Por Categoría
                        </button>
                        <button onClick={() => exportData('SECTOR')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <FileJson size={14} /> Por Rubro
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-full flex items-center gap-2 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap"
            >
              <Upload size={18} /> Importar
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-4"
            >
              <div className="max-w-md w-full space-y-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-200">
                    <LogIn size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Bienvenido al CRM</h2>
                  <p className="text-gray-500 mt-2">Ingresa tu email para continuar</p>
                </div>
                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <input
                    required
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
                  />
                  <button
                    disabled={isLoggingIn}
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {isLoggingIn ? 'Iniciando...' : 'Entrar'}
                  </button>
                </form>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                  WebDev CRM &bull; Acceso Restringido
                </p>
              </div>
            </motion.div>
          ) : view.type === 'ADMIN_PANEL' ? (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setView({ type: 'CATEGORIES' })}
                  className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Gestión de CoAdmins</h2>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Agregar Nuevo CoAdmin</h3>
                <form onSubmit={handleAddCoAdmin} className="flex gap-3">
                  <input
                    type="email"
                    value={newCoAdminEmail}
                    onChange={(e) => setNewCoAdminEmail(e.target.value)}
                    placeholder="email@del-coadmin.com"
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Agregar
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {users.filter(u => u.role === 'CoAdmin').map(user => (
                  <div key={user.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-400">Rol: {user.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => userService.updateUserPermission(user.email, !user.canSeeAll)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${user.canSeeAll ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {user.canSeeAll ? <Eye size={18} /> : <EyeOff size={18} />}
                      {user.canSeeAll ? 'Puede ver todo' : 'Solo ve lo propio'}
                    </button>
                  </div>
                ))}
                {users.filter(u => u.role === 'CoAdmin').length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400">No hay CoAdmins registrados aún.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view.type === 'CATEGORIES' ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {Object.entries(SECTOR_CATEGORIES).map(([category, sectors]) => (
                <section key={category}>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase size={16} /> {category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(sectors as readonly string[]).map(sector => {
                      const sectorStat = categoryStats[category]?.[sector] || { count: 0, hasNew: false };
                      return (
                        <button
                          key={sector}
                          onClick={() => setView({ type: 'SECTOR_LIST', sector, category })}
                          className={`p-5 rounded-2xl border shadow-sm transition-all text-left group flex justify-between items-center ${sectorStat.hasNew ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold transition-colors ${sectorStat.hasNew ? 'text-green-700' : 'text-gray-900 group-hover:text-blue-600'}`}>{sector}</p>
                              {sectorStat.hasNew && <Sparkles size={14} className="text-green-500 animate-pulse" />}
                            </div>
                            <p className={`text-xs mt-1 font-medium ${sectorStat.hasNew ? 'text-green-600/70' : 'text-gray-400'}`}>
                              {sectorStat.count} prospectos
                            </p>
                          </div>
                          <ChevronRight size={18} className={`${sectorStat.hasNew ? 'text-green-400' : 'text-gray-300 group-hover:text-blue-400'} transition-colors`} />
                        </button>
                      );
                    })}
                    {Object.entries(categoryStats[category] || {}).map(([sector, stat]) => {
                      const s = stat as { count: number, hasNew: boolean };
                      return !(sectors as readonly string[]).includes(sector) && (
                        <button
                          key={sector}
                          onClick={() => setView({ type: 'SECTOR_LIST', sector, category })}
                          className={`p-5 rounded-2xl border shadow-sm transition-all text-left group flex justify-between items-center ${s.hasNew ? 'bg-green-50 border-green-200 hover:border-green-400' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold transition-colors ${s.hasNew ? 'text-green-700' : 'text-gray-900 group-hover:text-blue-600'}`}>{sector}</p>
                              {s.hasNew && <Sparkles size={14} className="text-green-500 animate-pulse" />}
                            </div>
                            <p className={`text-xs mt-1 font-medium ${s.hasNew ? 'text-green-600/70' : 'text-gray-400'}`}>{s.count} prospectos</p>
                          </div>
                          <ChevronRight size={18} className={`${s.hasNew ? 'text-green-400' : 'text-gray-300 group-hover:text-blue-400'} transition-colors`} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView({ type: 'CATEGORIES' })}
                    className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {view.type === 'FINISHED_JOBS' ? 'Trabajos Terminados' : 
                       view.type === 'HISTORY' ? 'Historial (Últimas 24h)' : 
                       view.sector}
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">
                      {view.type === 'SECTOR_LIST' ? view.category : 
                       view.type === 'HISTORY' ? 'Nuevos prospectos agregados recientemente' :
                       'Historial de clientes cerrados'}
                    </p>
                  </div>
                </div>

                {view.type === 'FINISHED_JOBS' && currentUser?.role === 'Admin' && (
                  <div className="flex items-center gap-4 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ingresos Totales</p>
                      <p className="text-xl font-black text-emerald-700">${totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Respondió">Respondió</option>
                    <option value="Interesado">Interesado</option>
                    <option value="No interesado">No interesado</option>
                    <option value="Cliente">Cliente</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="date-new">Más recientes</option>
                    <option value="date-old">Más antiguos</option>
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                  </select>
                </div>
              </div>

              {view.type === 'FINISHED_JOBS' && currentUser?.role === 'Admin' && revenueData.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8"
                >
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={16} /> Evolución de Ingresos por Mes
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                          tickFormatter={(value) => `$${value >= 1000 ? (value/1000) + 'k' : value}`}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f9fafb' }}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '12px'
                          }}
                        />formatter={
                            ((value: number) => [
                              `$${value.toLocaleString()}`,
                              'Ingresos'
                            ]) as any
                          }
                        <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                          {revenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#059669' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              <ContactTable 
                contacts={filteredContacts} 
                currentUser={currentUser!}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isFormOpen && (
          <ContactForm 
            onSubmit={handleAddOrUpdate}
            onClose={() => {
              setIsFormOpen(false);
              setDuplicateError(null);
            }}
            currentUser={currentUser!}
          />
        )}

        {duplicateError && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-500"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Error: Nombre Duplicado</h3>
              </div>
              <p className="text-gray-600 mb-6">{duplicateError}</p>
              <button
                onClick={() => setDuplicateError(null)}
                className="w-full px-4 py-2 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">¿Eliminar contacto?</h3>
              </div>
              <p className="text-gray-600 mb-6">Esta acción no se puede deshacer. El contacto será borrado permanentemente.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
          WebDev CRM &bull; Gestión de Prospectos
        </p>
      </footer>
    </div>
  );
}
