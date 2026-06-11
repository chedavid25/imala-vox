/**
 * Cálculo de tiempos en "horario hábil" (business hours) según el horario de
 * atención humana configurado por agente. Se usa para que las estadísticas de
 * tiempo de respuesta no cuenten las horas/días en que no hay nadie atendiendo.
 *
 * NOTA: Mantener sincronizado con functions/src/horarioHabil.ts (paquetes distintos).
 * Zona horaria por defecto: America/Argentina/Buenos_Aires (UTC-3, sin DST).
 */

export interface HorarioHumano {
  diasActivos: string[]; // ['lun','mar','mie','jue','vie','sab','dom']
  horaInicio: string; // "09:00" — base Lun-Vie
  horaFin: string; // "18:00" — base Lun-Vie
  sabadoHoraInicio?: string;
  sabadoHoraFin?: string;
  domingoHoraInicio?: string;
  domingoHoraFin?: string;
}

// getUTCDay(): 0=Domingo .. 6=Sábado
const DIA_IDX_TO_KEY = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function parseHHMM(s?: string): number | null {
  if (!s) return null;
  const partes = s.split(":");
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m; // minutos desde la medianoche local
}

/** Devuelve la franja hábil del día (en minutos desde medianoche) o null si no atiende. */
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

/**
 * Suma los segundos comprendidos entre [startMs, endMs] que caen dentro de las
 * ventanas de atención humana. Si no hay horario, devuelve el tiempo de reloj.
 */
export function segundosHabiles(
  startMs: number,
  endMs: number,
  horario?: HorarioHumano | null,
  tzOffsetMin = -180
): number {
  if (endMs <= startMs) return 0;
  if (!horario) return Math.floor((endMs - startMs) / 1000);

  const SHIFT = tzOffsetMin * 60000; // ms para pasar de UTC a hora local (leyendo getUTC*)
  let total = 0;

  // Medianoche local del día de inicio, expresada en "espacio desplazado"
  const startLocal = new Date(startMs + SHIFT);
  let dayCursor = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate());

  let guard = 0;
  while (guard++ < 400) {
    const dayUtcMidnight = dayCursor - SHIFT; // medianoche local en UTC real
    if (dayUtcMidnight > endMs) break;

    const d = new Date(dayCursor); // getUTC* = hora de pared local
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

/** Indica si un instante cae dentro de la ventana de atención humana. */
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
