import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import VideoCard from '../components/VideoCard.jsx';
import VideoModal from '../components/VideoModal.jsx';
import UploadModal from '../components/UploadModal.jsx';
import PageTransition from '../components/PageTransition.jsx';
import SpotlightCard from '../components/SpotlightCard.jsx';

export default function HomePage() {
  const { videos, registeredHeadsets, role } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const libraryRef = useRef(null);

  const canUpload = role === 'admin' || role === 'editor';

  const filtered = videos.filter(v => {
    const q = search.toLowerCase();
    const matchText = v.title.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q);
    const matchCat = category === 'all' || v.category === category;
    return matchText && matchCat;
  });

  function scrollToVideos() {
    libraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <PageTransition id="tab-content-home" className="tab-content active" style={{ paddingTop: 'var(--navbar-h)' }}>
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="container hero-inner">
          <div className="hero-text">
            <div className="badge badge-cyan hero-badge anim-fade-up">
              <span className="pulse-dot online"></span> VR Encrypted Library
            </div>
            <h1 className="hero-title anim-fade-up" style={{ animationDelay: '0.1s' }}>
              Immersive Content,<br /><span className="gradient-text">Unbreakable Security</span>
            </h1>
            <p className="hero-desc anim-fade-up" style={{ animationDelay: '0.2s' }}>
              Browse, select, and stream encrypted VR experiences directly to your registered headset.
              Content is decrypted and rendered in real-time by the Unity Player.
            </p>
            <div className="hero-actions anim-fade-up" style={{ animationDelay: '0.3s' }}>
              <button className="btn btn-primary" onClick={scrollToVideos}>▶ Browse Content</button>
              <button className="btn btn-outline" onClick={() => navigate('/headsets')}>
                🥽 Manage Headset
              </button>
            </div>
          </div>
          <div className="hero-stats">
            <SpotlightCard className="stat-card glass" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="stat-value">{videos.length}</div>
              <div className="stat-label">Total Videos</div>
            </SpotlightCard>
            <SpotlightCard className="stat-card glass" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="stat-value cyan">{registeredHeadsets.length}</div>
              <div className="stat-label">Active Headsets</div>
            </SpotlightCard>
            <SpotlightCard className="stat-card glass" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="stat-value purple">AES-256</div>
              <div className="stat-label">Encryption</div>
            </SpotlightCard>
          </div>
        </div>
      </div>

      {/* Video Library */}
      <div className="container" id="video-library-section" ref={libraryRef} style={{ paddingBottom: 60 }}>
        <div className="library-toolbar">
          <h2 className="section-title">Encrypted Library</h2>
          <div className="library-filters">
            {canUpload && (
              <button className="btn btn-outline" onClick={() => setShowUpload(true)}>
                + Upload .BIN
              </button>
            )}
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search videos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-input filter-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="training">Training</option>
              <option value="simulation">Simulation</option>
              <option value="experience">Experience</option>
              <option value="neural">Neural</option>
            </select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="video-grid">
            {filtered.map((v, i) => (
              <VideoCard
                key={v.id}
                video={v}
                index={i}
                onClick={id => setSelectedVideo(videos.find(x => x.id === id))}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No videos found</h3>
            <p>Try adjusting your search or filter.</p>
          </div>
        )}
      </div>

      {selectedVideo && (
        <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} />
      )}
    </PageTransition>
  );
}
