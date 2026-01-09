#!/bin/bash

# FIDOS BD Manager - Supabase + Jodoo Integration Setup Script
# Run this from your qontrek-monorepo directory

echo "🚀 Setting up FIDOS BD Manager v3 with Supabase + Jodoo..."

# Navigate to project
cd "/Users/firdausismail/Documents/SMEC Consulting/SME AutoBiz OS/Qontrek Platform/qontrek-monorepo/apps/solar-demo"

# Create directories
echo "📁 Creating directories..."
mkdir -p src/lib
mkdir -p src/pages/api/jodoo

# ============================================
# 1. Create lib/supabase.ts
# ============================================
echo "📝 Creating src/lib/supabase.ts..."
cat > src/lib/supabase.ts << 'SUPABASE_EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Deal {
  id: string;
  project_no: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_state?: string;
  finalized_capacity_kwp?: number;
  system_type?: string;
  total_sales?: number;
  status: string;
  stage: number;
  booking_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AIWorker {
  id: string;
  worker_id: string;
  name: string;
  role?: string;
  icon?: string;
  status: string;
  tasks_today: number;
  tasks_total: number;
  success_rate: number;
}

export interface GovernanceLog {
  id: string;
  worker_id?: string;
  action_type: string;
  action_description?: string;
  governance_type: string;
  confirmed: boolean;
  created_at: string;
}

export async function getDeals() {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .not('status', 'in', '(completed,cancelled,refund)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Deal[];
}

export async function getAIWorkers() {
  const { data, error } = await supabase
    .from('ai_workers')
    .select('*')
    .order('worker_id');
  if (error) throw error;
  return data as AIWorker[];
}

export async function getGovernanceLogs(limit = 10) {
  const { data, error } = await supabase
    .from('governance_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as GovernanceLog[];
}

export async function createGovernanceLog(log: Partial<GovernanceLog>) {
  const { data, error } = await supabase
    .from('governance_log')
    .insert(log)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkerStats(workerId: string, tasksDelta: number) {
  const { data: worker } = await supabase
    .from('ai_workers')
    .select('tasks_today, tasks_total')
    .eq('worker_id', workerId)
    .single();
  
  if (worker) {
    await supabase
      .from('ai_workers')
      .update({
        tasks_today: (worker.tasks_today || 0) + tasksDelta,
        tasks_total: (worker.tasks_total || 0) + tasksDelta,
        last_task_at: new Date().toISOString()
      })
      .eq('worker_id', workerId);
  }
}
SUPABASE_EOF

# ============================================
# 2. Create lib/jodoo.ts
# ============================================
echo "📝 Creating src/lib/jodoo.ts..."
cat > src/lib/jodoo.ts << 'JODOO_EOF'
const JODOO_API_BASE = 'https://api.jodoo.com/api';

interface JodooConfig {
  apiKey: string;
  appId: string;
  formId: string;
}

interface JodooRecord {
  _id: string;
  [key: string]: any;
}

// Update these with your actual Jodoo widget IDs
const FIELD_MAPPING: Record<string, string> = {
  customer_name: '_widget_customer_name',
  customer_phone: '_widget_customer_phone',
  customer_address: '_widget_customer_address',
  customer_state: '_widget_customer_state',
  system_capacity: '_widget_system_capacity',
  total_sales: '_widget_total_sales',
  status: '_widget_status',
  booking_date: '_widget_booking_date',
};

export class JodooClient {
  private config: JodooConfig;
  private headers: HeadersInit;

  constructor(config: JodooConfig) {
    this.config = config;
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async queryRecords(limit = 100): Promise<JodooRecord[]> {
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/list`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        limit,
      }),
    });
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.msg);
    return result.data || [];
  }

  async createRecord(data: Record<string, any>): Promise<JodooRecord> {
    const jodooData = this.mapToJodoo(data);
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data: jodooData,
        is_start_workflow: true,
      }),
    });
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.msg);
    return result.data;
  }

  async updateRecord(dataId: string, data: Record<string, any>): Promise<JodooRecord> {
    const jodooData = this.mapToJodoo(data);
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/update`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data_id: dataId,
        data: jodooData,
      }),
    });
    const result = await response.json();
    if (result.code !== 0) throw new Error(result.msg);
    return result.data;
  }

  private mapToJodoo(data: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const widgetId = FIELD_MAPPING[key];
      if (widgetId && value !== undefined) {
        mapped[widgetId] = { value };
      }
    }
    return mapped;
  }

  mapFromJodoo(jodooData: JodooRecord): Record<string, any> {
    const mapped: Record<string, any> = { jodoo_id: jodooData._id };
    const reverse = Object.entries(FIELD_MAPPING).reduce((acc, [k, v]) => {
      acc[v] = k;
      return acc;
    }, {} as Record<string, string>);
    for (const [widgetId, value] of Object.entries(jodooData)) {
      const fieldName = reverse[widgetId];
      if (fieldName) mapped[fieldName] = value;
    }
    return mapped;
  }
}

