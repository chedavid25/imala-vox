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
  ExternalLink,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  DialogTrigger,
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

  useEffect(() => {
    if (!currentWorkspaceId) return;

    // Escuchar miembros
    const qMembers = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.MIEMBROS),
      orderBy("creadoEl", "desc")
    );
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Escuchar invitaciones
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

  const planLimit = workspace ? PLAN_LIMITS[workspace.plan as keyof typeof PLAN_LIMITS].seats : 1;
  const totalOccupied = members.length + invitations.filter(i => i.status === 'pendiente').length;
  const canInvite = totalOccupied < planLimit;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER INTEGRADO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1.5 text-left">
          <Link href="/dashboard/ajustes" className="flex items-center gap-2 text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors mb-2 text-[10px] font-bold uppercase tracking-widest">
            <ChevronLeft className="w-3 h-3" />
            Volver a Ajustes
          </Link>
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Users className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Gestión de Equipo</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary-light)] tracking-tight">Usuarios y Accesos</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)] max-w-md leading-relaxed font-medium">
             Administra quién tiene acceso a tu espacio de trabajo y qué puede hacer.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Asientos Ocupados</p>
              <p className="text-lg font-black text-[var(--text-primary-light)]">{totalOccupied} <span className="text-[var(--text-tertiary-light)] text-sm font-bold">/ {planLimit}</span></p>
           </div>
           
           <Dialog open={isInviteModalOpen} onOpenChange={(open) => {
             setIsInviteModalOpen(open);
             if (!open) setLastInviteLink(null);
           }}>
             <DialogTrigger render={
                <Button 
                  disabled={!canInvite}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-xl shadow-[var(--accent)]/10 transition-all active:scale-95"
                />
             }>
                <UserPlus className="w-4 h-4 mr-2" />
                Invitar Miembro
             </DialogTrigger>
             <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] p-8 sm:p-10 w-[95vw] sm:max-w-2xl rounded-[2.5rem] shadow-3xl">
                {!lastInviteLink ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-[var(--text-primary-light)]">Invitar al Equipo</DialogTitle>
                      <DialogDescription className="text-sm text-[var(--text-tertiary-light)] pt-1 font-medium opacity-70">
                        Enviá una invitación para que alguien se una a este espacio.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleInvite} className="space-y-6 pt-6">
                      <div className="space-y-4">
                         <div className="grid gap-2 text-left">
                           <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)]">Correo Electrónico</Label>
                           <Input 
                             id="email"
                             type="email"
                             required
                             value={inviteEmail}
                             onChange={(e) => setInviteEmail(e.target.value)}
                             className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-12 px-4 font-bold text-sm focus:ring-[var(--accent)]/30"
                             placeholder="ejemplo@correo.com"
                           />
                         </div>

                         <div className="grid gap-2 text-left">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary-light)]">Rol del Integrante</Label>
                            <div className="grid grid-cols-2 gap-4">
                               <button 
                                 type="button"
                                 onClick={() => setInviteRole("operador")}
                                 className={`p-5 rounded-2xl border-2 transition-all text-left ${inviteRole === 'operador' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border-light)] hover:border-[var(--text-tertiary-light)]/30'}`}
                               >
                                 <p className="text-xs font-black uppercase text-[var(--text-primary-light)]">Usuario</p>
                                 <p className="text-[10px] font-medium text-[var(--text-tertiary-light)] mt-1 opacity-60">Gestiona chats y CRM.</p>
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setInviteRole("admin")}
                                 className={`p-5 rounded-2xl border-2 transition-all text-left ${inviteRole === 'admin' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border-light)] hover:border-[var(--text-tertiary-light)]/30'}`}
                               >
                                 <p className="text-xs font-black uppercase text-[var(--text-primary-light)]">Admin</p>
                                 <p className="text-[10px] font-medium text-[var(--text-tertiary-light)] mt-1 opacity-60">Control total del espacio.</p>
                               </button>
                            </div>
                         </div>
                      </div>

                      <DialogFooter className="pt-4 flex !flex-col-reverse sm:!flex-row">
                        <Button 
                          type="submit" 
                          disabled={isInviting || !inviteEmail}
                          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-sm uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-[var(--accent)]/20"
                        >
                          {isInviting ? "Generando..." : "Enviar Invitación"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-6 py-2 animate-in zoom-in-95 duration-300 w-full max-w-full">
                    <div className="size-20 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                       <CheckCircle2 className="size-10" />
                    </div>
                    
                    <div className="space-y-2 text-center w-full">
                       <h2 className="text-2xl font-black text-[var(--text-primary-light)] tracking-tight">¡Enlace de Invitación!</h2>
                       <p className="text-[13px] text-[var(--text-tertiary-light)] font-medium px-4 opacity-80 leading-relaxed">
                        Copiá este enlace y envíaselo a la persona que querés sumar a tu equipo.
                      </p>
                    </div>
                    
                    <div className="w-full bg-[var(--bg-input)] p-4 rounded-2xl border border-[var(--border-light)] flex items-center gap-3 shadow-inner overflow-hidden">
                       <div className="flex-1 min-w-0 overflow-hidden">
                         <p className="text-[11px] font-mono text-[var(--text-tertiary-light)] break-all whitespace-normal opacity-70">
                           {window.location.origin}{lastInviteLink}
                         </p>
                       </div>
                       <Button 
                         size="icon" 
                         variant="ghost" 
                         className="shrink-0 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-xl"
                         onClick={copyInviteLink}
                       >
                          <Copy className="size-4" />
                       </Button>
                    </div>

                    <div className="w-full pt-4">
                      <Button 
                        onClick={() => setIsInviteModalOpen(false)}
                        className="w-full bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/80 text-[var(--text-primary-light)] font-black text-[10px] uppercase tracking-[0.2em] h-14 rounded-2xl border border-[var(--border-light)] transition-all hover:border-[var(--accent)]/50"
                      >
                        Cerrar Ventana
                      </Button>
                    </div>
                  </div>
                )}
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-black text-[var(--text-primary-light)] flex items-center gap-3">
               Equipo Activo
               <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 font-bold">{members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader className="bg-[var(--bg-main)]/30">
                  <TableRow className="border-b border-[var(--border-light)]">
                    <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-14">Nombre</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Email</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Rol</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Estado</TableHead>
                    <TableHead className="text-right px-8 h-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="border-b border-[var(--border-light)]/50 hover:bg-[var(--bg-main)]/20 transition-colors">
                      <TableCell className="px-8 py-5">
                         <div className="flex items-center gap-3">
                           <div className="size-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center font-black text-[var(--accent)] text-xs">
                             {member.nombre?.charAt(0).toUpperCase()}
                           </div>
                           <span className="text-sm font-extrabold text-[var(--text-primary-light)]">
                             {member.nombre} {workspace?.propietarioUid === member.id && <span className="text-[10px] text-[var(--accent)] ml-2">(Dueño)</span>}
                           </span>
                         </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-[var(--text-tertiary-light)]">
                        {member.email}
                      </TableCell>
                      <TableCell>
                         <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border ${member.rol === 'admin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                           {member.rol === 'operador' ? 'Usuario' : member.rol}
                         </Badge>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                           <CheckCircle2 className="size-3.5" />
                           Activo
                         </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                         <DropdownMenu>
                           <DropdownMenuTrigger render={
                             <Button variant="ghost" size="icon" className="text-[var(--text-tertiary-light)]" />
                           }>
                                <MoreVertical className="size-4" />
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl">
                              <DropdownMenuItem className="text-rose-500 font-bold text-xs gap-2">
                                <Trash2 className="size-3.5" />
                                Eliminar Miembro
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

        {invitations.length > 0 && (
          <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black text-[var(--text-primary-light)] flex items-center gap-3">
                Invitaciones Pendientes
                <Badge className="bg-amber-500/10 text-amber-500 border-none px-3 font-bold">{invitations.filter(i => i.status === 'pendiente').length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-left">
              <Table>
                <TableHeader className="bg-[var(--bg-main)]/30">
                  <TableRow className="border-b border-[var(--border-light)]">
                    <TableHead className="px-8 text-[10px] font-black uppercase tracking-widest h-14">Email</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Rol</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Vencimiento</TableHead>
                    <TableHead className="text-right px-8 h-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.filter(i => i.status === 'pendiente').map((invite) => (
                    <TableRow key={invite.id} className="border-b border-[var(--border-light)]/50 hover:bg-[var(--bg-main)]/20 transition-colors">
                      <TableCell className="px-8 py-5 text-sm font-bold text-[var(--text-primary-light)]">
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg text-[10px] font-black uppercase tracking-tighter">
                          {invite.role === 'operador' ? 'Usuario' : invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-[var(--text-tertiary-light)]">
                         <div className="flex items-center gap-1.5">
                           <Clock className="size-3.5" />
                           {invite.venceEl?.toDate().toLocaleDateString()}
                         </div>
                      </TableCell>
                       <TableCell className="text-right px-8">
                          <Button 
                             className="bg-transparent hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-[10px] uppercase tracking-[0.2em] px-5 h-8 rounded-xl transition-all disabled:opacity-50"
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

      {!canInvite && workspace?.plan === 'starter' && (
        <div className="p-10 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-amber-900/5">
           <div className="size-20 rounded-[2rem] bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Shield className="size-10" />
           </div>
           <div className="space-y-4 flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black text-amber-500">¡Potenciá tu Equipo!</h3>
              <p className="text-sm text-amber-200/70 leading-relaxed font-medium max-w-2xl">
                Actualmente estás en el plan **Starter**, que permite un único asiento. Si querés sumar colaboradores para atender más chats y administrar tu embudo de ventas juntos, subí a **Plan Pro** para obtener hasta 3 usuarios totales.
              </p>
           </div>
           <Link href="/dashboard/ajustes/facturacion">
             <Button className="bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase h-14 px-10 rounded-2xl shadow-lg shadow-amber-500/20">
                Mejorar Plan
             </Button>
           </Link>
        </div>
      )}
    </div>
  );
}
