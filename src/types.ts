export type ContactStatus = 'Pendiente' | 'Contactado' | 'Respondió' | 'Interesado' | 'No interesado' | 'Cliente';

export type UserRole = 'Admin' | 'CoAdmin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  canSeeAll: boolean; // For CoAdmins
}

export interface Contact {
  id: string;
  businessName: string;
  sector: string;
  category: string;
  zone: string;
  address?: string;
  instagram: string;
  phone: string;
  email: string;
  status: ContactStatus;
  firstContactDate: string;
  observations: string;
  websiteUrl?: string; // For finished jobs
  salePrice?: number;
  saleDate?: string;
  createdAt: number;
  createdBy: string; // User ID or Email
}

export const SECTOR_CATEGORIES = {
  'Salud': [
    'ODONTÓLOGOS', 'CENTROS ODONTOLÓGICOS', 'KINESIÓLOGOS', 'PSICÓLOGOS', 
    'NUTRICIONISTAS', 'FONOAUDIÓLOGOS', 'PODÓLOGOS', 'TERAPISTAS OCUPACIONALES'
  ],
  'Estética y Bienestar': [
    'CLÍNICAS DE ESTÉTICA', 'COSMETÓLOGAS', 'LASHISTAS', 'UÑERAS', 
    'MASAJISTAS', 'ESTETICISTAS', 'PELUQUERÍAS', 'BARBERÍAS', 
    'ACADEMIAS DE ARTES MARCIALES', 'ESTUDIOS DE YOGA', 'ESCUELAS DE DANZA', 
    'CENTROS DE PILATES'
  ],
  'Construcción y Hogar': [
    'CORRALON', 'ELECTRICISTAS', 'PLOMEROS', 'TÉCNICOS DE AIRE ACONDICIONADO', 
    'GASISTAS', 'ALBAÑILES', 'PINTORES', 'CERRAJEROS'
  ],
  'Automotor': [
    'TALLERES MECÁNICOS', 'TALLERES DE CHAPA Y PINTURA', 
    'INSTALADORES DE AUDIO PARA AUTOS', 'SERVICIOS DE POLARIZADO DE VEHÍCULOS'
  ],
  'Educación': [
    'ACADEMIAS DE IDIOMAS', 'CLASES DE MÚSICA', 'ESCUELAS DE MANEJO'
  ],
  'Inmobiliarias': [
    'INMOBILIARIAS', 'AGENTES INMOBILIARIOS INDEPENDIENTES', 'LOTEOS', 
    'VENTA DE TERRENOS', 'DESARROLLADORES INMOBILIARIOS', 'CONSTRUCTORAS', 
    'EMPRESAS DE BIENES RAÍCES', 'INVERSIONES INMOBILIARIAS', 'CONSULTORAS INMOBILIARIAS'
  ],
  'Hoteles y Albergues': [
    'ALBERGUES TRANSITORIOS', 'HOTEL ALOJAMIENTO'
  ],
  'Eventos': [
    'QUINCEAÑERAS'
  ],
  'Otros': []
} as const;
