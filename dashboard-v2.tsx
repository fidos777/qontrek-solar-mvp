import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Worker {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'pending' | 'idle';
  tasks: number;
  success: number;
}

interface Deal {
  id: string;
  customer: string;
  location: string;
  system: string;
  stage: string;
  value: number;
  tag: string;
  tagColor: string;
  phone?: string;
}

interface LogEntry {
  time: string;
  type: 'success' | 'pending' | 'info';
  message: string;
}

interface Quote {
  id: string;
  customer: string;
  phone: string;
  address: string;
  monthlyBill: number;
  systemSize: number;
  panels: number;
  totalPrice: number;
  monthlySavings: number;
  paybackYears: number;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'quotes'>('overview');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '12:34', type: 'success', message: 'QuoteGen → Quote #Q-2026-047 generated → CONFIRMED' },
    { time: '12:35', type: 'success', message: 'Human → Confirmed (1.2s delay)' },
    { time: '12:35', type: 'success', message: 'WhatsApp → Message sent to +60123456789' },
    { time: '12:36', type: 'info', message: 'SEDA Check → Validation complete → NEM eligible' },
    { time: '12:38', type: 'pending', message: 'QuoteGen → Quote #Q-2026-048 → PENDING CONFIRM' },
  ]);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', name: '⚡ QuoteGen', role: 'Quote Generator', status: 'active', tasks: 8, success: 100 },
    { id: '2', name: '📱 WhatsApp', role: 'Message Sender', status: 'active', tasks: 6, success: 95 },
    { id: '3', name: '🎯 LeadScore', role: 'Lead Qualifier', status: 'active', tasks: 12, success: 88 },
    { id: '4', name: '🏛️ SEDA Check', role: 'Official Validator', status: 'active', tasks: 8, success: 100 },
    { id: '5', name: '📊 Reporter', role: 'Daily Summary', status: 'pending', tasks: 1, success: 0 },
  ]);

  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', customer: 'Ahmad Abdullah', location: 'Petaling Jaya', system: '5.5 kW', stage: 'Quote sent', value: 22500, tag: '🔥 Hot Lead', tagColor: 'orange', phone: '+60123456789' },
    { id: '2', customer: 'Siti Aminah', location: 'Shah Alam', system: '8 kW', stage: 'Site visit scheduled', value: 32000, tag: '✓ Qualified', tagColor: 'green', phone: '+60198765432' },
    { id: '3', customer: 'Syarikat ABC Sdn Bhd', location: 'Klang', system: '80 kW commercial', stage: 'Proposal review', value: 168000, tag: '⭐ Enterprise', tagColor: 'cyan', phone: '+60376543210' },
    { id: '4', customer: 'Lee Wei Ming', location: 'Subang', system: '4 kW', stage: 'No response', value: 16000, tag: '⚠️ Follow up', tagColor: 'red', phone: '+60112345678' },
    { id: '5', customer: 'Muhammad Lokman', location: 'Wangsa Melawati', system: '10.2 kW', stage: 'Pending SEDA', value: 45500, tag: '📋 SEDA', tagColor: 'yellow', phone: '+60145678901' },
  ]);

  const pipelineValue = deals.reduce((sum, d) => sum + d.value, 0);
  const commission = 48000;
  const target = 100000;

  // Add log entry
  const addLog = (type: 'success' | 'pending' | 'info', message: string) => {
    const time = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ time, type, message }, ...prev].slice(0, 10));
  };

  // Update worker stats
  const updateWorker = (workerId: string, tasksDelta: number) => {
    setWorkers(prev => prev.map(w => 
      w.id === workerId ? { ...w, tasks: w.tasks + tasksDelta } : w
    ));
  };

  // Send WhatsApp batch
  const handleWhatsAppBatch = () => {
    const pendingDeals = deals.filter(d => d.tag.includes('Follow up') || d.tag.includes('Hot'));
    
    pendingDeals.forEach((deal, index) => {
      setTimeout(() => {
        const message = encodeURIComponent(
          `Hi ${deal.customer}! 🌞\n\n` +
          `Regarding your ${deal.system} solar system inquiry:\n` +
          `💰 Investment: RM ${deal.value.toLocaleString()}\n\n` +
          `Would you like to proceed? Reply YES to confirm!\n\n` +
          `- Voltek Energy Team`
        );
        
        // Open WhatsApp (in real app, use WhatsApp Business API)
        window.open(`https://wa.me/${deal.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
        
        addLog('success', `WhatsApp → Message sent to ${deal.customer}`);
        updateWorker('2', 1);
      }, index * 1000);
    });

    addLog('info', `WhatsApp Batch → ${pendingDeals.length} messages queued`);
  };

  // Generate daily report
  const handleGenerateReport = () => {
    setShowReportModal(true);
    addLog('success', 'Reporter → Daily summary generated');
    updateWorker('5', 1);
    setWorkers(prev => prev.map(w => 
      w.id === '5' ? { ...w, status: 'active' as const } : w
    ));
  };

  // Generate report content
  const generateReportContent = () => {
    const completedDeals = deals.filter(d => d.tag.includes('Qualified') || d.tag.includes('Enterprise'));
    const hotLeads = deals.filter(d => d.tag.includes('Hot'));
    const followUps = deals.filter(d => d.tag.includes('Follow up'));
    
    return {
      date: currentTime.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      summary: {
        totalDeals: deals.length,
        pipelineValue,
        hotLeads: hotLeads.length,
        qualified: completedDeals.length,
        followUpsNeeded: followUps.length
      },
      workers: workers.map(w => ({
        name: w.name,
        tasks: w.tasks,
        success: w.success
      })),
      commission: {
        earned: commission,
        target,
        percentage: Math.round((commission / target) * 100)
      }
    };
  };

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
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Solar Vertical • Voltek Energy</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <StatCard label="Tasks Today" value={workers.reduce((s, w) => s + w.tasks, 0).toString()} sub={`${workers.reduce((s, w) => s + w.tasks, 0) - 6} completed • 6 pending`} subColor="#94a3b8" />
            <StatCard label="Pipeline Value" value={`RM ${(pipelineValue/1000).toFixed(0)}k`} sub={`${deals.length} active deals`} subColor="#94a3b8" valueColor="#22c55e" />
            <StatCard label="Conversion Rate" value="32%" sub="↑ 8% from last week" subColor="#22c55e" valueColor="#f97316" />
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
                        <td style={{ padding: '0.75rem 0' }}>{w.tasks} today</td>
                        <td style={{ padding: '0.75rem 0', color: w.success > 0 ? '#22c55e' : '#94a3b8' }}>
                          {w.success > 0 ? `${w.success}%` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Deal Pipeline */}
              <Card title="💰 Deal Pipeline" action={{ label: 'View All →', href: '/' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deals.map(d => (
                    <div key={d.id} style={{ 
                      background: 'rgba(51,65,85,0.5)', 
                      borderRadius: '8px', 
                      padding: '0.75rem', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      opacity: d.tag.includes('Follow') ? 0.6 : 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(51,65,85,0.8)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(51,65,85,0.5)'}
                    onClick={() => {
                      const message = encodeURIComponent(
                        `Hi ${d.customer}! 🌞 Following up on your ${d.system} solar inquiry. Ready to proceed?`
                      );
                      window.open(`https://wa.me/${d.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                    }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{d.customer} • {d.location}</div>
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{d.system} • {d.stage}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: '#22c55e' }}>RM {d.value.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: d.tagColor === 'orange' ? '#f97316' : d.tagColor === 'green' ? '#22c55e' : d.tagColor === 'cyan' ? '#06b6d4' : d.tagColor === 'yellow' ? '#eab308' : '#ef4444' }}>
                          {d.tag}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Governance Log */}
              <Card title="🔒 CIVOS Governance Log" badge={{ label: 'Type B Active', color: '#3b82f6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', color: '#cbd5e1' }}>
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
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>RM {commission.toLocaleString()}</div>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>4 closes × 80kWp × RM150</div>
                <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(commission/target)*100}%`, background: 'linear-gradient(90deg, #f97316, #eab308)', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>{((commission/target)*100).toFixed(0)}% of RM{(target/1000).toFixed(0)}k monthly target</div>
              </div>

              {/* Alerts */}
              <Card title="⚠️ Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <AlertItem color="#ef4444" title="Lead #23 no response" sub="3 days since last contact" />
                  <AlertItem color="#eab308" title="Quote pending confirm" sub="Q-2026-048 awaiting approval" />
                  <AlertItem color="#06b6d4" title="Site visit tomorrow" sub="Siti Aminah, Shah Alam 10am" />
                </div>
              </Card>

              {/* Quick Actions - NOW FUNCTIONAL */}
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="/" style={{ display: 'block', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', textAlign: 'center', fontWeight: '500', fontSize: '0.875rem', textDecoration: 'none', color: 'white', cursor: 'pointer' }}>
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

          {/* Report Modal */}
          {showReportModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📊 Daily BD Report</h2>
                  <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>
                
                {(() => {
                  const report = generateReportContent();
                  return (
                    <div style={{ fontSize: '0.875rem' }}>
                      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>{report.date}</p>
                      
                      <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Pipeline Summary</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                          <div>Total Deals: <strong>{report.summary.totalDeals}</strong></div>
                          <div>Pipeline Value: <strong style={{ color: '#22c55e' }}>RM {report.summary.pipelineValue.toLocaleString()}</strong></div>
                          <div>Hot Leads: <strong style={{ color: '#f97316' }}>{report.summary.hotLeads}</strong></div>
                          <div>Qualified: <strong style={{ color: '#22c55e' }}>{report.summary.qualified}</strong></div>
                          <div>Follow-ups Needed: <strong style={{ color: '#ef4444' }}>{report.summary.followUpsNeeded}</strong></div>
                        </div>
                      </div>

                      <div style={{ background: '#334155', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>AI Worker Performance</h3>
                        {report.workers.map((w, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                            <span>{w.name}</span>
                            <span>{w.tasks} tasks • {w.success}% success</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,179,8,0.2))', borderRadius: '8px', padding: '1rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Commission Status</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>RM {report.commission.earned.toLocaleString()}</div>
                        <div style={{ color: '#94a3b8' }}>{report.commission.percentage}% of RM {report.commission.target.toLocaleString()} target</div>
                      </div>

                      <button 
                        onClick={() => {
                          const text = `FIDOS BD Report - ${report.date}\n\nPipeline: RM ${report.summary.pipelineValue.toLocaleString()}\nDeals: ${report.summary.totalDeals}\nCommission: RM ${report.commission.earned.toLocaleString()} (${report.commission.percentage}%)`;
                          navigator.clipboard.writeText(text);
                          alert('Report copied to clipboard!');
                        }}
                        style={{ marginTop: '1rem', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', fontWeight: '500', fontSize: '0.875rem', border: 'none', color: 'white', cursor: 'pointer', width: '100%' }}
                      >
                        📋 Copy Report
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b' }}>
            <div>FIDOS BD Manager v2.0 • Qontrek × Voltek Solar</div>
            <div>CIVOS Governance Active • Type B Confirmation Enabled</div>
          </footer>

        </div>
      </div>
    </>
  );
}

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
