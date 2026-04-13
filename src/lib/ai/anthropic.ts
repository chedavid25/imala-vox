import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ADVERTENCIA: ANTHROPIC_API_KEY no está configurada en las variables de entorno.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Modelos Oficiales Imalá Vox (Abril 2026)
export const MODELOS = {
  AGENTE: "claude-sonnet-4-6",
  CLASIFICADOR: "claude-haiku-4-5-20251001"
} as const;

export type ModeloIA = typeof MODELOS[keyof typeof MODELOS];
