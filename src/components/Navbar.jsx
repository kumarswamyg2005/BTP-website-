import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Navbar() {
  const { user, activeHeadset, logout, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    toast('Signed out. Session cleared.', 'info');
    navigate('/login');
  }

  const headsetLabel = activeHeadset
    ? (activeHeadset.model.length > 18 ? activeHeadset.model.substring(0, 18) + '…' : activeHeadset.model)
    : 'No headset';

  return (
    <nav className="navbar glass" id="main-navbar">
      <div className="container navbar-inner">
        <NavLink to="/home" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="Unity Stream" className="nav-logo" />
          <span className="nav-brand-name">Unity Stream</span>
        </NavLink>

        <div className="navbar-tabs" role="tablist">
          <NavLink
            to="/home"
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
            role="tab"
          >
            <span>🏠</span> Home
          </NavLink>
          <NavLink
            to="/headsets"
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
            role="tab"
          >
            <span>🥽</span> Headsets
          </NavLink>
          <NavLink
            to="/cloud"
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
            role="tab"
          >
            <span>☁️</span> Cloud
          </NavLink>
          {role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              role="tab"
            >
              <span>⚙️</span> Admin
            </NavLink>
          )}
        </div>

        <div className="navbar-right">
          <div className="headset-status-pill" title="Active headset">
            <span className={`pulse-dot ${activeHeadset ? 'online' : 'offline'}`}></span>
            <span>{headsetLabel}</span>
          </div>
          <div className="user-avatar-wrap" ref={menuRef}>
            <div
              className="user-avatar"
              onClick={() => setMenuOpen(o => !o)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setMenuOpen(o => !o)}
            >
              {user?.initial || '?'}
            </div>
            {menuOpen && (
              <div className="user-menu glass" style={{ display: 'block' }}>
                <div className="user-menu-info">
                  <strong>{user?.username}</strong>
                  <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                </div>
                <div className="divider" style={{ margin: '10px 0' }}></div>
                <button
                  className="user-menu-item"
                  onClick={() => { setMenuOpen(false); navigate('/cloud'); }}
                >
                  ☁️ Cloud Settings
                </button>
                <button
                  className="user-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    toast(`Role: ${user?.role} | ID: ${user?.username}`, 'info');
                  }}
                >
                  👤 Profile
                </button>
                <div className="divider" style={{ margin: '10px 0' }}></div>
                <button className="user-menu-item danger" onClick={handleLogout}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
