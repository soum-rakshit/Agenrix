import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };



  return (
    <header className="h-20 bg-[#454545] dark:bg-black border-b border-border flex items-center justify-between px-6 transition-colors duration-200 shrink-0">
      <div className="flex items-center gap-6">
        <a href="https://www.agenrix.com/" target="_blank" rel="noopener noreferrer" className="flex items-center">
          <img src="/agenrix-logo-no-tagline-transparent.svg" alt="Agenrix Logo" className="scale-65" />
        </a>
      </div>

      <div className="flex items-center">
        <button
          onClick={toggleTheme}
          className="relative w-10 h-10 rounded-full hover:bg-white/10 text-white/80 transition-colors flex items-center justify-center overflow-hidden"
          aria-label="Toggle Theme"
        >
          <div className={`absolute transition-all duration-300 transform ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
            <Moon className="w-5 h-5" />
          </div>
          <div className={`absolute transition-all duration-300 transform ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}>
            <Sun className="w-5 h-5" />
          </div>
        </button>
      </div>
    </header>
  );
}
