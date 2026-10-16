import { useState } from 'react';
import { LogOut, X, Layout, Sunrise, Moon, TreePine, Sparkles, Flower2, Waves, Flame, Flower, Zap, Plus, ChevronDown, ChevronUp, ScrollText, CreditCard as CardIcon, Globe } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import SyncLogsModal from './SyncLogsModal';

export default function Sidebar() {
  const { isSidebarOpen, setSidebarOpen, user, theme, setTheme, setActiveTab } = useFinanceStore();
  const [appearanceExpanded, setAppearanceExpanded] = useState(false);
  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const glassIconStyle = { opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSidebarOpen(false);
    } catch (e) {
      console.error("Failed to sign out", e);
    }
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebar-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>Credit Card Stack</h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--sys-label-secondary)', padding: '8px', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="sidebar-content">
          <div className="trip-pill active">
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Credit Cards</span>
          </div>

          <div 
            className="trip-pill" 
            onClick={() => {
              setActiveTab('manage');
              setSidebarOpen(false);
            }}
            style={{ marginTop: '8px', marginLeft: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <CardIcon size={16} />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Manage Cards</span>
            </div>
          </div>
          
          <div 
            className="trip-pill" 
            onClick={() => {
              setActiveTab('no-ftf');
              setSidebarOpen(false);
            }}
            style={{ marginTop: '8px', marginLeft: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <Globe size={16} />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>No FTF Guide</span>
            </div>
          </div>

          <div 
            className="trip-pill" 
            onClick={() => {
              setShowSyncLogs(true);
              setSidebarOpen(false);
            }}
            style={{ marginTop: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <ScrollText size={16} />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Sync Logs</span>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button
              onClick={() => setAppearanceExpanded(!appearanceExpanded)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', padding: '8px 4px', cursor: 'pointer',
                color: '#fff', fontSize: '14px', fontWeight: 800
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layout size={16} color="var(--sys-blue)" />
                Appearance
              </div>
              {appearanceExpanded ? <ChevronUp size={16} color="var(--sys-label-secondary)" /> : <ChevronDown size={16} color="var(--sys-label-secondary)" />}
            </button>
            
            {appearanceExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                {([
                  { key: 'sunset',    label: 'Sunset',      icon: <Sunrise size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #FF3B30 0%, #FF9F0A 50%, #FFD60A 100%)' },
                  { key: 'midnight',  label: 'Midnight',    icon: <Moon size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 60%, #32ADE6 100%)' },
                  { key: 'forest',    label: 'Forest',      icon: <TreePine size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #30D158 0%, #34C759 50%, #32ADE6 100%)' },
                  { key: 'aurora',    label: 'Aurora',      icon: <Sparkles size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #00F5A0 0%, #8B5CF6 55%, #06B6D4 100%)' },
                  { key: 'desert',    label: 'Desert Rose', icon: <Flower2 size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #E2A57E 0%, #C9415A 55%, #EDCA7F 100%)' },
                  { key: 'ocean',     label: 'Deep Ocean',  icon: <Waves size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #0EA5E9 0%, #0D9488 50%, #6366F1 100%)' },
                  { key: 'vulcan',    label: 'Vulcan',      icon: <Flame size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #FF4500 0%, #FF8C00 50%, #FF2D55 100%)' },
                  { key: 'sakura',    label: 'Sakura',      icon: <Flower size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #FF85A2 0%, #D891EF 55%, #FFB6CE 100%)' },
                  { key: 'cyberpunk', label: 'Cyberpunk',   icon: <Zap size={20} style={glassIconStyle} />, grad: 'linear-gradient(135deg, #FF00AA 0%, #00FFEA 55%, #FFE600 100%)' },
                  { key: 'slate',     label: 'Slate',       icon: <Plus size={20} style={glassIconStyle} />, grad: '#708090' },
                  { key: 'black',     label: 'Black',       icon: <Moon size={20} style={glassIconStyle} />, grad: '#000000' },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    style={{
                      position: 'relative',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: theme === t.key ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
                      boxShadow: theme === t.key ? '0 0 18px rgba(255,255,255,0.25)' : 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      aspectRatio: '1.8',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: t.grad, opacity: 0.9 }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.25)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: '4px'
                    }}>
                      {t.icon}
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{t.label}</span>
                    </div>
                    {theme === t.key && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          {user && (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--sys-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--sys-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          )}
          
          <button className="logout-pill" onClick={handleSignOut} style={{ cursor: 'pointer', border: 'none' }}>
            <LogOut size={16} style={{ marginRight: '8px' }} />
            Sign Out
          </button>
        </div>
      </div>
      {showSyncLogs && (
        <SyncLogsModal onClose={() => setShowSyncLogs(false)} />
      )}
    </>
  );
}
