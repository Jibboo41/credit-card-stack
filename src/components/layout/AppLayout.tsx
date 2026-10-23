import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CreditCard, Eye, EyeOff, LogOut, MoreHorizontal, Palette, RefreshCw, X } from 'lucide-react';
import { NAV_GROUPS, NAV_ITEMS, findNavItem } from './navConfig';
import { MonthPicker } from './MonthPicker';
import { AmbientBackground } from './AmbientBackground';
import { Toasts } from '../ui/Toasts';
import { DialogRoot } from '../dialogs/DialogRoot';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { getTheme } from '../../lib/themes';
import { auth } from '../../firebase';

export function AppLayout() {
  const location = useLocation();
  const user = useFinanceStore(s => s.user);
  const theme = useFinanceStore(s => s.theme);
  const showHiddenItems = useFinanceStore(s => s.showHiddenItems);
  const setShowHiddenItems = useFinanceStore(s => s.setShowHiddenItems);
  const syncNow = useFinanceStore(s => s.syncNow);

  const openDialog = useUiStore(s => s.openDialog);
  const syncStatus = useSyncStatus();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNav = findNavItem(location.pathname);
  const themeDef = getTheme(theme);

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <div className="app-shell">
      <AmbientBackground colors={themeDef.blobs} />

      {/* ── Desktop Side Navigation ──────────────────────────────── */}
      <aside className="side-nav">
        <div className="brand">
          <div className="brand-mark">
            <CreditCard size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">Credit Card Stack</div>
            <div className="brand-tag">Rewards & Spend Optimization</div>
          </div>
        </div>

        {NAV_GROUPS.map(group => {
          const items = NAV_ITEMS.filter(item => item.group === group);
          return (
            <div key={group} className="nav-group">
              <div className="nav-group-label">{group}</div>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}

        <div className="side-nav-footer">
          {/* Monarch Sync Panel */}
          <div className="sync-panel">
            <div className="sync-status">
              <span className={`status-dot ${syncStatus.tone}`} />
              <span className="truncate">{syncStatus.label}</span>
            </div>
            <div className="row-between">
              <button
                type="button"
                className="btn btn-sm grow"
                onClick={syncNow}
                disabled={syncStatus.isSyncing}
              >
                <RefreshCw size={13} className={syncStatus.isSyncing ? 'spin' : ''} />
                <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => openDialog({ type: 'syncLogs' })}
              >
                Logs
              </button>
            </div>
          </div>

          {/* User Row */}
          <div className="user-row">
            <div className="avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="avatar" />
              ) : (
                (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
              )}
            </div>
            <div className="grow truncate" style={{ fontSize: '13px' }}>
              <div className="truncate" style={{ fontWeight: 600 }}>
                {user?.displayName || user?.email || 'User'}
              </div>
              <div className="subtle" style={{ fontSize: '11px' }}>
                Monarch Connected
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              title="Appearance"
              onClick={() => openDialog({ type: 'appearance' })}
            >
              <Palette size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              title="Sign Out"
              onClick={handleSignOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Application Content ─────────────────────────────── */}
      <div className="app-main">
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="top-bar-title truncate">
            {currentNav?.label || 'Credit Card Stack'}
          </div>

          <div className="top-bar-actions">
            {currentNav?.usesMonth && <MonthPicker />}

            <button
              type="button"
              className={`btn btn-sm ${showHiddenItems ? 'btn-primary' : ''}`}
              aria-pressed={showHiddenItems}
              onClick={() => setShowHiddenItems(!showHiddenItems)}
              title={showHiddenItems ? 'Showing all items including hidden' : 'Hiding inactive / hidden items'}
            >
              {showHiddenItems ? <Eye size={14} /> : <EyeOff size={14} />}
              <span className="hide-mobile">{showHiddenItems ? 'Showing hidden' : 'Hidden'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-icon hide-desktop"
              title="Appearance"
              onClick={() => openDialog({ type: 'appearance' })}
            >
              <Palette size={16} />
            </button>

            <button
              type="button"
              className="btn btn-sm btn-icon hide-desktop"
              title="Sync Now"
              onClick={syncNow}
              disabled={syncStatus.isSyncing}
            >
              <RefreshCw size={16} className={syncStatus.isSyncing ? 'spin' : ''} />
            </button>
          </div>
        </header>

        {/* Page View */}
        <main tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ─────────────────────────── */}
      <nav className="bottom-nav hide-desktop">
        {NAV_ITEMS.filter(item => item.tab).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          className={`bottom-nav-item ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MoreHorizontal size={24} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {mobileMenuOpen && (
        <div className="modal-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Menu & Settings</div>
              <span className="spacer" style={{ flex: 1 }} />
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body stack">
              <div className="nav-group">
                <div className="nav-group-label">Pages</div>
                {NAV_ITEMS.filter(item => !item.tab).map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      <span className="subtle" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                        {item.description}
                      </span>
                    </NavLink>
                  );
                })}
              </div>

              <div className="nav-group" style={{ marginTop: '12px' }}>
                <div className="nav-group-label">Quick Actions</div>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openDialog({ type: 'appearance' });
                  }}
                >
                  <Palette size={18} />
                  <span>Change Theme</span>
                </button>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openDialog({ type: 'syncLogs' });
                  }}
                >
                  <RefreshCw size={18} />
                  <span>Monarch Sync Logs</span>
                </button>
                <button
                  type="button"
                  className="nav-link"
                  style={{ color: 'var(--red)' }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global UI Components */}
      <Toasts />
      <DialogRoot />
    </div>
  );
}
