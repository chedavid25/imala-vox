"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";
import { NotificationBanner } from "./NotificationBanner";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS, Workspace } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setWorkspace, setWorkspaceId, currentWorkspaceId, currentAgentName, setCurrentAgentName } = useWorkspaceStore();
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const isPublicRoute = pathname === "/auth" || pathname === "/onboarding";

  // Efecto para recuperar el nombre del agente si estamos en una subruta de agentes
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const agentsIdx = segments.indexOf('agentes');
    
    // Si estamos en /dashboard/ajustes/agentes/[id]/...
    if (agentsIdx !== -1 && segments[agentsIdx + 1] && currentWorkspaceId) {
      const agentId = segments[agentsIdx + 1];
      
      const fetchAgentName = async () => {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const agentRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId);
          const agentSnap = await getDoc(agentRef);
          
          if (agentSnap.exists()) {
            setCurrentAgentName(agentSnap.data().nombre);
          } else {
            setCurrentAgentName(null);
          }
        } catch (error) {
          console.error("Error fetching agent name:", error);
          setCurrentAgentName(null);
        }
      };
      
      fetchAgentName();
    } else {
      setCurrentAgentName(null);
    }
  }, [pathname, currentWorkspaceId, setCurrentAgentName]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
// ... existing session logic ...
      if (user) {
        try {
          const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
          const q = query(
            collection(db, COLLECTIONS.ESPACIOS),
            where("propietarioUid", "==", user.uid),
            limit(1)
          );
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
// ... onboarding logic ...
            if (pathname !== "/onboarding") {
              router.push("/onboarding");
            }
          } else {
            const wsDoc = snapshot.docs[0];
            const wsData = { ...wsDoc.data(), id: wsDoc.id } as Workspace;
            setWorkspaceId(wsDoc.id);
            setWorkspace(wsData);

            if (isPublicRoute) {
              router.push("/dashboard/operacion/inbox");
            }
          }
        } catch (error) {
          console.error("Error resolviendo workspace:", error);
        } finally {
          setIsSessionLoading(false);
        }
      } else {
        setIsSessionLoading(false);
        if (!isPublicRoute) {
          router.push("/auth");
        }
      }
    });

    return () => unsubscribe();
  }, [pathname, router, setWorkspace, setWorkspaceId, isPublicRoute]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isSessionLoading) {
    return <AppLoadingSkeleton />;
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];
    
    return segments.map((segment, index) => {
      let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      if (segment === 'dashboard') return 'Dashboard';
      if (segment === 'inbox') return 'Bandeja de entrada';
      if (segment === 'webs') return 'Sitios web';
      if (segment === 'agentes') return 'Agentes IA';
      if (segment === 'catalogo') return 'Catálogo';
      
      // Si el segmento anterior era 'agentes', usar el nombre del store si coincide con el ID
      if (segments[index - 1] === 'agentes' && currentAgentName) {
        return `Agente: ${currentAgentName}`;
      }
      
      // Fallback si es un ID pero no tenemos el nombre aún
      if (segments[index - 1] === 'agentes') {
        return `Agente: ${segment.slice(0, 8)}...`;
      }
      
      return label;
    });
  };

  const breadcrumbs = getBreadcrumbs();
  const showContextPanel = pathname.includes('/inbox') || pathname.includes('/contactos');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <NotificationBanner />
        <header className="h-[var(--header-height)] border-b border-[var(--border-light)] bg-[var(--bg-card)] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-[13px]">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <span className={cn(
                  index === breadcrumbs.length - 1 
                    ? "font-bold text-[var(--text-primary-light)]" 
                    : "text-[var(--text-tertiary-light)]"
                )}>
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && (
                  <span className="text-[var(--text-tertiary-light)]/40 mx-0.5">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] custom-scrollbar">
          {children}
        </div>
      </main>
      {showContextPanel && <ContextPanel />}
    </div>
  );
}

function AppLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
      <div className="w-[var(--sidebar-width)] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] p-4 space-y-8">
        <div className="h-6 w-32 bg-white/10 rounded-md animate-pulse mb-12" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-full bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
          <div className="h-[var(--header-height)] border-b border-[var(--border-light)] bg-white animate-pulse" />
          <div className="flex-1 p-8">
             <div className="space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 w-full bg-gray-100 rounded-3xl animate-pulse" />
             </div>
          </div>
      </div>
    </div>
  );
}
