import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data || data);
      setLoading(false);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const axios = (await import('axios')).default;
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const { data: refreshData } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
            const newToken = refreshData.data?.token || refreshData.token;
            const newRefresh = refreshData.data?.refreshToken || refreshData.refreshToken;
            if (newToken) {
              localStorage.setItem('token', newToken);
              if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
              const { data: retry } = await api.get('/auth/me');
              setUser(retry.data || retry);
              setLoading(false);
              return;
            }
          } catch {}
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setLoading(false);
      } else if (err.response) {
        setUser(null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password, role) => {
    const { data } = await api.post('/auth/login', { email, password, role });
    const payload = data.data || data;
    localStorage.setItem('token', payload.token);
    if (payload.refreshToken) {
      localStorage.setItem('refreshToken', payload.refreshToken);
    }
    setUser(payload.user);
    return payload;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    const payload = data.data || data;
    localStorage.setItem('token', payload.token);
    if (payload.refreshToken) {
      localStorage.setItem('refreshToken', payload.refreshToken);
    }
    setUser(payload.user);
    return payload;
  };

  const loginWithGoogle = async (googleData) => {
    const { data } = await api.post('/auth/google', googleData);
    const payload = data.data || data;
    localStorage.setItem('token', payload.token);
    if (payload.refreshToken) {
      localStorage.setItem('refreshToken', payload.refreshToken);
    }
    setUser(payload.user);
    return payload;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const { data } = await api.put('/auth/update-profile', updates);
    setUser(data.data || data.user || data);
    return data;
  };

  const hasPermission = useCallback((feature, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'client') {
      return ['view', 'list', 'read', 'get'].includes(action);
    }
    if (!user.permissions) {
      return ['admin', 'advocate', 'staff'].includes(user.role);
    }
    const featurePerms = user.permissions[feature];
    if (!featurePerms) return false;
    if (typeof featurePerms === 'boolean') return featurePerms;
    return !!featurePerms[action];
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user, loading, loadUser, login, register, loginWithGoogle, logout, updateProfile, setUser, hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
