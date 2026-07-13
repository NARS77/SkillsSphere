import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  is_verified: boolean;
  first_name?: string;
  last_name?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
  setLoading: (isLoading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to load initial session from localStorage
  const savedUser = localStorage.getItem('ss_user');
  const savedAccess = localStorage.getItem('ss_access_token');
  const savedRefresh = localStorage.getItem('ss_refresh_token');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    accessToken: savedAccess || null,
    refreshToken: savedRefresh || null,
    isAuthenticated: !!savedAccess,
    isLoading: false,

    setSession: (user, accessToken, refreshToken) => {
      localStorage.setItem('ss_user', JSON.stringify(user));
      localStorage.setItem('ss_access_token', accessToken);
      localStorage.setItem('ss_refresh_token', refreshToken);
      set({ user, accessToken, refreshToken, isAuthenticated: true });
    },

    clearSession: () => {
      localStorage.removeItem('ss_user');
      localStorage.removeItem('ss_access_token');
      localStorage.removeItem('ss_refresh_token');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },

    setLoading: (isLoading) => set({ isLoading }),

    updateUser: (updatedUser) => {
      set((state) => {
        if (!state.user) return state;
        const newUserData = { ...state.user, ...updatedUser };
        localStorage.setItem('ss_user', JSON.stringify(newUserData));
        return { user: newUserData };
      });
    }
  };
});
