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
  customer_name: string;
  customer_state?: string;
  customer_phone?: string;
  finalized_capacity_kwp?: number;
  total_sales: number;
  status: string;
  stage: number;
  assigned_to?: string;
}

interface Task {
  id: string;
  staff_name: string;
  staff_type: 'ai' | 'human';
  task_type: string;
  description: string;
  customer: string;
  time: string;
  status: 'completed' | 'ongoing' | 'pending' | 'delayed';
}

interface LogEntry {
  id: string;
  time: string;
  type: 'success' | 'pending' | 'info' | 'warning';
  source: 'ai' | 'human' | 'system';
  source_name: string;
  message: string;
}

function getTagFromStatus(status: string): { tag: string; color: string } {
  const mapping: Record<string, { tag: string; color: string }> = {
    'quoted': { tag: '🔥 Hot Lead', color: '#f97316' },
    'site_visit': { tag: '✓ Qualified', color: '#22c55e' },
    'negotiating': { tag: '⭐ Enterprise', color: '#06b6d4' },
    'seda_pending': { tag: '📋 SEDA', color: '#eab308' },
    'completed': { tag: '✅ Completed', color: '#22c55e' },
  };
  return mapping[status] || { tag: '⚠️ Follow up', color: '#ef4444' };
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'ai' | 'human' | 'all'>('all');
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

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

  // Today's Tasks
  const [tasks] = useState<Task[]>([
    { id: 't1', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', description: 'Site survey + measurements', customer: 'Ahmad Abdullah, PJ', time: '10:00 AM', status: 'completed' },
    { id: 't2', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', description: 'Site survey', customer: 'Siti Aminah, Shah Alam', time: '2:00 PM', status: 'ongoing' },
    { id: 't3', staff_name: 'Haziq', staff_type: 'human', task_type: 'Site Visit', description: 'Site survey', customer: 'Lee Wei Ming, Subang', time: '4:00 PM', status: 'pending' },
    { id: 't4', staff_name: 'Acong Team', staff_type: 'human', task_type: 'Installation', description: 'Day 2/2 - Panel mounting', customer: 'Mohd Akmal, Kajang', time: '8:00 AM', status: 'ongoing' },
    { id: 't5', staff_name: 'Sarah', staff_type: 'human', task_type: 'SEDA Submit', description: 'Submit application', customer: 'Q-2026-041', time: '9:00 AM', status: 'completed' },
    { id: 't6', staff_name: 'Sarah', staff_type: 'human', task_type: 'SEDA Submit', description: 'Submit application', customer: 'Q-2026-042', time: '10:00 AM', status: 'completed' },
    { id: 't7', staff_name: 'En Din', staff_type: 'human', task_type: 'Installation', description: 'Day 1 - Site prep', customer: 'Delayed - reschedule', time: '8:00 AM', status: 'delayed' },
    { id: 't8', staff_name: 'QuoteGen', staff_type: 'ai', task_type: 'Quote', description: 'Auto-generated quote', customer: 'New lead from website', time: '11:30 AM', status: 'completed' },
    { id: 't9', staff_name: 'WhatsApp', staff_type: 'ai', task_type: 'Message', description: 'Follow-up batch', customer: '5 pending leads', time: '12:00 PM', status: 'completed' },
  ]);

  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', customer_name: 'Ahmad Abdullah', customer_state: 'Petaling Jaya', finalized_capacity_kwp: 5.5, total_sales: 22500, status: 'quoted', stage: 2, customer_phone: '+60123456789' },
    { id: '2', customer_name: 'Siti Aminah', customer_state: 'Shah Alam', finalized_capacity_kwp: 8, total_sales: 32000, status: 'site_visit', stage: 3, customer_phone: '+60198765432', assigned_to: 'Haziq' },
    { id: '3', customer_name: 'Syarikat ABC Sdn Bhd', customer_state: 'Klang', finalized_capacity_kwp: 80, total_sales: 168000, status: 'negotiating', stage: 4, customer_phone: '+60376543210' },
    { id: '4', customer_name: 'Lee Wei Ming', customer_state: 'Subang', finalized_capacity_kwp: 4, total_sales: 16000, status: 'quoted', stage: 2, customer_phone: '+60112345678' },
    { id: '5', customer_name: 'Muhammad Lokman', customer_state: 'Wangsa Melawati', finalized_capacity_kwp: 10.2, total_sales: 45500, status: 'seda_pending', stage: 3, customer_phone: '+60145678901', assigned_to: 'Sarah' },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '12:34', type: 'success', source: 'ai', source_name: 'QuoteGen', message: 'Quote #Q-2026-047 generated → CONFIRMED' },
    { id: '2', time: '12:35', type: 'success', source: 'human', source_name: 'Megat', message: 'Confirmed quote (1.2s delay)' },
    { id: '3', time: '12:35', type: 'success', source: 'ai', source_name: 'WhatsApp', message: 'Message sent to +60123456789' },
    { id: '4', time: '12:40', type: 'success', source: 'human', source_name: 'Haziq', message: 'Site visit completed: Ahmad Abdullah' },
    { id: '5', time: '12:45', type: 'info', source: 'human', source_name: 'Sarah', message: 'SEDA submitted: Q-2026-047' },
    { id: '6', time: '13:00', type: 'success', source: 'human', source_name: 'Acong', message: 'Installation Day 1 complete' },
    { id: '7', time: '13:15', type: 'pending', source: 'human', source_name: 'Accounts', message: 'Payment reminder sent (pending response)' },
    { id: '8', time: '13:20', type: 'warning', source: 'human', source_name: 'En Din', message: 'Site visit DELAYED - customer reschedule' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((type: 'success' | 'pending' | 'info' | 'warning', source: 'ai' | 'human' | 'system', source_name: string, message: string) => {
    const time = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ id: Date.now().toString(), time, type, source, source_name, message }, ...prev].slice(0, 20));
  }, [currentTime]);

  const handleWhatsAppBatch = () => {
    const pending = deals.filter(d => d.status === 'quoted');
    addLog('info', 'ai', 'WhatsApp', `Batch queued: ${pending.length} messages`);
    pending.forEach((deal, i) => {
      setTimeout(() => {
        const msg = encodeURIComponent(`Hi ${deal.customer_name}! 🌞\n\nRegarding your ${deal.finalized_capacity_kwp} kW solar inquiry:\n💰 Investment: RM ${deal.total_sales.toLocaleString()}\n\nReply YES to proceed!\n\n- Voltek Energy`);
        window.open(`https://wa.me/${deal.customer_phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
        addLog('success', 'ai', 'WhatsApp', `Message sent to ${deal.customer_name}`);
      }, i * 1500);
    });
  };

  const handleJodooSync = async () => {
    setSyncing(true);
    addLog('info', 'system', 'Jodoo', 'Starting sync...');
    try {
      const res = await fetch('/api/jodoo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      });
      const result = await res.json();
      addLog(result.success ? 'success' : 'warning', 'system', 'Jodoo', result.message || result.error);
    } catch (err) {
      addLog('warning', 'system', 'Jodoo', `Error: ${err}`);
    }
    setSyncing(false);
    setShowSyncModal(false);
  };

  const handleAssignTask = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowAssignModal(true);
  };

  const confirmAssignment = (staffId: string, taskType: string, date: string, time: string) => {
    if (!selectedDeal) return;
    const staff = humanStaff.find(s => s.id === staffId);
    if (staff) {
      addLog('success', 'human', 'Megat', `Assigned ${taskType} to ${staff.name}: ${selectedDeal.customer_name}`);
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, assigned_to: staff.name.replace(/^[^\s]+\s/, '') } : d));
      setHumanStaff(prev => prev.map(s => s.id === staffId ? { ...s, tasks_today: s.tasks_today + 1, status: 'busy' } : s));
    }
    setShowAssignModal(false);
    setSelectedDeal(null);
  };

  const handleReport = () => {
    setShowReportModal(true);
    addLog('success', 'ai', 'Reporter', 'Daily summary generated');
  };

  const pipelineValue = deals.reduce((s, d) => s + d.total_sales, 0);
  const commission = 48000;
  const target = 100000;
  const totalWorkers = aiWorkers.length + humanStaff.length;
  const totalTasks = aiWorkers.reduce((s, w) => s + w.tasks_today, 0) + humanStaff.reduce((s, w) => s + w.tasks_today, 0);

  const allWorkers = activeTab === 'ai' ? aiWorkers : activeTab === 'human' ? humanStaff : [...aiWorkers, ...humanStaff];

  return (
    <>
      <Head><title>FIDOS BD Manager v4 - AI + Human Workforce</title></Head>
      <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', padding: '1rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>🤖 FIDOS BD Manager <span style={{ fontSize: '0.875rem', color: '#8b5cf6' }}>v4.0</span></h1>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Solar Vertical • Voltek Energy • <span style={{ color: '#22c55e' }}>AI + Human Workforce</span></p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setShowSyncModal(true)} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>
                🔄 Sync Jodoo
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>BD Manager</div>
                <div style={{ fontWeight: '600' }}>Megat Mohd Firdaus</div>
              </div>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>M</div>
            </div>
          </header>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Workers" value={`${aiWorkers.filter(w => w.status === 'active').length} + ${humanStaff.filter(w => w.status === 'active' || w.status === 'busy').length}`} sub="🤖 AI + 👥 Human" subColor="#22c55e" />
            <StatCard label="Tasks Today" value={totalTasks.toString()} sub={`${tasks.filter(t => t.status === 'completed').length} completed`} subColor="#94a3b8" />
            <StatCard label="Pipeline Value" value={`RM ${(pipelineValue/1000).toFixed(0)}k`} sub={`${deals.length} active deals`} subColor="#94a3b8" valueColor="#22c55e" />
            <StatCard label="Conversion Rate" value="32%" sub="↑ 8% from last week" subColor="#22c55e" valueColor="#f97316" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Worker Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '-0.5rem' }}>
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>📊 All Workers ({totalWorkers})</TabButton>
                <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>🤖 AI Workers ({aiWorkers.length})</TabButton>
                <TabButton active={activeTab === 'human'} onClick={() => setActiveTab('human')}>👥 Human Staff ({humanStaff.length})</TabButton>
              </div>

              {/* Workers Table */}
              <Card title={activeTab === 'ai' ? '🤖 AI Worker Performance' : activeTab === 'human' ? '👥 Human Staff Performance' : '📊 All Workers Performance'} subtitle="Real-time status">
                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ paddingBottom: '0.75rem' }}>Worker</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Role</th>
                      {activeTab !== 'ai' && <th style={{ paddingBottom: '0.75rem' }}>Team/Location</th>}
                      <th style={{ paddingBottom: '0.75rem' }}>Status</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Tasks</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allWorkers.map(w => (
                      <tr key={w.id} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: '500' }}>
                          {w.type === 'ai' ? '' : ''}{w.name}
                        </td>
                        <td style={{ padding: '0.75rem 0', color: '#94a3b8' }}>{w.role}</td>
                        {activeTab !== 'ai' && (
                          <td style={{ padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                            {w.team && <span>{w.team}</span>}
                            {w.location && <span style={{ color: '#64748b' }}> • {w.location}</span>}
                          </td>
                        )}
                        <td style={{ padding: '0.75rem 0' }}>
                          <StatusBadge status={w.status} />
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>{w.tasks_today} today</td>
                        <td style={{ padding: '0.75rem 0' }}>
                          <span style={{ color: w.success_rate >= 80 ? '#22c55e' : w.success_rate >= 60 ? '#eab308' : '#ef4444' }}>
                            {w.success_rate > 0 ? `${w.success_rate}%` : '--'}
                          </span>
                          {w.success_rate < 70 && w.success_rate > 0 && <span style={{ marginLeft: '4px' }}>⚠️</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Today's Tasks */}
              <Card title="📋 Today's Tasks" subtitle={`${tasks.filter(t => t.status === 'completed').length}/${tasks.length} completed`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'rgba(51,65,85,0.3)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', width: '60px' }}>{t.time}</span>
                      <TaskStatusIcon status={t.status} />
                      <span style={{ fontSize: '0.75rem', color: t.staff_type === 'ai' ? '#8b5cf6' : '#06b6d4' }}>
                        {t.staff_type === 'ai' ? '🤖' : '👤'} {t.staff_name}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>•</span>
                      <span style={{ fontSize: '0.875rem', flex: 1 }}>{t.task_type}: {t.customer}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Deal Pipeline */}
              <Card title="💰 Deal Pipeline" action={{ label: 'View All →', href: '/' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deals.map(d => {
                    const { tag, color } = getTagFromStatus(d.status);
                    return (
                      <div key={d.id} style={{ background: 'rgba(51,65,85,0.5)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500' }}>{d.customer_name} • {d.customer_state}</div>
                          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                            {d.finalized_capacity_kwp} kW • {d.status.replace('_', ' ')}
                            {d.assigned_to && <span style={{ color: '#06b6d4' }}> • 👤 {d.assigned_to}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                          <div style={{ fontWeight: 'bold', color: '#22c55e' }}>RM {d.total_sales.toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color }}>{tag}</div>
                        </div>
                        <button 
                          onClick={() => handleAssignTask(d)}
                          style={{ padding: '0.5rem 0.75rem', background: '#334155', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          👤 Assign
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Commission */}
              <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,179,8,0.2))', borderRadius: '12px', border: '1px solid rgba(249,115,22,0.3)', padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#fdba74', marginBottom: '0.5rem' }}>💰 Commission Tracker (Jan 2026)</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>RM {commission.toLocaleString()}</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>4 closes × 80kWp × RM150</div>
                <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(commission/target)*100}%`, background: 'linear-gradient(90deg, #f97316, #eab308)', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>{((commission/target)*100).toFixed(0)}% of RM{(target/1000).toFixed(0)}k target</div>
              </div>

              {/* Alerts */}
              <Card title="⚠️ Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <AlertItem color="#ef4444" title="En Din - Task delayed" sub="Installation rescheduled by customer" />
                  <AlertItem color="#eab308" title="Accounts - Low success rate" sub="60% payment collection this week" />
                  <AlertItem color="#06b6d4" title="Haziq - 3 site visits today" sub="Currently at Shah Alam" />
                  <AlertItem color="#22c55e" title="Sarah - 12 docs processed" sub="93% completion rate" />
                </div>
              </Card>

              {/* Governance Log */}
              <Card title="🔒 CIVOS Governance Log" badge={{ label: 'Type B Active', color: '#3b82f6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#64748b', width: '40px' }}>{log.time}</span>
                      <span style={{ color: log.type === 'success' ? '#22c55e' : log.type === 'pending' ? '#eab308' : log.type === 'warning' ? '#ef4444' : '#06b6d4' }}>
                        {log.type === 'success' ? '✓' : log.type === 'pending' ? '○' : log.type === 'warning' ? '⚠' : '●'}
                      </span>
                      <span style={{ color: log.source === 'ai' ? '#8b5cf6' : log.source === 'human' ? '#06b6d4' : '#94a3b8', width: '70px', fontSize: '0.7rem' }}>
                        {log.source === 'ai' ? '🤖' : log.source === 'human' ? '👤' : '⚙️'} {log.source_name}
                      </span>
                      <span style={{ flex: 1 }}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/" style={{ display: 'block', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', textAlign: 'center', fontWeight: '500', fontSize: '0.875rem', textDecoration: 'none', color: 'white' }}>⚡ Generate New Quote</a>
                <button onClick={handleWhatsAppBatch} style={{ padding: '0.75rem', background: '#22c55e', borderRadius: '8px', fontWeight: '500', fontSize: '0.875rem', border: 'none', color: 'white', cursor: 'pointer' }}>📱 Send WhatsApp Batch</button>
                <button onClick={handleReport} style={{ padding: '0.75rem', background: '#334155', borderRadius: '8px', fontWeight: '500', fontSize: '0.875rem', border: 'none', color: 'white', cursor: 'pointer' }}>📊 Generate Daily Report</button>
              </div>
            </div>
          </div>

          {/* Assign Modal */}
          {showAssignModal && selectedDeal && (
            <Modal title="👤 Assign Task" onClose={() => { setShowAssignModal(false); setSelectedDeal(null); }}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#334155', borderRadius: '8px' }}>
                <div style={{ fontWeight: '500' }}>{selectedDeal.customer_name}</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{selectedDeal.customer_state} • {selectedDeal.finalized_capacity_kwp} kW • RM {selectedDeal.total_sales.toLocaleString()}</div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>Task Type</label>
                <select id="taskType" style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}>
                  <option value="site_visit">🔍 Site Visit</option>
                  <option value="installation">🔧 Installation</option>
                  <option value="doc_process">📋 Document Processing</option>
                  <option value="payment_chase">💰 Payment Collection</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>Assign To</label>
                <select id="staffSelect" style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}>
                  {humanStaff.filter(s => s.status !== 'on_leave').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role}) - {s.status}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>Date</label>
                  <input id="taskDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>Time</label>
                  <input id="taskTime" type="time" defaultValue="10:00" style={{ width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }} />
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>⏱️ Type B Governance</div>
                <div style={{ fontSize: '0.875rem' }}>This action requires your confirmation</div>
              </div>

              <button 
                onClick={() => {
                  const staffId = (document.getElementById('staffSelect') as HTMLSelectElement).value;
                  const taskType = (document.getElementById('taskType') as HTMLSelectElement).value;
                  const date = (document.getElementById('taskDate') as HTMLInputElement).value;
                  const time = (document.getElementById('taskTime') as HTMLInputElement).value;
                  confirmAssignment(staffId, taskType, date, time);
                }}
                style={{ width: '100%', padding: '0.75rem', background: '#22c55e', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                ✓ Confirm Assignment
              </button>
            </Modal>
          )}

          {/* Sync Modal */}
          {showSyncModal && (
            <Modal title="🔄 Jodoo ERP Sync" onClose={() => setShowSyncModal(false)}>
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Sync deals and staff data with Jodoo ERP.</p>
              <button onClick={handleJodooSync} disabled={syncing} style={{ width: '100%', padding: '0.75rem', background: '#8b5cf6', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: syncing ? 'wait' : 'pointer', opacity: syncing ? 0.7 : 1 }}>
                {syncing ? '⏳ Syncing...' : '📥 Import from Jodoo'}
              </button>
            </Modal>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <Modal title="📊 Daily BD Report" onClose={() => setShowReportModal(false)}>
              <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#94a3b8' }}>🤖 AI Workers</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div>Tasks: <strong>{aiWorkers.reduce((s, w) => s + w.tasks_today, 0)}</strong></div>
                  <div>Active: <strong style={{ color: '#22c55e' }}>{aiWorkers.filter(w => w.status === 'active').length}/{aiWorkers.length}</strong></div>
                </div>
              </div>

              <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#94a3b8' }}>👥 Human Staff</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div>Tasks: <strong>{humanStaff.reduce((s, w) => s + w.tasks_today, 0)}</strong></div>
                  <div>Active: <strong style={{ color: '#22c55e' }}>{humanStaff.filter(w => w.status === 'active' || w.status === 'busy').length}/{humanStaff.length}</strong></div>
                </div>
              </div>

              <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#94a3b8' }}>💰 Pipeline</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div>Deals: <strong>{deals.length}</strong></div>
                  <div>Value: <strong style={{ color: '#22c55e' }}>RM {pipelineValue.toLocaleString()}</strong></div>
                  <div>Commission: <strong style={{ color: '#f97316' }}>RM {commission.toLocaleString()}</strong></div>
                  <div>Target: <strong>{((commission/target)*100).toFixed(0)}%</strong></div>
                </div>
              </div>

              <button onClick={() => { 
                const report = `FIDOS BD Report - ${currentTime.toLocaleDateString()}\n\n🤖 AI Workers: ${aiWorkers.reduce((s, w) => s + w.tasks_today, 0)} tasks\n👥 Human Staff: ${humanStaff.reduce((s, w) => s + w.tasks_today, 0)} tasks\n💰 Pipeline: RM ${pipelineValue.toLocaleString()}\n📈 Commission: RM ${commission.toLocaleString()} (${((commission/target)*100).toFixed(0)}%)`;
                navigator.clipboard.writeText(report); 
                alert('Report copied!'); 
              }} style={{ width: '100%', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer' }}>
                📋 Copy Report
              </button>
            </Modal>
          )}

          {/* Footer */}
          <footer style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b' }}>
            <div>FIDOS BD Manager v4.0 • Qontrek × Voltek • AI + Human Workforce</div>
            <div>CIVOS Governance Active • Type B Enabled</div>
          </footer>
        </div>
      </div>
    </>
  );
}

// Components
function StatCard({ label, value, sub, subColor, valueColor }: { label: string; value: string; sub: string; subColor: string; valueColor?: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1rem', border: '1px solid #334155' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: valueColor || 'white' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: subColor, marginTop: '0.25rem' }}>{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, badge, action, children }: { title: string; subtitle?: string; badge?: { label: string; color: string }; action?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontWeight: '600', margin: 0, fontSize: '1rem' }}>{title}</h2>
        {subtitle && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</span>}
        {badge && <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: `${badge.color}33`, color: badge.color, borderRadius: '4px' }}>{badge.label}</span>}
        {action && <a href={action.href} style={{ fontSize: '0.75rem', color: '#06b6d4', textDecoration: 'none' }}>{action.label}</a>}
      </div>
      <div style={{ padding: '1rem' }}>{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: active ? '#334155' : 'transparent',
        border: '1px solid #334155',
        borderBottom: active ? '1px solid #1e293b' : '1px solid #334155',
        borderRadius: '8px 8px 0 0',
        color: active ? 'white' : '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.875rem',
        marginBottom: '-1px',
      }}
    >
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
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: bg, color: text }}>
      ● {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  const icons: Record<string, { icon: string; color: string }> = {
    'completed': { icon: '✓', color: '#22c55e' },
    'ongoing': { icon: '●', color: '#3b82f6' },
    'pending': { icon: '○', color: '#94a3b8' },
    'delayed': { icon: '⚠', color: '#ef4444' },
  };
  const { icon, color } = icons[status] || icons['pending'];
  return <span style={{ color, fontWeight: 'bold' }}>{icon}</span>;
}

function AlertItem({ color, title, sub }: { color: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <span style={{ color, fontSize: '1.125rem' }}>●</span>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
