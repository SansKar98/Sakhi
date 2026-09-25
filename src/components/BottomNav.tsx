// no default React import required with the new JSX runtime
import { Shield, Map, AlertCircle, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Map routes to active tab IDs for styling
  const getActiveTab = (pathname: string) => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/map')) return 'map';
    if (pathname.startsWith('/reports')) return 'reports';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs = [
    { id: 'home', path: '/', icon: Shield, label: 'Guardian' },
    { id: 'map', path: '/map', icon: Map, label: 'Navigation' },
    { id: 'reports', path: '/reports', icon: AlertCircle, label: 'Reports' },
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="fixed bottom-6 left-4 right-4 glass-panel px-2 py-4 flex justify-around items-center z-50 border border-white/10 shadow-neon-cyan/20">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`
              flex flex-col items-center gap-1 transition-all duration-300 relative
              ${isActive ? 'text-neon-cyan-500 -translate-y-1' : 'text-gray-400 hover:text-gray-200'}
            `}
          >
            <div className={`
                p-2 rounded-full transition-all duration-300
                ${isActive ? 'bg-neon-cyan-500/20 shadow-[0_0_15px_rgba(0,225,255,0.3)]' : 'bg-transparent'}
            `}>
              <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>

            {isActive && (
              <span className="text-[10px] font-black uppercase tracking-tighter absolute -bottom-5 text-neon-cyan-400 drop-shadow-[0_0_5px_rgba(0,225,255,0.8)]">
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
