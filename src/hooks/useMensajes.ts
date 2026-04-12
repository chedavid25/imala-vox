import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/types/firestore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function useMensajes(conversationId: string | null) {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (!currentWorkspaceId || !conversationId) {
      setMensajes([]);
      return;
    }

    setLoading(true);
    // Sub-subcolección: espaciosDeTrabajo/{esId}/conversaciones/{cId}/mensajes
    const messagesRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversationId, COLLECTIONS.MENSAJES);
    
    // Query inicial de los últimos 50 mensajes
    const q = query(
      messagesRef,
      orderBy('creadoEl', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Ordenamos cronológicamente para la vista
      
      setMensajes(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId, conversationId]);

  return { mensajes, loading };
}
