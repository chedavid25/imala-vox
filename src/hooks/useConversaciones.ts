import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/types/firestore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function useConversaciones() {
  const [conversaciones, setConversaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (!currentWorkspaceId) {
      setConversaciones([]);
      setLoading(false);
      return;
    }

    const conversationsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES);
    const q = query(
      conversationsRef,
      orderBy('ultimaActividad', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConversaciones(convs);
        setLoading(false);
      },
      (err) => {
        console.error('Error suscribiéndose a conversaciones:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  return { conversaciones, loading, error };
}
