/* ================================================================
   Unity Stream — Video Library
   Add `src` to point to a real equirectangular 360° video file.
   The three local files cycle across the 6 entries.
================================================================ */

export const VIDEOS = [
  {
    id: 'v1',
    title: 'Encrypted Training Module Alpha',
    category: 'training',
    duration: '42:18',
    resolution: '8K VR',
    size: '14.2 GB',
    thumb: '/thumb1.png',
    src: '/vr_4k_hq.mp4',          // ← real 360° equirectangular video
    desc: 'Advanced tactical VR training simulation with encrypted environment data. Used by ARDS field operatives for mission preparation.',
  },
  {
    id: 'v2',
    title: 'Deep Space VR Portal Experience',
    category: 'experience',
    duration: '28:50',
    resolution: '6K VR',
    size: '9.8 GB',
    thumb: '/thumb2.png',
    src: '/vr_4k.mp4',
    desc: 'An immersive journey through a photorealistic deep-space wormhole. Fully encrypted stream — real-time decryption via Unity Player.',
  },
  {
    id: 'v3',
    title: 'CyberSec Matrix Visualization',
    category: 'simulation',
    duration: '56:04',
    resolution: '4K VR',
    size: '6.5 GB',
    thumb: '/thumb3.png',
    src: '/vr_video.mp4',
    desc: 'Binary matrix data stream visualization for cybersecurity analysis sessions. AES-256 encrypted .bin file with live decryption pipeline.',
  },
  {
    id: 'v4',
    title: 'Global Network Threat Map',
    category: 'simulation',
    duration: '35:22',
    resolution: '8K VR',
    size: '18.4 GB',
    thumb: '/thumb4.png',
    src: '/vr_4k_hq.mp4',
    desc: 'Real-time holographic threat intelligence map covering global network nodes. Classified encrypted stream with session-bound decryption.',
  },
  {
    id: 'v5',
    title: 'Alien World Exploration: Aurora',
    category: 'experience',
    duration: '61:10',
    resolution: '8K VR',
    size: '22.1 GB',
    thumb: '/thumb5.png',
    src: '/vr_4k.mp4',
    desc: 'Crystal-covered alien landscapes with aurora-lit skies. Encoded with next-gen VR encryption for an ultra-immersive experience.',
  },
  {
    id: 'v6',
    title: 'Neural Interface Calibration Session',
    category: 'neural',
    duration: '19:45',
    resolution: '4K VR',
    size: '4.9 GB',
    thumb: '/thumb6.png',
    src: '/vr_video.mp4',
    desc: 'Precise neural interface calibration protocol in VR. Required for ARDS VR headset synchronization. Encrypted and session-locked.',
  },
];
