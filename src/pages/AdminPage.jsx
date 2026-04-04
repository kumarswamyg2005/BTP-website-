import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { LOCAL_USERS } from "../data/users.js";
import PageTransition from "../components/PageTransition.jsx";

const SECURITY_LOG = [
  {
    time: "2026-03-23 14:32:11",
    event: "Login success",
    user: "admin",
    ip: "192.168.1.42",
    status: "success",
  },
  {
    time: "2026-03-23 13:18:04",
    event: "Login failed",
    user: "unknown_user",
    ip: "10.0.0.55",
    status: "error",
  },
  {
    time: "2026-03-23 12:55:30",
    event: "Login success",
    user: "editor",
    ip: "192.168.1.67",
    status: "success",
  },
  {
    time: "2026-03-23 11:40:22",
    event: "Headset registered",
    user: "admin",
    ip: "192.168.1.42",
    status: "info",
  },
  {
    time: "2026-03-23 10:12:09",
    event: "Video uploaded",
    user: "editor",
    ip: "192.168.1.67",
    status: "info",
  },
  {
    time: "2026-03-22 23:59:47",
    event: "Login failed",
    user: "admin",
    ip: "203.0.113.7",
    status: "error",
  },
];

const ROLE_COLORS = {
  admin: "#4f8ef7",
  editor: "#a78bfa",
  user: "#22c55e",
};

const STATUS_COLORS = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--accent)",
};

export default function AdminPage() {
  const { videos, registeredHeadsets } = useAuth();

  return (
    <PageTransition
      className="tab-content active"
      style={{ paddingTop: "var(--navbar-h)" }}
    >
      <div
        className="container admin-page"
        style={{ paddingTop: 40, paddingBottom: 60 }}
      >
        <h2 className="section-title">Administration Panel</h2>
        <p className="section-desc">
          System overview, user management, and security audit log. Admin access
          only.
        </p>

        {/* Users Section */}
        <div
          className="glass"
          style={{
            padding: 28,
            borderRadius: "var(--radius-lg)",
            marginBottom: 28,
          }}
        >
          <h3 className="section-title" style={{ marginBottom: 20 }}>
            <span style={{ marginRight: 8 }}>👥</span> Registered Users
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Username",
                    "Display Name",
                    "Role",
                    "Cloud Storage",
                    "Initial",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(LOCAL_USERS).map(([uid, u]) => (
                  <tr
                    key={uid}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.02)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 14px",
                        fontFamily: "var(--mono)",
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {uid}
                    </td>
                    <td
                      style={{
                        padding: "14px 14px",
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {u.displayName}
                    </td>
                    <td style={{ padding: "14px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "2px 10px",
                          borderRadius: 99,
                          fontSize: "0.73rem",
                          fontWeight: 700,
                          background: `${ROLE_COLORS[u.role]}18`,
                          color: ROLE_COLORS[u.role],
                          border: `1px solid ${ROLE_COLORS[u.role]}40`,
                          textTransform: "capitalize",
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 14px",
                        fontFamily: "var(--mono)",
                        fontSize: "0.88rem",
                        color: "var(--cyan)",
                      }}
                    >
                      {u.cloudGb} GB
                    </td>
                    <td style={{ padding: "14px 14px" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${ROLE_COLORS[u.role]}, #7c5cfc)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          color: "#fff",
                        }}
                      >
                        {u.initial}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Stats */}
        <div
          className="glass"
          style={{
            padding: 28,
            borderRadius: "var(--radius-lg)",
            marginBottom: 28,
          }}
        >
          <h3 className="section-title" style={{ marginBottom: 20 }}>
            <span style={{ marginRight: 8 }}>📊</span> System Stats
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                label: "Total Videos",
                value: videos.length,
                icon: "🎬",
                color: "#4f8ef7",
              },
              {
                label: "Registered Users",
                value: Object.keys(LOCAL_USERS).length,
                icon: "👥",
                color: "#a78bfa",
              },
              {
                label: "Active Headsets",
                value: registeredHeadsets.length,
                icon: "🥽",
                color: "#22c55e",
              },
              {
                label: "Encryption Type",
                value: "AES-256-CTR",
                icon: "🔐",
                color: "#f59e0b",
              },
              {
                label: "Platform Version",
                value: "v2.0.0",
                icon: "⚡",
                color: "#6eb3ff",
              },
              {
                label: "Session Store",
                value: "sessionStorage",
                icon: "🔒",
                color: "#7c5cfc",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass"
                style={{
                  padding: "18px 20px",
                  borderRadius: "var(--radius-md)",
                  background: `${stat.color}08`,
                  borderColor: `${stat.color}22`,
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: stat.color,
                    marginBottom: 4,
                    fontFamily:
                      typeof stat.value === "string"
                        ? "var(--mono)"
                        : "var(--font)",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Log */}
        <div
          className="glass"
          style={{ padding: 28, borderRadius: "var(--radius-lg)" }}
        >
          <h3 className="section-title" style={{ marginBottom: 20 }}>
            <span style={{ marginRight: 8 }}>🛡</span> Security Log
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontWeight: 400,
                marginLeft: 8,
              }}
            >
              (simulated)
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SECURITY_LOG.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_COLORS[entry.status],
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${STATUS_COLORS[entry.status]}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                    minWidth: 150,
                  }}
                >
                  {entry.time}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    color: "var(--text-primary)",
                    flex: 1,
                  }}
                >
                  {entry.event}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.78rem",
                    color: "var(--accent)",
                  }}
                >
                  {entry.user}
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {entry.ip}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    background: `${STATUS_COLORS[entry.status]}18`,
                    color: STATUS_COLORS[entry.status],
                    border: `1px solid ${STATUS_COLORS[entry.status]}40`,
                    textTransform: "uppercase",
                  }}
                >
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
