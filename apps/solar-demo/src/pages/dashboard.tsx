import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

interface Worker {
  id: string;
  name: string;
  role: string;
  type: 'ai' | 'human';
  status: 'active' | 'pending' | 'idle' | 'busy' | 'on_leave';
  tasks_today: number;
  success_rate: number;
  team?: string;
  location?: string;
  phone?: string;
}

interface Deal {
  id: string;
  jodoo_id?: string;
  project_no?: string;
  customer_name: string;
  customer_state?: string;
  customer_phone?: string;
  finalized_capacity_kwp?: number;
  total_sales: number;
  status: string;
  stage: number;
  assigned_to?: string;
  last_synced?: string;
}

interface Task {
  id: string;
  staff_name: string;
  staff_type: 'ai' | 'human';
  task_type: string;
  customer: string;
  time: string;
  status: 'completed' | 'ongoing' | 'pending' | 'delayed';
}

interface LogEntry {
  id: string;
  time: string;
  type: 'success' | 'pending' | 'info' | 'warning';
  source: 'ai' | 'human' | 'system' | 'jodoo';
  source_name: string;
  message: string;
}

interface PipelineStage {
  name: string;
  count: number;
  value: number;
  color: string;
  icon: string;
}

interface JodooStatus {
  connected: boolean;
  lastSync: Date | null;
  recordCount: number;
  webhookActive: boolean;
  autoSync: boolean;
  syncInterval: number;
}

function getTagFromStatus(status: string): { tag: string; color: string } {
  const mapping: Record<string, { tag: string; color: string }> = {
    'quoted': { tag: '🔥 Hot Lead', color: '#f97316' },
    'site_visit': { tag: '✓ Qualified', color: '#22c55e' },
    'negotiating': { tag: '⭐ Enterprise', color: '#06b6d4' },
    'seda_pending': { tag: '📋 SEDA', color: '#eab308' },
    'payment_pending': { tag: '💰 Payment', color: '#8b5cf6' },
    'installation': { tag: '🔧 Installing', color: '#3b82f6' },
    'completed': { tag: '✅ Done', color: '#22c55e' },
  };
  return mapping[status] || { tag: '⚠️ Follow up', color: '#ef4444' };
}

function timeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'ai' | 'human' | 'all'>('all');
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showJodooSettings, setShowJodooSettings] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Jodoo Connection Status
  const [jodooStatus, setJodooStatus] = useState<JodooStatus>({
    connected: true,
    lastSync: new Date(Date.now() - 120000), // 2 min ago
    recordCount: 403,
    webhookActive: true,
    autoSync: true,
    syncInterval: 5,
  });

  // AI Workers
  const [aiWorkers] = useState<Worker[]>([
    { id: 'ai1', name: '⚡ QuoteGen', role: 'Quote Generator', type: 'ai', status: 'active', tasks_today: 8, success_rate: 100 },
    { id: 'ai2', name: '📱 WhatsApp', role: 'Message Sender', type: 'ai', status: 'active', tasks_today: 6, success_rate: 95 },
    { id: 'ai3', name: '🎯 LeadScore', role: 'Lead Qualifier', type: 'ai', status: 'active', tasks_today: 12, success_rate: 88 },
    { id: 'ai4', name: '🏛️ SEDA Check', role: 'Official Validator', type: 'ai', status: 'active', tasks_today: 8, success_rate: 100 },
    { id: 'ai5', name: '📊 Reporter', role: 'Daily Summary', type: 'ai', status: 'pending', tasks_today: 1, success_rate: 0 },
  ]);

  // Human Staff
  const [humanStaff, setHumanStaff] = useState<Worker[]>([
    { id: 'h1', name: '👷 Haziq', role: 'Site Surveyor', type: 'human', status: 'busy', tasks_today: 3, success_rate: 83, team: 'In-house', location: 'Shah Alam', phone: '+60123456789' },
    { id: 'h2', name: '👷 Farid', role: 'Site Surveyor', type: 'human', status: 'active', tasks_today: 2, success_rate: 100, team: 'In-house', location: 'Kajang', phone: '+60198765432' },
    { id: 'h3', name: '🔧 Acong Team', role: 'Installer', type: 'human', status: 'busy', tasks_today: 1, success_rate: 83, team: 'In-house', location: 'Kajang', phone: '+60111111111' },
    { id: 'h4', name: '🔧 MTSS Team', role: 'Installer', type: 'human', status: 'active', tasks_today: 1, success_rate: 100, team: 'In-house', location: 'Melaka', phone: '+60122222222' },
    { id: 'h5', name: '🔧 En Din', role: 'Installer (Subcon)', type: 'human', status: 'idle', tasks_today: 0, success_rate: 67, team: 'Subcon', location: 'Seremban', phone: '+60133333333' },
    { id: 'h6', name: '🔧 AZ Solar', role: 'Installer (Subcon)', type: 'human', status: 'active', tasks_today: 1, success_rate: 90, team: 'Subcon', location: 'Klang', phone: '+60144444444' },
    { id: 'h7', name: '📋 Sarah', role: 'Doc Processor', type: 'human', status: 'active', tasks_today: 12, success_rate: 93, team: 'Office', location: 'HQ', phone: '+60155555555' },
    { id: 'h8', name: '💰 Accounts', role: 'Payment Collection', type: 'human', status: 'active', tasks_today: 8, success_rate: 60, team: 'Office', location: 'HQ', phone: '+60166666666' },
  ]);

  // Pipeline Funnel Data
  const [pipelineStages] = useState<PipelineStage[]>([
    { name: 'New Leads', count: 45, value: 675000, color: '#94a3b8', icon: '📥' },
    { name: 'Quoted', count: 23, value: 460000, color: '#f97316', icon: '📝' },
    { name: 'Site Visit', count: 12, value: 288000, color: '#eab308', icon: '🔍' },
    { name: 'SEDA Pending', count: 8, value: 192000, color: '#3b82f6', icon: '🏛️' },
    { name: 'Payment 80%', count: 30, value: 720000, color: '#8b5cf6', icon: '💰' },
    { name: 'Installing', count: 3, value: 72000, color: '#06b6d4', icon: '🔧' },
    { name: 'Completed', count: 103, value: 2472000, color: '#22c55e', icon: '✅' },
  ]);

  // Weekly comparison
  const [weeklyStats] = useState({
    quotes: { current: 23, change: 15 },
    closes: { current: 4, change: 33 },
    revenue: { current: 284000, change: 8 },
  });

  // Tasks
  const [tasks] = useState<Task[]>([
    { id: 't1', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', customer: 'Ahmad Abdullah, PJ', time: '10:00 AM', status: 'completed' },
    { id: 't2', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', customer: 'Siti Aminah, Shah Alam', time: '2:00 PM', status: 'ongoing' },
    { id: 't3', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', customer: 'Lee Wei Ming, Subang', time: '4:00 PM', status: 'pending' },
    { id: 't4', staff_name: 'Acong Team', staff_type: 'human', task_type: 'Installation', customer: 'Mohd Akmal, Kajang', time: '8:00 AM', status: 'ongoing' },
    { id: 't5', staff_name: 'Sarah', staff_type: 'human', task_type: 'SEDA Submit', customer: 'Q-2026-041', time: '9:00 AM', status: 'completed' },
    { id: 't6', staff_name: 'QuoteGen', staff_type: 'ai', task_type: 'Quote', customer: 'New lead', time: '11:30 AM', status: 'completed' },
  ]);

  // Deals with Jodoo IDs
  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', jodoo_id: '605b5f68255d4845a73d3c0a', project_no: 'VESB/RESI/IN/2024/01/0101', customer_name: 'Ahmad Abdullah', customer_state: 'Petaling Jaya', finalized_capacity_kwp: 5.5, total_sales: 22500, status: 'quoted', stage: 2, customer_phone: '+60123456789', last_synced: '2m ago' },
    { id: '2', jodoo_id: '605b5f68255d4845a73d3c0b', project_no: 'VESB/RESI/IN/2024/01/0102', customer_name: 'Siti Aminah', customer_state: 'Shah Alam', finalized_capacity_kwp: 8, total_sales: 32000, status: 'site_visit', stage: 3, customer_phone: '+60198765432', assigned_to: 'Haziq', last_synced: '2m ago' },
    { id: '3', jodoo_id: '605b5f68255d4845a73d3c0c', project_no: 'VESB/COMM/IN/2024/02/0015', customer_name: 'Syarikat ABC Sdn Bhd', customer_state: 'Klang', finalized_capacity_kwp: 80, total_sales: 168000, status: 'negotiating', stage: 4, customer_phone: '+60376543210', last_synced: '2m ago' },
    { id: '4', jodoo_id: '605b5f68255d4845a73d3c0d', project_no: 'VESB/RESI/IN/2024/01/0103', customer_name: 'Lee Wei Ming', customer_state: 'Subang', finalized_capacity_kwp: 4, total_sales: 16000, status: 'quoted', stage: 2, customer_phone: '+60112345678', last_synced: '5m ago' },
    { id: '5', jodoo_id: '605b5f68255d4845a73d3c0e', project_no: 'VESB/RESI/IN/2024/01/0104', customer_name: 'Muhammad Lokman', customer_state: 'Wangsa Melawati', finalized_capacity_kwp: 10.2, total_sales: 45500, status: 'seda_pending', stage: 3, customer_phone: '+60145678901', assigned_to: 'Sarah', last_synced: '2m ago' },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '12:30', type: 'success', source: 'jodoo', source_name: 'Sync', message: '403 records imported' },
    { id: '2', time: '12:34', type: 'success', source: 'ai', source_name: 'QuoteGen', message: 'Quote #Q-2026-047 → CONFIRMED' },
    { id: '3', time: '12:35', type: 'success', source: 'human', source_name: 'Megat', message: 'Confirmed (1.2s delay)' },
    { id: '4', time: '12:35', type: 'info', source: 'jodoo', source_name: 'Webhook', message: 'Quote synced to Jodoo' },
    { id: '5', time: '12:40', type: 'success', source: 'human', source_name: 'Haziq', message: 'Site visit: Ahmad ✓' },
    { id: '6', time: '12:41', type: 'info', source: 'jodoo', source_name: 'Webhook', message: 'Status updated in Jodoo' },
    { id: '7', time: '13:15', type: 'pending', source: 'human', source_name: 'Accounts', message: 'Payment reminder sent' },
    { id: '8', time: '13:20', type: 'warning', source: 'human', source_name: 'En Din', message: 'Task DELAYED ⚠️' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-sync simulation
  useEffect(() => {
    if (jodooStatus.autoSync) {
      const syncTimer = setInterval(() => {
        setJodooStatus(prev => ({ ...prev, lastSync: new Date() }));
        addLog('info', 'jodoo', 'Auto-sync', 'Data refreshed');
      }, jodooStatus.syncInterval * 60 * 1000);
      return () => clearInterval(syncTimer);
    }
  }, [jodooStatus.autoSync, jodooStatus.syncInterval]);

  const addLog = useCallback((type: 'success' | 'pending' | 'info' | 'warning', source: 'ai' | 'human' | 'system' | 'jodoo', source_name: string, message: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ id: Date.now().toString(), time, type, source, source_name, message }, ...prev].slice(0, 20));
  }, []);

  const handleJodooSync = async () => {
    setSyncing(true);
    addLog('info', 'jodoo', 'Sync', 'Starting import...');
    
    try {
      const res = await fetch('/api/jodoo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      });
      const result = await res.json();
      
      if (result.success) {
        setJodooStatus(prev => ({ ...prev, lastSync: new Date() }));
        addLog('success', 'jodoo', 'Sync', `${result.message}`);
      } else {
        addLog('warning', 'jodoo', 'Sync', result.error || 'Failed');
      }
    } catch (err) {
      addLog('warning', 'jodoo', 'Sync', `Error: ${err}`);
    }
    
    setSyncing(false);
    setShowSyncModal(false);
  };

  const handleExportToJodoo = async (deal: Deal) => {
    addLog('info', 'jodoo', 'Export', `Pushing ${deal.customer_name}...`);
    // Simulate export
    setTimeout(() => {
      addLog('success', 'jodoo', 'Export', `${deal.customer_name} synced ✓`);
    }, 1000);
  };

  const openInJodoo = (jodooId?: string) => {
    if (jodooId) {
      // Replace with actual Jodoo URL pattern
      window.open(`https://app.jodoo.com/app/YOUR_APP_ID/entry/YOUR_ENTRY_ID/data/${jodooId}`, '_blank');
    }
  };

  const handleWhatsAppBatch = () => {
    const pending = deals.filter(d => d.status === 'quoted');
    addLog('info', 'ai', 'WhatsApp', `Batch: ${pending.length} messages`);
    pending.forEach((deal, i) => {
      setTimeout(() => {
        const msg = encodeURIComponent(`Hi ${deal.customer_name}! 🌞\n\nSolar ${deal.finalized_capacity_kwp} kW:\n💰 RM ${deal.total_sales.toLocaleString()}\n\nReply YES!\n- Voltek`);
        window.open(`https://wa.me/${deal.customer_phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
        addLog('success', 'ai', 'WhatsApp', `Sent to ${deal.customer_name}`);
      }, i * 1500);
    });
  };

  const handleAssignTask = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowAssignModal(true);
  };

  const confirmAssignment = (staffId: string, taskType: string) => {
    if (!selectedDeal) return;
    const staff = humanStaff.find(s => s.id === staffId);
    if (staff) {
      addLog('success', 'human', 'Megat', `Assigned → ${staff.name}: ${selectedDeal.customer_name}`);
      addLog('info', 'jodoo', 'Webhook', 'Assignment synced to Jodoo');
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, assigned_to: staff.name.replace(/^[^\s]+\s/, '') } : d));
      setHumanStaff(prev => prev.map(s => s.id === staffId ? { ...s, tasks_today: s.tasks_today + 1, status: 'busy' } : s));
    }
    setShowAssignModal(false);
    setSelectedDeal(null);
  };

  const pipelineValue = deals.reduce((s, d) => s + d.total_sales, 0);
  const commission = 48000;
  const target = 100000;
  const aiTasksToday = aiWorkers.reduce((s, w) => s + w.tasks_today, 0);
  const humanTasksToday = humanStaff.reduce((s, w) => s + w.tasks_today, 0);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const allWorkers = activeTab === 'ai' ? aiWorkers : activeTab === 'human' ? humanStaff : [...aiWorkers, ...humanStaff];
  const maxFunnelCount = Math.max(...pipelineStages.slice(0, -1).map(s => s.count));

  return (
    <>
      <Head><title>FIDOS BD Manager v4.2 - Jodoo Integrated</title></Head>
      <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', padding: '1rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header with Jodoo Status */}
          <header style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                  🤖 FIDOS BD Manager <span style={{ fontSize: '0.8rem', color: '#8b5cf6' }}>v4.2</span>
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                  Solar • Voltek Energy • AI + Human Workforce
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => setShowSyncModal(true)} disabled={syncing} style={{ padding: '0.5rem 1rem', background: syncing ? '#334155' : '#8b5cf6', borderRadius: '8px', border: 'none', color: 'white', cursor: syncing ? 'wait' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {syncing ? '⏳' : '🔄'} Sync Jodoo
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>BD Manager</div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Megat Mohd Firdaus</div>
                </div>
                <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>M</div>
              </div>
            </div>
            
            {/* Jodoo Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: jodooStatus.connected ? '#22c55e' : '#ef4444', fontSize: '0.6rem' }}>●</span>
                <span style={{ color: '#94a3b8' }}>Jodoo:</span>
                <span style={{ color: jodooStatus.connected ? '#22c55e' : '#ef4444' }}>
                  {jodooStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div style={{ color: '#334155' }}>│</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Last sync:</span>
                <span>{timeAgo(jodooStatus.lastSync)}</span>
              </div>
              <div style={{ color: '#334155' }}>│</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Records:</span>
                <span style={{ color: '#06b6d4' }}>{jodooStatus.recordCount}</span>
              </div>
              <div style={{ color: '#334155' }}>│</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: jodooStatus.webhookActive ? '#22c55e' : '#94a3b8', fontSize: '0.6rem' }}>●</span>
                <span style={{ color: '#94a3b8' }}>Webhook:</span>
                <span style={{ color: jodooStatus.webhookActive ? '#22c55e' : '#94a3b8' }}>
                  {jodooStatus.webhookActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ color: '#334155' }}>│</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Auto-sync:</span>
                <span style={{ color: jodooStatus.autoSync ? '#22c55e' : '#94a3b8' }}>
                  {jodooStatus.autoSync ? `Every ${jodooStatus.syncInterval}m` : 'Off'}
                </span>
              </div>
              <button onClick={() => setShowJodooSettings(true)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>
                ⚙️
              </button>
            </div>
          </header>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <StatCard label="Total Workers" value={`${aiWorkers.length} + ${humanStaff.length}`} sub="🤖 AI + 👥 Human" subColor="#22c55e" />
            <StatCard label="Tasks Today" value={(aiTasksToday + humanTasksToday).toString()} sub={`${completedTasks}/${tasks.length} completed`} subColor="#94a3b8" />
            <StatCard label="Pipeline Value" value={`RM ${(pipelineValue/1000).toFixed(0)}k`} sub={`${deals.length} active deals`} subColor="#94a3b8" valueColor="#22c55e" />
            <StatCard label="Jodoo Records" value={jodooStatus.recordCount.toString()} sub={`Synced ${timeAgo(jodooStatus.lastSync)}`} subColor="#8b5cf6" valueColor="#06b6d4" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Pipeline Funnel */}
              <Card title="📊 Pipeline Funnel" subtitle="From Jodoo" badge={{ label: '🔗 Live', color: '#22c55e' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {pipelineStages.map((stage, index) => {
                    const widthPercent = stage.name === 'Completed' ? 100 : Math.max(15, (stage.count / maxFunnelCount) * 100);
                    const isPayment = stage.name === 'Payment 80%';
                    return (
                      <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '85px', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right' }}>
                          {stage.icon} {stage.name}
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div style={{ 
                            height: '24px', 
                            width: `${widthPercent}%`,
                            background: isPayment 
                              ? `repeating-linear-gradient(45deg, ${stage.color}44, ${stage.color}44 10px, ${stage.color}66 10px, ${stage.color}66 20px)`
                              : `linear-gradient(90deg, ${stage.color}66, ${stage.color}33)`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '0.5rem',
                            border: isPayment ? `2px solid ${stage.color}` : `1px solid ${stage.color}44`,
                          }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{stage.count}</span>
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: '#94a3b8' }}>
                              RM {(stage.value / 1000).toFixed(0)}k
                            </span>
                            {isPayment && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', color: '#ef4444' }}>⚠️ RM720k stuck!</span>}
                          </div>
                        </div>
                        {index < pipelineStages.length - 2 && (
                          <div style={{ width: '40px', fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>
                            {pipelineStages[index + 1].count > 0 ? `${Math.round((pipelineStages[index + 1].count / stage.count) * 100)}%` : '-'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Weekly Stats */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <WeeklyCompare label="Quotes" current={weeklyStats.quotes.current} change={weeklyStats.quotes.change} />
                  <WeeklyCompare label="Closes" current={weeklyStats.closes.current} change={weeklyStats.closes.change} />
                  <WeeklyCompare label="Revenue" current={weeklyStats.revenue.current} change={weeklyStats.revenue.change} isRM />
                </div>
              </Card>

              {/* Worker Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '-0.5rem' }}>
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>📊 All ({aiWorkers.length + humanStaff.length})</TabButton>
                <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>🤖 AI ({aiWorkers.length})</TabButton>
                <TabButton active={activeTab === 'human'} onClick={() => setActiveTab('human')}>👥 Human ({humanStaff.length})</TabButton>
              </div>

              {/* Workers Table */}
              <Card title={activeTab === 'ai' ? '🤖 AI Workers' : activeTab === 'human' ? '👥 Human Staff' : '📊 All Workers'} subtitle="Real-time">
                <table style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ paddingBottom: '0.5rem' }}>Worker</th>
                      <th style={{ paddingBottom: '0.5rem' }}>Role</th>
                      {activeTab !== 'ai' && <th style={{ paddingBottom: '0.5rem' }}>Location</th>}
                      <th style={{ paddingBottom: '0.5rem' }}>Status</th>
                      <th style={{ paddingBottom: '0.5rem' }}>Tasks</th>
                      <th style={{ paddingBottom: '0.5rem' }}>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allWorkers.map(w => (
                      <tr key={w.id} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '0.5rem 0', fontWeight: '500', fontSize: '0.8rem' }}>{w.name}</td>
                        <td style={{ padding: '0.5rem 0', color: '#94a3b8', fontSize: '0.75rem' }}>{w.role}</td>
                        {activeTab !== 'ai' && <td style={{ padding: '0.5rem 0', color: '#64748b', fontSize: '0.7rem' }}>{w.location || '-'}</td>}
                        <td style={{ padding: '0.5rem 0' }}><StatusBadge status={w.status} /></td>
                        <td style={{ padding: '0.5rem 0', fontSize: '0.8rem' }}>{w.tasks_today}</td>
                        <td style={{ padding: '0.5rem 0' }}>
                          <span style={{ color: w.success_rate >= 80 ? '#22c55e' : w.success_rate >= 60 ? '#eab308' : '#ef4444', fontSize: '0.8rem' }}>
                            {w.success_rate > 0 ? `${w.success_rate}%` : '--'}
                          </span>
                          {w.success_rate > 0 && w.success_rate < 70 && ' ⚠️'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Deal Pipeline with Jodoo Links */}
              <Card title="💰 Active Deals" subtitle="🔗 Jodoo linked" action={{ label: 'View All →', href: '/' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {deals.map(d => {
                    const { tag, color } = getTagFromStatus(d.status);
                    return (
                      <div key={d.id} style={{ background: 'rgba(51,65,85,0.4)', borderRadius: '8px', padding: '0.6rem', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{d.customer_name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {d.finalized_capacity_kwp} kW • {d.customer_state}
                              {d.assigned_to && (
                                <span style={{ marginLeft: '0.5rem', padding: '1px 5px', background: '#06b6d433', color: '#06b6d4', borderRadius: '3px', fontSize: '0.6rem' }}>
                                  👤 {d.assigned_to}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '0.9rem' }}>RM {d.total_sales.toLocaleString()}</div>
                            <div style={{ fontSize: '0.65rem', color }}>{tag}</div>
                          </div>
                        </div>
                        
                        {/* Jodoo Link Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid #334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button 
                              onClick={() => openInJodoo(d.jodoo_id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: '#8b5cf622', border: '1px solid #8b5cf644', borderRadius: '4px', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.65rem' }}
                            >
                              🔗 {d.project_no || 'View in Jodoo'}
                            </button>
                            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                              ↻ {d.last_synced}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button 
                              onClick={() => handleExportToJodoo(d)}
                              style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.65rem' }}
                            >
                              ↑ Push
                            </button>
                            <button 
                              onClick={() => handleAssignTask(d)}
                              style={{ padding: '0.25rem 0.5rem', background: '#334155', borderRadius: '4px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.65rem' }}
                            >
                              👤 Assign
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Jodoo Sync Widget */}
              <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.3)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>🔗 Jodoo ERP Sync</div>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: jodooStatus.connected ? '#22c55e33' : '#ef444433', color: jodooStatus.connected ? '#22c55e' : '#ef4444', borderRadius: '4px' }}>
                    ● {jodooStatus.connected ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  <div><span style={{ color: '#94a3b8' }}>Records:</span> <span style={{ color: '#06b6d4' }}>{jodooStatus.recordCount}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Last sync:</span> <span>{timeAgo(jodooStatus.lastSync)}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Webhook:</span> <span style={{ color: jodooStatus.webhookActive ? '#22c55e' : '#94a3b8' }}>{jodooStatus.webhookActive ? 'Active' : 'Off'}</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Auto:</span> <span style={{ color: jodooStatus.autoSync ? '#22c55e' : '#94a3b8' }}>{jodooStatus.autoSync ? `${jodooStatus.syncInterval}m` : 'Off'}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleJodooSync} disabled={syncing} style={{ flex: 1, padding: '0.5rem', background: '#8b5cf6', borderRadius: '6px', border: 'none', color: 'white', cursor: syncing ? 'wait' : 'pointer', fontSize: '0.75rem' }}>
                    {syncing ? '⏳ Syncing...' : '↓ Import'}
                  </button>
                  <button onClick={() => setShowJodooSettings(true)} style={{ padding: '0.5rem', background: '#334155', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
                    ⚙️
                  </button>
                </div>
              </div>
              
              {/* Commission */}
              <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,179,8,0.2))', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.3)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#fdba74', marginBottom: '0.25rem' }}>💰 Commission (Jan 2026)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>RM {commission.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>4 closes × 80kWp × RM150</div>
                <div style={{ height: '6px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(commission/target)*100}%`, background: 'linear-gradient(90deg, #f97316, #eab308)', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem' }}>{((commission/target)*100).toFixed(0)}% of RM{(target/1000).toFixed(0)}k target</div>
              </div>

              {/* Tasks */}
              <Card title="📋 Today" subtitle={`${completedTasks}/${tasks.length}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {tasks.slice(0, 5).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                      <TaskStatusIcon status={t.status} />
                      <span style={{ color: t.staff_type === 'ai' ? '#8b5cf6' : '#06b6d4', width: '55px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.staff_name}</span>
                      <span style={{ flex: 1, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.customer}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Alerts */}
              <Card title="⚠️ Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <AlertItem color="#ef4444" title="30 NEM Approved" sub="RM720k pending 80% payment!" highlight />
                  <AlertItem color="#eab308" title="En Din - Delayed" sub="Reschedule needed" />
                  <AlertItem color="#06b6d4" title="Accounts - 60%" sub="Low collection rate" />
                </div>
              </Card>

              {/* Governance Log */}
              <Card title="🔒 Governance" badge={{ label: 'Type B', color: '#3b82f6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {logs.slice(0, 8).map(log => (
                    <div key={log.id} style={{ display: 'flex', gap: '0.3rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#64748b', width: '32px' }}>{log.time}</span>
                      <span style={{ color: log.type === 'success' ? '#22c55e' : log.type === 'pending' ? '#eab308' : log.type === 'warning' ? '#ef4444' : '#06b6d4' }}>
                        {log.type === 'success' ? '✓' : log.type === 'pending' ? '○' : log.type === 'warning' ? '⚠' : '●'}
                      </span>
                      <span style={{ 
                        width: '50px', 
                        fontSize: '0.6rem',
                        color: log.source === 'ai' ? '#8b5cf6' : log.source === 'jodoo' ? '#06b6d4' : log.source === 'human' ? '#22c55e' : '#94a3b8'
                      }}>
                        {log.source === 'jodoo' ? '🔗' : log.source === 'ai' ? '🤖' : '👤'} {log.source_name}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <a href="/" style={{ display: 'block', padding: '0.6rem', background: '#0ea5e9', borderRadius: '8px', textAlign: 'center', fontWeight: '500', fontSize: '0.8rem', textDecoration: 'none', color: 'white' }}>⚡ Generate Quote</a>
                <button onClick={handleWhatsAppBatch} style={{ padding: '0.6rem', background: '#22c55e', borderRadius: '8px', fontWeight: '500', fontSize: '0.8rem', border: 'none', color: 'white', cursor: 'pointer' }}>📱 WhatsApp Batch</button>
                <button onClick={() => setShowReportModal(true)} style={{ padding: '0.6rem', background: '#334155', borderRadius: '8px', fontWeight: '500', fontSize: '0.8rem', border: 'none', color: 'white', cursor: 'pointer' }}>📊 Daily Report</button>
              </div>
            </div>
          </div>

          {/* Modals */}
          {showAssignModal && selectedDeal && (
            <Modal title="👤 Assign Task" onClose={() => { setShowAssignModal(false); setSelectedDeal(null); }}>
              <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#334155', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: '500' }}>{selectedDeal.customer_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{selectedDeal.project_no}</div>
              </div>
              <select id="taskType" style={{ width: '100%', padding: '0.6rem', marginBottom: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                <option value="site_visit">🔍 Site Visit</option>
                <option value="installation">🔧 Installation</option>
                <option value="doc_process">📋 Doc Processing</option>
                <option value="payment_chase">💰 Payment Collection</option>
              </select>
              <select id="staffSelect" style={{ width: '100%', padding: '0.6rem', marginBottom: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                {humanStaff.filter(s => s.status !== 'on_leave').map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.status}</option>
                ))}
              </select>
              <div style={{ padding: '0.5rem', background: '#8b5cf622', border: '1px solid #8b5cf644', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.7rem' }}>
                🔗 Will sync to Jodoo automatically
              </div>
              <button onClick={() => confirmAssignment((document.getElementById('staffSelect') as HTMLSelectElement).value, (document.getElementById('taskType') as HTMLSelectElement).value)} style={{ width: '100%', padding: '0.6rem', background: '#22c55e', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                ✓ Confirm Assignment
              </button>
            </Modal>
          )}

          {showSyncModal && (
            <Modal title="🔄 Jodoo Sync" onClose={() => setShowSyncModal(false)}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#334155', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#94a3b8' }}>Status:</span> <span style={{ color: '#22c55e' }}>● Connected</span></div>
                  <div><span style={{ color: '#94a3b8' }}>Records:</span> {jodooStatus.recordCount}</div>
                  <div><span style={{ color: '#94a3b8' }}>Last:</span> {timeAgo(jodooStatus.lastSync)}</div>
                  <div><span style={{ color: '#94a3b8' }}>Webhook:</span> <span style={{ color: '#22c55e' }}>Active</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button onClick={handleJodooSync} disabled={syncing} style={{ flex: 1, padding: '0.6rem', background: '#8b5cf6', borderRadius: '6px', border: 'none', color: 'white', cursor: syncing ? 'wait' : 'pointer', fontSize: '0.8rem' }}>
                  {syncing ? '⏳' : '↓'} Import All
                </button>
                <button style={{ flex: 1, padding: '0.6rem', background: '#334155', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                  ↑ Export Changed
                </button>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
                Webhook URL: /api/jodoo/webhook
              </div>
            </Modal>
          )}

          {showJodooSettings && (
            <Modal title="⚙️ Jodoo Settings" onClose={() => setShowJodooSettings(false)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Auto-sync Interval</label>
                  <select 
                    value={jodooStatus.syncInterval} 
                    onChange={(e) => setJodooStatus(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                  >
                    <option value={1}>Every 1 minute</option>
                    <option value={5}>Every 5 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem' }}>Auto-sync enabled</span>
                  <button 
                    onClick={() => setJodooStatus(prev => ({ ...prev, autoSync: !prev.autoSync }))}
                    style={{ padding: '0.4rem 0.75rem', background: jodooStatus.autoSync ? '#22c55e' : '#334155', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {jodooStatus.autoSync ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem' }}>Webhook notifications</span>
                  <button 
                    onClick={() => setJodooStatus(prev => ({ ...prev, webhookActive: !prev.webhookActive }))}
                    style={{ padding: '0.4rem 0.75rem', background: jodooStatus.webhookActive ? '#22c55e' : '#334155', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {jodooStatus.webhookActive ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div style={{ padding: '0.5rem', background: '#334155', borderRadius: '6px', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <div>API: api.jodoo.com/api/v5</div>
                  <div>Webhook: /api/jodoo/webhook</div>
                </div>
              </div>
            </Modal>
          )}

          {showReportModal && (
            <Modal title="📊 Daily Report" onClose={() => setShowReportModal(false)}>
              <div style={{ background: '#334155', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                  <div>AI Tasks: <strong>{aiTasksToday}</strong></div>
                  <div>Human Tasks: <strong>{humanTasksToday}</strong></div>
                  <div>Pipeline: <strong style={{ color: '#22c55e' }}>RM {pipelineValue.toLocaleString()}</strong></div>
                  <div>Commission: <strong style={{ color: '#f97316' }}>RM {commission.toLocaleString()}</strong></div>
                  <div>Jodoo Records: <strong style={{ color: '#06b6d4' }}>{jodooStatus.recordCount}</strong></div>
                  <div>Last Sync: <strong>{timeAgo(jodooStatus.lastSync)}</strong></div>
                </div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`FIDOS Report\nPipeline: RM ${pipelineValue.toLocaleString()}\nJodoo: ${jodooStatus.recordCount} records`); alert('Copied!'); }} style={{ width: '100%', padding: '0.6rem', background: '#0ea5e9', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                📋 Copy Report
              </button>
            </Modal>
          )}

          {/* Footer */}
          <footer style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <div>FIDOS BD Manager v4.2 • Qontrek × Voltek × Jodoo</div>
            <div>🔗 Jodoo {jodooStatus.connected ? 'Connected' : 'Offline'} • CIVOS Type B Active</div>
          </footer>
        </div>
      </div>
    </>
  );
}

// Components
function StatCard({ label, value, sub, subColor, valueColor }: { label: string; value: string; sub: string; subColor: string; valueColor?: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '10px', padding: '0.75rem', border: '1px solid #334155' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: valueColor || 'white' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: subColor, marginTop: '0.2rem' }}>{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, badge, action, children }: { title: string; subtitle?: string; badge?: { label: string; color: string }; action?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155' }}>
      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontWeight: '600', margin: 0, fontSize: '0.85rem' }}>{title}</h2>
        {subtitle && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{subtitle}</span>}
        {badge && <span style={{ fontSize: '0.6rem', padding: '2px 5px', background: `${badge.color}33`, color: badge.color, borderRadius: '4px' }}>{badge.label}</span>}
        {action && <a href={action.href} style={{ fontSize: '0.65rem', color: '#06b6d4', textDecoration: 'none' }}>{action.label}</a>}
      </div>
      <div style={{ padding: '0.6rem' }}>{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '0.35rem 0.6rem', background: active ? '#334155' : 'transparent', border: '1px solid #334155', borderBottom: active ? '1px solid #1e293b' : '1px solid #334155', borderRadius: '5px 5px 0 0', color: active ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', marginBottom: '-1px' }}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    'active': { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' },
    'busy': { bg: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
    'pending': { bg: 'rgba(234,179,8,0.2)', text: '#eab308' },
    'idle': { bg: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
    'on_leave': { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' },
  };
  const { bg, text } = colors[status] || colors['idle'];
  return <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.6rem', background: bg, color: text }}>● {status}</span>;
}

function TaskStatusIcon({ status }: { status: string }) {
  const icons: Record<string, { icon: string; color: string }> = {
    'completed': { icon: '✓', color: '#22c55e' },
    'ongoing': { icon: '●', color: '#3b82f6' },
    'pending': { icon: '○', color: '#94a3b8' },
    'delayed': { icon: '⚠', color: '#ef4444' },
  };
  const { icon, color } = icons[status] || icons['pending'];
  return <span style={{ color, fontWeight: 'bold', width: '14px', fontSize: '0.7rem' }}>{icon}</span>;
}

function AlertItem({ color, title, sub, highlight }: { color: string; title: string; sub: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', padding: highlight ? '0.4rem' : 0, background: highlight ? `${color}11` : 'transparent', borderRadius: '6px', border: highlight ? `1px solid ${color}33` : 'none' }}>
      <span style={{ color, fontSize: '0.8rem' }}>●</span>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: '0.65rem', color: highlight ? color : '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  );
}

function WeeklyCompare({ label, current, change, isRM }: { label: string; current: number; change: number; isRM?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{isRM ? `RM ${(current/1000).toFixed(0)}k` : current}</div>
      <div style={{ fontSize: '0.6rem', color: change >= 0 ? '#22c55e' : '#ef4444' }}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.25rem', maxWidth: '380px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
