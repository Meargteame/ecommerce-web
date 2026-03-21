import { create } from 'zustand'

type AuthTab = 'login' | 'register'

interface AuthModalState {
  open: boolean
  tab: AuthTab
  openModal: (tab?: AuthTab) => void
  closeModal: () => void
  setTab: (tab: AuthTab) => void
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  open: false,
  tab: 'login',
  openModal: (tab = 'login') => set({ open: true, tab }),
  closeModal: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
}))
