"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Trash2, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronLeft,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ArrowRight,
  UserCheck,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { invitarUsuarioAction, cancelarInvitacionAction } from "@/app/actions/team";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UsuariosPage() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operador");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const qMembers = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.MIEMBROS),
      orderBy("creadoEl", "desc")
    );
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qInvites = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "invitaciones"),
      orderBy("creadoEl", "desc")
    );
    const unsubInvites = onSnapshot(qInvites, (snap) => {
      setInvitations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [currentWorkspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId) return;

    setIsInviting(true);
    try {
      const res = await invitarUsuarioAction(currentWorkspaceId, inviteEmail, inviteRole);
      if (res.success) {
        toast.success("Invitación generada con éxito");
        setLastInviteLink(res.link || null);
        setInviteEmail("");
      } else {
        toast.error(res.error || "Error al invitar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (lastInviteLink) {
      const fullLink = `${window.location.origin}${lastInviteLink}`;
      navigator.clipboard.writeText(fullLink);
      toast.success("Enlace copiado al portapapeles");
    }
  };

  const handleCancelInvite = async (token: string) => {
    if (!currentWorkspaceId) return;
    
    setCancellingId(token);
    try {
      const res = await cancelarInvitacionAction(currentWorkspaceId, token);
      if (res.success) {
        toast.success("Invitación cancelada");
      } else {
        toast.error(res.error || "Error al cancelar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setCancellingId(null);
    }
  };

  const ayudaUsuarios = {
    titulo: "Gestión de Equipo y Roles",
    descripcion: "Controla quién accede a tu espacio y qué nivel de permisos tienen para operar tus canales y agentes IA.",
    items: [
      { titulo: "Roles", detalle: "Admin (Control total) o Usuario (Gestión operativa de chats y CRM)." },
      { titulo: "Invitaciones", detalle: "Los enlaces de invitación caducan a los 7 días por seguridad." },
      { titulo: "Límites", detalle: "Tu plan actual define cuántos colaboradores pueden trabajar simultáneamente." },
    ]
  };

  const planLimit = workspace ? PLAN_LIMITS[workspace.plan as keyof typeof PLAN_LIMITS].seats : 1;
  const totalOccupied = members.length + invitations.filter(i => i.status === 'pendiente').length;
  const canInvite = totalOccupied < planLimit;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard/ajustes" className="flex items-center gap-2 text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors mb-3 text-[10px] font-black uppercase tracking-widest">
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver a Ajustes
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Colaboradores</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Equipo y Accesos</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-md">Administra los permisos de tus colaboradores y sus roles.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right px-4 border-r border-slate-100 hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asientos</p>
            <p className="text-xl font-black text-slate-900">{totalOccupied}<span className="text-slate-300 text-sm">/{planLimit}</span></p>
          </div>

          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            Roles y Equipo
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>

          <Button 
            disabled={!canInvite}
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-xl shadow-[var(--accent)]/10"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar
          </Button>
        </div>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaUsuarios.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaUsuarios.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaUsuarios.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INVITACION */}
      <Dialog open={isInviteModalOpen} onOpenChange={(open) => {
        setIsInviteModalOpen(open);
        if (!open) setLastInviteLink(null);
      }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
          {!lastInviteLink ? (
            <>
              <DialogHeader className="bg-slate-50/50 p-8 pb-4">
                <div className="size-16 rounded-[2rem] bg-[var(--accent)] flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-[var(--accent)]/20">
                  <UserPlus className="size-8" />
                </div>
                <DialogTitle className="text-2xl font-black text-[var(--text-primary-light)] text-center tracking-tight">Sumar al Equipo</DialogTitle>
                <DialogDescription className="text-center text-[var(--text-secondary-light)] text-sm leading-relaxed px-2 font-medium">
                  Genera un enlace de invitación para un nuevo colaborador.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleInvite} className="p-8 pt-4 space-y-6">
                <div className="space-y-5">
                  <div className="grid gap-2 text-left">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Correo Electrónico</Label>
                    <Input 
                      id="email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-2xl h-14 px-5 font-bold text-sm focus:ring-2 focus:ring-[var(--accent)]/30 transition-all shadow-sm"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div className="grid gap-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Rol Sugerido</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setInviteRole("operador")}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left space-y-1",
                          inviteRole === 'operador' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-slate-100 hover:border-slate-200'
                        )}
                      >
                        <p className="text-xs font-black uppercase text-[var(--text-primary-light)]">Usuario</p>
                        <p className="text-[9px] font-medium text-slate-500 leading-tight">Gestiona chats y CRM.</p>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setInviteRole("admin")}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left space-y-1",
                          inviteRole === 'admin' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-slate-100 hover:border-slate-200'
                        )}
                      >
                        <p className="text-xs font-black uppercase text-[var(--text-primary-light)]">Admin</p>
                        <p className="text-[9px] font-medium text-slate-500 leading-tight">Control total del espacio.</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button 
                    type="submit" 
                    disabled={isInviting || !inviteEmail}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-[var(--accent)]/20"
                  >
                    {isInviting ? "Generando Enlace..." : "Generar Invitación"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    type="button"
                    className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="size-20 rounded-[2.5rem] bg-emerald-50 text-emerald-500 flex items-center justify-center border-4 border-white shadow-2xl">
                 <CheckCircle2 className="size-10" />
              </div>
              
              <div className="space-y-2">
                 <h2 className="text-2xl font-black text-[var(--text-primary-light)] tracking-tight">¡Enlace Generado!</h2>
                 <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-[280px]">
                  Copiá el enlace y envíaselo a tu nuevo compañero.
                </p>
              </div>
              
              <div className="w-full bg-slate-900 p-5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-2xl overflow-hidden group">
                 <div className="flex-1 min-w-0 overflow-hidden text-left">
                   <p className="text-[10px] font-mono text-white/40 break-all leading-relaxed">
                     {window.location.origin}{lastInviteLink}
                   </p>
                 </div>
                 <Button 
                   size="icon" 
                   className="shrink-0 bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] rounded-xl"
                   onClick={copyInviteLink}
                 >
                    <Copy className="size-4" />
                 </Button>
              </div>

              <Button 
                onClick={() => setIsInviteModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest h-14 rounded-2xl transition-all"
              >
                Cerrar Ventana
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-10">
        {/* EQUIPO ACTIVO */}
        <Card className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm">
          <CardHeader className="p-8 pb-6 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/20">
            <CardTitle className="text-xl font-bold text-[var(--text-primary-light)] flex items-center gap-3 tracking-tight">
               Equipo Activo
               <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-black text-[10px] rounded-xl">{members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-14">Integrante</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Email</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Rol</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Estado</TableHead>
                    <TableHead className="text-right px-8 h-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="px-8 py-5">
                         <div className="flex items-center gap-4">
                           <div className="size-11 rounded-[1.2rem] bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 text-sm group-hover:bg-[var(--accent)] group-hover:text-black group-hover:border-transparent transition-all duration-300">
                             {member.nombre?.charAt(0).toUpperCase()}
                           </div>
                           <div className="space-y-0.5">
                             <p className="text-sm font-bold text-[var(--text-primary-light)]">
                               {member.nombre}
                             </p>
                             {workspace?.propietarioUid === member.id && (
                               <div className="flex items-center gap-1 text-[9px] text-amber-600 font-black uppercase tracking-tighter">
                                 <Crown className="size-2.5" />
                                 Propietario
                               </div>
                             )}
                           </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-400">
                        {member.email}
                      </TableCell>
                      <TableCell>
                         <Badge className={cn(
                           "rounded-xl px-3 py-1 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                           member.rol === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                         )}>
                           {member.rol === 'operador' ? 'Usuario' : member.rol}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-500 font-black uppercase tracking-tighter">
                           <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           Activo
                         </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-600 rounded-xl">
                                <MoreVertical className="size-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="bg-white border-slate-200 rounded-2xl shadow-2xl p-2 min-w-[160px]">
                              <DropdownMenuItem className="text-rose-500 font-bold text-[10px] uppercase tracking-widest gap-2 p-3 rounded-xl hover:bg-rose-50 cursor-pointer focus:bg-rose-50">
                                <Trash2 className="size-3.5" />
                                Eliminar del Equipo
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        {/* INVITACIONES PENDIENTES */}
        {invitations.length > 0 && (
          <Card className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm">
            <CardHeader className="p-8 pb-6 border-b border-slate-50 bg-slate-50/20">
              <CardTitle className="text-xl font-bold text-[var(--text-primary-light)] flex items-center gap-3 tracking-tight">
                Invitaciones Pendientes
                <Badge className="bg-amber-50 text-amber-600 border-none px-3 py-1 font-black text-[10px] rounded-xl">{invitations.filter(i => i.status === 'pendiente').length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-left">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-14">Email Destino</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Rol Sugerido</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Expira en</TableHead>
                    <TableHead className="text-right px-8 h-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.filter(i => i.status === 'pendiente').map((invite) => (
                    <TableRow key={invite.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-8 py-5 text-sm font-bold text-slate-900">
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-xl border-slate-200 text-slate-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                          {invite.role === 'operador' ? 'Usuario' : invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-400">
                         <div className="flex items-center gap-1.5">
                           <Clock className="size-3.5" />
                           {invite.venceEl?.toDate().toLocaleDateString()}
                         </div>
                      </TableCell>
                       <TableCell className="text-right px-8">
                          <Button 
                             className="bg-transparent hover:bg-rose-50 text-rose-500 border border-rose-100 font-black text-[10px] uppercase tracking-widest px-5 h-9 rounded-xl transition-all disabled:opacity-50"
                             onClick={() => handleCancelInvite(invite.token)}
                             disabled={cancellingId === invite.token}
                          >
                             {cancellingId === invite.token ? "Cancelando..." : "Cancelar"}
                          </Button>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PROMO UPGRADE */}
      {!canInvite && workspace?.plan === 'starter' && (
        <div className="p-12 rounded-[3.5rem] bg-slate-900 border border-white/5 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 size-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
           
           <div className="size-24 rounded-[2.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xl group-hover:scale-110 transition-transform duration-700 relative z-10">
              <Crown className="size-12" />
           </div>
           
           <div className="space-y-3 flex-1 text-center md:text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-2">
                <Shield className="size-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Plan Starter</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">¡Potenciá tu Equipo de Ventas!</h3>
              <p className="text-sm text-white/50 leading-relaxed font-medium max-w-xl">
                Tu plan actual permite un único usuario. Subí a **Plan Pro** para obtener hasta 3 asientos y permitir que tu equipo gestione chats y CRM en conjunto.
              </p>
           </div>
           
           <Link href="/dashboard/ajustes/facturacion" className="relative z-10">
             <Button className="bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-amber-500/20 group/btn transition-all">
                Mejorar Plan Ahora
                <ArrowRight className="ml-2 size-4 group-hover/btn:translate-x-1 transition-transform" />
             </Button>
           </Link>
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
