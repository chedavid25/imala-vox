"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, deleteDoc, doc,
  updateDoc, serverTimestamp
} from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { COLLECTIONS, Objeto } from "@/lib/types/firestore";
import {
  LayoutGrid, Building2, ShoppingCart, Pencil, Trash2,
  ExternalLink, Loader2, Globe, Filter, Home,
  Maximize2, BedDouble, Bath, MapPin, Tag, Package,
  CheckCircle2, Clock, XCircle, PauseCircle, Search
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ObjetoConId = Objeto & { id: string };

const ESTADO_CONFIG = {
  disponible: { label: 'Disponible', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  vendido:    { label: 'Vendido',    icon: XCircle,      bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
  reservado:  { label: 'Reservado',  icon: Clock,        bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  pausado:    { label: 'Pausado',    icon: PauseCircle,  bg: 'bg-[var(--bg-input)]', border: 'border-[var(--border-light)]', text: 'text-[var(--text-tertiary-light)]', dot: 'bg-[var(--text-tertiary-light)]' },
};

function CatalogoContent() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const searchParams = useSearchParams();
  const [objetos, setObjetos] = useState<ObjetoConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroFuente, setFiltroFuente] = useState<string>("todos");
  const [editando, setEditando] = useState<ObjetoConId | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Partial<Objeto>>({});

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id })) as ObjetoConId[];
      // Ordenar: disponibles primero, luego por título
      docs.sort((a, b) => {
        if (a.estado === 'disponible' && b.estado !== 'disponible') return -1;
        if (b.estado === 'disponible' && a.estado !== 'disponible') return 1;
        return a.titulo.localeCompare(b.titulo);
      });
      setObjetos(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [currentWorkspaceId]);

  // Manejar query param 'fuente'
  useEffect(() => {
    const fuente = searchParams.get('fuente');
    if (fuente) setFiltroFuente(fuente);
  }, [searchParams]);

  // Fuentes únicas para el filtro
  const fuentesUnicas = useMemo(() => {
    const map = new Map<string, string>();
    objetos.forEach(o => {
      if (o.recursoOrigenId && o.urlOriginWeb) {
        map.set(o.recursoOrigenId, new URL(o.urlOriginWeb).hostname);
      }
    });
    return Array.from(map.entries());
  }, [objetos]);

  // Filtrado
  const objetosFiltrados = useMemo(() => {
    return objetos.filter(o => {
      if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false;
      if (filtroFuente !== 'todos' && o.recursoOrigenId !== filtroFuente) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          o.titulo.toLowerCase().includes(q) ||
          o.descripcion.toLowerCase().includes(q) ||
          JSON.stringify(o.caracteristicas).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [objetos, filtroTipo, filtroEstado, filtroFuente, busqueda]);

  const abrirEdicion = (obj: ObjetoConId) => {
    setEditando(obj);
    setForm({ ...obj });
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setForm({});
  };

  const guardarEdicion = async () => {
    if (!editando || !currentWorkspaceId) return;
    setGuardando(true);
    try {
      await updateDoc(
        doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS, editando.id),
        { ...form, actualizadoEl: serverTimestamp() }
      );
      toast.success("Objeto actualizado");
      cerrarEdicion();
    } catch (err) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (obj: ObjetoConId) => {
    if (!confirm(`¿Eliminar "${obj.titulo}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.OBJETOS, obj.id));
      toast.success("Eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const cambiarEstado = async (obj: ObjetoConId, nuevoEstado: Objeto['estado']) => {
    try {
      await updateDoc(
        doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.OBJETOS, obj.id),
        { estado: nuevoEstado, actualizadoEl: serverTimestamp() }
      );
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const disponibles = objetos.filter(o => o.estado === 'disponible').length;
  const propiedades = objetos.filter(o => o.tipo === 'propiedad').length;
  const productos = objetos.filter(o => o.tipo === 'producto').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">
            Catálogo de Objetos
          </h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Productos y propiedades extraídos automáticamente de tus sitios indexados.
          </p>
        </div>
      </div>

      {/* Stats rápidas */}
      {objetos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', valor: objetos.length, icon: LayoutGrid },
            { label: 'Disponibles', valor: disponibles, icon: CheckCircle2 },
            { label: 'Propiedades', valor: propiedades, icon: Building2 },
            { label: 'Productos', valor: productos, icon: ShoppingCart },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 text-[var(--text-secondary-light)]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text-primary-light)] leading-none">{stat.valor}</p>
                <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros */}
      {objetos.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-10 bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
            />
          </div>

          {/* Filtro tipo */}
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v || "todos")}>
            <SelectTrigger className="w-36 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="propiedad">Propiedades</SelectItem>
              <SelectItem value="producto">Productos</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro estado */}
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v || "todos")}>
            <SelectTrigger className="w-36 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro fuente */}
          {fuentesUnicas.length > 1 && (
            <Select value={filtroFuente} onValueChange={(v) => setFiltroFuente(v || "todos")}>
              <SelectTrigger className="w-44 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las fuentes</SelectItem>
                {fuentesUnicas.map(([id, hostname]) => (
                  <SelectItem key={id} value={id}>{hostname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(filtroTipo !== 'todos' || filtroEstado !== 'todos' || filtroFuente !== 'todos' || busqueda) && (
            <button
              onClick={() => { setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroFuente('todos'); setBusqueda(''); }}
              className="text-xs font-bold text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-input)]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary-light)]" />
        </div>
      ) : objetos.length === 0 ? (
        // Empty state — sin objetos en absoluto
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-[var(--text-tertiary-light)]" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-[var(--text-secondary-light)]">El catálogo está vacío</p>
            <p className="text-xs text-[var(--text-tertiary-light)] max-w-xs">
              Indexá un sitio web con productos o propiedades y el sistema los extraerá automáticamente.
            </p>
          </div>
          <Link
            href="/dashboard/cerebro/conocimiento/webs"
            className={cn(buttonVariants(), "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl mt-2")}
          >
            Ir a Sitios Web
          </Link>
        </div>
      ) : objetosFiltrados.length === 0 ? (
        // Empty state — filtros sin resultados
        <div className="flex flex-col items-center justify-center py-16 space-y-3 opacity-60">
          <Filter className="w-8 h-8 text-[var(--text-tertiary-light)]" />
          <p className="text-sm font-bold text-[var(--text-secondary-light)]">Sin resultados para estos filtros</p>
        </div>
      ) : (
        // Grid de cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {objetosFiltrados.map(obj => (
            <ObjetoCard
              key={obj.id}
              obj={obj}
              onEditar={() => abrirEdicion(obj)}
              onEliminar={() => eliminar(obj)}
              onCambiarEstado={(estado) => cambiarEstado(obj, estado)}
            />
          ))}
        </div>
      )}

      {/* Modal de edición */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && cerrarEdicion()}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary-light)]">
              Editar {editando?.tipo === 'propiedad' ? 'Propiedad' : 'Producto'}
            </DialogTitle>
          </DialogHeader>

          {editando && (
            <div className="space-y-5 py-2">
              {/* Campos comunes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Título</Label>
                  <Input
                    value={form.titulo || ''}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Precio</Label>
                  <Input
                    type="number"
                    value={form.precio || ''}
                    onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Moneda</Label>
                  <Select value={form.moneda || 'USD'} onValueChange={v => setForm(f => ({ ...f, moneda: (v as any) || 'USD' }))}>
                    <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Estado</Label>
                  <Select value={form.estado || 'disponible'} onValueChange={v => setForm(f => ({ ...f, estado: (v as any) || 'disponible' }))}>
                    <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="vendido">Vendido</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Descripción</Label>
                  <Textarea
                    value={form.descripcion || ''}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Campos específicos de propiedades */}
              {editando.tipo === 'propiedad' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest border-t border-[var(--border-light)] pt-4">Características de la propiedad</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'operacion', label: 'Operación', tipo: 'select', opciones: ['venta', 'alquiler', 'alquiler_temporal'] },
                      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['casa', 'departamento', 'local', 'oficina', 'terreno', 'campo', 'otro'] },
                      { key: 'ambientes', label: 'Ambientes', tipo: 'number' },
                      { key: 'dormitorios', label: 'Dormitorios', tipo: 'number' },
                      { key: 'banios', label: 'Baños', tipo: 'number' },
                      { key: 'm2', label: 'M² totales', tipo: 'number' },
                      { key: 'm2_cubiertos', label: 'M² cubiertos', tipo: 'number' },
                      { key: 'expensas', label: 'Expensas (ARS)', tipo: 'number' },
                      { key: 'barrio', label: 'Barrio', tipo: 'text' },
                      { key: 'localidad', label: 'Localidad', tipo: 'text' },
                    ].map(campo => (
                      <div key={campo.key} className="space-y-1.5">
                        <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">{campo.label}</Label>
                        {campo.tipo === 'select' ? (
                          <Select
                            value={form.caracteristicas?.[campo.key] || ''}
                            onValueChange={v => setForm(f => ({ ...f, caracteristicas: { ...f.caracteristicas, [campo.key]: v || '' } }))}
                          >
                            <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {campo.opciones!.map(op => (
                                <SelectItem key={op} value={op}>{op.charAt(0).toUpperCase() + op.slice(1).replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={campo.tipo}
                            value={form.caracteristicas?.[campo.key] || ''}
                            onChange={e => setForm(f => ({
                              ...f,
                              caracteristicas: {
                                ...f.caracteristicas,
                                [campo.key]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value
                              }
                            }))}
                            className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos específicos de productos */}
              {editando.tipo === 'producto' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest border-t border-[var(--border-light)] pt-4">Características del producto</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'sku', label: 'SKU', tipo: 'text' },
                      { key: 'marca', label: 'Marca', tipo: 'text' },
                      { key: 'categoria', label: 'Categoría', tipo: 'text' },
                      { key: 'stock', label: 'Stock', tipo: 'number' },
                    ].map(campo => (
                      <div key={campo.key} className="space-y-1.5">
                        <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">{campo.label}</Label>
                        <Input
                          type={campo.tipo}
                          value={form.caracteristicas?.[campo.key] || ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            caracteristicas: {
                              ...f.caracteristicas,
                              [campo.key]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value
                            }
                          }))}
                          className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL fuente */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">URL de la ficha (opcional)</Label>
                <Input
                  value={form.urlFuente || ''}
                  onChange={e => setForm(f => ({ ...f, urlFuente: e.target.value }))}
                  placeholder="https://..."
                  className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 border-t border-[var(--border-light)]">
            <Button
              variant="outline"
              onClick={cerrarEdicion}
              className="h-9 px-4 bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary-light)] font-bold text-xs hover:bg-[var(--bg-input)] rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarEdicion}
              disabled={guardando}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-[var(--accent)]/20"
            >
              {guardando && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
      <CatalogoContent />
    </Suspense>
  );
}

// ─── Componente ObjetoCard ───────────────────────────────────────────────────

function ObjetoCard({
  obj,
  onEditar,
  onEliminar,
  onCambiarEstado,
}: {
  obj: ObjetoConId;
  onEditar: () => void;
  onEliminar: () => void;
  onCambiarEstado: (estado: Objeto['estado']) => void;
}) {
  const estadoCfg = ESTADO_CONFIG[obj.estado] || ESTADO_CONFIG.disponible;
  const c = obj.caracteristicas || {};
  const esPropiedad = obj.tipo === 'propiedad';

  const precioFormateado = obj.precio > 0
    ? `${obj.moneda || 'USD'} ${obj.precio.toLocaleString('es-AR')}`
    : 'Consultar precio';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-5 hover:border-[var(--border-light-strong)] transition-all flex flex-col gap-4 group">
      
      {/* Header de la card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
            {esPropiedad
              ? <Building2 className="w-4 h-4 text-[var(--text-secondary-light)]" />
              : <ShoppingCart className="w-4 h-4 text-[var(--text-secondary-light)]" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary-light)] truncate">{obj.titulo}</p>
            <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
              {esPropiedad ? c.operacion || 'Propiedad' : 'Producto'}
            </p>
          </div>
        </div>

        {/* Badge de estado */}
        <Select value={obj.estado} onValueChange={(v) => onCambiarEstado((v as any) || 'disponible')}>
          <SelectTrigger className={cn(
            "h-7 px-2.5 rounded-full border text-[9px] font-black uppercase tracking-wider w-auto gap-1.5",
            estadoCfg.bg, estadoCfg.border, estadoCfg.text
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", estadoCfg.dot)} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Precio */}
      <div className="text-lg font-bold text-[var(--text-primary-light)]">
        {precioFormateado}
        {esPropiedad && c.expensas && (
          <span className="text-xs font-medium text-[var(--text-tertiary-light)] ml-2">
            + ARS {c.expensas.toLocaleString('es-AR')} exp.
          </span>
        )}
      </div>

      {/* Características en chips */}
      <div className="flex flex-wrap gap-1.5">
        {esPropiedad ? (
          <>
            {c.tipo && <Chip icon={Home} label={c.tipo} />}
            {c.m2 && <Chip icon={Maximize2} label={`${c.m2}m²`} />}
            {c.dormitorios && <Chip icon={BedDouble} label={`${c.dormitorios} dorm`} />}
            {c.banios && <Chip icon={Bath} label={`${c.banios} baños`} />}
            {(c.barrio || c.localidad) && <Chip icon={MapPin} label={c.barrio || c.localidad} />}
          </>
        ) : (
          <>
            {c.marca && <Chip icon={Tag} label={c.marca} />}
            {c.categoria && <Chip icon={Package} label={c.categoria} />}
            {c.stock != null && <Chip icon={Package} label={`Stock: ${c.stock}`} />}
            {c.sku && <Chip icon={Tag} label={`SKU: ${c.sku}`} />}
          </>
        )}
      </div>

      {/* Descripción truncada */}
      {obj.descripcion && (
        <p className="text-xs text-[var(--text-secondary-light)] leading-relaxed line-clamp-2">
          {obj.descripcion}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)] mt-auto">
        {/* Sitio origen */}
        {obj.urlOriginWeb ? (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary-light)] font-medium">
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[120px]">
              {new URL(obj.urlOriginWeb).hostname}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-tertiary-light)]">Manual</span>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-1">
          {obj.urlFuente && (
            <a
              href={obj.urlFuente}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEliminar}
            className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Chip ─────────────────────────────────────────────────────────

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-secondary-light)]">
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
