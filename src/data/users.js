/* ================================================================
   Unity Stream — Local User Database  (React version)
================================================================ */

export const LOCAL_USERS = {
  admin: {
    password: "Password",
    role: "admin",
    initial: "A",
    cloudGb: 4.2,
    displayName: "Administrator",
  },
  editor: {
    password: "Editor@2025!",
    role: "editor",
    initial: "E",
    cloudGb: 2.8,
    displayName: "Editor",
  },
  user01: {
    password: "User@2025!",
    role: "user",
    initial: "U",
    cloudGb: 1.5,
    displayName: "User",
  },
};

const CUSTOM_USERS_KEY = 'unity_custom_users';

export function getCustomUsers() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveCustomUsers(users) {
  localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users));
}

export const AuthService = {
  async login(username, password) {
    const key = (username || "").trim().toLowerCase();
    const pass = (password || "").trim();

    const hardcoded = LOCAL_USERS[key];
    if (hardcoded) {
      const a = hardcoded.password;
      const b = pass;
      if (a.length !== b.length) return null;
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      if (diff !== 0) return null;
      return {
        role: hardcoded.role,
        initial: hardcoded.initial,
        cloudGb: hardcoded.cloudGb,
        displayName: hardcoded.displayName || key,
      };
    }

    const custom = getCustomUsers()[key];
    if (!custom) return null;
    const a = custom.password;
    const b = pass;
    if (a.length !== b.length) return null;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    if (diff !== 0) return null;
    return {
      role: custom.role,
      initial: custom.initial,
      cloudGb: custom.cloudGb,
      displayName: custom.displayName || key,
    };
  },

  async register(username, password, displayName) {
    const key = (username || "").trim().toLowerCase();
    const pass = (password || "").trim();
    const name = (displayName || "").trim() || key;

    if (!key || !pass) {
      return { success: false, error: 'Username and password are required.' };
    }
    if (key.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (pass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    if (LOCAL_USERS[key] || getCustomUsers()[key]) {
      return { success: false, error: 'Username already exists.' };
    }

    const custom = getCustomUsers();
    custom[key] = {
      password: pass,
      role: 'user',
      initial: name.charAt(0).toUpperCase(),
      cloudGb: 1.0,
      displayName: name,
    };
    saveCustomUsers(custom);
    return { success: true };
  },
};
