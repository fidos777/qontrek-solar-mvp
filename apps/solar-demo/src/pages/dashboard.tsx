'use client';

import React, { useState } from 'react';
import { 
  Zap, MessageSquare, Target, Building, FileText, Users, 
  RefreshCw, Settings, ChevronDown, ChevronRight, Phone,
  MapPin, Clock, AlertTriangle, CheckCircle, Circle,
  TrendingUp, Flame, Star, Link, ArrowUp
} from 'lucide-react';

// ============================================
// FIDOS BD Manager v4.2 - Mobile Responsive
// ============================================

// Types
interface Worker {
  id: string;
  name: string;
  role: string;
  location: string;
  status: 'active' | 'busy' | 'idle' | 'pending';
  tasks: number;
  success: number;
  type: 'ai' | 'human';
}

interface Deal {
  id: string;
  name: string;
  company?: string;
  kw: number;
  location: string;
  value: number;
  status: 'hot' | 'qualified' | 'enterprise' | 'seda';
  jodooRef: string;
  assignee?: string;
  updatedAgo: string;
}

interface PipelineStage {
  name: string;
  icon: string;
  count: number;
  value: number;
  conversion?: number;
}

// Sample Data
const aiWorkers: Worker[] = [
  { id: '1', name: 'QuoteGen', role: 'Quote Generator', location: '-', status: 'active', tasks: 8, success: 100, type: 'ai' },
  { id: '2', name: 'WhatsApp', role: 'Message Sender', location: '-', status: 'active', tasks: 6, success: 95, type: 'ai' },
  { id: '3', name: 'LeadScore', role: 'Lead Qualifier', location: '-', status: 'active', tasks: 12, success: 88, type: 'ai' },
  { id: '4', name: 'SEDA Check', role: 'Official Validator', location: '-', status: 'active', tasks: 8, success: 100, type: 'ai' },
  { id: '5', name: 'Reporter', role: 'Daily Summary', location: '-', status: 'pending', tasks: 1, success: 0, type: 'ai' },
];

const humanWorkers: Worker[] = [
  { id: '6', name: 'Haziq', role: 'Site Surveyor', location: 'Shah Alam', status: 'busy', tasks: 3, success: 83, type: 'human' },
  { id: '7', name: 'Farid', role: 'Site Surveyor', location: 'Kajang', status: 'active', tasks: 2, success: 100, type: 'human' },
  { id: '8', name: 'Acong Team', role: 'Installer', location: 'Kajang', status: 'busy', tasks: 1, success: 83, type: 'human' },
  { id: '9', name: 'MTSS Team', role: 'Installer', location: 'Melaka', status: 'active', tasks: 1, success: 100, type: 'human' },
  { id: '10', name: 'En Din', role: 'Installer (Subcon)', location: 'Seremban', status: 'idle', tasks: 0, success: 67, type: 'human' },
  { id: '11', name: 'AZ Solar', role: 'Installer (Subcon)', location: 'Klang', status: 'active', tasks: 1, success: 90, type: 'human' },
  { id: '12', name: 'Sarah', role: 'Doc Processor', location: 'HQ', status: 'active', tasks: 12, success: 93, type: 'human' },
  { id: '13', name: 'Accounts', role: 'Payment Collection', location: 'HQ', status: 'active', tasks: 8, success: 60, type: 'human' },
];

const activeDeals: Deal[] = [
  { id: '1', name: 'Ahmad Abdullah', kw: 5.5, location: 'Petaling Jaya', value: 22500, status: 'hot', jodooRef: 'VESB/RESI/IN/2024/01/0101', updatedAgo: '2m' },
  { id: '2', name: 'Siti Aminah', kw: 8, location: 'Shah Alam', value: 32000, status: 'qualified', jodooRef: 'VESB/RESI/IN/2024/01/0102', assignee: 'Haziq', updatedAgo: '2m' },
  { id: '3', name: 'Syarikat ABC Sdn Bhd', company: 'Syarikat ABC Sdn Bhd', kw: 80, location: 'Klang', value: 168000, status: 'enterprise', jodooRef: 'VESB/COMM/IN/2024/02/0015', updatedAgo: '2m' },
  { id: '4', name: 'Lee Wei Ming', kw: 4, location: 'Subang', value: 16000, status: 'hot', jodooRef: 'VESB/RESI/IN/2024/01/0103', updatedAgo: '5m' },
  { id: '5', name: 'Muhammad Lokman', kw: 10.2, location: 'Wangsa Melawati', value: 45500, status: 'seda', jodooRef: 'VESB/RESI/IN/2024/01/0104', assignee: 'Sarah', updatedAgo: '2m' },
];

