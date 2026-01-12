import React from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Trash2, 
  Layers, 
  Share2,
  WifiOff
} from 'lucide-react';
import { TaskStatus } from '../types';

interface SidebarProps {
  currentFilter: string;
  setFilter: (filter: string) => void;
  dbAddress: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentFilter, setFilter, dbAddress }) => {
  
  const navItems = [
    { id: TaskStatus.INBOX, label: 'Inbox', icon: <Inbox size={20} /> },
    { id: TaskStatus.NEXT, label: 'Next Actions', icon: <CheckCircle2 size={20} /> },
    { id: TaskStatus.WAITING, label: 'Waiting For', icon: <Clock size={20} /> },
    { id: TaskStatus.SOMEDAY, label: 'Someday/Maybe', icon: <Calendar size={20} /> },
    { id: TaskStatus.DONE, label: 'Logbook', icon: <Layers size={20} /> },
    { id: TaskStatus.TRASH, label: 'Trash', icon: <Trash2 size={20} /> },
  ];

  const isLocalMode = dbAddress && dbAddress.startsWith('local-mode');

  const copyAddress = () => {
    if (dbAddress && !isLocalMode) {
      navigator.clipboard.writeText(dbAddress);
      alert("Database address copied! Share this with another peer to sync.");
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-full flex flex-col border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="text-white" size={20} />
          </div>
          PeerGTD
        </h1>
        <p className="text-xs text-slate-500 mt-2">Decentralized & Local-First</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentFilter === item.id 
                ? 'bg-blue-600/10 text-blue-400' 
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={`rounded-lg p-3 ${isLocalMode ? 'bg-amber-900/20 border border-amber-900/50' : 'bg-slate-800/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${isLocalMode ? 'text-amber-500' : 'text-slate-400'}`}>
              {isLocalMode ? 'LOCAL MODE' : 'SYNC ID'}
            </span>
            {!isLocalMode && (
              <button onClick={copyAddress} className="text-slate-400 hover:text-white transition-colors" title="Copy Address">
                <Share2 size={14} />
              </button>
            )}
          </div>
          
          {isLocalMode ? (
             <div className="flex items-center gap-2 text-xs text-amber-600/80">
                <WifiOff size={12} />
                <span>P2P Unavailable</span>
             </div>
          ) : (
            <code className="block text-[10px] text-slate-500 break-all font-mono leading-tight">
                {dbAddress ? `${dbAddress.slice(0, 24)}...` : 'Initializing...'}
            </code>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;