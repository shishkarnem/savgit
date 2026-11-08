/**
 * SAV BD ProTalk Client (PostgreSQL)
 * Official high-performance frontend data client for BD ProTalk PostgreSQL database 'sav'.
 */

export class ProTalkQueryBuilder<T = any> {
  private tableName: string;
  private filters: Record<string, string> = {};
  private selectedColumns: string = '*';
  private orderByCol: string = 'created_at';
  private orderDirection: 'asc' | 'desc' = 'desc';
  private limitCount: number = 1000;
  private offsetCount: number = 0;
  private isSingleResult: boolean = false;
  private isMaybeSingleResult: boolean = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    if (value === null || value === undefined) {
      this.filters[column] = 'is.null';
    } else {
      this.filters[column] = `eq.${value}`;
    }
    return this;
  }

  neq(column: string, value: any) {
    this.filters[column] = `neq.${value}`;
    return this;
  }

  like(column: string, pattern: string) {
    this.filters[column] = `like.${pattern}`;
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters[column] = `ilike.${pattern}`;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[column] = `in.(${values.join(',')})`;
    return this;
  }

  or(filters: string) {
    this.filters['_or'] = filters;
    return this;
  }

  gte(column: string, value: any) {
    this.filters[column] = `gte.${value}`;
    return this;
  }

  lte(column: string, value: any) {
    this.filters[column] = `lte.${value}`;
    return this;
  }

  gt(column: string, value: any) {
    this.filters[column] = `gt.${value}`;
    return this;
  }

  lt(column: string, value: any) {
    this.filters[column] = `lt.${value}`;
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderByCol = column;
    this.orderDirection = options.ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = Math.max(1, to - from + 1);
    return this;
  }

  single() {
    this.isSingleResult = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingleResult = true;
    this.limitCount = 1;
    return this;
  }

  insert(data: any | any[]) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  upsert(data: any | any[]) {
    this.operation = 'upsert';
    this.payload = data;
    return this;
  }

  update(updates: any) {
    this.operation = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      if (this.operation === 'insert' || this.operation === 'upsert') {
        const res = await this.resilientFetch(`/api/v1/data/${this.tableName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.payload),
        });
        const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
        if (!res.ok || !json.success) {
          return { data: null, error: new Error(json.error || 'Failed to insert row in BD ProTalk') };
        }
        let resData = json.data;
        if (this.isSingleResult) {
          resData = Array.isArray(resData) ? (resData[0] || null) : resData;
          if (!resData) return { data: null, error: new Error('No row returned') };
        } else if (this.isMaybeSingleResult) {
          resData = Array.isArray(resData) ? (resData[0] || null) : resData;
        }
        return { data: resData as T, error: null };
      }

      if (this.operation === 'update') {
        const queryParams = new URLSearchParams(this.filters);
        const res = await this.resilientFetch(`/api/v1/data/${this.tableName}?${queryParams.toString()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.payload),
        });
        const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
        if (!res.ok || !json.success) {
          return { data: null, error: new Error(json.error || 'Failed to update row in BD ProTalk') };
        }
        return { data: (json.data || true) as T, error: null };
      }

      if (this.operation === 'delete') {
        const queryParams = new URLSearchParams(this.filters);
        const res = await this.resilientFetch(`/api/v1/data/${this.tableName}?${queryParams.toString()}`, {
          method: 'DELETE',
        });
        const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
        if (!res.ok || !json.success) {
          return { data: null, error: new Error(json.error || 'Failed to delete row in BD ProTalk') };
        }
        return { data: true, error: null };
      }

      // Default: 'select'
      const params = new URLSearchParams(this.filters);
      params.set('_limit', String(this.limitCount));
      params.set('_offset', String(this.offsetCount));
      params.set('_order_by', this.orderByCol);
      params.set('_order_dir', this.orderDirection);
      if (this.selectedColumns && this.selectedColumns !== '*') {
        params.set('_select', this.selectedColumns);
      }

      const res = await this.resilientFetch(`/api/v1/data/${this.tableName}?${params.toString()}`);
      const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));

      if (!res.ok || !json.success) {
        return { data: null, error: new Error(json.error || 'BD ProTalk query failed') };
      }

      const rows = json.data || [];
      if (this.isSingleResult) {
        if (rows.length === 0) {
          return { data: null, error: new Error('No rows found') };
        }
        return { data: rows[0], error: null };
      }
      if (this.isMaybeSingleResult) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    } catch (err: any) {
      console.warn(`[BD ProTalk Client] Handled error on ${this.tableName}:`, err?.message || err);
      return { data: null, error: err };
    }
  }

  private async resilientFetch(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, init);
        return res;
      } catch {
        if (attempt === 2) {
          console.warn(`[BD ProTalk Client] Network fetch failed after 3 attempts for ${url}`);
          return new Response(JSON.stringify({ success: false, error: 'Сервер BD ProTalk временно недоступен', data: [] }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
      }
    }
    return new Response(JSON.stringify({ success: false, error: 'Сервер недоступен', data: [] }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export class ProTalkFunctionsClient {
  async invoke(functionName: string, options: { body?: any } = {}) {
    try {
      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch(`/api/v1/functions/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: options.body }),
          });
          break;
        } catch {
          if (attempt < 2) await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
        }
      }

      if (!res) {
        return { data: null, error: new Error('Не удалось связаться с сервером функций') };
      }

      const json = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }));
      if (!res.ok || !json.success) {
        return { data: null, error: new Error(json.error || `Error invoking function ${functionName}`) };
      }
      return { data: json.data, error: null };
    } catch (err: any) {
      console.warn(`[BD ProTalk Functions] Error invoking ${functionName}:`, err?.message || err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}

export class ProTalkDBClient {
  public functions = new ProTalkFunctionsClient();

  from<T = any>(tableName: string): ProTalkQueryBuilder<T> {
    return new ProTalkQueryBuilder<T>(tableName);
  }

  async rpc(functionName: string, params: Record<string, any> = {}) {
    return this.functions.invoke(functionName, { body: params });
  }
}

export const protalkDb = new ProTalkDBClient();
export const dbClient = protalkDb;
export const sqlite = protalkDb; // Backward-compatibility alias
export const createClient = () => protalkDb;
export default protalkDb;
