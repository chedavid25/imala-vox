"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";
import { NotificationBanner } from "./NotificationBanner";
import { AvisosHeader } from "./AvisosHeader";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COLLECTIONS, Workspace } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileLayout } from "./MobileLayout";
import { SplashScreen } from "./SplashScreen";
import { TrialExpiredGate } from "./TrialExpiredGate";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setWorkspace, setWorkspaceId, currentWorkspaceId, currentAgentName, setCurrentAgentName } = useWorkspaceStore();
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const isMobile = useMobileLayout();

  const normalizedPathname = pathname?.toLowerCase() || "/";
  const isLanding = normalizedPathname === "/" || normalizedPathname === "";

  const isPublicRoute =
    isLanding ||
    normalizedPathname.startsWith("/auth") ||
    normalizedPathname.startsWith("/onboarding") ||
    normalizedPathname.startsWith("/privacy") ||
    normalizedPathname.startsWith("/terms");

  // Todos los useEffect DEBEN ir antes de cualquier return condicional (Reglas de Hooks)

  useEffect(() => {
    if (isLanding) return;

    const segments = normalizedPathname.split('/').filter(Boolean);
    const agentsIdx = segments.indexOf('agentes');

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
  }, [normalizedPathname, currentWorkspaceId, setCurrentAgentName, isLanding]);

  useEffect(() => {
    // La landing maneja su propio estado de auth — no suscribir aquí
    if (isLanding) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const { collection, query, where, getDocs, limit, collectionGroup, getDoc } = await import("firebase/firestore");

          const qOwner = query(
            collection(db, COLLECTIONS.ESPACIOS),
            where("propietarioUid", "==", user.uid),
            limit(1)
          );
          const ownerSnap = await getDocs(qOwner);

          let wsDocData = null;

          if (!ownerSnap.empty) {
            const ownerDoc = ownerSnap.docs[0];
            wsDocData = { ...ownerDoc.data(), id: ownerDoc.id } as Workspace;
          } else {
            const qMember = query(
              collectionGroup(db, COLLECTIONS.MIEMBROS),
              where("__name__", "==", user.uid),
              limit(1)
            );
            const memberSnap = await getDocs(qMember);

            if (!memberSnap.empty) {
              const memberDoc = memberSnap.docs[0];
              const wsRef = memberDoc.ref.parent.parent;
              if (wsRef) {
                const wsSnap = await getDoc(wsRef);
                if (wsSnap.exists()) {
                  wsDocData = { ...wsSnap.data(), id: wsSnap.id } as Workspace;
                }
              }
            }
          }

          if (!wsDocData) {
            if (normalizedPathname !== "/onboarding") {
              router.push("/onboarding");
            }
          } else {
            setWorkspaceId(wsDocData.id);
            setWorkspace(wsDocData);

            // Redirigir a dashboard solo desde /auth y /onboarding, nunca desde la landing
            if (isPublicRoute && !isLanding) {
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
  }, [normalizedPathname, isLanding, isPublicRoute, router, setWorkspace, setWorkspaceId]);

  // Returns condicionales DESPUÉS de todos los hooks
  if (isLanding) {
    return <>{children}</>;
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isSessionLoading || isMobile === null) {
    return <SplashScreen />;
  }

  if (isMobile) {
    return (
      <>
        <MobileLayout>{children}</MobileLayout>
        <TrialExpiredGate />
      </>
    );
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];

    return segments.map((segment, index) => {
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      if (segment === 'dashboard') return 'Dashboard';
      if (segment === 'inbox') return 'Bandeja de entrada';
      if (segment === 'webs') return 'Sitios web';
      if (segment === 'agentes') return 'Agentes IA';
      if (segment === 'catalogo') return 'Catálogo';

      if (segments[index - 1] === 'agentes' && currentAgentName) {
        return `Agente: ${currentAgentName}`;
      }

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
      <TrialExpiredGate />
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

          <div className="flex items-center gap-4">
            <AvisosHeader />
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

