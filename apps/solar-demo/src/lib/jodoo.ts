const JODOO_API_BASE = 'https://api.jodoo.com/api';

export class JodooClient {
  private headers: HeadersInit;
  private appId: string;
  private formId: string;

  constructor() {
    this.headers = {
      'Authorization': `Bearer ${process.env.JODOO_API_KEY || ''}`,
      'Content-Type': 'application/json',
    };
    this.appId = process.env.JODOO_APP_ID || '';
    this.formId = process.env.JODOO_FORM_ID || '';
  }

  async queryRecords(limit = 100) {
    const res = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/list`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ app_id: this.appId, entry_id: this.formId, limit }),
    });
    const result = await res.json();
    return result.data || [];
  }

  async createRecord(data: Record<string, any>) {
    const res = await fetch(`${JODOO_API_BASE}/v5/app/entry/data/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ app_id: this.appId, entry_id: this.formId, data, is_start_workflow: true }),
    });
    return res.json();
  }
}

export const jodooClient = new JodooClient();
