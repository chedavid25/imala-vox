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
  CONOCIMIENTO: 'baseConocimiento',
  AGENTES: 'agentes',
  CONOCIMIENTO_ACTIVO: 'conocimientoActivo',
  ETIQUETAS_AGENTE: 'etiquetasAgente',
  NOTIFICACIONES: 'notificaciones',
  LEADS: 'leads',
  ETAPAS_EMBUDO: 'etapasEmbudo',
};

export interface Contacto {
  nombre: string;
  email?: string;
  telefono: string;
  relacionTag: 'Personal' | 'Laboral' | 'Lead';
  aiBlocked: boolean; // Automático si relacionTag === 'Personal'
  etiquetas: string[];
  fechaNacimiento?: string; // Formato YYYY-MM-DD
  
  // Trazabilidad desde Leads
  leadOrigenId?: string;
  origenCampana?: string;
  origenFormulario?: string;
  camposFormulario?: Record<string, string>;
  notas?: string;

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

// NUEVOS TIPOS FASE 2

export interface RecursoConocimiento {
  id?: string;
  tipo: 'archivo' | 'texto' | 'web' | 'recurso';
  titulo: string;
  descripcion: string;             // Guía para la IA
  contenidoTexto: string;          // Texto extraído
  archivoUrl?: string | null;      // Storage URL
  archivoNombre?: string | null;
  archivoTamano?: number | null;
  webUrl?: string | null;
  ultimoScrapeo?: Timestamp | null;
  frecuenciaActualizacion?: 'manual' | 'diaria' | 'semanal' | 'mensual' | null;
  estado: 'procesando' | 'activo' | 'error';
  errorMensaje?: string | null;
  creadoPor: string;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}

export interface Agente {
  id?: string;
  nombre: string;
  avatar: string | null;
  activo: boolean;

  // IDENTIDAD
  instrucciones: string;           // System prompt libre (máx 8000)
  rolPublico: string;              // Quién es el cliente
  rolAgente: string;               // Cuál es el rol del agente

  // COMPORTAMIENTO
  modoDefault: 'auto' | 'copiloto';
  strictMode: boolean;
  horarioActivo: boolean;
  horario?: {
    diasActivos: string[];         // ['lun','mar','mie','jue','vie','sab','dom']
    horaInicio: string;            // "09:00" — horario base L-V
    horaFin: string;               // "18:00" — horario base L-V
    // Horarios especiales fin de semana (opcional)
    sabadoHoraInicio?: string;     // Si está vacío, usa el horario base
    sabadoHoraFin?: string;
    domingoHoraInicio?: string;
    domingoHoraFin?: string;
    mensajeFueraHorario: string;
  };
  escalada: {
    mensajesSinResolucion: number; // default: 5
    mensajeEscalada: string;
    notificarEmail: boolean;
  };

  configuracionVersion: number;    // Para invalidar caché de Claude
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}

export interface ConocimientoActivo {
  id: string;                      // Mismo ID que el recurso en baseConocimiento
  activo: boolean;
  orden: number;
  agregadoEl: Timestamp;
}

export interface EtiquetaAgente {
  id?: string;
  nombre: string;
  instruccionIA: string;           // Cuándo aplicar
  color: string;                   // Hex
  activa: boolean;
}

export interface Conversacion {
  id: string;
  contactoId: string;
  canalId: string;
  agenteId: string;                // Agente asignado actualmente
  ultimoMensaje: string;
  ultimaActividad: Timestamp;
  unreadCount: number;
  
  // CONTROL IA
  aiActive: boolean;               // Toggle manual del operador
  modoIA: 'auto' | 'copiloto';     // Puede heredar del agente o ser forzado aquí
  statusIA: 'thinking' | 'idle' | 'warning';
}

export interface Mensaje {
  id?: string;
  text: string;
  from: 'operator' | 'user' | 'bot' | 'system';
  creadoEl: Timestamp;
  visto: boolean;
  metadata?: {
    model?: string;
    intent?: string;
    suggestedByIA?: boolean;       // Si es un borrador generado en modo copiloto
    recursoId?: string;            // Si adjuntó un archivo multimedia
  };
}

export interface Canal {
  id?: string;
  tipo: 'whatsapp' | 'instagram' | 'facebook';
  nombre: string;
  cuenta: string;        // número de teléfono o @usuario
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  metaPageId?: string;
  metaPhoneNumberId?: string; // solo WhatsApp
  metaInstagramId?: string;   // solo Instagram
  webhookVerified: boolean;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}

// Estructura para canales/{id}/secrets/config
// Solo accesible desde Admin SDK (Backend)
export interface CanalSecret {
  metaAccessToken: string;
  metaAppSecret?: string;      // por si cada cliente tiene su propia app de Meta
  actualizadoEl: Timestamp;
}

// MÓDULO DE LEADS
export type TemperaturaLead = 'frio' | 'tibio' | 'caliente';
export type OrigenLead = 'meta_ads' | 'organico' | 'manual';

export interface Lead {
  id?: string;
  origen: OrigenLead;
  etapaId: string;             // ID de la etapa del embudo
  temperatura: TemperaturaLead;
  nombre: string;
  email: string | null;
  telefono: string | null;
  camposFormulario: Record<string, string>; // respuestas del formulario Meta
  metaLeadId?: string;
  metaFormId?: string;
  metaPageId?: string;
  campana?: string;            // nombre de la campaña
  formulario?: string;         // nombre del formulario
  notas: string;
  convertidoAContacto: boolean;
  contactoId: string | null;   // referencia al contacto CRM si fue convertido
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}

export interface EtapaEmbudo {
  id?: string;
  nombre: string;
  orden: number;               // posición en el embudo
  color: string;               // hex para identificación visual
  esDefault: boolean;          // las etapas default no se pueden eliminar
}

// NOTIFICACIONES DE SISTEMA
export interface NotificacionSistema {
  id?: string;
  tipo: 'alerta' | 'info' | 'error';
  titulo: string;
  mensaje: string;
  visto: boolean;
  creadoEl: Timestamp;
  metadata?: Record<string, any>;
}
