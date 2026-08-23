import { Pool, QueryResult } from 'pg';

export type ResultSetHeader = {
  insertId: number;
  affectedRows: number;
};

const camelCaseIdentifiers = [
  'session_token', 'vipTierUpdatedAt', 'quarterlySpending', 'rewardPoints', 'vipQuarterKey', 'vipTier',
  'isFlashSale', 'salePrice', 'oldPrice', 'priceValue', 'imageUrl',
  'userId', 'totalAmount', 'createdAt', 'orderCode', 'paymentMethod', 'shippingAddress', 'estimatedDelivery', 'updatedAt',
  'orderId', 'productId', 'productName', 'bulkOrderId', 'orderDate', 'totalPrice', 'pricePerKg',
  'discountType', 'discountValue', 'minOrderValue', 'maxUsage', 'usedCount', 'startDate', 'endDate', 'isActive',
  'discountPct', 'activatedAt', 'createdBy', 'receiver', 'supplier',
  'totalProducts', 'totalStock', 'lowStock', 'flashSuggest', 'todayImport', 'todayExport',
  'totalIn', 'totalOut', 'fsActive', 'createdByName',
];

function translateSql(source: string): string {
  let parameterIndex = 0;
  let sql = source.replace(/\?/g, () => `$${++parameterIndex}`);

  sql = sql
    .replace(/\bRAND\(\)/gi, 'RANDOM()')
    .replace(/\bCURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/DATE_SUB\(CURRENT_DATE,\s*INTERVAL\s+6\s+DAY\)/gi, "CURRENT_DATE - INTERVAL '6 days'")
    .replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE/gi, 'ON CONFLICT ("productId") DO UPDATE SET')
    .replace(/VALUES\((discountPct|isActive|activatedAt)\)/gi, 'EXCLUDED."$1"');

  for (const identifier of camelCaseIdentifiers) {
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sql = sql.replace(new RegExp(`(?<!["'])\\b${escaped}\\b(?!["'])`, 'g'), `"${identifier}"`);
  }

  if (/^\s*INSERT\s+INTO\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
    sql += ' RETURNING id';
  }
  return sql;
}

export class PostgresCompatPool {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<[T, unknown]> {
    const result: QueryResult = await this.pool.query(translateSql(sql), params);
    if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql)) {
      const header: ResultSetHeader = {
        insertId: Number(result.rows[0]?.id ?? 0),
        affectedRows: result.rowCount ?? 0,
      };
      return [header as T, result.fields];
    }
    return [result.rows as T, result.fields];
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}