const pipelineStages: PipelineStage[] = [
  { name: 'New Leads', icon: '📥', count: 45, value: 675000, conversion: 51 },
  { name: 'Quoted', icon: '📋', count: 23, value: 460000, conversion: 52 },
  { name: 'Site Visit', icon: '🔵', count: 12, value: 288000, conversion: 67 },
  { name: 'SEDA Pending', icon: '🏛️', count: 8, value: 192000, conversion: 375 },
  { name: 'Payment 80%', icon: '💰', count: 30, value: 720000, conversion: 10 },
  { name: 'Installing', icon: '🔧', count: 3, value: 72000 },
  { name: 'Completed', icon: '✅', count: 103, value: 2472000 },
];

const governanceLogs = [
  { time: '12:30', icon: '✓', action: 'Sync', detail: '403 records imported', color: 'text-cyan-400' },
  { time: '12:34', icon: '✓', action: 'QuoteGen', detail: 'Quote #Q-2026-047 → CONFIRMED', color: 'text-green-400' },
  { time: '12:35', icon: '●', action: 'Megat', detail: 'Confirmed (1.2s delay)', color: 'text-yellow-400' },
  { time: '12:35', icon: '●', action: 'Webhook', detail: 'Quote synced to Jodoo', color: 'text-cyan-400' },
  { time: '12:40', icon: '✓', action: 'Haziq', detail: 'Site visit: Ahmad ✓', color: 'text-green-400' },
];

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    busy: 'bg-yellow-500',
    idle: 'bg-gray-500',
    pending: 'bg-orange-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
  );
};

