import { Response } from 'express';
import { ZipArchive } from 'archiver';
import fs from 'fs';
import path from 'path';
import { query, runSql } from '../db/database';

/**
 * Escapes a single CSV value with RFC 4180 rules
 */
export function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses CSV text taking into account quoted multi-line values and escaped quotes
 */
export function parseCsv(csvText: string): { headers: string[]; rows: Record<string, any>[] } {
  // Remove BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return { headers: [], rows: [] };

  const parsedLines: string[][] = [];
  let currentField = '';
  let currentRecord: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else if (char === '"') {
        inQuotes = false;
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRecord.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        currentRecord.push(currentField);
        parsedLines.push(currentRecord);
        currentField = '';
        currentRecord = [];
        i += 2;
        continue;
      } else if (char === '\n' || char === '\r') {
        currentRecord.push(currentField);
        parsedLines.push(currentRecord);
        currentField = '';
        currentRecord = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    parsedLines.push(currentRecord);
  }

  if (parsedLines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parsedLines[0].map(h => h.trim());
  const rows: Record<string, any>[] = [];

  for (let r = 1; r < parsedLines.length; r++) {
    const values = parsedLines[r];
    if (values.length === 1 && values[0].trim() === '') continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] !== undefined ? values[idx] : null;
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Converts a PostgreSQL BD ProTalk table to CSV format string with UTF-8 BOM
 */
export async function exportTableToCsv(tableName: string): Promise<string> {
  const schema = await query(`
    SELECT column_name as name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1 
    ORDER BY ordinal_position ASC
  `, [tableName]);

  const columns = schema.map((c: any) => c.name);
  const rows = await query(`SELECT * FROM "${tableName}"`);

  if (columns.length === 0 && rows.length > 0) {
    Object.keys(rows[0]).forEach(k => columns.push(k));
  }

  const headerLine = columns.map(escapeCsvValue).join(',');
  const rowLines = rows.map((row: any) => {
    return columns.map((col: string) => escapeCsvValue(row[col])).join(',');
  });

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Imports CSV text into a BD ProTalk PostgreSQL table
 */
export async function importCsvToTable(tableName: string, csvContent: string): Promise<{ insertedCount: number; errors: string[] }> {
  const { headers, rows } = parseCsv(csvContent);
  if (headers.length === 0 || rows.length === 0) {
    return { insertedCount: 0, errors: ['CSV файл пуст или имеет неверный формат'] };
  }

  const schema = await query(`
    SELECT column_name as name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);

  const existingCols = new Set(schema.map((c: any) => c.name.toLowerCase()));
  const validHeaders = headers.filter(h => existingCols.has(h.toLowerCase()));

  if (validHeaders.length === 0) {
    return { insertedCount: 0, errors: [`В CSV не найдено колонок, соответствующих структуре таблицы ${tableName}`] };
  }

  const errors: string[] = [];
  let insertedCount = 0;

  const placeholders = validHeaders.map(() => '?').join(', ');
  const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${validHeaders.join(', ')}) VALUES (${placeholders})`;

  for (const row of rows) {
    try {
      const values = validHeaders.map(col => {
        const val = row[col];
        if (val === '' || val === undefined) return null;
        return val;
      });
      await runSql(insertSql, values);
      insertedCount++;
    } catch (err: any) {
      errors.push(`Ошибка вставки строки: ${err.message}`);
    }
  }

  try {
    await runSql(`
      INSERT INTO system_logs (id, level, source, message)
      VALUES (?, 'INFO', 'CSV_IMPORT', ?)
    `, [`log_${Date.now()}`, `[CSV Import] Imported ${insertedCount} rows into table '${tableName}'`]);
  } catch (_) {}

  return { insertedCount, errors };
}

/**
 * Packs all PostgreSQL tables as CSV files into a ZIP archive and streams it directly to the response
 */
export async function exportAllTablesToZip(res: Response): Promise<void> {
  const tableRows = await query(`
    SELECT relname as name 
    FROM pg_stat_user_tables 
    ORDER BY relname ASC
  `);

  const tables = tableRows.map((t: any) => t.name);

  const archive = new ZipArchive({
    zlib: { level: 9 } // Maximum compression
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFilename = `sav_ai_protalk_tables_backup_${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  archive.pipe(res);

  for (const tableName of tables) {
    try {
      const csvData = await exportTableToCsv(tableName);
      archive.append(csvData, { name: `${tableName}.csv` });
    } catch (err) {
      console.error(`Error archiving table ${tableName}:`, err);
    }
  }

  const metadata = {
    backup_type: 'ALL_TABLES_CSV_ZIP',
    created_at: new Date().toISOString(),
    database: 'sav (BD ProTalk PostgreSQL)',
    tables_count: tables.length,
    tables: tables
  };
  archive.append(JSON.stringify(metadata, null, 2), { name: '_backup_metadata.json' });

  await archive.finalize();
}

/**
 * Creates a complete JSON backup containing all BD ProTalk table schemas and data
 */
export async function exportFullJsonBackup(): Promise<Record<string, any>> {
  const tableRows = await query(`
    SELECT relname as name 
    FROM pg_stat_user_tables 
    ORDER BY relname ASC
  `);
  const tables = tableRows.map((t: any) => t.name);

  const backupData: Record<string, any> = {
    version: '2.0',
    platform: 'SAV_AI_PROTALK_SYSTEM',
    database: 'sav (BD ProTalk PostgreSQL)',
    exported_at: new Date().toISOString(),
    tables_count: tables.length,
    tables: {}
  };

  for (const tableName of tables) {
    try {
      const schema = await query(`
        SELECT column_name as name, data_type as type,
               CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
               column_default as dflt_value
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC
      `, [tableName]);

      const rows = await query(`SELECT * FROM "${tableName}"`);

      backupData.tables[tableName] = {
        schema: schema,
        rowCount: rows.length,
        rows: rows
      };
    } catch (err: any) {
      console.warn(`[Backup] Table ${tableName} export warning:`, err.message);
    }
  }

  return backupData;
}

/**
 * Restores all database tables and rows from a full JSON backup to BD ProTalk PostgreSQL
 */
export async function restoreFullJsonBackup(backupData: any): Promise<{
  success: boolean;
  tablesRestored: number;
  totalRowsRestored: number;
  details: Record<string, number>;
  error?: string;
}> {
  if (!backupData || !backupData.tables || typeof backupData.tables !== 'object') {
    return {
      success: false,
      tablesRestored: 0,
      totalRowsRestored: 0,
      details: {},
      error: 'Неверная структура JSON бэкапа (отсутствует поле tables)'
    };
  }

  let tablesRestored = 0;
  let totalRowsRestored = 0;
  const details: Record<string, number> = {};

  const tableNames = Object.keys(backupData.tables);

  for (const tableName of tableNames) {
    const tableInfo = backupData.tables[tableName];
    if (!tableInfo || !Array.isArray(tableInfo.rows)) continue;

    try {
      // 1. Clear existing rows in this table if restoring
      try {
        await runSql(`DELETE FROM "${tableName}"`);
      } catch (delErr) {
        console.warn(`Could not clear table ${tableName}:`, delErr);
      }

      // 2. Insert rows
      const rows = tableInfo.rows;
      let insertedForTable = 0;

      if (rows.length > 0) {
        const colSet = new Set<string>();
        rows.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
        const cols = Array.from(colSet);

        const schema = await query(`
          SELECT column_name as name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        const validSchemaCols = new Set(schema.map((c: any) => c.name));
        const finalCols = cols.filter(c => validSchemaCols.has(c));

        if (finalCols.length > 0) {
          const placeholders = finalCols.map(() => '?').join(', ');
          const quotedCols = finalCols.map(c => `"${c}"`).join(', ');
          const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;

          for (const row of rows) {
            try {
              const vals = finalCols.map(c => (row[c] !== undefined ? row[c] : null));
              await runSql(insertSql, vals);
              insertedForTable++;
            } catch (rErr) {
              // skip single bad row
            }
          }
        }
      }

      details[tableName] = insertedForTable;
      totalRowsRestored += insertedForTable;
      tablesRestored++;
    } catch (err: any) {
      console.error(`Error restoring table ${tableName}:`, err);
    }
  }

  try {
    await runSql(`
      INSERT INTO system_logs (id, level, source, message)
      VALUES (?, 'INFO', 'SYSTEM_RESTORE', ?)
    `, [`log_${Date.now()}`, `[Database Restore] Restored ${tablesRestored} tables and ${totalRowsRestored} rows from JSON backup.`]);
  } catch (_) {}

  return {
    success: true,
    tablesRestored,
    totalRowsRestored,
    details
  };
}

/**
 * Packs clean project source code and assets (excluding node_modules, cache, git) into a clean ZIP
 */
export async function exportSourceCodeZip(res: Response): Promise<void> {
  const archive = new ZipArchive({
    zlib: { level: 6 }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFilename = `SAV_AI_SourceCode_${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  archive.pipe(res);

  const dirsToAdd = ['src', 'backend/src', 'public'];
  for (const dir of dirsToAdd) {
    const fullDir = path.join(process.cwd(), dir);
    if (fs.existsSync(fullDir)) {
      archive.directory(fullDir, dir);
    }
  }

  const rootFiles = [
    'package.json', 'server.ts', 'vite.config.ts', 'index.html',
    'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
    'tailwind.config.ts', 'metadata.json', '.env.example', '.gitignore',
    'components.json', 'postcss.config.js', 'eslint.config.js'
  ];

  for (const f of rootFiles) {
    const fullFile = path.join(process.cwd(), f);
    if (fs.existsSync(fullFile)) {
      archive.file(fullFile, { name: f });
    }
  }

  await archive.finalize();
}
