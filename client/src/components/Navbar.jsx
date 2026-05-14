import { Link } from 'react-router-dom';
import { ExternalLink, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/#features', label: 'Features' },
    { href: '/about', label: 'How it works' },
    { href: 'https://github.com', label: 'GitHub', external: true },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass border-b shadow-[0_1px_40px_rgba(0,0,0,0.15)]'
          : 'bg-transparent'
      }`}
      style={{ borderColor: scrolled ? 'var(--border)' : 'transparent' }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] opacity-70 blur-md group-hover:opacity-100 transition-opacity" />
            <BrandLogo size={32} />
          </div>
          <span className="font-extrabold text-[17px] tracking-tight text-[var(--text)]">
            sync<span className="gradient-text">.music</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
              >
                {l.label}
                <ExternalLink size={11} className="opacity-60" />
              </a>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="px-4 py-2 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
              >
                {l.label}
              </a>
            )
          )}
          <div className="w-px h-5 bg-[var(--border)] mx-2" />
          <ThemeToggle />
          <Link
            to="/"
            className="btn-primary ml-1 px-5 py-2 rounded-xl text-sm font-semibold"
          >
            Start Listening →
          </Link>
        </div>

        {/* Mobile burger */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden glass border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 space-y-1">
              {links.map((l) =>
                l.external ? (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                  >
                    {l.label} <ExternalLink size={11} />
                  </a>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    className="block w-full px-4 py-3 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                )
              )}
              <Link
                to="/"
                className="block btn-primary text-center w-full py-3 rounded-xl text-sm font-semibold mt-2"
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
