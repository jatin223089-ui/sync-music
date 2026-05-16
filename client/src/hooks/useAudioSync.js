import { useEffect, useRef, useState, useCallback } from 'react';

function sameAudioUrl(loadedSrc, targetUrl) {
  if (!loadedSrc || !targetUrl) return false;
  if (loadedSrc === targetUrl) return true;
  try {
    const a = new URL(loadedSrc, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    const b = new URL(targetUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return a.pathname === b.pathname && a.search === b.search;
  } catch {
    return loadedSrc.endsWith(targetUrl) || targetUrl.endsWith(loadedSrc);
  }
}

/** Optional spatial mix: pan / distance from virtual stage at center (0.5, 0.5). */
/** @param {{ globalVolume?: number }} mix Host-controlled gain multiplier (0–1), default 1 */
export function useAudioSync(socket, roomCode, ntpOffset, spatial = {}, mix = {}) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const gainUserRef = useRef(null);
  const gainSpatialRef = useRef(null);
  const pannerRef = useRef(null);
  const sourceCreatedForRef = useRef(null);
  const animFrameRef = useRef(null);
  const progressRef = useRef(null);
  const ntpOffsetRef = useRef(ntpOffset);
  const volumeRef = useRef(0.8);
  const globalVolumeRef = useRef(1);
  const spatialEnabledRef = useRef(!!spatial.enabled);
  const spatialPositionRef = useRef(spatial.position ?? null);
  const scheduledPlayRef = useRef(null);
  const [playBlocked, setPlayBlocked] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [analyserData, setAnalyserData] = useState(new Uint8Array(64));

  useEffect(() => { ntpOffsetRef.current = ntpOffset; }, [ntpOffset]);
  useEffect(() => { spatialEnabledRef.current = !!spatial.enabled; }, [spatial.enabled]);
  useEffect(() => { spatialPositionRef.current = spatial.position ?? null; }, [spatial.position]);

  const applyUserGain = useCallback(() => {
    const gv = globalVolumeRef.current;
    const product = volumeRef.current * gv;
    if (gainUserRef.current) {
      gainUserRef.current.gain.value = product;
      if (audioRef.current) audioRef.current.volume = 1;
    } else if (audioRef.current) {
      audioRef.current.volume = product;
    }
  }, []);

  useEffect(() => {
    const raw = Number(mix.globalVolume);
    globalVolumeRef.current = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
    applyUserGain();
  }, [mix.globalVolume, applyUserGain]);

  const applySpatialToGraph = useCallback(() => {
    const gainSp = gainSpatialRef.current;
    if (!gainSp) return;
    const panner = pannerRef.current;
    if (!spatialEnabledRef.current) {
      if (panner) panner.pan.value = 0;
      gainSp.gain.value = 1;
      return;
    }
    const p = spatialPositionRef.current;
    const x = p && Number.isFinite(p.x) ? p.x : 0.5;
    const y = p && Number.isFinite(p.y) ? p.y : 0.5;
    const dx = 0.5 - x;
    if (panner) panner.pan.value = Math.max(-1, Math.min(1, dx * 2));
    const dist = Math.hypot(0.5 - x, 0.5 - y);
    gainSp.gain.value = Math.max(0.22, Math.min(1, 1 - dist * 0.92));
  }, []);

  useEffect(() => {
    applySpatialToGraph();
  }, [spatial.enabled, spatial.position?.x, spatial.position?.y, applySpatialToGraph]);

  const startAnalyserLoop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    const tick = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      setAnalyserData(new Uint8Array(data));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const setupAnalyser = useCallback((audio) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    if (sourceCreatedForRef.current !== audio) {
      try { sourceRef.current?.disconnect(); } catch { /* ignore */ }
      gainUserRef.current = null;
      gainSpatialRef.current = null;
      pannerRef.current = null;
      try {
        const source = ctx.createMediaElementSource(audio);
        const gainUser = ctx.createGain();
        const gainSpatial = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        gainUser.gain.value = volumeRef.current * globalVolumeRef.current;

        gainUserRef.current = gainUser;
        gainSpatialRef.current = gainSpatial;
        sourceRef.current = source;
        analyserRef.current = analyser;

        gainUser.connect(gainSpatial);

        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.value = 0;
          pannerRef.current = panner;
          gainSpatial.connect(panner);
          panner.connect(analyser);
        } else {
          gainSpatial.connect(analyser);
        }

        analyser.connect(ctx.destination);
        source.connect(gainUser);
        sourceCreatedForRef.current = audio;
        audio.volume = 1;
        applySpatialToGraph();
      } catch {
        // Element already has a source node attached — reuse existing graph if present
      }
    }

    if (analyserRef.current) startAnalyserLoop();
  }, [startAnalyserLoop, applySpatialToGraph]);

  const loadAudio = useCallback((src) => {
    if (!src) return Promise.resolve();
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
    }
    const audio = audioRef.current;
    if (sameAudioUrl(audio.src, src)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (scheduledPlayRef.current) {
        clearTimeout(scheduledPlayRef.current);
        scheduledPlayRef.current = null;
      }
      audio.pause();

      const done = () => {
        audio.removeEventListener('canplay', done);
        audio.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = () => {
        audio.removeEventListener('canplay', done);
        audio.removeEventListener('error', onErr);
        resolve();
      };

      audio.addEventListener('canplay', done, { once: true });
      audio.addEventListener('error', onErr, { once: true });
      audio.src = src;
      audio.onloadedmetadata = () => setDuration(audio.duration || 0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => setIsPlaying(false);
      setupAnalyser(audio);
      if (gainUserRef.current) {
        gainUserRef.current.gain.value = volumeRef.current * globalVolumeRef.current;
        audio.volume = 1;
      } else {
        audio.volume = volumeRef.current * globalVolumeRef.current;
      }
      try { audio.load(); } catch { /* ignore */ }
    });
  }, [setupAnalyser]);

  const applyServerTransport = useCallback((payload) => {
    const {
      isPlaying: serverPlaying,
      currentTime: serverCurrentTime,
      serverTime: sTime,
      startedAt,
    } = payload;
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (!serverPlaying && Number.isFinite(serverCurrentTime)) {
      if (Math.abs(audio.currentTime - serverCurrentTime) > 0.45) {
        audio.currentTime = Math.max(0, serverCurrentTime);
      }
    } else {
      const refTime = startedAt != null ? startedAt : sTime;
      if (refTime != null && Number.isFinite(serverCurrentTime)) {
        const estimatedPos = serverCurrentTime + (Date.now() + ntpOffsetRef.current - refTime) / 1000;
        if (Number.isFinite(estimatedPos) && Math.abs(audio.currentTime - estimatedPos) > 0.25) {
          audio.currentTime = Math.max(0, estimatedPos);
        }
      } else if (Number.isFinite(serverCurrentTime) && Math.abs(audio.currentTime - serverCurrentTime) > 0.45) {
        audio.currentTime = Math.max(0, serverCurrentTime);
      }
    }

    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (serverPlaying && audio.paused) {
      audio.play()
        .then(() => { setPlayBlocked(false); setIsPlaying(true); })
        .catch(() => { setPlayBlocked(true); });
    } else if (!serverPlaying && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback((serverTime) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    if (serverTime) {
      const delay = (serverTime - (Date.now() + ntpOffsetRef.current)) / 1000;
      if (delay > 0) {
        if (scheduledPlayRef.current) clearTimeout(scheduledPlayRef.current);
        scheduledPlayRef.current = setTimeout(() => {
          audio.play().then(() => setPlayBlocked(false)).catch(() => setPlayBlocked(true));
          setIsPlaying(true);
          scheduledPlayRef.current = null;
        }, delay * 1000);
        return;
      }
    }
    if (scheduledPlayRef.current) {
      clearTimeout(scheduledPlayRef.current);
      scheduledPlayRef.current = null;
    }
    audio.play().then(() => setPlayBlocked(false)).catch(() => setPlayBlocked(true));
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (scheduledPlayRef.current) {
      clearTimeout(scheduledPlayRef.current);
      scheduledPlayRef.current = null;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((v) => {
    const next = Math.max(0, Math.min(1, v));
    volumeRef.current = next;
    setVolumeState(next);
    applyUserGain();
  }, [applyUserGain]);

  const unlockRemotePlayback = useCallback(() => {
    setPlayBlocked(false);
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSync = (payload) => {
      const { currentTrack: ct } = payload;
      const nextUrl = ct?.url;
      const audio = audioRef.current;

      const run = () => {
        applyServerTransport(payload);
      };

      if (nextUrl && audio && !sameAudioUrl(audio.src, nextUrl)) {
        loadAudio(nextUrl).then(run);
        return;
      }
      if (!audio?.src && nextUrl) {
        loadAudio(nextUrl).then(run);
        return;
      }
      run();
    };

    socket.on('playback:sync', handleSync);
    return () => socket.off('playback:sync', handleSync);
  }, [socket, loadAudio, applyServerTransport]);

  useEffect(() => {
    progressRef.current = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 500);
    return () => clearInterval(progressRef.current);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (scheduledPlayRef.current) clearTimeout(scheduledPlayRef.current);
      audioRef.current?.pause();
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    analyserData,
    playBlocked,
    loadAudio,
    play,
    pause,
    seek,
    setVolume,
    unlockRemotePlayback,
  };
}
