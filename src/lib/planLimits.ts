export interface PlanLimits {
  seats: number;
  whatsappNumbers: number;
  channelsIGFB: boolean;
  convCountIA: number;
  crmContacts: number | 'unlimited';
  catalogObjects: number | 'unlimited';
  agentsIA: number;
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
    convCountIA: 10000, // + exceso proporcional
    crmContacts: 'unlimited',
    catalogObjects: 'unlimited',
    agentsIA: 10,
    knowledgeBase: true,
    massBroadcast: 'unlimited',
    visualWorkflows: 'unlimited',
    scraper: true,
    apiAccess: true,
    priceMonthly: 179,
    priceYearly: 149,
  },
};
