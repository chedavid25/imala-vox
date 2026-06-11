/**
 * Cálculo de tiempos en "horario hábil" (business hours) según el horario de
 * atención humana configurado por agente. Espejo de src/lib/horarioHabil.ts.
 * Zona horaria por defecto: America/Argentina/Buenos_Aires (UTC-3, sin DST).
 */

export interface HorarioHumano {
  diasActivos: string[];
  horaInicio: string;
  horaFin: string;
  sabadoHoraInicio?: string;
  sabadoHoraFin?: string;
  domingoHoraInicio?: string;
  domingoHoraFin?: string;
}

const DIA_IDX_TO_KEY = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const partes = s.split(":");
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function franjaDelDia(diaKey: string, horario: HorarioHumano): { ini: number; fin: number } | null {
  if (!horario.diasActivos?.includes(diaKey)) return null;

  let ini: number | null;
  let fin: number | null;
  if (diaKey === "sab") {
    ini = parseHHMM(horario.sabadoHoraInicio);
    fin = parseHHMM(horario.sabadoHoraFin);
  } else if (diaKey === "dom") {
    ini = parseHHMM(horario.domingoHoraInicio);
    fin = parseHHMM(horario.domingoHoraFin);
  } else {
    ini = parseHHMM(horario.horaInicio);
    fin = parseHHMM(horario.horaFin);
  }

  if (ini == null || fin == null || fin <= ini) return null;
  return { ini, fin };
}

export function segundosHabiles(
  startMs: number,
  endMs: number,
  horario?: HorarioHumano | null,
  tzOffsetMin = -180
): number {
  if (endMs <= startMs) return 0;
  if (!horario) return Math.floor((endMs - startMs) / 1000);

  const SHIFT = tzOffsetMin * 60000;
  let total = 0;

  const startLocal = new Date(startMs + SHIFT);
  let dayCursor = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate());

  let guard = 0;
  while (guard++ < 400) {
    const dayUtcMidnight = dayCursor - SHIFT;
    if (dayUtcMidnight > endMs) break;

    const d = new Date(dayCursor);
    const diaKey = DIA_IDX_TO_KEY[d.getUTCDay()];
    const franja = franjaDelDia(diaKey, horario);

    if (franja) {
      const winStart = dayUtcMidnight + franja.ini * 60000;
      const winEnd = dayUtcMidnight + franja.fin * 60000;
      const interStart = Math.max(winStart, startMs);
      const interEnd = Math.min(winEnd, endMs);
      if (interEnd > interStart) total += interEnd - interStart;
    }

    dayCursor += 24 * 3600 * 1000;
  }

  return Math.floor(total / 1000);
}

export function estaEnHorario(dateMs: number, horario?: HorarioHumano | null, tzOffsetMin = -180): boolean {
  if (!horario) return true;
  const SHIFT = tzOffsetMin * 60000;
  const d = new Date(dateMs + SHIFT);
  const diaKey = DIA_IDX_TO_KEY[d.getUTCDay()];
  const franja = franjaDelDia(diaKey, horario);
  if (!franja) return false;
  const minutosDelDia = d.getUTCHours() * 60 + d.getUTCMinutes();
  return minutosDelDia >= franja.ini && minutosDelDia < franja.fin;
}
