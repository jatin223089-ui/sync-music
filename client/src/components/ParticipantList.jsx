import { Crown, Wifi } from 'lucide-react';
import { generateAvatarColor, getInitials } from '../utils/formatTime';

export default function ParticipantList({ participants, myId }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>Listeners</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors border"
              style={{
                background: isMe ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface)',
                borderColor: isMe ? 'color-mix(in srgb, var(--primary) 22%, transparent)' : 'transparent',
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-black"
                style={{ background: color, boxShadow: `0 4px 12px ${color}30` }}
              >
                {getInitials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate" style={{ color: isMe ? 'var(--text)' : 'var(--muted)' }}>
                    {p.name}
                  </span>
                  {isMe && <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>You</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {p.isHost && <Crown size={12} className="text-amber-400" />}
                <Wifi size={9} className="text-emerald-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
