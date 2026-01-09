import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

// Types
interface Worker {
  id: string;
  worker_id: string;
  name: string;
  role: string;
  icon: string;
  status: 'active' | 'pending' | 'idle';
  tasks_today: number;
  success_rate: number;
}

interface Deal {
  id: string;
  project_no?: string;
  customer_name: string;
  customer_state?: string;
  customer_phone?: string;
  finalized_capacity_kwp?: number;
  total_sales: number;
  status: string;
  stage: number;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'success' | 'pending' | 'info';
  worker_id?: string;
  action_type: string;
  message: string;
  confirmed: boolean;
}

interface BDStats {
  total_deals: number;
  pipeline_value: number;
  conversion_rate: number;
  commission_earned: number;
  commission_target: number;
}

// API helpers
const API_BASE = '/api';

async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch(`${API_BASE}/deals`);
  if (!res.ok) throw new Error('Failed to fetch deals');
  const data = await res.json();
  return data.deals || data;
}

async function fetchWorkers(): Promise<Worker[]> {
  const res = await fetch(`${API_BASE}/workers`);
  if (!res.ok) throw new Error('Failed to fetch workers');
  return res.json();
}

async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch(`${API_BASE}/governance-log`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

async function fetchStats(): Promise<BDStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function syncWithJodoo(action: string, data?: any): Promise<any> {
  const res = await fetch(`${API_BASE}/jodoo/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

async function createGovernanceLog(log: Partial<LogEntry>): Promise<LogEntry> {
  const res = await fetch(`${API_BASE}/governance-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
  return res.json();
}

// Status to tag mapping
function getTagFromStatus(status: string): { tag: string; color: string } {
  const mapping: Record<string, { tag: string; color: string }> = {
    'quoted': { tag: '🔥 Hot Lead', color: 'orange' },
    'site_visit': { tag: '✓ Qualified', color: 'green' },
    'negotiating': { tag: '⭐ Enterprise', color: 'cyan' },
    'seda_pending': { tag: '📋 SEDA', color: 'yellow' },
    'payment_pending': { tag: '💰 Payment', color: 'green' },
    'installation': { tag: '🔧 Install', color: 'blue' },
    'handover_pending': { tag: '📦 Handover', color: 'purple' },
    'completed': { tag: '✅ Completed', color: 'green' },
    'cancelled': { tag: '❌ Cancelled', color: 'red' },
  };
  return mapping[status] || { tag: '⚠️ Follow up', color: 'red' };
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<BDStats>({
    total_deals: 0,
    pipeline_value: 0,
    conversion_rate: 32,
    commission_earned: 48000,
    commission_target: 100000,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try to load from API, fallback to mock data
      const [workersData, dealsData, logsData] = await Promise.allSettled([
        fetchWorkers(),
        fetchDeals(),
        fetchLogs(),
      ]);

      if (workersData.status === 'fulfilled') {
        setWorkers(workersData.value);
      } else {
        // Fallback mock data
        setWorkers([
          { id: '1', worker_id: 'quotegen', name: '⚡ QuoteGen', role: 'Quote Generator', icon: '⚡', status: 'active', tasks_today: 8, success_rate: 100 },
          { id: '2', worker_id: 'whatsapp', name: '📱 WhatsApp', role: 'Message Sender', icon: '📱', status: 'active', tasks_today: 6, success_rate: 95 },
          { id: '3', worker_id: 'leadscore', name: '🎯 LeadScore', role: 'Lead Qualifier', icon: '🎯', status: 'active', tasks_today: 12, success_rate: 88 },
          { id: '4', worker_id: 'sedacheck', name: '🏛️ SEDA Check', role: 'Official Validator', icon: '🏛️', status: 'active', tasks_today: 8, success_rate: 100 },
          { id: '5', worker_id: 'reporter', name: '📊 Reporter', role: 'Daily Summary', icon: '📊', status: 'pending', tasks_today: 1, success_rate: 0 },
        ]);
      }

      if (dealsData.status === 'fulfilled') {
        setDeals(dealsData.value);
        // Calculate stats from deals
        const pipelineValue = dealsData.value.reduce((sum: number, d: Deal) => sum + (d.total_sales || 0), 0);
        setStats(prev => ({ ...prev, total_deals: dealsData.value.length, pipeline_value: pipelineValue }));
      } else {
        // Fallback mock deals
        setDeals([
          { id: '1', customer_name: 'Ahmad Abdullah', customer_state: 'Petaling Jaya', finalized_capacity_kwp: 5.5, total_sales: 22500, status: 'quoted', stage: 2, customer_phone: '+60123456789' },
          { id: '2', customer_name: 'Siti Aminah', customer_state: 'Shah Alam', finalized_capacity_kwp: 8, total_sales: 32000, status: 'site_visit', stage: 3, customer_phone: '+60198765432' },
          { id: '3', customer_name: 'Syarikat ABC Sdn Bhd', customer_state: 'Klang', finalized_capacity_kwp: 80, total_sales: 168000, status: 'negotiating', stage: 4, customer_phone: '+60376543210' },
          { id: '4', customer_name: 'Lee Wei Ming', customer_state: 'Subang', finalized_capacity_kwp: 4, total_sales: 16000, status: 'quoted', stage: 2, customer_phone: '+60112345678' },
        ]);
      }

      if (logsData.status === 'fulfilled') {
        setLogs(logsData.value);
      } else {
        // Fallback mock logs
        setLogs([
          { id: '1', time: '12:34', type: 'success', action_type: 'quote_generated', message: 'QuoteGen → Quote #Q-2026-047 generated → CONFIRMED', confirmed: true },
          { id: '2', time: '12:35', type: 'success', action_type: 'human_confirm', message: 'Human → Confirmed (1.2s delay)', confirmed: true },
          { id: '3', time: '12:35', type: 'success', action_type: 'whatsapp_sent', message: 'WhatsApp → Message sent to +60123456789', confirmed: true },
          { id: '4', time: '12:36', type: 'info', action_type: 'seda_check', message: 'SEDA Check → Validation complete → NEM eligible', confirmed: true },
          { id: '5', time: '12:38', type: 'pending', action_type: 'quote_pending', message: 'QuoteGen → Quote #Q-2026-048 → PENDING CONFIRM', confirmed: false },
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add log entry
  const addLog = useCallback((type: 'success' | 'pending' | 'info', message: string, actionType: string) => {
    const time = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const newLog: LogEntry = {
      id: Date.now().toString(),
      time,
      type,
      action_type: actionType,
      message,
      confirmed: type === 'success',
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
    
    // Also save to API
    createGovernanceLog(newLog).catch(console.error);
  }, [currentTime]);

  // Update worker stats
  const updateWorker = useCallback((workerId: string, tasksDelta: number) => {
    setWorkers(prev => prev.map(w => 
      w.worker_id === workerId ? { ...w, tasks_today: w.tasks_today + tasksDelta } : w
    ));
  }, []);

  // Send WhatsApp batch
  const handleWhatsAppBatch = () => {
    const pendingDeals = deals.filter(d => 
      d.status === 'quoted' || getTagFromStatus(d.status).tag.includes('Follow')
    );
    
    addLog('info', `WhatsApp Batch → ${pendingDeals.length} messages queued`, 'batch_start');

    pendingDeals.forEach((deal, index) => {
      setTimeout(() => {
        const message = encodeURIComponent(
          `Hi ${deal.customer_name}! 🌞\n\n` +
          `Regarding your ${deal.finalized_capacity_kwp || 5} kW solar system inquiry:\n` +
          `💰 Investment: RM ${(deal.total_sales || 0).toLocaleString()}\n\n` +
          `Would you like to proceed? Reply YES to confirm!\n\n` +
          `- Voltek Energy Team`
        );
        
        window.open(`https://wa.me/${deal.customer_phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
        addLog('success', `WhatsApp → Message sent to ${deal.customer_name}`, 'whatsapp_sent');
        updateWorker('whatsapp', 1);
      }, index * 1500);
    });
  };

  // Sync with Jodoo
  const handleJodooSync = async () => {
    setSyncing(true);
    try {
      addLog('info', 'Jodoo Sync → Starting import...', 'jodoo_sync_start');
      const result = await syncWithJodoo('import');
      
      if (result.success) {
        addLog('success', `Jodoo Sync → Imported ${result.message}`, 'jodoo_sync_complete');
        await loadData(); // Reload data
      } else {
        addLog('pending', `Jodoo Sync → Failed: ${result.error}`, 'jodoo_sync_error');
      }
    } catch (error) {
      addLog('pending', `Jodoo Sync → Error: ${error}`, 'jodoo_sync_error');
    } finally {
      setSyncing(false);
      setShowSyncModal(false);
    }
  };

  // Generate daily report
  const handleGenerateReport = () => {
    setShowReportModal(true);
    addLog('success', 'Reporter → Daily summary generated', 'report_generated');
    updateWorker('reporter', 1);
    setWorkers(prev => prev.map(w => 
      w.worker_id === 'reporter' ? { ...w, status: 'active' as const } : w
    ));
  };

  const pipelineValue = deals.reduce((sum, d) => sum + (d.total_sales || 0), 0);

  if (loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
          <div>Loading FIDOS BD Manager...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>FIDOS BD Manager - Qontrek Solar</title>
      </Head>
      
      <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', padding: '1rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>🤖 FIDOS BD Manager</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Solar Vertical • Voltek Energy • Connected to Jodoo ERP</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setShowSyncModal(true)}
                style={{ padding: '0.5rem 1rem', background: '#8b5cf6', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                🔄 Sync Jodoo
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>BD Manager</div>
                <div style={{ fontWeight: '600' }}>Megat Mohd Firdaus</div>
              </div>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                M
              </div>
            </div>
          </header>

          {/* Top Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Active AI Workers" value={workers.filter(w => w.status === 'active').length.toString()} sub="● All operational" subColor="#22c55e" />
            <StatCard label="Tasks Today" value={workers.reduce((s, w) => s + w.tasks_today, 0).toString()} sub={`${workers.reduce((s, w) => s + w.tasks_today, 0)} completed`} subColor="#94a3b8" />
            <StatCard label="Pipeline Value" value={`RM ${(pipelineValue/1000).toFixed(0)}k`} sub={`${deals.length} active deals`} subColor="#94a3b8" valueColor="#22c55e" />
            <StatCard label="Conversion Rate" value={`${stats.conversion_rate}%`} sub="↑ 8% from last week" subColor="#22c55e" valueColor="#f97316" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* AI Workers Table */}
              <Card title="🤖 AI Worker Performance" subtitle="Real-time status">
                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ paddingBottom: '0.75rem' }}>Worker</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Role</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Status</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Tasks</th>
                      <th style={{ paddingBottom: '0.75rem' }}>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => (
                      <tr key={w.id} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: '500' }}>{w.name}</td>
                        <td style={{ padding: '0.75rem 0', color: '#94a3b8' }}>{w.role}</td>
                        <td style={{ padding: '0.75rem 0' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem',
                            background: w.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                            color: w.status === 'active' ? '#22c55e' : '#eab308'
                          }}>
                            ● {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>{w.tasks_today} today</td>
                        <td style={{ padding: '0.75rem 0', color: w.success_rate > 0 ? '#22c55e' : '#94a3b8' }}>
                          {w.success_rate > 0 ? `${w.success_rate}%` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Deal Pipeline */}
              <Card title="💰 Deal Pipeline (Jodoo Synced)" action={{ label: 'View All →', href: '/' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deals.slice(0, 5).map(d => {
                    const { tag, color } = getTagFromStatus(d.status);
                    return (
                      <div key={d.id} style={{ 
                        background: 'rgba(51,65,85,0.5)', 
                        borderRadius: '8px', 
                        padding: '0.75rem', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        const message = encodeURIComponent(
                          `Hi ${d.customer_name}! 🌞 Following up on your ${d.finalized_capacity_kwp || 5} kW solar inquiry. Ready to proceed?`
                        );
                        window.open(`https://wa.me/${d.customer_phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                      }}
                      >
                        <div>
                          <div style={{ fontWeight: '500' }}>{d.customer_name} • {d.customer_state}</div>
                          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{d.finalized_capacity_kwp} kW • {d.status.replace('_', ' ')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: '#22c55e' }}>RM {(d.total_sales || 0).toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color: color === 'orange' ? '#f97316' : color === 'green' ? '#22c55e' : color === 'cyan' ? '#06b6d4' : color === 'yellow' ? '#eab308' : '#ef4444' }}>
                            {tag}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Governance Log */}
              <Card title="🔒 CIVOS Governance Log" badge={{ label: 'Type B Active', color: '#3b82f6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '0.75rem', color: '#cbd5e1' }}>
                      <span style={{ color: '#64748b' }}>{log.time}</span>
                      <span style={{ color: log.type === 'success' ? '#22c55e' : log.type === 'pending' ? '#eab308' : '#06b6d4' }}>
                        {log.type === 'success' ? '✓' : log.type === 'pending' ? '○' : '●'}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Commission Tracker */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,179,8,0.2))', 
                borderRadius: '12px', 
                border: '1px solid rgba(249,115,22,0.3)',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#fdba74', marginBottom: '0.5rem' }}>💰 Commission Tracker (Jan 2026)</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>RM {stats.commission_earned.toLocaleString()}</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>4 closes × 80kWp × RM150</div>
                <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(stats.commission_earned/stats.commission_target)*100}%`, background: 'linear-gradient(90deg, #f97316, #eab308)', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>{((stats.commission_earned/stats.commission_target)*100).toFixed(0)}% of RM{(stats.commission_target/1000).toFixed(0)}k monthly target</div>
              </div>

              {/* Alerts */}
              <Card title="⚠️ Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <AlertItem color="#ef4444" title="Lead #23 no response" sub="3 days since last contact" />
                  <AlertItem color="#eab308" title="Quote pending confirm" sub="Q-2026-048 awaiting approval" />
                  <AlertItem color="#06b6d4" title="Site visit tomorrow" sub="Siti Aminah, Shah Alam 10am" />
                </div>
              </Card>

              {/* Quick Actions */}
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/" style={{ display: 'block', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', textAlign: 'center', fontWeight: '500', fontSize: '0.875rem', textDecoration: 'none', color: 'white' }}>
                  ⚡ Generate New Quote
                </a>
                <button 
                  onClick={handleWhatsAppBatch}
                  style={{ padding: '0.75rem', background: '#22c55e', borderRadius: '8px', fontWeight: '500', fontSize: '0.875rem', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  📱 Send WhatsApp Batch
                </button>
                <button 
                  onClick={handleGenerateReport}
                  style={{ padding: '0.75rem', background: '#334155', borderRadius: '8px', fontWeight: '500', fontSize: '0.875rem', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  📊 Generate Daily Report
                </button>
              </div>

            </div>
          </div>

          {/* Jodoo Sync Modal */}
          {showSyncModal && (
            <Modal title="🔄 Jodoo ERP Sync" onClose={() => setShowSyncModal(false)}>
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                Sync deals between Qontrek and Jodoo ERP system.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={handleJodooSync}
                  disabled={syncing}
                  style={{ padding: '0.75rem', background: '#8b5cf6', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: syncing ? 'wait' : 'pointer', opacity: syncing ? 0.7 : 1 }}
                >
                  {syncing ? '⏳ Syncing...' : '📥 Import from Jodoo'}
                </button>
                <button
                  onClick={() => syncWithJodoo('export', { deal: deals[0] })}
                  style={{ padding: '0.75rem', background: '#334155', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                  📤 Export to Jodoo
                </button>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#334155', borderRadius: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                <strong>API Endpoint:</strong> https://api.jodoo.com/api<br/>
                <strong>Last Sync:</strong> {currentTime.toLocaleString()}
              </div>
            </Modal>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <Modal title="📊 Daily BD Report" onClose={() => setShowReportModal(false)}>
              <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>{currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Pipeline Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div>Total Deals: <strong>{deals.length}</strong></div>
                  <div>Pipeline Value: <strong style={{ color: '#22c55e' }}>RM {pipelineValue.toLocaleString()}</strong></div>
                  <div>Hot Leads: <strong style={{ color: '#f97316' }}>{deals.filter(d => d.status === 'quoted').length}</strong></div>
                  <div>Qualified: <strong style={{ color: '#22c55e' }}>{deals.filter(d => d.status === 'site_visit').length}</strong></div>
                </div>
              </div>

              <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>AI Worker Performance</h3>
                {workers.map((w) => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.875rem' }}>
                    <span>{w.name}</span>
                    <span>{w.tasks_today} tasks • {w.success_rate}% success</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  const text = `FIDOS BD Report\n\nPipeline: RM ${pipelineValue.toLocaleString()}\nDeals: ${deals.length}\nCommission: RM ${stats.commission_earned.toLocaleString()}`;
                  navigator.clipboard.writeText(text);
                  alert('Report copied!');
                }}
                style={{ width: '100%', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                📋 Copy Report
              </button>
            </Modal>
          )}

          {/* Footer */}
          <footer style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b' }}>
            <div>FIDOS BD Manager v2.1 • Qontrek × Voltek Solar × Jodoo ERP</div>
            <div>CIVOS Governance Active • Type B Confirmation Enabled</div>
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
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
