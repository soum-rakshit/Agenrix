import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserPlus, UserCog, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { name: 'Data Explorer', path: '/explorer', icon: LayoutDashboard },
    { name: 'Add Agent', path: '/add', icon: UserPlus },
    { name: 'Update Agent', path: '/update', icon: UserCog },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col transition-colors duration-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Agenrix</h1>
        <p className="text-sm text-foreground/60 mt-1">Audit & Management</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/80 hover:bg-foreground/5 hover:text-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/80 transition-colors text-sm font-medium"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}
