import { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import {
  Music2, Plus, Play, Upload, X, Search, GripVertical, Minus, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBackendBaseUrl } from '../utils/siteUrl';
import { formatTime } from '../utils/formatTime';

const SPOTIFY_GREEN = '#1DB954';

function MiniEqualizer({ active }) {
  if (!active) return null;
  return (
    <span className="flex items-end justify-center gap-0.5 h-4 w-5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full animate-mobile-eq"
          style={{
            height: i % 2 === 0 ? '60%' : '100%',
            animationDelay: `${i * 120}ms`,
            backgroundColor: SPOTIFY_GREEN,
          }}
        />
      ))}
    </span>
  );
}

const Playlist = forwardRef(function Playlist(
  {
    playlist,
    currentTrackIndex,
    isHost,
    canControlPlayback,
    onAddTrack,
    onSelectTrack,
    addFormNonce = 0,
    variant = 'default',
    onRemoveTrack,
    playingDuration,
  },
  ref,
) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', artist: '', url: '' });
  const [tab, setTab] = useState('url');
  const [search, setSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [catalogNotice, setCatalogNotice] = useState(null);
  const [catalogDisclaimer, setCatalogDisclaimer] = useState(null);
  const fileRef = useRef(null);
  const searchRef = useRef(null);
  const lastAddNonce = useRef(null);

  const isMobile = variant === 'mobile';
  const canPickTrack = canControlPlayback ?? isHost;

  useEffect(() => {
    if (!isMobile) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile]);

  useEffect(() => {
    if (!isHost) return;
    if (lastAddNonce.current === null) {
      lastAddNonce.current = addFormNonce;
      return;
    }
    if (addFormNonce > lastAddNonce.current) {
      setAdding(true);
    }
    lastAddNonce.current = addFormNonce;
  }, [addFormNonce, isHost]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setCatalogResults([]);
      setCatalogLoading(false);
      setCatalogError(null);
      setCatalogNotice(null);
      setCatalogDisclaimer(null);
      return undefined;
    }

    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogNotice(null);
    setCatalogDisclaimer(null);

    let cancelled = false;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `${getBackendBaseUrl()}/api/music/search?q=${encodeURIComponent(q)}`,
          { signal: ac.signal },
        );
        let data = {};
        try {
          data = await res.json();
        } catch {
          /* ignore */
        }
        if (cancelled) return;
        if (!res.ok) {
          setCatalogResults([]);
          setCatalogDisclaimer(null);
          setCatalogError(data.error || 'Could not search catalog');
          return;
        }
        if (data.configured === false && typeof data.message === 'string') {
          setCatalogNotice(data.message);
        }
        if (typeof data.disclaimer === 'string') {
          setCatalogDisclaimer(data.disclaimer);
        } else {
          setCatalogDisclaimer(null);
        }
        setCatalogResults(Array.isArray(data.results) ? data.results : []);
      } catch (e) {
        if (cancelled) return;
        if (e?.name === 'AbortError') return;
        setCatalogResults([]);
        setCatalogDisclaimer(null);
        setCatalogError(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 380);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [search]);

  const addCatalogTrack = (item) => {
    onAddTrack({
      name: item.name,
      artist: item.artist,
      url: item.url,
      durationSeconds: item.durationSeconds,
      artwork: item.artwork || undefined,
      source: item.source || 'jamendo',
      isPreview: item.isPreview === true,
    });
  };

  const isHttpUrl = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAdd = () => {
    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();
    if (!trimmedName || !trimmedUrl) return;
    if (!isHttpUrl(trimmedUrl)) {
      window.alert('Please enter a valid public audio URL starting with http:// or https://');
      return;
    }
    onAddTrack({ name: trimmedName, artist: form.artist.trim() || 'Unknown Artist', url: trimmedUrl });
    setForm({ name: '', artist: '', url: '' });
    setAdding(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('audio', file);
      const response = await fetch(`${getBackendBaseUrl()}/api/upload`, {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (!data?.url || !isHttpUrl(data.url)) {
        throw new Error('Upload URL missing');
      }
      const name = file.name.replace(/\.[^/.]+$/, '');
      onAddTrack({ name: data.name || name, artist: 'Uploaded File', url: data.url });
      setAdding(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again or use a public URL.';
      window.alert(message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filteredPlaylist = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playlist.map((track, i) => ({ track, i }));
    return playlist
      .map((track, i) => ({ track, i }))
      .filter(({ track }) => {
        const hay = `${track.name || ''} ${track.artist || ''}`.toLowerCase();
        return hay.includes(q);
      });
  }, [playlist, search]);

  const trackDur = (track) => {
    const s = track?.durationSeconds ?? track?.duration;
    if (Number.isFinite(s) && s > 0) return formatTime(s);
    return '--:--';
  };

  return (
    <div
      ref={ref}
      className="flex flex-col h-full min-h-0 w-full min-w-0 scroll-mt-24"
      id="queue-panel-anchor"
    >
      {/* Search */}
      <div className={`relative w-full ${isMobile ? 'mb-2' : 'mb-3'}`}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--faint)] z-[1]" aria-hidden />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="What do you want to play?"
          className={`ui-input w-full bg-[var(--surface)] rounded-xl border-[color-mix(in_srgb,var(--border)_85%,transparent)] ${
            isMobile ? '!py-3 !pl-9 !pr-[4.25rem] !text-[13px]' : '!py-2.5 !pl-9 !pr-3 !text-sm'
          }`}
          autoComplete="off"
        />
        {isMobile && (
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono-ui text-[var(--faint)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[var(--bg)]"
            aria-hidden
          >
            ⌘K
          </kbd>
        )}
      </div>

      {isMobile && (
        <p className="font-mono-ui text-[10px] text-[var(--muted)] flex items-center gap-1.5 mb-3 tracking-wide">
          <Zap size={11} className="text-[var(--primary)] shrink-0" strokeWidth={2.5} aria-hidden />
          [EXPERIMENTAL FREE BETA]
        </p>
      )}

      {!isMobile && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--faint)' }}>
          Search uses Jamendo — add CC-licensed tracks from results (full streams). You can also upload audio or paste a direct stream URL. Queue below still filters by this search text.
        </p>
      )}

      {search.trim().length >= 2 && (
        <div
          className={`mb-3 rounded-xl border overflow-hidden flex flex-col ${isMobile ? 'max-h-[38vh]' : 'max-h-64'}`}
          style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 92%, transparent)' }}
        >
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b shrink-0" style={{ borderColor: 'color-mix(in srgb, var(--border) 55%, transparent)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>Catalog results</span>
            <span className="text-[10px] font-mono-ui" style={{ color: 'var(--muted)' }}>Jamendo</span>
          </div>
          {catalogDisclaimer && (
            <p className="text-[10px] px-3 py-2 leading-snug border-b" style={{ borderColor: 'color-mix(in srgb, var(--border) 55%, transparent)', color: 'var(--muted)', background: 'var(--bg)' }}>
              {catalogDisclaimer}
            </p>
          )}
          <div className="overflow-y-auto min-h-0 flex-1 p-2 space-y-1">
            {catalogLoading && (
              <p className="text-[11px] px-2 py-3 text-center animate-pulse" style={{ color: 'var(--muted)' }}>Searching…</p>
            )}
            {!catalogLoading && catalogNotice && (
              <p className="text-[11px] px-2 py-2 leading-snug rounded-lg" style={{ color: 'var(--muted)', background: 'var(--bg)' }}>{catalogNotice}</p>
            )}
            {!catalogLoading && catalogError && (
              <p className="text-[11px] px-2 py-2 text-red-400">{catalogError}</p>
            )}
            {!catalogLoading && !catalogError && catalogResults.length === 0 && !catalogNotice && (
              <p className="text-[11px] px-2 py-3 text-center" style={{ color: 'var(--muted)' }}>No tracks found — try other keywords</p>
            )}
            {!catalogLoading && catalogResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-lg min-w-0"
                style={{ background: 'var(--surface)' }}
              >
                {item.artwork ? (
                  <img src={item.artwork} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 bg-black/20" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                    <Music2 size={16} style={{ color: 'var(--faint)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                  <p className="text-[10px] truncate flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                    {item.artist}
                    {item.isPreview ? (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1 py-px rounded" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}>30s</span>
                    ) : item.source === 'jamendo' ? (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1 py-px rounded" style={{ background: 'color-mix(in srgb, var(--accent-warm) 18%, transparent)', color: 'var(--accent-warm)' }}>CC</span>
                    ) : null}
                  </p>
                </div>
                <span className="text-[10px] tabular-nums shrink-0 w-10 text-right" style={{ color: 'var(--faint)' }}>
                  {item.durationSeconds > 0 ? formatTime(item.durationSeconds) : '—'}
                </span>
                {isHost ? (
                  <button
                    type="button"
                    aria-label={`Add ${item.name} to queue`}
                    onClick={() => addCatalogTrack(item)}
                    className="shrink-0 min-h-9 min-w-9 h-9 w-9 rounded-lg flex items-center justify-center transition-colors active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-d))',
                      color: '#052e1f',
                    }}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                ) : (
                  <span className="text-[9px] font-semibold uppercase shrink-0 w-14 text-center" style={{ color: 'var(--faint)' }}>Host only</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMobile && (
      <div className="flex flex-col gap-2.5 mb-3 w-full min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0 w-full flex-nowrap">
          <h3
            className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 min-w-0 flex-1"
            style={{ color: 'var(--faint)' }}
          >
            <span className="truncate">Queue</span>
            {playlist.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                {playlist.length}
              </span>
            )}
          </h3>
          {isHost && (
            <button
              type="button"
              aria-label={adding ? 'Close add track' : 'Add track to queue'}
              onClick={() => setAdding(!adding)}
              className="hidden lg:flex min-h-[40px] min-w-[40px] h-10 w-10 shrink-0 rounded-xl items-center justify-center transition-all active:scale-95"
              style={{
                background: adding ? 'var(--surface)' : 'linear-gradient(135deg, var(--primary), var(--primary-d))',
                boxShadow: adding ? 'none' : '0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent)',
              }}
            >
              {adding
                ? <X size={16} style={{ color: 'var(--muted)' }} />
                : <Plus size={18} className="text-[#052e1f]" strokeWidth={2.5} />
              }
            </button>
          )}
        </div>
        {isHost && (
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className="lg:hidden w-full min-h-[48px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition-colors"
            style={{
              color: adding ? 'var(--muted)' : '#052e1f',
              background: adding ? 'var(--surface)' : 'linear-gradient(135deg, var(--primary), var(--primary-d))',
              borderColor: adding ? 'var(--border)' : 'transparent',
              boxShadow: adding ? 'none' : '0 6px 20px color-mix(in srgb, var(--primary) 22%, transparent)',
            }}
          >
            {adding ? (
              <>Close add track</>
            ) : (
              <>
                <Plus size={18} strokeWidth={2.5} />
                Add music to queue
              </>
            )}
          </button>
        )}
      </div>
      )}

      {isMobile && isHost && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            aria-label={adding ? 'Close add music' : 'Add music'}
            className="min-h-11 min-w-11 h-11 w-11 shrink-0 rounded-xl flex items-center justify-center border transition-all active:scale-95"
            style={{
              borderColor: adding ? 'var(--border)' : 'color-mix(in srgb, var(--primary) 35%, transparent)',
              background: adding ? 'var(--surface)' : 'color-mix(in srgb, var(--primary) 12%, transparent)',
              color: 'var(--primary)',
            }}
          >
            {adding ? <X size={18} /> : <Plus size={20} strokeWidth={2.5} />}
          </button>
        </div>
      )}

      {/* Add track form */}
      <AnimatePresence>
        {adding && isHost && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl space-y-2 surface-3d border-0">
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-2)' }}>
                {['url', 'file'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className="flex-1 text-xs py-1.5 rounded-md font-semibold transition-all capitalize"
                    style={{
                      background: tab === t ? 'linear-gradient(135deg, var(--primary), var(--primary-d))' : 'transparent',
                      color: tab === t ? '#052e1f' : 'var(--muted)',
                    }}
                  >
                    {t === 'url' ? 'From URL' : 'Upload File'}
                  </button>
                ))}
              </div>

              {tab === 'url' ? (
                <>
                  <input
                    className="ui-input !py-2 !px-3 !text-xs rounded-lg"
                    placeholder="Track name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="ui-input !py-2 !px-3 !text-xs rounded-lg"
                    placeholder="Artist"
                    value={form.artist}
                    onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  />
                  <input
                    className="ui-input !py-2 !px-3 !text-xs rounded-lg"
                    placeholder="Audio URL (.mp3, .ogg…)"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!form.name.trim() || !form.url.trim()}
                    className="btn-primary w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Queue
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-5 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 transition-all"
                  style={{ borderColor: 'var(--border-2)', color: 'var(--muted)' }}
                >
                  <Upload size={18} />
                  <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Click to upload audio'}</span>
                  <span className="text-[10px]" style={{ color: 'var(--faint)' }}>mp3, ogg, wav, m4a</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track list */}
      <div
        className={`flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 ${
          !isMobile && playlist.length === 0 ? 'flex flex-col justify-center' : ''
        } ${isMobile ? 'space-y-0 divide-y divide-[color-mix(in_srgb,var(--border)_45%,transparent)]' : 'space-y-1'}`}
      >
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 text-center w-full py-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
              <Music2 size={18} style={{ color: 'var(--faint)' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>No tracks yet</p>
              {isHost && <p className="text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>{isMobile ? 'Tap + to add' : 'Tap + to add a track'}</p>}
            </div>
          </div>
        ) : filteredPlaylist.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>No matches</p>
            <p className="text-[11px]" style={{ color: 'var(--faint)' }}>Try a different search</p>
          </div>
        ) : isMobile ? (
          filteredPlaylist.map(({ track, i }) => {
            const active = i === currentTrackIndex;
            const line = `${track.artist || 'Unknown'} — ${track.name || 'Untitled'}`;
            return (
              <div
                key={track.id || i}
                className="flex items-center gap-1.5 py-2.5 pl-0 pr-1 min-w-0"
              >
                <GripVertical size={14} className="shrink-0 text-[var(--faint)] opacity-35 pointer-events-none" aria-hidden />
                <button
                  type="button"
                  onClick={() => canPickTrack && onSelectTrack(i)}
                  disabled={!canPickTrack}
                  className="flex flex-1 min-w-0 items-center gap-2 text-left disabled:cursor-default py-0.5"
                >
                  <div className="w-7 flex justify-center shrink-0">
                    {active ? (
                      <MiniEqualizer active />
                    ) : (
                      <span className="text-[11px] font-semibold tabular-nums text-[var(--muted)]">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12px] leading-snug font-medium flex items-center gap-1.5 min-w-0 ${active ? '' : 'text-[var(--text)]'}`}
                      style={active ? { color: SPOTIFY_GREEN } : undefined}
                    >
                      <span className="truncate">{line}</span>
                      {track.isPreview ? (
                        <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1 py-px rounded" style={{ background: 'color-mix(in srgb, var(--primary) 18%, transparent)', color: active ? SPOTIFY_GREEN : 'var(--primary)' }}>30s</span>
                      ) : null}
                    </p>
                  </div>
                  <span className={`text-[11px] tabular-nums shrink-0 w-11 text-right ${active ? '' : 'text-[var(--muted)]'}`} style={active ? { color: SPOTIFY_GREEN } : undefined}>
                    {active && Number.isFinite(playingDuration) && playingDuration > 0 ? formatTime(playingDuration) : trackDur(track)}
                  </span>
                </button>
                {isHost && onRemoveTrack && (
                  <button
                    type="button"
                    aria-label={`Remove ${track.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(i);
                    }}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <Minus size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          filteredPlaylist.map(({ track, i }) => {
            const active = i === currentTrackIndex;
            return (
              <button
                key={track.id || i}
                type="button"
                onClick={() => canPickTrack && onSelectTrack(i)}
                disabled={!canPickTrack}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group disabled:cursor-default border"
                style={{
                  background: active ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent',
                  borderColor: active ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active && canPickTrack) e.currentTarget.style.background = 'var(--surface)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: active ? 'linear-gradient(135deg, var(--primary), var(--primary-d))' : 'var(--surface)',
                    boxShadow: active ? '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)' : 'none',
                  }}
                >
                  {active
                    ? <Play size={11} fill="white" className="text-white ml-0.5" strokeWidth={0} />
                    : <span className="text-[10px] font-semibold" style={{ color: 'var(--faint)' }}>{i + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate flex items-center gap-1.5" style={{ color: active ? 'var(--primary)' : 'var(--muted)' }}>
                    <span className="truncate">{track.name}</span>
                    {track.isPreview ? (
                      <span className="shrink-0 text-[8px] font-bold uppercase px-1 py-px rounded" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}>30s</span>
                    ) : null}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--faint)' }}>{track.artist}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export default Playlist;
