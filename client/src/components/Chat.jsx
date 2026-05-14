import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { generateAvatarColor, getInitials } from '../utils/formatTime';

export default function Chat({ messages, onSend, myId }) {
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
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--faint)' }}>
        <MessageSquare size={11} />
        Chat
        {messages.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
            {messages.length}
          </span>
        )}
      </h3>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 -mr-1">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--surface)' }}>
              <MessageSquare size={16} style={{ color: 'var(--faint)' }} />
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>No messages yet</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--faint)' }}>Say hi to the room</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === myId || msg.userName === messages.find(m => m.userId === myId)?.userName;
            const color = generateAvatarColor(msg.userName);
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
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
          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none transition-all border"
          style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}
          placeholder="Say something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          maxLength={300}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} className="text-white" />
        </button>
      </div>
    </div>
  );
}
