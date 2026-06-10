export interface PlanLimits {
  seats: number;
  whatsappNumbers: number;
  channelsIGFB: boolean;
  convCountIA: number;
  crmContacts: number | 'unlimited';
  catalogObjects: number | 'unlimited';
  agentsIA: number;
  
  // Límites Fase 2 (Cognitive)
  archivosActivosPorAgente: number;
  archivosWorkspace: number;
  textosActivosPorAgente: number;
  textosWorkspace: number;
  sitiosActivosPorAgente: number;
  sitiosWorkspace: number;
  etiquetasPorAgente: number;
  recursosMB: number;
  recursosMultimediaPorAgente: number;

  knowledgeBase: boolean;
  massBroadcast: number | 'unlimited';
  visualWorkflows: number | 'unlimited';
  scraper: boolean;
  apiAccess: boolean;
  priceMonthly: number;
  priceYearly: number;
}

export const PLAN_LIMITS: Record<'starter' | 'pro' | 'agencia', PlanLimits> = {
  starter: {
    seats: 1,
    whatsappNumbers: 1,
    channelsIGFB: true,
    convCountIA: 800,
    crmContacts: 500,
    catalogObjects: 0,
    agentsIA: 1,
    archivosActivosPorAgente: 3,
    archivosWorkspace: 6,
    textosActivosPorAgente: 5,
    textosWorkspace: 8,
    sitiosActivosPorAgente: 1,
    sitiosWorkspace: 3,
    etiquetasPorAgente: 10,
    recursosMB: 50,
    recursosMultimediaPorAgente: 3,
    knowledgeBase: true,
    massBroadcast: 0,
    visualWorkflows: 0,
    scraper: false,
    apiAccess: false,
    priceMonthly: 39,
    priceYearly: 33,
  },
  pro: {
    seats: 2,
    whatsappNumbers: 2,
    channelsIGFB: true,
    convCountIA: 2000,
    crmContacts: 'unlimited',
    catalogObjects: 300,
    agentsIA: 2,
    archivosActivosPorAgente: 20,
    archivosWorkspace: 50,
    textosActivosPorAgente: 20,
    textosWorkspace: 40,
    sitiosActivosPorAgente: 10,
    sitiosWorkspace: 20,
    etiquetasPorAgente: 30,
    recursosMB: 200,
    recursosMultimediaPorAgente: 20,
    knowledgeBase: true,
    massBroadcast: 2000,
    visualWorkflows: 0,
    scraper: true,
    apiAccess: false,
    priceMonthly: 69,
    priceYearly: 59,
  },
  agencia: {
    seats: 5,
    whatsappNumbers: 5,
    channelsIGFB: true,
    convCountIA: 10000,
    crmContacts: 'unlimited',
    catalogObjects: 'unlimited',
    agentsIA: 10,
    archivosActivosPorAgente: 100,
    archivosWorkspace: 300,
    textosActivosPorAgente: 50,
    textosWorkspace: 150,
    sitiosActivosPorAgente: 30,
    sitiosWorkspace: 100,
    etiquetasPorAgente: 100,
    recursosMB: 1000,
    recursosMultimediaPorAgente: 100,
    knowledgeBase: true,
    massBroadcast: 'unlimited',
    visualWorkflows: 'unlimited',
    scraper: true,
    apiAccess: true,
    priceMonthly: 179,
    priceYearly: 152,
  },
};