// Deal Status Badge
const DealStatusBadge = ({ status }: { status: Deal['status'] }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    hot: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: <Flame className="w-3 h-3" /> },
    qualified: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
    enterprise: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Star className="w-3 h-3" /> },
    seda: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Building className="w-3 h-3" /> },
  };
  const { bg, text, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${bg} ${text}`}>
      {icon}
      <span className="capitalize">{status === 'hot' ? 'Hot Lead' : status}</span>
    </span>
  );
};

// Card Component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

// Stat Card Component
const StatCard = ({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="bg-slate-800/30 rounded-lg p-3">
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

// Collapsible Section
const CollapsibleSection = ({ 
  title, 
  badge, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  badge?: React.ReactNode; 
  children: React.ReactNode; 
  defaultOpen?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && <div className="p-4 bg-slate-900/30">{children}</div>}
    </div>
  );
};

// Worker Card (Mobile)
const WorkerCard = ({ worker }: { worker: Worker }) => (
  <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        worker.type === 'ai' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
      }`}>
        {worker.type === 'ai' ? <Zap className="w-4 h-4" /> : <Users className="w-4 h-4" />}
      </div>
      <div>
        <p className="font-medium text-white text-sm">{worker.name}</p>
        <p className="text-xs text-slate-400">{worker.role}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="flex items-center gap-1">
          <StatusBadge status={worker.status} />
          <span className="text-xs text-slate-400 capitalize">{worker.status}</span>
        </div>
        <p className="text-xs text-slate-500">{worker.tasks} tasks</p>
      </div>
      <span className={`text-sm font-medium ${
        worker.success >= 90 ? 'text-green-400' : 
        worker.success >= 70 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {worker.success}%
        {worker.success < 70 && <AlertTriangle className="inline w-3 h-3 ml-1" />}
      </span>
    </div>
  </div>
);

// Deal Card (Mobile)
const DealCard = ({ deal }: { deal: Deal }) => (
  <Card className="space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-semibold text-white">{deal.name}</h3>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" />
          {deal.kw} kW • {deal.location}
        </p>
      </div>
      <div className="text-right">
        <p className="text-green-400 font-bold">RM {deal.value.toLocaleString()}</p>
        <DealStatusBadge status={deal.status} />
      </div>
    </div>
    
    {deal.assignee && (
      <p className="text-xs text-slate-400">
        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
          <Users className="w-3 h-3" />
          {deal.assignee}
        </span>
      </p>
    )}
    
    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
      <a 
        href="#" 
        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
      >
        <Link className="w-3 h-3" />
        {deal.jodooRef}
      </a>
      <span className="text-xs text-slate-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {deal.updatedAgo} ago
      </span>
    </div>
    
    <div className="flex gap-2">
      <button className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
        <ArrowUp className="w-4 h-4" />
        Push
      </button>
      <button className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1">
        <Users className="w-4 h-4" />
        Assign
      </button>
    </div>
  </Card>
);

// Pipeline Bar
const PipelineBar = ({ stage, maxValue }: { stage: PipelineStage; maxValue: number }) => {
  const width = (stage.value / maxValue) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span>{stage.icon}</span>
          <span className="text-slate-300">{stage.name}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="bg-slate-700 px-2 py-0.5 rounded text-xs font-medium">{stage.count}</span>
          <span className="text-slate-400 text-xs">RM {(stage.value / 1000).toFixed(0)}k</span>
          {stage.conversion && (
            <span className="text-slate-500 text-xs">{stage.conversion}%</span>
          )}
        </div>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            stage.name === 'Completed' ? 'bg-green-500' : 
            stage.name === 'Payment 80%' ? 'bg-yellow-500' : 'bg-cyan-500'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function FIDOSDashboardMobile() {
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'human'>('all');
  const maxPipelineValue = Math.max(...pipelineStages.map(s => s.value));
  
  const filteredWorkers = activeTab === 'all' 
    ? [...aiWorkers, ...humanWorkers]
    : activeTab === 'ai' ? aiWorkers : humanWorkers;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header - Fixed on mobile */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              FIDOS BD Manager
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">v4.2</span>
            </h1>
            <p className="text-xs text-slate-400">Solar • Voltek Energy • AI + Human Workforce</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold">
              M
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-20">
        {/* Connection Status Bar */}
        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg overflow-x-auto text-xs">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Jodoo: Connected
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 whitespace-nowrap">Last sync: 2m ago</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 whitespace-nowrap">Records: 403</span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Webhook: Active
          </span>
        </div>

        {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            label="Total Workers" 
            value="5 + 8" 
            sub="🤖 AI + 👥 Human" 
            color="text-cyan-400" 
          />
          <StatCard 
            label="Tasks Today" 
            value="63" 
            sub="3/6 completed" 
          />
          <StatCard 
            label="Pipeline Value" 
            value="RM 284k" 
            sub="5 active deals" 
            color="text-green-400" 
          />
          <StatCard 
            label="Jodoo Records" 
            value="403" 
            sub="Synced 2m ago" 
            color="text-orange-400" 
          />
        </div>

        {/* Pipeline Funnel - Full width on mobile */}
        <CollapsibleSection 
          title="📊 Pipeline Funnel" 
          badge={
            <span className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From Jodoo</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </span>
          }
        >
          <div className="space-y-3">
            {pipelineStages.map((stage) => (
              <PipelineBar key={stage.name} stage={stage} maxValue={maxPipelineValue} />
            ))}
            
            {/* Pipeline Summary */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-lg font-bold text-white">23</p>
                <p className="text-xs text-slate-400">Quotes</p>
                <p className="text-xs text-green-400">↑ 15%</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">4</p>
                <p className="text-xs text-slate-400">Closes</p>
                <p className="text-xs text-green-400">↑ 33%</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">RM 284k</p>
                <p className="text-xs text-slate-400">Revenue</p>
                <p className="text-xs text-green-400">↑ 8%</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Jodoo Sync + Commission - Stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                🔗 Jodoo ERP Sync
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Connected</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-400">Records</p>
                <p className="text-xl font-bold text-cyan-400">403</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Last sync</p>
                <p className="text-xl font-bold">2m ago</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Webhook</p>
                <p className="text-sm text-green-400">Active</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Auto</p>
                <p className="text-sm text-cyan-400">5m</p>
              </div>
            </div>
            <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Import
            </button>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">💰 Commission (Jan 2026)</h3>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-1">RM 48,000</p>
            <p className="text-sm text-slate-400 mb-3">4 closes × 80kWp × RM150</p>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '48%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">48% of RM100k target</p>
          </Card>
        </div>

        {/* Today's Activities */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">📅 Today</h3>
            <span className="text-xs text-slate-400">3/6</span>
          </div>
          <div className="space-y-2">
            {[
              { status: 'done', name: 'Haziq', task: 'Ahmad Abdullah, PJ' },
              { status: 'active', name: 'Haziq', task: 'Siti Aminah, Shah Alam' },
              { status: 'pending', name: 'Haziq', task: 'Lee Wei Ming, Subang' },
              { status: 'active', name: 'Acong T...', task: 'Mohd Akmal, Kajang' },
              { status: 'done', name: 'Sarah', task: 'Q-2026-041' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {item.status === 'done' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : item.status === 'active' ? (
                  <Circle className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-500" />
                )}
                <span className={item.status === 'done' ? 'text-green-400' : 'text-cyan-400'}>{item.name}</span>
                <span className="text-slate-400">{item.task}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card className="border-yellow-500/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Alerts
          </h3>
          <div className="space-y-2">
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 font-medium">30 NEM Approved</p>
              <p className="text-xs text-orange-400">RM720k pending 80% payment!</p>
            </div>
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400 font-medium">En Din - Delayed</p>
              <p className="text-xs text-slate-400">Reschedule needed</p>
            </div>
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400 font-medium">Accounts - 60%</p>
              <p className="text-xs text-slate-400">Low collection rate</p>
            </div>
          </div>
        </Card>

        {/* Governance Log */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              🔒 Governance
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Type B</span>
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {governanceLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500">{log.time}</span>
                <span className={log.color}>{log.icon}</span>
                <span className="text-cyan-400">{log.action}</span>
                <span className="text-slate-400 flex-1">{log.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Workers Section */}
        <CollapsibleSection 
          title="👥 All Workers" 
          badge={<span className="text-xs text-slate-400">Real-time</span>}
        >
          {/* Tab Filters */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'all', label: 'All (13)' },
              { id: 'ai', label: '🤖 AI (5)' },
              { id: 'human', label: '👥 Human (8)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Worker Cards */}
          <div className="space-y-2">
            {filteredWorkers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Active Deals */}
        <CollapsibleSection 
          title="💰 Active Deals" 
          badge={
            <span className="flex items-center gap-2">
              <Link className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-slate-400">Jodoo linked</span>
            </span>
          }
        >
          <div className="space-y-3">
            {activeDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Quick Actions - Bottom Sheet Style */}
        <div className="grid grid-cols-3 gap-3">
          <button className="p-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-medium transition-colors flex flex-col items-center gap-2 text-black">
            <Zap className="w-6 h-6" />
            <span className="text-sm">Generate Quote</span>
          </button>
          <button className="p-4 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            <span className="text-sm">WhatsApp Batch</span>
          </button>
          <button className="p-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors flex flex-col items-center gap-2">
            <FileText className="w-6 h-6" />
            <span className="text-sm">Daily Report</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>FIDOS BD Manager v4.2 • Qontrek × Voltek × Jodoo</span>
          <span className="flex items-center gap-2">
            <span className="text-cyan-400">CIVOS</span>
            <span>Type B Active</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
