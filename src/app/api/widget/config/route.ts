import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types/firestore";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { 
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" } 
    });
  }

  try {
    // Usamos adminDb para saltar las reglas de seguridad y obtener la config del canal web
    const snap = await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(workspaceId)
      .collection(COLLECTIONS.CANALES)
      .where("tipo", "==", "web")
      .get();
    
    if (snap.empty) {
      return NextResponse.json({ error: "Web channel not found" }, { 
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" } 
      });
    }

    const canal = snap.docs[0].data();
    
    return NextResponse.json({
      config: canal.configWeb,
      agenteId: canal.agenteId,
      status: canal.status
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  } catch (error: any) {
    console.error("Error fetching widget config:", error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
}
