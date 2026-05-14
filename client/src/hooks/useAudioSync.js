import { useEffect, useRef, useState, useCallback } from 'react';

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
      try { sourceRef.current?.disconnect(); } catch {}
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
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
    }
    const audio = audioRef.current;
    if (scheduledPlayRef.current) {
      clearTimeout(scheduledPlayRef.current);
      scheduledPlayRef.current = null;
    }
    audio.pause();
    audio.src = src;
    audio.volume = volumeRef.current;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => setIsPlaying(false);
    setupAnalyser(audio);
  }, [setupAnalyser]);

  const play = useCallback((serverTime) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (serverTime) {
      const delay = (serverTime - (Date.now() + ntpOffsetRef.current)) / 1000;
      if (delay > 0) {
        if (scheduledPlayRef.current) {
          clearTimeout(scheduledPlayRef.current);
        }
        scheduledPlayRef.current = setTimeout(() => {
          audio.play().catch(() => {});
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
    audio.play().catch(() => {});
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

  // Sync events from server
  useEffect(() => {
    if (!socket) return;

    const handleSync = ({ isPlaying: serverPlaying, currentTime: serverCurrentTime, serverTime: sTime }) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (sTime) {
        const estimatedPos = serverCurrentTime + (Date.now() + ntpOffsetRef.current - sTime) / 1000;
        if (Math.abs(audio.currentTime - estimatedPos) > 0.5) {
          audio.currentTime = Math.max(0, estimatedPos);
        }
      }
      if (serverPlaying && audio.paused) {
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else if (!serverPlaying && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    socket.on('playback:sync', handleSync);
    return () => socket.off('playback:sync', handleSync);
  }, [socket]);

  // Progress update interval
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
      if (scheduledPlayRef.current) {
        clearTimeout(scheduledPlayRef.current);
      }
      audioRef.current?.pause();
    };
  }, []);

  return { audioRef, isPlaying, currentTime, duration, volume, analyserData, loadAudio, play, pause, seek, setVolume };
}