export class JodooSyncService {
  private jodoo: JodooClient;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(jodooConfig: JodooConfig, supabaseUrl: string, supabaseKey: string) {
    this.jodoo = new JodooClient(jodooConfig);
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  async importFromJodoo(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    try {
      const records = await this.jodoo.queryRecords(500);
      for (const record of records) {
        try {
          const mapped = this.jodoo.mapFromJodoo(record);
          const res = await fetch(`${this.supabaseUrl}/rest/v1/deals`, {
            method: 'POST',
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(mapped),
          });
          if (res.ok) imported++;
          else errors.push(`${record._id}: ${await res.text()}`);
        } catch (err) {
          errors.push(`${record._id}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Import failed: ${err}`);
    }
    return { imported, errors };
  }

  async exportToJodoo(deal: Record<string, any>): Promise<string | null> {
    try {
      const result = await this.jodoo.createRecord(deal);
      return result._id;
    } catch {
      return null;
    }
  }
}

export function createJodooClient(): JodooClient {
  return new JodooClient({
    apiKey: process.env.JODOO_API_KEY || '',
    appId: process.env.JODOO_APP_ID || '',
    formId: process.env.JODOO_FORM_ID || '',
  });
}

export function createJodooSyncService(): JodooSyncService {
  return new JodooSyncService(
    {
      apiKey: process.env.JODOO_API_KEY || '',
      appId: process.env.JODOO_APP_ID || '',
      formId: process.env.JODOO_FORM_ID || '',
    },
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
  );
}
JODOO_EOF

# ============================================
# 3. Create API route: jodoo/sync.ts
# ============================================
echo "📝 Creating src/pages/api/jodoo/sync.ts..."
cat > src/pages/api/jodoo/sync.ts << 'SYNC_EOF'
import type { NextApiRequest, NextApiResponse } from 'next';
import { createJodooSyncService } from '../../../lib/jodoo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    const syncService = createJodooSyncService();

    switch (action) {
      case 'import':
        const importResult = await syncService.importFromJodoo();
        return res.status(200).json({
          success: true,
          message: `Imported ${importResult.imported} records`,
          errors: importResult.errors,
        });

      case 'export':
        const { deal } = req.body;
        const jodooId = await syncService.exportToJodoo(deal);
        return res.status(200).json({ success: !!jodooId, jodoo_id: jodooId });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
SYNC_EOF

# ============================================
# 4. Create API route: jodoo/webhook.ts
# ============================================
echo "📝 Creating src/pages/api/jodoo/webhook.ts..."
cat > src/pages/api/jodoo/webhook.ts << 'WEBHOOK_EOF'
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { op, data } = req.body;
    console.log(`Jodoo webhook: ${op}`, data._id);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    switch (op) {
      case 'data_create':
      case 'data_recover':
        await fetch(`${supabaseUrl}/rest/v1/deals`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ jodoo_id: data._id, ...data }),
        });
        break;

      case 'data_update':
        await fetch(`${supabaseUrl}/rest/v1/deals?jodoo_id=eq.${data._id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        break;

      case 'data_remove':
        await fetch(`${supabaseUrl}/rest/v1/deals?jodoo_id=eq.${data._id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        break;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: String(error) });
  }
}
WEBHOOK_EOF

# ============================================
# 5. Create .env.local template
# ============================================
echo "📝 Creating .env.local..."
cat > .env.local << 'ENV_EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Jodoo ERP
JODOO_API_KEY=your-jodoo-api-key
JODOO_APP_ID=your-jodoo-app-id
JODOO_FORM_ID=your-jodoo-form-id
ENV_EOF

# ============================================
# 6. Update dashboard.tsx
# ============================================
echo "📝 Updating src/pages/dashboard.tsx..."
cat > src/pages/dashboard.tsx << 'DASHBOARD_EOF'
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

interface Worker {
  id: string;
  worker_id: string;
  name: string;
  role: string;
  status: 'active' | 'pending' | 'idle';
  tasks_today: number;
  success_rate: number;
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
}

