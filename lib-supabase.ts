// apps/solar-demo/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on your schema
export interface Deal {
  id: string;
  project_no: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_state?: string;
  proposed_capacity_kwp?: number;
  finalized_capacity_kwp?: number;
  system_type?: string;
  total_sales?: number;
  status: string;
  stage: number;
  booking_date?: string;
  site_visit_date?: string;
  seda_submission_date?: string;
  seda_approval_date?: string;
  installation_date?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  state?: string;
  property_type: string;
  monthly_bill?: number;
  source?: string;
  lead_score: number;
  lead_status: string;
  assigned_to?: string;
  created_at: string;
}

export interface Quote {
  id: string;
  quote_no: string;
  customer_name: string;
  customer_phone?: string;
  monthly_bill?: number;
  system_size_kw?: number;
  panel_count?: number;
  total_price?: number;
  monthly_savings?: number;
  payback_years?: number;
  status: string;
  governance_type: string;
  created_at: string;
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
  last_task_at?: string;
  last_task_description?: string;
}

export interface GovernanceLog {
  id: string;
  worker_id?: string;
  action_type: string;
  action_description?: string;
  governance_type: string;
  requires_confirmation: boolean;
  confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;
  confirmation_delay_ms?: number;
  created_at: string;
}

// Helper functions
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
  return data as GovernanceLog;
}

export async function updateWorkerStats(workerId: string, tasksDelta: number) {
  const { data: worker, error: fetchError } = await supabase
    .from('ai_workers')
    .select('tasks_today, tasks_total')
    .eq('worker_id', workerId)
    .single();
  
  if (fetchError) throw fetchError;
  
  const { error: updateError } = await supabase
    .from('ai_workers')
    .update({
      tasks_today: (worker.tasks_today || 0) + tasksDelta,
      tasks_total: (worker.tasks_total || 0) + tasksDelta,
      last_task_at: new Date().toISOString()
    })
    .eq('worker_id', workerId);
  
  if (updateError) throw updateError;
}

export async function createQuote(quote: Partial<Quote>) {
  const { data, error } = await supabase
    .from('quotes')
    .insert(quote)
    .select()
    .single();
  
  if (error) throw error;
  return data as Quote;
}

export async function createDeal(deal: Partial<Deal>) {
  const { data, error } = await supabase
    .from('deals')
    .insert(deal)
    .select()
    .single();
  
  if (error) throw error;
  return data as Deal;
}

export async function getBDStats() {
  const { data, error } = await supabase
    .from('bd_stats')
    .select('*')
    .order('stat_date', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
