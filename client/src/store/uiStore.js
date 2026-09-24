import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: false,
  currentEventId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentEventId: (eventId) => set({ currentEventId: eventId }),
}));

export default useUIStore;
