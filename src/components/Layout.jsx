import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Layout() {
  const toast = useToast();

  // Anti-download / anti-drag protections (screenshot interception is handled
  // globally by contentProtection.js with correct Mac key code detection)
  useEffect(() => {
    function handleContextMenu(e) {
      e.preventDefault();
      toast('⛔ Content is protected. Right-click is disabled.', 'error', 2500);
    }

    function handleKeyDown(e) {
      // Block only Ctrl+S (page save) — all screenshot shortcuts handled by contentProtection.js
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    }

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Inject CSS shield
    const shield = document.createElement('style');
    shield.id = 'unity-shield';
    shield.textContent = `
      #page-app * { user-select: none !important; -webkit-user-select: none !important; }
      .video-thumb, #modal-thumb { pointer-events: none !important; -webkit-user-drag: none !important; }
      #actual-video-player { pointer-events: auto !important; }
      @media print { body { display: none !important; } }
    `;
    document.head.appendChild(shield);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.getElementById('unity-shield')?.remove();
    };
  }, [toast]);


  return (
    <div id="page-app" style={{ display: 'block' }}>
      <div className="bg-animated"></div>
      <div className="bg-grid"></div>
      <Navbar />
      <Outlet />
    </div>
  );
}
