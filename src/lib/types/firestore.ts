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
  CATEGORIAS_CRM: 'categoriasCRM',
  ETIQUETAS_CRM: 'etiquetasCRM',
};

export interface CategoriaCRM {
  id?: string;
  nombre: string;
  tipo: 'multiple' | 'exclusiva'; // 'exclusiva' es el semáforo
  alertaDiasDefault?: number;     // Días para que se ponga en rojo
  aiBlocked?: boolean;            // Nuevo: Bloqueo de IA para el grupo
  orden: number;
  creadoEl: Timestamp;
}

export interface EtiquetaCRM {
  id?: string;
  nombre: string;
  categoriaId: string;
  colorBg: string;
  colorText: string;
  instruccionIA?: string;         // Instrucción para lo que la IA debe detectar
  aiBlocked?: boolean;            // Nuevo: Bloqueo de IA para esta etiqueta
  alertaDias?: number;            // Sobrescribe alertaDiasDefault de la categoría
  creadoEl: Timestamp;
}

export interface TareaCRM {
  id?: string;
  titulo: string;
  descripcion?: string;
  fecha: string;                   // Formato YYYY-MM-DD
  hora?: string;                   // Formato HH:mm
  prioridad: 'baja' | 'media' | 'alta';
  completada: boolean;
  estado?: 'pendiente' | 'proceso' | 'completada'; // Nuevo sistema de estados
  contactoId?: string | null;      // Opcional
  recurrencia?: {
    tipo: 'diaria' | 'semanal' | 'intervalo' | 'ninguna';
    config?: {
      diasSemana?: number[];       // 0-6 (Dom-Sab)
      intervaloDias?: number;      // Cada X días
    }
  };
  creadoEl: Timestamp;
  venceEl: Timestamp;
}

export interface InteraccionCRM {
  id?: string;
  tipo: 'nota' | 'llamada' | 'whatsapp';
  contenido: string;
  creadoPor: string;
  creadoEl: Timestamp;
  actualizadoEl?: Timestamp;
}

export interface Contacto {
  id?: string;
  nombre: string;
  email?: string;
  telefono: string;
  avatarUrl?: string;
  esContactoCRM?: boolean;
  relacionTag: 'Personal' | 'Laboral' | 'Lead';
  aiBlocked: boolean;
  etiquetas: string[];
  ultimaInteraccion: Timestamp;
  fechaNacimiento?: string;        // Formato YYYY-MM-DD
  proximoAviso?: Timestamp | null;
  notaAviso?: string | null;
  
  // Trazabilidad
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
  necesitaHumano?: boolean;        // Si la IA delegó la conversación
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
  metaWABAId?: string;        // WhatsApp Business Account ID (para plantillas)
  metaInstagramId?: string;   // solo Instagram
  webhookVerified: boolean;
  aiEnabled: boolean;         // Nuevo: control maestro IA por canal
  agenteId?: string | null;   // Nuevo: agente específico asignado a este canal
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
// FACTURACIÓN Y SUPERADMIN
export interface EventoFacturacion {
  id?: string;
  tipo: 'pago_exitoso' | 'pago_fallido' | 'suscripcion_creada' |
        'suscripcion_cancelada' | 'upgrade' | 'downgrade' |
        'trial_iniciado' | 'trial_vencido' | 'ajuste_ars' | 'exceso_conversaciones';
  monto: number;             // en ARS
  montoUSD: number;          // equivalente en USD
  cotizacionUsada?: number;  // solo para pagos ARS
  mpSuscripcionId?: string;
  mpPagoId?: string;
  planAnterior?: string;
  planNuevo?: string;
  descripcion: string;
  creadoEl: Timestamp;
}

export interface PlataformaConfig {
  planes: {
    starter: { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };
    pro:     { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };
    agencia: { precioUSD: number; precioARS: number; cotizacionUsada: number; fijadoEl: Timestamp };
  };
  proximoAjusteARS: Timestamp;
  superAdminUids: string[];
  adminEmails: string[];
  overageRate: number;        // 0.018 — costo por conversación extra en plan Agencia
  trialDias: number;          // 7
}

export interface SuperAdminMetrics {
  mrr: number;
  arr: number;
  totalWorkspaces: number;
  workspacesActivos: number;
  workspacesEnPrueba: number;
  workspacesCancelados: number;
  churnEsteMes: number;
  nuevosEsteMes: number;
}
