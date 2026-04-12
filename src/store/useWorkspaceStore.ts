import { create } from 'zustand';
import { Workspace } from '@/lib/types/firestore';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspace: Workspace | null;
  setWorkspaceId: (id: string) => void;
  setWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  workspace: null,
  setWorkspaceId: (id) => set({ currentWorkspaceId: id }),
  setWorkspace: (workspace) => set({ workspace }),
}));
