import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, QrCode, Link } from 'lucide-react';
import { getRoomInviteUrl } from '../utils/siteUrl';

export default function ShareModal({ roomCode, onClose }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const roomUrl = getRoomInviteUrl(roomCode);

  const copyText = async (text, onSuccess) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      onSuccess();
    } catch {
      window.prompt('Copy to clipboard:', text);
    }
  };

  const copyCode = () => {
    copyText(roomCode, () => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const copyLink = () => {
    copyText(roomUrl, () => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 pt-[env(safe-area-inset-top,0px)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        style={{ background: 'rgba(0,0,0,0.7)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl w-full max-w-sm overflow-hidden border card-glow"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <QrCode size={16} style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Invite to Room</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface)]"
              style={{ color: 'var(--muted)' }}
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-5 px-5 py-6">
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              Scan with any phone camera to join instantly
            </p>

            <div className="p-4 bg-white rounded-2xl shadow-lg" style={{ boxShadow: '0 10px 30px color-mix(in srgb, var(--primary) 15%, transparent)' }}>
              <QRCodeSVG
                value={roomUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#050508"
                level="H"
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Room Code</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono tracking-[0.2em] gradient-text">
                  {roomCode}
                </span>
                <button
                  onClick={copyCode}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  {copiedCode
                    ? <Check size={12} className="text-emerald-400" />
                    : <Copy size={12} style={{ color: 'var(--muted)' }} />
                  }
                </button>
              </div>
            </div>

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--faint)' }}>or share link</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, transparent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Link size={14} style={{ color: 'var(--muted)' }} className="flex-shrink-0" />
              <span className="flex-1 text-xs truncate text-left" style={{ color: 'var(--muted)' }}>{roomUrl}</span>
              {copiedLink
                ? <Check size={14} className="text-emerald-400 flex-shrink-0" />
                : <Copy size={14} className="flex-shrink-0 transition-colors group-hover:text-[var(--text)]" style={{ color: 'var(--muted)' }} />
              }
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
