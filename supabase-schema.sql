-- ============================================
-- QONTREK SOLAR BD MANAGER - SUPABASE SCHEMA
-- Based on Voltek Energy actual data structure
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. LEADS / PROSPECTS TABLE
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer Info
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  ic_number VARCHAR(20),
  
  -- Address
  address TEXT,
  state VARCHAR(50),
  postcode VARCHAR(10),
  
  -- Property Info
  property_type VARCHAR(20) DEFAULT 'residential', -- residential, commercial, industrial
  monthly_bill DECIMAL(10,2),
  
  -- Lead Source
  source VARCHAR(50), -- event, referral, website, whatsapp
  event_name VARCHAR(100),
  event_date DATE,
  
  -- Lead Scoring
  lead_score INTEGER DEFAULT 0, -- 0-100
  lead_status VARCHAR(30) DEFAULT 'new', -- new, contacted, qualified, site_visit, quoted, negotiating, won, lost
  
  -- Assignment
  assigned_to VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ
);

-- ============================================
-- 2. DEALS / PROJECTS TABLE
-- ============================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Project Reference
  project_no VARCHAR(50) UNIQUE, -- e.g., VESB/RESI/IN/2024/01/0101
  lead_id UUID REFERENCES leads(id),
  
  -- Customer Info (denormalized for speed)
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_state VARCHAR(50),
  
  -- System Specs
  proposed_capacity_kwp DECIMAL(10,3),
  finalized_capacity_kwp DECIMAL(10,3),
  finalized_capacity_kwac DECIMAL(10,3),
  system_type VARCHAR(20) DEFAULT 'string', -- string, micro
  panel_count INTEGER,
  inverter_model VARCHAR(100),
  
  -- Pricing
  total_sales DECIMAL(12,2),
  price_per_watt DECIMAL(8,2),
  booking_payment DECIMAL(10,2),
  payment_80_percent DECIMAL(10,2),
  payment_20_percent DECIMAL(10,2),
  balance DECIMAL(10,2),
  
  -- Status Tracking (based on Voltek workflow)
  status VARCHAR(50) DEFAULT 'booking', 
  -- Values: booking, site_visit, quoted, seda_pending, seda_approved, 
  --         nem_approved, payment_pending, installation, energized, 
  --         handover_pending, completed, cancelled, refund
  
  stage INTEGER DEFAULT 1, -- 1-6 pipeline stages
  
  -- Key Dates
  booking_date DATE,
  site_visit_date DATE,
  design_completion_date DATE,
  seda_submission_date DATE,
  seda_approval_date DATE,
  seda_cert_date DATE,
  installation_date DATE,
  tnb_submission_date DATE,
  nem_welcome_letter_date DATE,
  energize_date DATE,
  handover_date DATE,
  
  -- Documents (boolean flags)
  has_ic BOOLEAN DEFAULT FALSE,
  has_ic_spouse BOOLEAN DEFAULT FALSE,
  has_site_ownership BOOLEAN DEFAULT FALSE,
  has_tnb_bill BOOLEAN DEFAULT FALSE,
  has_declaration_form BOOLEAN DEFAULT FALSE,
  has_pvsvst BOOLEAN DEFAULT FALSE,
  has_pvl BOOLEAN DEFAULT FALSE,
  has_sld BOOLEAN DEFAULT FALSE,
  
  -- Assignment
  pic_site_visit VARCHAR(100),
  subcon VARCHAR(50),
  
  -- Remarks
  remark TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. QUOTES TABLE
