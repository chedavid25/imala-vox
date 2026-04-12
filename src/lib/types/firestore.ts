import { Timestamp } from 'firebase/firestore';

export type PlanType = 'starter' | 'pro' | 'agencia';
export type WorkspaceStatus = 'prueba' | 'activo' | 'pago_vencido' | 'cancelado';

export interface WorkspaceUsage {
  convCount: number;
  contactCount: number;
  objectCount: number;
}

export interface FacturacionConfig {
  metodo: 'mercadopago';
  moneda: 'ARS';
  precioUSD: number;
  precioARS: number;
  cotizacionUsada: number;
  precioFijadoEl: Timestamp;
  proximaActualizacion: Timestamp;
  mpSuscripcionId: string;
  ciclo: 'mensual' | 'anual';
}

export interface Workspace {
  id: string;
  nombre: string;
  propietarioEmail: string;
  propietarioUid: string;
  plan: PlanType;
  estado: WorkspaceStatus;
  pruebaTerminaEl: Timestamp | null;
  periodoVigenteHasta: Timestamp;
  uso: WorkspaceUsage;
  usoReiniciaEl: Timestamp;
  facturacion: FacturacionConfig;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}

// Subcolecciones (nombres de referencia)
export const COLLECTIONS = {
  PLATAFORMA_CONFIG: 'plataforma/config',
  EVENTOS_PLATAFORMA: 'eventosPlataforma',
  ESPACIOS: 'espaciosDeTrabajo',
  MIEMBROS: 'miembros', // subcolección de espaciosDeTrabajo/{esId}
  CONTACTOS: 'contactos',
  CONVERSACIONES: 'conversaciones',
  MENSAJES: 'mensajes', // sub-subcolección de conversaciones/{cId}
  OBJETOS: 'objetos',
  CANALES: 'canales',
  RECURSOS: 'recursos',
  WORKFLOWS: 'workflows',
  DIFUSIONES: 'difusiones',
  EVENTOS_FACT: 'eventosFact',
};

export interface Contacto {
  nombre: string;
  email?: string;
  telefono: string;
  relacionTag: 'Personal' | 'Laboral' | 'Lead';
  aiBlocked: boolean; // Automático si relacionTag === 'Personal'
  etiquetas: string[];
  fechaNacimiento?: string; // Formato YYYY-MM-DD
  creadoEl: Timestamp;
}

export interface Objeto {
  tipo: 'propiedad' | 'producto';
  titulo: string;
  precio: number;
  descripcion: string;
  fotos: string[];
  caracteristicas: Record<string, any>;
  urlFuente?: string;
  estado: 'disponible' | 'vendido' | 'reservado';
}
