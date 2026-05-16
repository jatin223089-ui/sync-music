import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { generateAvatarColor, getInitials } from '../utils/formatTime';

export default function Chat({ messages, onSend, myId, showTitle = true }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {showTitle && (
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--faint)' }}>
        <MessageSquare size={11} />
        Chat
        {messages.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
            {messages.length}
          </span>
        )}
      </h3>
      )}

      <div
        className={`flex-1 overflow-y-auto min-h-0 min-w-0 pr-1 -mr-1 ${
          messages.length === 0 ? 'flex flex-col flex-1 justify-start pt-6' : 'space-y-3'
        }`}
      >
        {messages.length === 0 ? (
          <div className="rounded-xl px-3 py-10 text-center border border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[var(--surface)]">
            <MessageSquare size={28} className="mx-auto mb-3 text-[var(--faint)] opacity-60" aria-hidden />
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>No messages yet</p>
            <p className="text-[11px] mt-2 leading-relaxed max-w-[14rem] mx-auto" style={{ color: 'var(--faint)' }}>Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === myId;
            const color = generateAvatarColor(msg.userName);
            return (
              <div key={msg.id || `${msg.userName}-${msg.timestamp}-${msg.message}`} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-black"
                  style={{ background: color }}
                >
                  {getInitials(msg.userName)}
                </div>
                <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] font-medium px-1" style={{ color: 'var(--faint)' }}>{msg.userName}</span>
                  )}
                  <div
                    className="px-3 py-2 rounded-2xl text-xs leading-relaxed"
                    style={
                      isMe
                        ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-d))', color: '#fff', borderTopRightRadius: '6px' }
                        : { background: 'var(--surface)', color: 'var(--text)', borderTopLeftRadius: '6px' }
                    }
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="ui-input flex-1 !py-2 !px-3 !text-xs rounded-xl"
          placeholder="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          maxLength={300}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:text-[#052e1f]"
        >
          <Send size={13} className="text-[#052e1f]" />
        </button>
      </div>
    </div>
  );
}
