import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.CANALES),
      where("tipo", "==", "web")
    );

    const snap = await getDocs(q);
    
    if (snap.empty) {
      return NextResponse.json({ error: "Web channel not found" }, { status: 404 });
    }

    const canal = snap.docs[0].data();
    
    // Devolvemos solo la configuración necesaria para el widget
    return NextResponse.json({
      config: canal.configWeb,
      agenteId: canal.agenteId,
      status: canal.status
    });
  } catch (error: any) {
    console.error("Error fetching widget config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
