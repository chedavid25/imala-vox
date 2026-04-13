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
    channelsIGFB: false,
    convCountIA: 500,
    crmContacts: 1000,
    catalogObjects: 30,
    agentsIA: 1,
    archivosActivosPorAgente: 5,
    archivosWorkspace: 10,
    textosActivosPorAgente: 10,
    textosWorkspace: 15,
    sitiosActivosPorAgente: 2,
    sitiosWorkspace: 5,
    etiquetasPorAgente: 10,
    recursosMB: 50,
    knowledgeBase: true,
    massBroadcast: 0,
    visualWorkflows: 0,
    scraper: false,
    apiAccess: false,
    priceMonthly: 29,
    priceYearly: 24,
  },
  pro: {
    seats: 5,
    whatsappNumbers: 2,
    channelsIGFB: true,
    convCountIA: 2000,
    crmContacts: 5000,
    catalogObjects: 200,
    agentsIA: 3,
    archivosActivosPorAgente: 20,
    archivosWorkspace: 50,
    textosActivosPorAgente: 20,
    textosWorkspace: 40,
    sitiosActivosPorAgente: 10,
    sitiosWorkspace: 20,
    etiquetasPorAgente: 30,
    recursosMB: 200,
    knowledgeBase: true,
    massBroadcast: 1000,
    visualWorkflows: 5,
    scraper: true,
    apiAccess: false,
    priceMonthly: 79,
    priceYearly: 66,
  },
  agencia: {
    seats: 15,
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
    knowledgeBase: true,
    massBroadcast: 'unlimited',
    visualWorkflows: 'unlimited',
    scraper: true,
    apiAccess: true,
    priceMonthly: 179,
    priceYearly: 149,
  },
};
