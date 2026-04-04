import React from 'react';
import SpotlightCard from './SpotlightCard.jsx';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function VideoCard({ video, index, onClick }) {
  return (
    <SpotlightCard
      className="video-card"
      onClick={() => onClick(video.id)}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClick(video.id)}
        role="button"
        style={{ outline: "none" }}
      >
      <div className="video-thumb-wrap">
        <img
          className="video-thumb"
          src={video.thumb}
          alt={video.title}
          loading="lazy"
          draggable="false"
        />
        <div className="video-lock-badge">Encrypted</div>
        <div className="video-play-overlay">
          <div className="play-btn-circle">▶</div>
        </div>
      </div>
      <div className="video-card-body">
        <h3 className="video-card-title">{video.title}</h3>
        <div className="video-card-meta">
          <span className="badge">{capitalize(video.category)}</span>
          <span className="badge">VR</span>
          {video.binFileName && (
            <span className="badge badge-gold" title={video.binFileName}>
              .{video.binFileName.split('.').pop().toUpperCase()}
            </span>
          )}
        </div>
        <p className="video-card-desc">{video.desc}</p>
        <div className="video-card-footer">
          <span className="video-card-duration">⏱ {video.duration}</span>
          <span className="video-card-resolution">{video.resolution}</span>
        </div>
      </div>
      </div>
    </SpotlightCard>
  );
}
