// apps/solar-demo/src/lib/jodoo.ts
// Jodoo ERP Integration for Voltek Energy
// API Docs: https://help.jodoo.com/open/11261

const JODOO_API_BASE = 'https://api.jodoo.com/api';

interface JodooConfig {
  apiKey: string;
  appId: string;        // Jodoo App ID
  formId: string;       // Form/Entry ID for deals
  leadsFormId?: string; // Form ID for leads
}

interface JodooRecord {
  _id: string;
  [key: string]: any;
}

interface JodooResponse {
  code: number;
  data?: any;
  msg?: string;
}

// Field mapping from Supabase to Jodoo widget IDs
// You'll need to update these with your actual Jodoo form field widget IDs
const FIELD_MAPPING = {
  // Deal fields → Jodoo widget IDs (example)
  customer_name: '_widget_customer_name',      // Replace with actual widget ID
  customer_phone: '_widget_customer_phone',
  customer_address: '_widget_customer_address',
  customer_state: '_widget_customer_state',
  system_capacity: '_widget_system_capacity',
  total_sales: '_widget_total_sales',
  status: '_widget_status',
  booking_date: '_widget_booking_date',
  site_visit_date: '_widget_site_visit_date',
  seda_submission: '_widget_seda_submission',
  seda_approval: '_widget_seda_approval',
  installation_date: '_widget_installation_date',
  remark: '_widget_remark',
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

  // ============================================
  // QUERY RECORDS (Multiple)
  // API: https://api.jodoo.com/api/v5/app/entry/data/list
  // ============================================
  async queryRecords(options?: {
    limit?: number;
    filter?: any;
    fields?: string[];
  }): Promise<JodooRecord[]> {
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/list`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        limit: options?.limit || 100,
        filter: options?.filter || {},
        fields: options?.fields || [],
      }),
    });

    const result: JodooResponse = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`Jodoo API Error: ${result.msg}`);
    }

    return result.data || [];
  }

  // ============================================
  // QUERY SINGLE RECORD
  // API: https://api.jodoo.com/api/v5/app/entry/data/get
  // ============================================
  async getRecord(dataId: string): Promise<JodooRecord | null> {
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/get`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data_id: dataId,
      }),
    });

    const result: JodooResponse = await response.json();
    
    if (result.code !== 0) {
      if (result.code === 8303) return null; // Record not found
      throw new Error(`Jodoo API Error: ${result.msg}`);
    }

    return result.data;
  }

  // ============================================
  // CREATE SINGLE RECORD
  // API: https://api.jodoo.com/api/v5/app/entry/data/create
  // ============================================
  async createRecord(data: Record<string, any>): Promise<JodooRecord> {
    const jodooData = this.mapToJodooFormat(data);
    
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data: jodooData,
        is_start_workflow: true, // Optionally start workflow
      }),
    });

    const result: JodooResponse = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`Jodoo API Error: ${result.msg}`);
    }

    return result.data;
  }

  // ============================================
  // UPDATE SINGLE RECORD
  // API: https://api.jodoo.com/api/v5/app/entry/data/update
  // ============================================
  async updateRecord(dataId: string, data: Record<string, any>): Promise<JodooRecord> {
    const jodooData = this.mapToJodooFormat(data);
    
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

    const result: JodooResponse = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`Jodoo API Error: ${result.msg}`);
    }

    return result.data;
  }

  // ============================================
  // DELETE SINGLE RECORD
  // API: https://api.jodoo.com/api/v5/app/entry/data/delete
  // ============================================
  async deleteRecord(dataId: string): Promise<boolean> {
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/delete`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data_id: dataId,
      }),
    });

    const result: JodooResponse = await response.json();
    return result.code === 0;
  }

  // ============================================
  // BATCH CREATE RECORDS
  // API: https://api.jodoo.com/api/v5/app/entry/data/batch_create
  // ============================================
  async batchCreate(records: Record<string, any>[]): Promise<JodooRecord[]> {
    const jodooRecords = records.map(r => this.mapToJodooFormat(r));
    
    const response = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/batch_create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        app_id: this.config.appId,
        entry_id: this.config.formId,
        data_list: jodooRecords,
      }),
    });

    const result: JodooResponse = await response.json();
    
    if (result.code !== 0) {
      throw new Error(`Jodoo API Error: ${result.msg}`);
    }

    return result.data || [];
  }

  // ============================================
  // Helper: Map Supabase data to Jodoo format
  // ============================================
  private mapToJodooFormat(data: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const widgetId = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING];
      if (widgetId && value !== undefined && value !== null) {
        // Jodoo expects { value: <actual_value> } format
        mapped[widgetId] = { value };
      }
    }
    
    return mapped;
  }

  // ============================================
  // Helper: Map Jodoo data to Supabase format
  // ============================================
  mapFromJodooFormat(jodooData: JodooRecord): Record<string, any> {
    const mapped: Record<string, any> = {
      jodoo_id: jodooData._id,
    };
    
    // Reverse mapping
    const reverseMapping = Object.entries(FIELD_MAPPING).reduce((acc, [key, widgetId]) => {
      acc[widgetId] = key;
      return acc;
    }, {} as Record<string, string>);
    
    for (const [widgetId, value] of Object.entries(jodooData)) {
      const fieldName = reverseMapping[widgetId];
      if (fieldName) {
        mapped[fieldName] = value;
      }
    }
    
    return mapped;
  }
}

// ============================================
// SYNC SERVICE: Jodoo ↔ Supabase
// ============================================
export class JodooSyncService {
  private jodoo: JodooClient;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(jodooConfig: JodooConfig, supabaseUrl: string, supabaseKey: string) {
    this.jodoo = new JodooClient(jodooConfig);
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  // Import all records from Jodoo to Supabase
  async importFromJodoo(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const jodooRecords = await this.jodoo.queryRecords({ limit: 500 });
      
      for (const record of jodooRecords) {
        try {
          const mapped = this.jodoo.mapFromJodooFormat(record);
          
          // Upsert to Supabase
          const response = await fetch(`${this.supabaseUrl}/rest/v1/deals`, {
            method: 'POST',
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify(mapped),
          });

          if (response.ok) {
            imported++;
          } else {
            const error = await response.text();
            errors.push(`Record ${record._id}: ${error}`);
          }
        } catch (err) {
          errors.push(`Record ${record._id}: ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Import failed: ${err}`);
    }

    return { imported, errors };
  }

  // Export record from Supabase to Jodoo
  async exportToJodoo(deal: Record<string, any>): Promise<string | null> {
    try {
      const result = await this.jodoo.createRecord(deal);
      return result._id;
    } catch (err) {
      console.error('Export to Jodoo failed:', err);
      return null;
    }
  }

  // Sync single record (bidirectional)
  async syncRecord(supabaseId: string, jodooId?: string): Promise<boolean> {
    // Fetch from Supabase
    const supabaseResponse = await fetch(
      `${this.supabaseUrl}/rest/v1/deals?id=eq.${supabaseId}`,
      {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      }
    );
    
    if (!supabaseResponse.ok) return false;
    
    const [supabaseDeal] = await supabaseResponse.json();
    if (!supabaseDeal) return false;

    if (jodooId) {
      // Update existing Jodoo record
      await this.jodoo.updateRecord(jodooId, supabaseDeal);
    } else {
      // Create new Jodoo record
      await this.jodoo.createRecord(supabaseDeal);
    }

    return true;
  }
}

// ============================================
// WEBHOOK HANDLER for Jodoo → Supabase
// ============================================
export interface JodooWebhookPayload {
  op: 'data_create' | 'data_update' | 'data_remove' | 'data_recover';
  data: JodooRecord;
}

export async function handleJodooWebhook(
  payload: JodooWebhookPayload,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  const client = new JodooClient({
    apiKey: '',  // Not needed for webhook handling
    appId: '',
    formId: '',
  });

  const mapped = client.mapFromJodooFormat(payload.data);

  switch (payload.op) {
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
        body: JSON.stringify(mapped),
      });
      break;

    case 'data_update':
      await fetch(`${supabaseUrl}/rest/v1/deals?jodoo_id=eq.${payload.data._id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapped),
      });
      break;

    case 'data_remove':
      await fetch(`${supabaseUrl}/rest/v1/deals?jodoo_id=eq.${payload.data._id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      break;
  }

  return true;
}

// ============================================
// Factory function for easy initialization
// ============================================
export function createJodooClient(): JodooClient {
  const apiKey = process.env.JODOO_API_KEY || '';
  const appId = process.env.JODOO_APP_ID || '';
  const formId = process.env.JODOO_FORM_ID || '';

  if (!apiKey || !appId || !formId) {
    throw new Error('Missing Jodoo configuration. Set JODOO_API_KEY, JODOO_APP_ID, JODOO_FORM_ID');
  }

  return new JodooClient({ apiKey, appId, formId });
}

export function createJodooSyncService(): JodooSyncService {
  const jodooConfig = {
    apiKey: process.env.JODOO_API_KEY || '',
    appId: process.env.JODOO_APP_ID || '',
    formId: process.env.JODOO_FORM_ID || '',
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

  return new JodooSyncService(jodooConfig, supabaseUrl, supabaseKey);
}
