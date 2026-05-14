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

export function useAudioSync(socket, roomCode, ntpOffset) {
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const sourceCreatedForRef = useRef(null);
  const animFrameRef = useRef(null);
  const progressRef = useRef(null);
  const ntpOffsetRef = useRef(ntpOffset);
  const volumeRef = useRef(0.8);
  const scheduledPlayRef = useRef(null);
  const [playBlocked, setPlayBlocked] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [analyserData, setAnalyserData] = useState(new Uint8Array(64));

  useEffect(() => { ntpOffsetRef.current = ntpOffset; }, [ntpOffset]);

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
      try {
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
        analyserRef.current = analyser;
        sourceCreatedForRef.current = audio;
      } catch {
        // Element already has a source node attached — reuse existing
      }
    }

    if (analyserRef.current) startAnalyserLoop();
  }, [startAnalyserLoop]);

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
      audio.volume = volumeRef.current;
      audio.onloadedmetadata = () => setDuration(audio.duration || 0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => setIsPlaying(false);
      setupAnalyser(audio);
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
    volumeRef.current = v;
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

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
