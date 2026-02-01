
import React from 'react';
import { AppConfig } from '../types';
import { Icons } from '../constants';

interface SidebarProps {
  apps: AppConfig[];
  currentAppId: string | null;
  onSelectApp: (id: string) => void;
  onNewApp: () => void;
  onDeleteApp: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  apps, 
  currentAppId, 
  onSelectApp, 
  onNewApp,
  onDeleteApp,
  isOpen,
  onToggle
}) => {
  return (
    <div className={`bg-vscode-sidebar border-r border-vscode-border h-screen flex flex-col shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-12'}`}>
      <div className={`p-3 border-b border-vscode-border flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen ? (
          <h1 className="text-sm font-medium text-white flex items-center gap-2">
            <span className="text-lg">⚡</span>
            Architect
          </h1>
        ) : (
          <span className="text-lg">⚡</span>
        )}
        <button onClick={onToggle} className="p-1.5 hover:bg-vscode-hover text-vscode-textMuted hover:text-white rounded transition-colors">
          <Icons.PanelLeft />
        </button>
      </div>
      
      <div className="p-3">
        <button 
          onClick={onNewApp}
          className={`w-full flex items-center justify-center gap-2 bg-vscode-accent hover:bg-vscode-accentHover text-white font-medium py-2 rounded transition-all ${!isOpen ? 'px-0 h-9 w-9 mx-auto' : 'px-3'}`}
          title="Create New App"
        >
          <Icons.Plus />
          {isOpen && "New App"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {isOpen && (
          <div className="text-xs font-medium text-vscode-textMuted px-2 py-2 uppercase tracking-wide">
            Workspace Apps
          </div>
        )}
        {apps.length === 0 && isOpen && (
          <div className="p-4 text-center text-sm text-vscode-textMuted">
            No apps yet
          </div>
        )}
        {apps.map((app) => (
          <div 
            key={app.id}
            className={`group relative flex items-center gap-3 cursor-pointer transition-colors rounded ${
              currentAppId === app.id 
                ? 'bg-vscode-listActive text-white' 
                : 'hover:bg-vscode-listHover text-vscode-text'
            } ${isOpen ? 'px-2 py-2' : 'p-2 justify-center'}`}
            onClick={() => onSelectApp(app.id)}
            title={!isOpen ? app.name : ""}
          >
            <span className="text-lg shrink-0">{app.icon}</span>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">{app.name}</div>
                <div className="truncate text-xs text-vscode-textMuted">
                  {app.model.split('-').slice(2, 4).join('-')}
                </div>
              </div>
            )}
            {isOpen && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteApp(app.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 text-vscode-textMuted rounded transition-all"
              >
                <Icons.Trash />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-vscode-border">
        <div className={`flex items-center gap-3 p-2 bg-vscode-bg rounded ${!isOpen && 'justify-center'}`}>
          <div className="w-7 h-7 bg-vscode-accent rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0">
            JD
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">Dev User</div>
              <div className="text-xs text-vscode-success truncate">Pro Plan</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