interface LogEntry {
  id: string;
  time: string;
  type: 'success' | 'pending' | 'info';
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
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', worker_id: 'quotegen', name: '⚡ QuoteGen', role: 'Quote Generator', status: 'active', tasks_today: 8, success_rate: 100 },
    { id: '2', worker_id: 'whatsapp', name: '📱 WhatsApp', role: 'Message Sender', status: 'active', tasks_today: 6, success_rate: 95 },
    { id: '3', worker_id: 'leadscore', name: '🎯 LeadScore', role: 'Lead Qualifier', status: 'active', tasks_today: 12, success_rate: 88 },
    { id: '4', worker_id: 'sedacheck', name: '🏛️ SEDA Check', role: 'Official Validator', status: 'active', tasks_today: 8, success_rate: 100 },
    { id: '5', worker_id: 'reporter', name: '📊 Reporter', role: 'Daily Summary', status: 'pending', tasks_today: 1, success_rate: 0 },
  ]);

  const [deals, setDeals] = useState<Deal[]>([
    { id: '1', customer_name: 'Ahmad Abdullah', customer_state: 'Petaling Jaya', finalized_capacity_kwp: 5.5, total_sales: 22500, status: 'quoted', stage: 2, customer_phone: '+60123456789' },
    { id: '2', customer_name: 'Siti Aminah', customer_state: 'Shah Alam', finalized_capacity_kwp: 8, total_sales: 32000, status: 'site_visit', stage: 3, customer_phone: '+60198765432' },
    { id: '3', customer_name: 'Syarikat ABC Sdn Bhd', customer_state: 'Klang', finalized_capacity_kwp: 80, total_sales: 168000, status: 'negotiating', stage: 4, customer_phone: '+60376543210' },
    { id: '4', customer_name: 'Lee Wei Ming', customer_state: 'Subang', finalized_capacity_kwp: 4, total_sales: 16000, status: 'quoted', stage: 2, customer_phone: '+60112345678' },
    { id: '5', customer_name: 'Muhammad Lokman', customer_state: 'Wangsa Melawati', finalized_capacity_kwp: 10.2, total_sales: 45500, status: 'seda_pending', stage: 3, customer_phone: '+60145678901' },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: '12:34', type: 'success', message: 'QuoteGen → Quote #Q-2026-047 generated → CONFIRMED' },
    { id: '2', time: '12:35', type: 'success', message: 'Human → Confirmed (1.2s delay)' },
    { id: '3', time: '12:35', type: 'success', message: 'WhatsApp → Message sent to +60123456789' },
    { id: '4', time: '12:36', type: 'info', message: 'SEDA Check → Validation complete → NEM eligible' },
    { id: '5', time: '12:38', type: 'pending', message: 'QuoteGen → Quote #Q-2026-048 → PENDING CONFIRM' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((type: 'success' | 'pending' | 'info', message: string) => {
    const time = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ id: Date.now().toString(), time, type, message }, ...prev].slice(0, 15));
  }, [currentTime]);

  const updateWorker = useCallback((workerId: string, delta: number) => {
    setWorkers(prev => prev.map(w => w.worker_id === workerId ? { ...w, tasks_today: w.tasks_today + delta } : w));
  }, []);

  const handleWhatsAppBatch = () => {
    const pending = deals.filter(d => d.status === 'quoted');
    addLog('info', `WhatsApp Batch → ${pending.length} messages queued`);
    pending.forEach((deal, i) => {
      setTimeout(() => {
        const msg = encodeURIComponent(`Hi ${deal.customer_name}! 🌞\n\nRegarding your ${deal.finalized_capacity_kwp} kW solar inquiry:\n💰 Investment: RM ${deal.total_sales.toLocaleString()}\n\nReply YES to proceed!\n\n- Voltek Energy`);
        window.open(`https://wa.me/${deal.customer_phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
        addLog('success', `WhatsApp → Message sent to ${deal.customer_name}`);
        updateWorker('whatsapp', 1);
      }, i * 1500);
    });
  };

  const handleJodooSync = async () => {
    setSyncing(true);
    addLog('info', 'Jodoo Sync → Starting import...');
    try {
      const res = await fetch('/api/jodoo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      });
      const result = await res.json();
      if (result.success) {
        addLog('success', `Jodoo Sync → ${result.message}`);
      } else {
        addLog('pending', `Jodoo Sync → Failed: ${result.error}`);
      }
    } catch (err) {
      addLog('pending', `Jodoo Sync → Error: ${err}`);
    }
    setSyncing(false);
    setShowSyncModal(false);
  };

  const handleReport = () => {
    setShowReportModal(true);
    addLog('success', 'Reporter → Daily summary generated');
    updateWorker('reporter', 1);
    setWorkers(prev => prev.map(w => w.worker_id === 'reporter' ? { ...w, status: 'active' as const } : w));
  };

  const pipelineValue = deals.reduce((s, d) => s + d.total_sales, 0);
  const commission = 48000;
  const target = 100000;

  return (
    <>
      <Head><title>FIDOS BD Manager - Qontrek Solar</title></Head>
      <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', padding: '1rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>🤖 FIDOS BD Manager</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Solar Vertical • Voltek Energy • Jodoo ERP Connected</p>
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
            <StatCard label="Active AI Workers" value={workers.filter(w => w.status === 'active').length.toString()} sub="● All operational" subColor="#22c55e" />
            <StatCard label="Tasks Today" value={workers.reduce((s, w) => s + w.tasks_today, 0).toString()} sub="completed" subColor="#94a3b8" />
            <StatCard label="Pipeline Value" value={`RM ${(pipelineValue/1000).toFixed(0)}k`} sub={`${deals.length} active deals`} subColor="#94a3b8" valueColor="#22c55e" />
            <StatCard label="Conversion Rate" value="32%" sub="↑ 8% from last week" subColor="#22c55e" valueColor="#f97316" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Workers */}
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
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', background: w.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)', color: w.status === 'active' ? '#22c55e' : '#eab308' }}>
                            ● {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>{w.tasks_today} today</td>
                        <td style={{ padding: '0.75rem 0', color: w.success_rate > 0 ? '#22c55e' : '#94a3b8' }}>{w.success_rate > 0 ? `${w.success_rate}%` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Deals */}
              <Card title="💰 Deal Pipeline (Jodoo Synced)" action={{ label: 'View All →', href: '/' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deals.map(d => {
                    const { tag, color } = getTagFromStatus(d.status);
                    return (
                      <div key={d.id} style={{ background: 'rgba(51,65,85,0.5)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => {
                          const msg = encodeURIComponent(`Hi ${d.customer_name}! 🌞 Following up on your ${d.finalized_capacity_kwp} kW solar inquiry.`);
                          window.open(`https://wa.me/${d.customer_phone?.replace(/\D/g, '')}?text=${msg}`, '_blank');
                        }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{d.customer_name} • {d.customer_state}</div>
                          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{d.finalized_capacity_kwp} kW • {d.status.replace('_', ' ')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: '#22c55e' }}>RM {d.total_sales.toLocaleString()}</div>
                          <div style={{ fontSize: '0.75rem', color }}>{tag}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Logs */}
              <Card title="🔒 CIVOS Governance Log" badge={{ label: 'Type B Active', color: '#3b82f6' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {logs.map(log => (
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
                  <AlertItem color="#ef4444" title="Lead #23 no response" sub="3 days since last contact" />
                  <AlertItem color="#eab308" title="Quote pending confirm" sub="Q-2026-048 awaiting approval" />
                  <AlertItem color="#06b6d4" title="Site visit tomorrow" sub="Siti Aminah, Shah Alam 10am" />
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

          {/* Sync Modal */}
          {showSyncModal && (
            <Modal title="🔄 Jodoo ERP Sync" onClose={() => setShowSyncModal(false)}>
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Sync deals between Qontrek and Jodoo ERP.</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div>Total Deals: <strong>{deals.length}</strong></div>
                  <div>Pipeline: <strong style={{ color: '#22c55e' }}>RM {pipelineValue.toLocaleString()}</strong></div>
                  <div>Commission: <strong style={{ color: '#f97316' }}>RM {commission.toLocaleString()}</strong></div>
                  <div>Target: <strong>{((commission/target)*100).toFixed(0)}%</strong></div>
                </div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`FIDOS Report\nPipeline: RM ${pipelineValue.toLocaleString()}\nCommission: RM ${commission.toLocaleString()}`); alert('Copied!'); }} style={{ width: '100%', padding: '0.75rem', background: '#0ea5e9', borderRadius: '8px', fontWeight: '500', border: 'none', color: 'white', cursor: 'pointer' }}>📋 Copy Report</button>
            </Modal>
          )}

          {/* Footer */}
          <footer style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b' }}>
            <div>FIDOS BD Manager v3.0 • Qontrek × Voltek × Jodoo</div>
            <div>CIVOS Governance Active • Type B Enabled</div>
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
DASHBOARD_EOF

# ============================================
# 7. Git commit and push
# ============================================
echo "📦 Committing changes..."
cd "/Users/firdausismail/Documents/SMEC Consulting/SME AutoBiz OS/Qontrek Platform/qontrek-monorepo"

git add .
git commit -m "feat: FIDOS BD Manager v3 - Supabase + Jodoo ERP integration"
git push

echo ""
echo "✅ Setup complete!"
echo ""
echo "📁 Files created:"
echo "   - src/lib/supabase.ts"
echo "   - src/lib/jodoo.ts"
echo "   - src/pages/api/jodoo/sync.ts"
echo "   - src/pages/api/jodoo/webhook.ts"
echo "   - src/pages/dashboard.tsx"
echo "   - .env.local"
echo ""
echo "⚠️  Next steps:"
echo "   1. Edit .env.local with your Supabase and Jodoo credentials"
echo "   2. Update FIELD_MAPPING in lib/jodoo.ts with your Jodoo widget IDs"
echo "   3. Add env vars to Vercel dashboard"
echo ""
echo "🚀 Dashboard URL: https://qontrek-solar-mvp-edge.vercel.app/dashboard"
