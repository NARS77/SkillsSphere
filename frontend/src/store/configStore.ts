import { create } from 'zustand';
import { api } from '../services/api';

interface ConfigState {
  DEMO_MODE: boolean;
  AI_ENABLED: boolean;
  PAYMENTS_ENABLED: boolean;
  EMAIL_ENABLED: boolean;
  NOTIFICATIONS_ENABLED: boolean;
  isLoaded: boolean;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  DEMO_MODE: import.meta.env.VITE_DEMO_MODE === 'true',
  AI_ENABLED: true,
  PAYMENTS_ENABLED: true,
  EMAIL_ENABLED: true,
  NOTIFICATIONS_ENABLED: true,
  isLoaded: false,

  fetchConfig: async () => {
    try {
      const response = await api.get('config/');
      set({
        DEMO_MODE: response.data.DEMO_MODE,
        AI_ENABLED: response.data.AI_ENABLED,
        PAYMENTS_ENABLED: response.data.PAYMENTS_ENABLED,
        EMAIL_ENABLED: response.data.EMAIL_ENABLED,
        NOTIFICATIONS_ENABLED: response.data.NOTIFICATIONS_ENABLED,
        isLoaded: true,
      });
    } catch (error) {
      console.warn("Failed to fetch platform configuration, using default fallbacks.", error);
      set({ isLoaded: true });
    }
  }
}));
