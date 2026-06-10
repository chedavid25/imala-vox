"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
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
import { verificarYSetearAdmin } from "@/app/actions/superadmin";

import { TeamChatBubble } from "./TeamChatBubble";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setWorkspace, setWorkspaceId, setWorkspacesList, currentWorkspaceId, currentAgentName, setCurrentAgentName, setIsAdmin, isAdmin, selectedContactId } = useWorkspaceStore();
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const isMobile = useMobileLayout();
  const adminJwtSetRef = useRef(false);

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
          const { collection, query, where, getDocs, limit, collectionGroup, getDoc, doc } = await import("firebase/firestore");

          // Verificar admin y buscar workspace en paralelo
          const configPromise = getDoc(doc(db, 'plataforma', 'config'));

          // 1. Buscar espacios propios
          const qOwner = query(
            collection(db, COLLECTIONS.ESPACIOS),
            where("propietarioUid", "==", user.uid)
          );
          const ownerSnap = await getDocs(qOwner);
          const ownerList = ownerSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Workspace));

          // 2. Buscar espacios donde soy miembro
          let memberList: Workspace[] = [];
          try {
            const qMember = query(
              collectionGroup(db, COLLECTIONS.MIEMBROS),
              where("email", "==", user.email)
            );
            const memberSnap = await getDocs(qMember);
            const memberListPromises = memberSnap.docs.map(async (memberDoc) => {
              const wsRef = memberDoc.ref.parent.parent;
              if (wsRef) {
                const wsSnap = await getDoc(wsRef);
                if (wsSnap.exists()) {
                  return { ...wsSnap.data(), id: wsSnap.id } as Workspace;
                }
              }
              return null;
            });
            const memberListRaw = await Promise.all(memberListPromises);
            memberList = memberListRaw.filter((ws): ws is Workspace => ws !== null);
          } catch (memberError) {
            console.warn("Advertencia: No se pudieron cargar las membresías del usuario. Es posible que falte el índice de collectionGroup de miembros por email.", memberError);
          }

          // Combinar de forma única por ID
          const combinedMap = new Map<string, Workspace>();
          ownerList.forEach(ws => combinedMap.set(ws.id, ws));
          memberList.forEach(ws => combinedMap.set(ws.id, ws));
          const combinedList = Array.from(combinedMap.values());

          setWorkspacesList(combinedList);

          let wsDocData = null;
          if (combinedList.length > 0) {
            // Usar el workspace id actual si es que sigue en la lista, de lo contrario el primero
            const existing = currentWorkspaceId ? combinedList.find(w => w.id === currentWorkspaceId) : null;
            wsDocData = existing || combinedList[0];
          }

          // Resolver check de admin (ya corrió en paralelo)
          const configSnap = await configPromise;
          const adminEmails: string[] = configSnap.data()?.adminEmails || [];
          const isAdminUser = !!(user.email && adminEmails.includes(user.email));
          if (isAdminUser) {
            setIsAdmin(true);
            // Setear cookie JWT si aún no se hizo en esta sesión
            if (!adminJwtSetRef.current) {
              adminJwtSetRef.current = true;
              verificarYSetearAdmin(user.uid, user.email ?? undefined).catch(console.error);
            }
          }

          if (!wsDocData) {
            if (isAdminUser) {
              // Admin sin workspace propio va al panel superadmin
              if (isPublicRoute && !isLanding) router.push("/superadmin");
            } else if (normalizedPathname !== "/onboarding" && !normalizedPathname.startsWith("/auth/join")) {
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
        setIsAdmin(false);
        setIsSessionLoading(false);
        if (!isPublicRoute) {
          router.push("/auth");
        }
      }
    });

    return () => unsubscribe();
  }, [normalizedPathname, isLanding, isPublicRoute, router, setWorkspace, setWorkspaceId, setIsAdmin]);

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
  const showContextPanel = pathname.includes('/contactos') || (pathname.includes('/tareas') && !!selectedContactId);

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
            {isAdmin && (
              <Link
                href="/superadmin"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/20 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--accent-active)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all group shadow-sm active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5 transition-colors" />
                <span>Panel Admin</span>
              </Link>
            )}
            <AvisosHeader />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] custom-scrollbar">
          {children}
        </div>
      </main>
      {showContextPanel && <ContextPanel />}
      <TeamChatBubble />
    </div>
  );
}

