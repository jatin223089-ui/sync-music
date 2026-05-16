import { Link } from 'react-router-dom';
import { ExternalLink, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/#features', label: 'Features' },
    { href: '/about', label: 'How it works' },
    { href: 'https://github.com', label: 'GitHub', external: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-[calc(0.65rem+env(safe-area-inset-top,0px))] px-3 sm:px-5 pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto nav-dock py-1.5 px-2 sm:px-3 transition-shadow duration-500">
        <div className="h-12 sm:h-[3.25rem] flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-40 blur-lg group-hover:opacity-70 transition-opacity duration-500" />
              <BrandLogo size={32} />
            </div>
            <span className="font-bold text-[16px] tracking-tight text-[var(--text)] truncate">
              Beat<span className="gradient-text">sync</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {links.map((l) =>
              l.external ? (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] transition-all"
                >
                  {l.label}
                  <ExternalLink size={11} className="opacity-55" />
                </a>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  className="px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] transition-all"
                >
                  {l.label}
                </a>
              )
            )}
            <Link
              to="/"
              className="btn-primary ml-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Start Listening →
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors border border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--text)_6%,transparent)_inset]"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-2 mx-auto max-w-6xl pointer-events-auto overflow-hidden rounded-2xl nav-dock"
          >
            <div className="px-3 py-3 space-y-1">
              {links.map((l) =>
                l.external ? (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-3 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,transparent)] transition-all"
                  >
                    {l.label} <ExternalLink size={11} />
                  </a>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    className="block w-full px-3 py-3 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,transparent)] transition-all"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                )
              )}
              <Link
                to="/"
                className="block btn-primary text-center w-full py-3 rounded-xl text-sm font-semibold mt-1"
                onClick={() => setOpen(false)}
              >
                Start Listening →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
