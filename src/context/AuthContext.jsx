import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthService } from '../data/users.js';
import { VIDEOS } from '../data/videos.js';

const AuthContext = createContext(null);

function randomHex(n) {
  return [...Array(n)]
    .map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase())
    .join('');
}

function loadFromSession() {
  try {
    const uid = sessionStorage.getItem('unity_user');
    if (!uid) return null;
    const userData = JSON.parse(sessionStorage.getItem('unity_user_data') || 'null');
    if (!userData) return null;
    const headsets = JSON.parse(sessionStorage.getItem('unity_headsets') || '[]');
    const active = JSON.parse(sessionStorage.getItem('unity_active') || 'null');
    const videos = JSON.parse(sessionStorage.getItem('unity_videos') || 'null') || VIDEOS;
    return { uid, userData, headsets, active, videos };
  } catch {
    return null;
  }
}

function persistToSession(uid, userData, headsets, active, videos) {
  sessionStorage.setItem('unity_user', uid);
  sessionStorage.setItem('unity_user_data', JSON.stringify(userData));
  sessionStorage.setItem('unity_headsets', JSON.stringify(headsets));
  sessionStorage.setItem('unity_active', JSON.stringify(active));
  // Strip ArrayBuffer fileData — not JSON-serializable; blob URL is reconstructed on play
  const serializableVideos = videos.map(v => {
    if (v.fileData) {
      const { fileData, ...rest } = v;
      return rest;
    }
    return v;
  });
  sessionStorage.setItem('unity_videos', JSON.stringify(serializableVideos));
}

export function AuthProvider({ children }) {
  const saved = loadFromSession();

  const [user, setUser] = useState(saved ? { username: saved.uid, ...saved.userData } : null);
  const [headsets, setHeadsets] = useState(saved?.headsets || []);
  const [activeHeadset, setActiveHeadset] = useState(saved?.active || null);
  const [videos, setVideos] = useState(saved?.videos || VIDEOS);

  // Persist whenever state changes
  useEffect(() => {
    if (!user) return;
    persistToSession(user.username, user, headsets, activeHeadset, videos);
  }, [user, headsets, activeHeadset, videos]);

  const login = useCallback(async (username, password) => {
    const userData = await AuthService.login(username, password);
    if (!userData) return null;
    const uid = username.trim().toLowerCase();
    const instanceId = `USR-${uid.toUpperCase()}-${randomHex(6)}-INST`;
    const fullUser = { username: uid, instanceId, ...userData };
    setUser(fullUser);
    return fullUser;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setUser(null);
    setHeadsets([]);
    setActiveHeadset(null);
    setVideos(VIDEOS);
  }, []);

  const registerHeadset = useCallback((device) => {
    setHeadsets(prev => {
      if (prev.find(h => h.id === device.id)) return prev;
      const reg = { ...device, registeredAt: new Date().toISOString() };
      const next = [...prev, reg];
      // Set active if none
      setActiveHeadset(cur => cur || reg);
      return next;
    });
  }, []);

  const releaseHeadset = useCallback((deviceId) => {
    setHeadsets(prev => {
      const next = prev.filter(h => h.id !== deviceId);
      setActiveHeadset(cur => (cur?.id === deviceId ? (next[0] || null) : cur));
      return next;
    });
  }, []);

  const setActiveHeadsetById = useCallback((deviceId) => {
    setHeadsets(prev => {
      const hset = prev.find(h => h.id === deviceId);
      if (hset) setActiveHeadset(hset);
      return prev;
    });
  }, []);

  const addVideo = useCallback((video) => {
    setVideos(prev => [video, ...prev]);
  }, []);

  const value = {
    user,
    username: user?.username || null,
    isLoggedIn: !!user,
    role: user?.role || null,
    login,
    logout,
    registeredHeadsets: headsets,
    activeHeadset,
    registerHeadset,
    releaseHeadset,
    setActiveHeadset: setActiveHeadsetById,
    videos,
    addVideo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
