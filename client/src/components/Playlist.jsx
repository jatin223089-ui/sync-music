import { useState, useRef, useEffect } from 'react';
import { Music2, Plus, Play, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBackendBaseUrl } from '../utils/siteUrl';

export default function Playlist({ playlist, currentTrackIndex, isHost, onAddTrack, onSelectTrack, addFormNonce = 0 }) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', artist: '', url: '' });
  const [tab, setTab] = useState('url');
  const fileRef = useRef(null);
  const lastAddNonce = useRef(null);

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

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0">
      <div className="flex flex-col gap-2.5 mb-3 w-full min-w-0 pl-0.5 pr-1">
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
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
                : <Plus size={18} className="text-white" strokeWidth={2.5} />
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
              color: adding ? 'var(--muted)' : '#fff',
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

      {/* Add track form */}
      <AnimatePresence>
        {adding && isHost && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border space-y-2"
              style={{
                background: 'color-mix(in srgb, var(--primary) 4%, var(--surface))',
                borderColor: 'color-mix(in srgb, var(--primary) 18%, var(--border))',
              }}
            >
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-2)' }}>
                {['url', 'file'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-1 text-xs py-1.5 rounded-md font-semibold transition-all capitalize"
                    style={{
                      background: tab === t ? 'linear-gradient(135deg, var(--primary), var(--primary-d))' : 'transparent',
                      color: tab === t ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {t === 'url' ? 'From URL' : 'Upload File'}
                  </button>
                ))}
              </div>

              {tab === 'url' ? (
                <>
                  <input
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all border"
                    style={{ background: 'var(--bg-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    placeholder="Track name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all border"
                    style={{ background: 'var(--bg-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    placeholder="Artist"
                    value={form.artist}
                    onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none transition-all border"
                    style={{ background: 'var(--bg-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                    placeholder="Audio URL (.mp3, .ogg…)"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!form.name.trim() || !form.url.trim()}
                    className="btn-primary w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add to Queue
                  </button>
                </>
              ) : (
                <button
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
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1 -mr-1">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
              <Music2 size={18} style={{ color: 'var(--faint)' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>No tracks yet</p>
              {isHost && <p className="text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>Tap + to add a track</p>}
            </div>
          </div>
        ) : (
          playlist.map((track, i) => {
            const active = i === currentTrackIndex;
            return (
              <button
                key={track.id || i}
                onClick={() => isHost && onSelectTrack(i)}
                disabled={!isHost}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group disabled:cursor-default border"
                style={{
                  background: active ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'transparent',
                  borderColor: active ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active && isHost) e.currentTarget.style.background = 'var(--surface)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
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
                  <p className="text-xs font-semibold truncate" style={{ color: active ? 'var(--text)' : 'var(--muted)' }}>
                    {track.name}
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
}
