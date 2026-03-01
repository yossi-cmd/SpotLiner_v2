"use client";

import { create } from "zustand";

export const usePWAStore = create((set) => ({
  installPrompt: null,
  setInstallPrompt: (event) => set({ installPrompt: event }),
  clearInstallPrompt: () => set({ installPrompt: null }),
}));