-- ============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_no VARCHAR(50) UNIQUE, -- e.g., Q-2026-001
  
  lead_id UUID REFERENCES leads(id),
  deal_id UUID REFERENCES deals(id),
  
  -- Customer Info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  monthly_bill DECIMAL(10,2),
  
  -- System Recommendation
  system_size_kw DECIMAL(10,3),
  panel_count INTEGER,
  panel_wattage INTEGER DEFAULT 550,
  inverter_type VARCHAR(50),
  
  -- Pricing
  price_per_watt DECIMAL(8,2),
  total_price DECIMAL(12,2),
  
  -- ROI Calculations
  monthly_savings DECIMAL(10,2),
  annual_savings DECIMAL(10,2),
  payback_years DECIMAL(4,1),
  lifetime_savings_25yr DECIMAL(12,2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending_confirm, sent, accepted, rejected
  confirmed_at TIMESTAMPTZ,
  confirmed_by VARCHAR(100),
  sent_via VARCHAR(20), -- whatsapp, email, manual
  sent_at TIMESTAMPTZ,
  
  -- CIVOS Governance
  governance_type VARCHAR(10) DEFAULT 'B', -- Type B = requires confirmation
  confirmation_delay_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. AI WORKERS TABLE
-- ============================================
CREATE TABLE ai_workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  worker_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., quotegen, whatsapp, leadscore
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  icon VARCHAR(10),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, pending, idle, error
  
  -- Performance Metrics
  tasks_today INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  avg_response_time_ms INTEGER,
  
  -- Last Activity
  last_task_at TIMESTAMPTZ,
  last_task_description TEXT,
  
  -- Config
  config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. GOVERNANCE LOG (CIVOS)
-- ============================================
CREATE TABLE governance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Action Info
  worker_id VARCHAR(50),
  action_type VARCHAR(50) NOT NULL, -- quote_generated, quote_confirmed, whatsapp_sent, etc.
  action_description TEXT,
  
  -- Governance Type
  governance_type VARCHAR(10) DEFAULT 'B', -- A, B, C, D
  
  -- Confirmation Tracking
  requires_confirmation BOOLEAN DEFAULT TRUE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by VARCHAR(100),
  confirmed_at TIMESTAMPTZ,
  confirmation_delay_ms INTEGER,
  
  -- Related Entities
  quote_id UUID REFERENCES quotes(id),
  deal_id UUID REFERENCES deals(id),
  lead_id UUID REFERENCES leads(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. WHATSAPP MESSAGES TABLE
-- ============================================
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  
  -- Message
  message_type VARCHAR(30), -- quote, followup, reminder, confirmation
  message_content TEXT,
  
  -- Related
  quote_id UUID REFERENCES quotes(id),
  deal_id UUID REFERENCES deals(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Governance
  confirmed_by VARCHAR(100),
  confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. BD MANAGER STATS (Daily Snapshot)
-- ============================================
CREATE TABLE bd_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  stat_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Pipeline Stats
  total_leads INTEGER DEFAULT 0,
  new_leads_today INTEGER DEFAULT 0,
  active_deals INTEGER DEFAULT 0,
  pipeline_value DECIMAL(15,2) DEFAULT 0,
  
  -- Conversion
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  deals_won_today INTEGER DEFAULT 0,
  deals_won_value DECIMAL(12,2) DEFAULT 0,
  
  -- Commission Tracking
  commission_earned DECIMAL(12,2) DEFAULT 0,
  commission_target DECIMAL(12,2) DEFAULT 100000,
  
  -- AI Worker Stats
  total_tasks INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  quotes_generated INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_governance_created ON governance_log(created_at DESC);
CREATE INDEX idx_whatsapp_status ON whatsapp_messages(status);

-- ============================================
-- DEFAULT AI WORKERS
-- ============================================
INSERT INTO ai_workers (worker_id, name, role, icon, status) VALUES
('quotegen', 'QuoteGen', 'Quote Generator', '⚡', 'active'),
('whatsapp', 'WhatsApp', 'Message Sender', '📱', 'active'),
('leadscore', 'LeadScore', 'Lead Qualifier', '🎯', 'active'),
('sedacheck', 'SEDA Check', 'Official Validator', '🏛️', 'active'),
('reporter', 'Reporter', 'Daily Summary', '📊', 'pending');

-- ============================================
-- SAMPLE DATA (from Voltek actual records)
-- ============================================
INSERT INTO deals (project_no, customer_name, customer_state, finalized_capacity_kwp, total_sales, status, stage, booking_date) VALUES
('VESB/RESI/IN/2024/01/0101', 'MOHD AKMAL BIN ISMAIL', 'KAJANG, SELANGOR', 5.1, 16500, 'completed', 6, '2024-01-14'),
('VESB/RESI/IN/2024/01/0102', 'LOH ZHEN HAO', 'BUKIT JALIL, KUALA LUMPUR', 8.5, 25000, 'completed', 6, '2024-01-20'),
('VESB/RESI/IN/2024/01/0104', 'MOHAMAD ERWAN BIN MAS''OD', 'MELAKA', 12.325, 39600, 'completed', 6, '2024-01-21'),
('VESB/RESI/IN/2024/01/0107', 'MUHAMMAD LOKMAN BIN MOHD ZAIN', 'WANGSA MELAWATI, KUALA LUMPUR', 10.2, 45500, 'seda_pending', 3, '2024-01-28'),
('VESB/RESI/IN/2024/02/0110', 'MOHD NASRULLAH BIN ABDULLAH', 'AMPANG, SELANGOR', 6.8, 21000, 'handover_pending', 5, '2024-02-24'),
('VESB/RESI/IN/2024/04/0141', 'SYAMSUL NIZAM BIN MOHD RAZALI', 'KAJANG, SELANGOR', 8.475, 28000, 'completed', 6, '2024-04-20'),
('VESB/RESI/IN/2024/04/0143', 'ABDUL HAFIZ BIN ABDUL RAJAK', 'CYBERJAYA, SELANGOR', 6.375, 19800, 'completed', 6, '2024-04-21'),
('VESB/RESI/IN/2024/04/0149', 'LEONG SENG CHUN', 'SHAH ALAM, SELANGOR', 5.65, 19775, 'completed', 6, '2024-04-21'),
('Q-2026-001', 'Ahmad Abdullah', 'Petaling Jaya', 5.5, 22500, 'quoted', 2, '2026-01-08'),
('Q-2026-002', 'Siti Aminah', 'Shah Alam', 8.0, 32000, 'site_visit', 3, '2026-01-07'),
('Q-2026-003', 'Syarikat ABC Sdn Bhd', 'Klang', 80.0, 168000, 'negotiating', 4, '2026-01-05'),
('Q-2026-004', 'Lee Wei Ming', 'Subang', 4.0, 16000, 'quoted', 2, '2026-01-03');

-- ============================================
-- INITIAL STATS
-- ============================================
INSERT INTO bd_stats (stat_date, total_leads, active_deals, pipeline_value, conversion_rate, commission_earned, quotes_generated, whatsapp_sent) VALUES
(CURRENT_DATE, 45, 11, 239000, 32.0, 48000, 8, 6);

-- ============================================
-- VIEWS FOR DASHBOARD
-- ============================================
CREATE OR REPLACE VIEW v_pipeline_summary AS
SELECT 
  COUNT(*) as total_deals,
  SUM(total_sales) as pipeline_value,
  COUNT(CASE WHEN stage >= 4 THEN 1 END) as hot_deals,
  AVG(finalized_capacity_kwp) as avg_system_size
FROM deals 
WHERE status NOT IN ('completed', 'cancelled', 'refund');

CREATE OR REPLACE VIEW v_deals_by_stage AS
SELECT 
  stage,
  COUNT(*) as count,
  SUM(total_sales) as value
FROM deals 
WHERE status NOT IN ('completed', 'cancelled', 'refund')
GROUP BY stage
ORDER BY stage;
