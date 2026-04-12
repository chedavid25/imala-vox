import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, Contacto } from '@/lib/types/firestore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function useContactos() {
  const [contactos, setContactos] = useState<(Contacto & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (!currentWorkspaceId) {
      setContactos([]);
      setLoading(false);
      return;
    }

    const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
    const q = query(
      contactsRef,
      orderBy('creadoEl', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (Contacto & { id: string })[];
        setContactos(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error suscribiéndose a contactos:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  return { contactos, loading, error };
}
