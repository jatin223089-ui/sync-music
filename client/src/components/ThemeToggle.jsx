import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ size = 'md' }) {
  const { isDark, toggle } = useTheme();

  const dims = size === 'sm'
    ? { btn: 'w-8 h-8', icon: 13 }
    : { btn: 'w-9 h-9', icon: 15 };

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`${dims.btn} relative rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/40 flex items-center justify-center transition-all overflow-hidden group`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1 }}
            exit   ={{ opacity: 0, rotate: 90,  scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon size={dims.icon} className="text-[#C084FC]" strokeWidth={2} />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 90,  scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1 }}
            exit   ={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun size={dims.icon} className="text-amber-500" strokeWidth={2} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Subtle hover glow */}
      <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[var(--primary)]/8 to-transparent" />
    </button>
  );
}
