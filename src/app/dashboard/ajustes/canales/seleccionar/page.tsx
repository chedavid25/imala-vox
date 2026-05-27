"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Instagram,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { obtenerPendingConnection, finalizarConexion } from "@/app/actions/channels";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.435 5.63 1.436h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.15 5.51 3.03 7.42V22l2.76-1.52c1.3.36 2.7.55 4.21.55 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.2 12.3l-2.4-2.5-4.6 2.5 5.1-5.4 2.4 2.5 4.6-2.5-5.1 5.4z"/>
  </svg>
);

const CheckBox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={cn(
      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer",
      checked
        ? "bg-[var(--accent)] border-[var(--accent)]"
        : "bg-white border-[var(--border-light)] hover:border-[var(--accent)]/50"
    )}
  >
    {checked && <Check className="w-3 h-3 text-[var(--accent-text)]" strokeWidth={3} />}
  </div>
);

type PageOption = {
  id: string;
  name: string;
  instagram: { id: string; username: string; name?: string } | null;
};

type WabaOption = {
  id: string;
  name: string;
  phones: { id: string; displayPhone: string; verifiedName: string }[];
};

export default function SeleccionarConexionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const { currentWorkspaceId } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [wabas, setWabas] = useState<WabaOption[]>([]);

  // Selecciones del usuario
  const [selPages, setSelPages] = useState<Set<string>>(new Set());
  const [selInstagrams, setSelInstagrams] = useState<Set<string>>(new Set());
  const [selPhones, setSelPhones] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId || !currentWorkspaceId) return;

    (async () => {
      const res = await obtenerPendingConnection(currentWorkspaceId, sessionId);
      if (!res.success) {
        setError(res.error || 'No se pudo cargar la sesión');
        setLoading(false);
        return;
      }
      setPages(res.pages || []);
      setWabas(res.wabas || []);

      // Pre-seleccionar todo por defecto para flujos simples (un solo activo)
      const allPageIds = new Set<string>((res.pages || []).map((p: PageOption) => p.id));
      const allIgIds = new Set<string>((res.pages || []).filter((p: PageOption) => p.instagram).map((p: PageOption) => p.id));
      const allPhones = new Set<string>(
        (res.wabas || []).flatMap((w: WabaOption) => w.phones.map(ph => ph.id))
      );
      setSelPages(allPageIds);
      setSelInstagrams(allIgIds);
      setSelPhones(allPhones);

      setLoading(false);
    })();
  }, [sessionId, currentWorkspaceId]);

  const togglePage = (pageId: string) => {
    setSelPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
        // Si destildo la página, también destildo su IG
        setSelInstagrams(igs => {
          const n = new Set(igs);
          n.delete(pageId);
          return n;
        });
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const toggleInstagram = (pageId: string) => {
    setSelInstagrams(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else {
        next.add(pageId);
        // Si tildo IG, asegurar que la página también esté tildada
        setSelPages(p => {
          const n = new Set(p);
          n.add(pageId);
          return n;
        });
      }
      return next;
    });
  };

  const togglePhone = (phoneId: string) => {
    setSelPhones(prev => {
      const next = new Set(prev);
      if (next.has(phoneId)) next.delete(phoneId);
      else next.add(phoneId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!sessionId || !currentWorkspaceId) return;
    const totalSeleccionados = selPages.size + selInstagrams.size + selPhones.size;
    if (totalSeleccionados === 0) {
      toast.error("Tenés que seleccionar al menos un activo para conectar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await finalizarConexion(currentWorkspaceId, sessionId, {
        pageIds: Array.from(selPages),
        instagramPageIds: Array.from(selInstagrams),
        wabaPhoneIds: Array.from(selPhones),
      });

      if (res.success) {
        toast.success(`${res.conectados} canal(es) conectado(s) correctamente`);
        if (res.errores && res.errores.length > 0) {
          for (const e of res.errores) toast.warning(e);
        }
        router.push('/dashboard/ajustes/canales?success=true');
      } else {
        toast.error(res.error || 'No se pudo finalizar la conexión');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-rose-900">No se pudo cargar la conexión</h2>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        </div>
        <Button onClick={() => router.push('/dashboard/ajustes/canales')} variant="outline" className="rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-2" /> Volver a Canales
        </Button>
      </div>
    );
  }

  const totalSel = selPages.size + selInstagrams.size + selPhones.size;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2">
        <button
          onClick={() => router.push('/dashboard/ajustes/canales')}
          className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Volver
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">
          Seleccioná qué activos conectar
        </h1>
        <p className="text-sm text-[var(--text-tertiary-light)] font-medium">
          Meta nos dio acceso a estos activos. Tildá solo los que querés conectar en este espacio de trabajo.
          Los demás quedan disponibles para conectar en otros workspaces.
        </p>
      </div>

      {/* Páginas de Facebook */}
      {pages.length > 0 && (
        <section className="bg-white border border-[var(--border-light)] rounded-[28px] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-[var(--border-light)] bg-[var(--bg-input)]/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary-light)]">
              Páginas de Facebook ({pages.length})
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {pages.map(page => {
              const checked = selPages.has(page.id);
              const igChecked = selInstagrams.has(page.id);
              return (
                <div key={page.id} className="p-5 space-y-3">
                  <label className={cn(
                    "flex items-center gap-4 cursor-pointer p-3 rounded-2xl transition-colors",
                    checked ? "bg-[var(--bg-input)]/50" : "hover:bg-[var(--bg-input)]/30"
                  )}>
                    <CheckBox checked={checked} onChange={() => togglePage(page.id)} />
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                      <MessengerIcon className="w-5 h-5 text-[#1877F2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary-light)] truncate">{page.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] mt-0.5">
                        Facebook Messenger · ID: {page.id}
                      </p>
                    </div>
                  </label>

                  {/* Sub-opción Instagram */}
                  {page.instagram && (
                    <label className={cn(
                      "flex items-center gap-4 cursor-pointer p-3 rounded-2xl transition-colors ml-6",
                      igChecked ? "bg-[var(--bg-input)]/50" : "hover:bg-[var(--bg-input)]/30"
                    )}>
                      <CheckBox checked={igChecked} onChange={() => toggleInstagram(page.id)} />
                      <div className="w-9 h-9 rounded-xl bg-[#E1306C]/10 flex items-center justify-center shrink-0">
                        <Instagram className="w-4 h-4 text-[#E1306C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary-light)] truncate">
                          @{page.instagram.username}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] mt-0.5">
                          Instagram vinculada
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* WhatsApp Business Accounts */}
      {wabas.length > 0 && (
        <section className="bg-white border border-[var(--border-light)] rounded-[28px] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-[var(--border-light)] bg-[var(--bg-input)]/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary-light)]">
              Números de WhatsApp Business
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {wabas.map(waba => (
              <div key={waba.id} className="p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">
                  {waba.name}
                </p>
                {waba.phones.map(phone => {
                  const checked = selPhones.has(phone.id);
                  return (
                    <label key={phone.id} className={cn(
                      "flex items-center gap-4 cursor-pointer p-3 rounded-2xl transition-colors",
                      checked ? "bg-[var(--bg-input)]/50" : "hover:bg-[var(--bg-input)]/30"
                    )}>
                      <CheckBox checked={checked} onChange={() => togglePhone(phone.id)} />
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                        <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary-light)] truncate">
                          {phone.verifiedName || phone.displayPhone}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)] mt-0.5">
                          {phone.displayPhone}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {pages.length === 0 && wabas.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-amber-900">No hay nada para conectar</h2>
            <p className="text-sm text-amber-700">
              Meta no devolvió páginas ni cuentas de WhatsApp. Verificá que sos administrador de los activos y que los marcaste durante el login.
            </p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-sm border border-[var(--border-light)] rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)]">
          {totalSel > 0 ? (
            <span className="text-[var(--text-primary-light)] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {totalSel} activo(s) seleccionado(s)
            </span>
          ) : (
            "Tildá los que querés conectar"
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/ajustes/canales')}
            className="rounded-xl h-11 text-[11px] font-black uppercase tracking-widest"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || totalSel === 0}
            className="rounded-xl h-11 px-6 text-[11px] font-black uppercase tracking-widest bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Conectar {totalSel}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
