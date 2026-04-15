import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Obtenemos el UID de la sesión de Firebase (si existe en los headers/cookies)
  // En este proyecto usamos cookies para la sesión de Firebase.
  
  return NextResponse.json({ 
    mensaje: "Para darte permisos de administrador, necesito tu UID.",
    instrucciones: [
      "1. Registra tu UID en Firestore en: plataforma/config -> columna superAdminUids (como un nuevo elemento del array).",
      "2. Una vez hecho, entra a /superadmin."
    ],
    tu_email: "contacto@imala.com.ar",
    nota: "Busca tu UID en la consola de Firebase -> Authentication -> Users. Copia el valor de la columna 'User UID' para contacto@imala.com.ar"
  });
}
