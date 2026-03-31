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

export const AuthService = {
  async login(username, password) {
    const key = (username || "").trim().toLowerCase();
    const pass = (password || "").trim();
    const user = LOCAL_USERS[key];
    if (!user) return null;

    // Constant-time comparison
    const a = user.password;
    const b = pass;
    if (a.length !== b.length) return null;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    if (diff !== 0) return null;

    return {
      role: user.role,
      initial: user.initial,
      cloudGb: user.cloudGb,
      displayName: user.displayName || key,
    };
  },
};
