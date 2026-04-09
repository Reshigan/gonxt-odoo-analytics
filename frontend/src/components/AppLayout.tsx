// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Root Layout
// Sidebar + Top bar + Company switcher
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState, KeyboardEvent } from 'react';
import {
  BarChart3, Package, AlertTriangle, LayoutDashboard,
  ChevronLeft, ChevronRight, Building2, ChevronDown,
  Bell, RefreshCw, LogOut, Menu, X, HelpCircle, User
} from 'lucide-react';
import HelpModal from './HelpModal';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  companies: { id: number; name: string }[];
  activeCompanyId: number;
  onCompanyChange: (id: number) => void;
  userName: string;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'executive', label: 'Executive View', icon: BarChart3 },
  { id: 'operations', label: 'Operations', icon: Package },
  { id: 'sales', label: 'Sales Analytics', icon: BarChart3 },
  { id: 'stock', label: 'Stock & Inventory', icon: Package },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
];

export default function AppLayout({
  children, activePage, onNavigate, companies,
  activeCompanyId, onCompanyChange, userName,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* ── Sidebar ── */}
      <div
        className="flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden"
        style={{ width: sidebarOpen ? 240 : 64, background: '#0B1426' }}
      >
        {/* Logo */}
        <div className="border-b border-white/10 flex items-center gap-3" style={{ padding: sidebarOpen ? '18px 16px' : '18px 14px' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00D4F5, #2DD4A8)' }}>
            <BarChart3 size={17} color="white" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-sm font-extrabold text-white tracking-widest">GONXT</div>
              <div className="text-[9px] font-bold tracking-wider" style={{ color: '#00D4F5' }}>ANALYTICS PORTAL</div>
            </div>
          )}
        </div>

        {/* Company Picker */}
        <div className="border-b border-white/10" style={{ padding: sidebarOpen ? '10px 12px' : '10px 8px' }}>
          <div
            onClick={() => sidebarOpen && setCompanyPickerOpen(!companyPickerOpen)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && sidebarOpen) {
                e.preventDefault();
                setCompanyPickerOpen(!companyPickerOpen);
              }
            }}
            className="flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
            style={{ padding: '8px 10px', background: '#111D35' }}
            tabIndex={sidebarOpen ? 0 : -1}
            role="button"
            aria-expanded={companyPickerOpen}
            aria-haspopup="listbox"
            aria-label="Select active company"
          >
            <Building2 size={15} style={{ color: '#00D4F5' }} aria-hidden="true" />
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-white truncate" id="company-name">{activeCompany?.name}</div>
                  <div className="text-[9px] text-slate-400">Active Company</div>
                </div>
                <ChevronDown size={13} className="text-slate-400" style={{
                  transform: companyPickerOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} aria-hidden="true" />
              </>
            )}
          </div>

          {companyPickerOpen && sidebarOpen && (
            <div className="mt-1.5 rounded-lg overflow-hidden border border-white/10" role="listbox" aria-labelledby="company-name">
              {companies.map(c => (
                <div
                  key={c.id}
                  onClick={() => { onCompanyChange(c.id); setCompanyPickerOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCompanyChange(c.id);
                      setCompanyPickerOpen(false);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-white/10"
                  style={{ background: c.id === activeCompanyId ? '#182744' : 'transparent' }}
                  tabIndex={0}
                  role="option"
                  aria-selected={c.id === activeCompanyId}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: c.id === activeCompanyId ? '#00D4F5' : '#4A5568' }} aria-hidden="true" />
                  <span className="text-[11px]" style={{
                    color: c.id === activeCompanyId ? 'white' : '#A0AEC0',
                    fontWeight: c.id === activeCompanyId ? 700 : 400,
                  }}>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

// Navigation items with keyboard accessibility
        <nav className="flex-1 py-3 px-2" aria-label="Main navigation">
          {NAV_ITEMS.map(item => {
            const active = activePage === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate(item.id);
                  }
                }}
                className="flex items-center gap-3 rounded-xl mb-1 cursor-pointer transition-all"
                style={{
                  padding: sidebarOpen ? '10px 14px' : '10px 13px',
                  background: active ? 'rgba(0,212,245,0.08)' : 'transparent',
                  borderLeft: active ? '3px solid #00D4F5' : '3px solid transparent',
                }}
                tabIndex={0}
                role="button"
                aria-current={active ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <item.icon size={17} style={{ color: active ? '#00D4F5' : '#A0AEC0' }} aria-hidden="true" />
                {sidebarOpen && (
                  <span className="text-[13px]" style={{
                    color: active ? 'white' : '#A0AEC0',
                    fontWeight: active ? 700 : 400,
                  }}>{item.label}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse */}
        <div className="border-t border-white/10 p-3">
          <div
            onClick={() => setSidebarOpen(!sidebarOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="flex items-center justify-center p-2 rounded-lg cursor-pointer hover:bg-white/5 transition"
            style={{ background: '#111D35' }}
            tabIndex={0}
            role="button"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <ChevronLeft size={15} className="text-slate-400" aria-hidden="true" /> : <ChevronRight size={15} className="text-slate-400" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <span className="text-lg font-extrabold text-slate-900">
              {NAV_ITEMS.find(n => n.id === activePage)?.label}
            </span>
            <span className="text-xs text-slate-400 ml-3">{activeCompany?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
              <RefreshCw size={12} className="text-emerald-500" />
              <span className="text-[10px] text-slate-500">Synced 2m ago</span>
            </div>
            <button 
              onClick={() => setHelpOpen(true)}
              className="p-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Open help center"
            >
              <HelpCircle size={17} className="text-slate-400" />
            </button>
            <div className="relative cursor-pointer">
              <Bell size={17} className="text-slate-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #00D4F5, #2DD4A8)' }}
              onClick={() => alert('Profile settings coming soon')}
              aria-label={`User menu for ${userName}`}
            >
              {initials}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
      
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
