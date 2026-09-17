import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global active branch filter store.
 * Allows Admin/Owner/Manager to filter across all legacy features
 * by selected branch ('all' or specific branch ObjectId).
 */
const useBranchStore = create(
  persist(
    (set) => ({
      selectedBranchId: 'all', // 'all' means chain-wide view
      branches: [],
      setSelectedBranchId: (branchId) => set({ selectedBranchId: branchId }),
      setBranches: (branches) => set({ branches }),
    }),
    {
      name: 'dinesync-branch',
      partialize: (state) => ({ selectedBranchId: state.selectedBranchId }),
    }
  )
);

export default useBranchStore;
