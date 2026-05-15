import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'syncmusic_pwa_install_dismissed';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [dismissed]);

  useEffect(() => {
    if (isStandalone() || dismissed || deferredPrompt) return;
    if (isIos()) {
      const t = setTimeout(() => setShowIosHint(true), 2500);
      return () => clearTimeout(t);
    }
  }, [dismissed, deferredPrompt]);

  const dismiss = () => {
    setDismissed(true);
    setShowIosHint(false);
    setDeferredPrompt(null);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  const visible = !isStandalone() && !dismissed && (deferredPrompt || showIosHint);
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed z-[60] left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm"
        style={{
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="relative rounded-2xl border p-4 shadow-2xl backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-2) 92%, transparent)',
            borderColor: 'color-mix(in srgb, var(--primary) 30%, var(--border))',
            boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--muted)' }}
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>

          <div className="flex gap-3 pr-8">
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-d))',
              }}
            >
              <Download size={20} className="text-white" />
            </motion.div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[var(--text)]">Install sync.music</p>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                {deferredPrompt
                  ? 'Add to your home screen for a full-screen app experience.'
                  : 'On iPhone: tap Share, then Add to Home Screen.'}
              </p>
            </div>
          </div>

          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              className="btn-primary w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Install app
            </button>
          ) : (
            <div
              className="mt-4 flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
              style={{ background: 'var(--surface)', color: 'var(--muted)' }}
            >
              <Share size={14} className="shrink-0" style={{ color: 'var(--primary)' }} />
              <span>Share, then Add to Home Screen</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
