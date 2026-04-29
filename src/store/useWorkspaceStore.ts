import { create } from 'zustand';
import { Workspace } from '@/lib/types/firestore';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspace: Workspace | null;
  selectedContactId: string | null;
  selectedChatId: string | null;
  currentAgentName: string | null;
  isAdmin: boolean;
  setWorkspaceId: (id: string) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setSelectedContactId: (id: string | null) => void;
  setSelectedChatId: (id: string | null) => void;
  setCurrentAgentName: (name: string | null) => void;
  setIsAdmin: (v: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  workspace: null,
  selectedContactId: null,
  selectedChatId: null,
  currentAgentName: null,
  isAdmin: false,
  setWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  setWorkspace: (workspace) => set({ workspace }),
  setSelectedContactId: (id) => set({ selectedContactId: id }),
  setSelectedChatId: (id) => set({ selectedChatId: id }),
  setCurrentAgentName: (name) => set({ currentAgentName: name }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
}));
