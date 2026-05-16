import { Crown, Wifi, MoreVertical } from 'lucide-react';
import { generateAvatarColor, getInitials } from '../utils/formatTime';

export default function ParticipantList({
  participants,
  myId,
  variant = 'default',
  headerIcon: HeaderIcon,
}) {
  const session = variant === 'session';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`flex items-center gap-1.5 uppercase tracking-wider ${
            session ? 'text-[10px] font-semibold text-white/40' : 'text-xs font-semibold'
          }`}
          style={!session ? { color: 'var(--faint)' } : undefined}
        >
          {session && HeaderIcon ? <HeaderIcon size={12} className="opacity-70" strokeWidth={2} /> : null}
          Connected users
        </h3>
        <div className="flex items-center gap-1.5">
          {!session && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              session ? 'bg-white/10 text-white/55' : ''
            }`}
            style={!session ? { background: 'var(--surface)', color: 'var(--muted)' } : undefined}
          >
            {participants.length}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {participants.map((p) => {
          const color = generateAvatarColor(p.name);
          const isMe = p.id === myId;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors border ${
                session ? 'border-white/[0.08]' : ''
              }`}
              style={{
                background: isMe
                  ? (session ? 'color-mix(in srgb, #1DB954 12%, transparent)' : 'color-mix(in srgb, var(--primary) 10%, transparent)')
                  : (session ? '#111' : 'var(--surface)'),
                borderColor: isMe
                  ? (session ? 'color-mix(in srgb, #1DB954 22%, transparent)' : 'color-mix(in srgb, var(--primary) 22%, transparent)')
                  : (session ? 'transparent' : 'transparent'),
              }}
            >
              <div className="relative shrink-0">
                <div
                  className={`rounded-full flex items-center justify-center flex-shrink-0 text-white font-black ${
                    session ? 'w-9 h-9 text-[11px]' : 'w-7 h-7 rounded-lg text-[10px]'
                  }`}
                  style={{ background: color, boxShadow: session ? undefined : `0 4px 12px ${color}30` }}
                >
                  {getInitials(p.name)}
                </div>
                {p.isHost && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black border border-white/15 flex items-center justify-center">
                    <Crown size={9} className="text-amber-400" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-xs font-semibold truncate ${
                      session && !isMe ? 'text-white/45' : ''
                    }`}
                    style={!session || isMe ? { color: isMe ? 'var(--text)' : 'var(--muted)' } : undefined}
                  >
                    {p.name}
                  </span>
                  {isMe && (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                        session ? 'bg-[#1DB954] text-black' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}
                    >
                      You
                    </span>
                  )}
                </div>
                {session && (
                  <p className="text-[10px] text-white/35 mt-0.5">Connected</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!session && (
                  <>
                    {p.isHost && <Crown size={12} className="text-amber-400" />}
                    <Wifi size={9} className="text-emerald-400" />
                  </>
                )}
                {session && (
                  <details className="relative">
                    <summary className="list-none cursor-pointer p-1 rounded-md hover:bg-white/10 text-white/35 [&::-webkit-details-marker]:hidden">
                      <MoreVertical size={16} strokeWidth={2} aria-hidden />
                      <span className="sr-only">Menu for {p.name}</span>
                    </summary>
                    <div className="absolute right-0 mt-1 z-20 min-w-[140px] rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl text-[11px] text-white/70">
                      <span className="block px-3 py-2 cursor-default">Participant options coming soon</span>
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
