import { isCategoryAllowed } from './categories.js';
import type { Transaction } from './transactions.repository.js';
import { createTransactionSchema, type CreateTransactionInput } from './transactions.schemas.js';

export const CSV_COLUMNS = ['date', 'type', 'category', 'amount', 'note'] as const;
type CsvColumn = (typeof CSV_COLUMNS)[number];

export const MAX_IMPORT_ROWS = 2000;

export interface CsvRowError {
  row: number;
  message: string;
}

export interface ParsedImport {
  drafts: CreateTransactionInput[];
  errors: CsvRowError[];
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;
const CSV_TOKEN = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r?\n|$)/g;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function escapeCell(cell: string): string {
  const neutralised = FORMULA_TRIGGER.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTING.test(neutralised) ? `"${neutralised.replace(/"/g, '""')}"` : neutralised;
}

export function toCsv(transactions: Transaction[]): string {
  const lines = transactions.map((entry) =>
    [entry.occurredOn, entry.type, entry.category, (entry.amountCents / 100).toFixed(2), entry.note]
      .map(escapeCell)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...lines].join('\r\n') + '\r\n';
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  for (const match of text.replace(/^﻿/, '').matchAll(CSV_TOKEN)) {
    const [, quotedCell, bareCell = '', delimiter] = match;
    cells.push(quotedCell === undefined ? bareCell.trim() : quotedCell.replace(/""/g, '"'));
    if (delimiter === ',') continue;
    rows.push(cells);
    cells = [];
    if (delimiter === '') break;
  }
  return rows.filter((row) => row.some((cell) => cell !== ''));
}

function parseAmount(raw: string): number | null {
  const normalised = raw.replace(/,/g, '');
  if (!AMOUNT_PATTERN.test(normalised)) return null;
  const [whole = '0', fraction = ''] = normalised.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function columnIndexes(header: string[]): Record<CsvColumn, number> | string {
  const normalised = header.map((cell) => cell.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((column) => column !== 'note' && !normalised.includes(column));
  if (missing.length > 0) return `Missing column(s): ${missing.join(', ')}`;
  return Object.fromEntries(CSV_COLUMNS.map((column) => [column, normalised.indexOf(column)])) as Record<CsvColumn, number>;
}

function toDraft(cells: string[], columns: Record<CsvColumn, number>): CreateTransactionInput | string {
  const cell = (column: CsvColumn) => (columns[column] >= 0 ? (cells[columns[column]] ?? '') : '');
  const amountCents = parseAmount(cell('amount'));
  if (amountCents === null) return `Invalid amount "${cell('amount')}"`;

  const parsed = createTransactionSchema.safeParse({
    type: cell('type').toLowerCase(),
    amountCents,
    category: cell('category'),
    note: cell('note'),
    occurredOn: cell('date'),
  });
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  }
  if (!isCategoryAllowed(parsed.data.type, parsed.data.category)) {
    return `"${parsed.data.category}" is not a valid ${parsed.data.type} category`;
  }
  return parsed.data;
}

export function parseTransactionsCsv(text: string): ParsedImport {
  const [header, ...body] = parseCsv(text);
  if (!header) return { drafts: [], errors: [{ row: 1, message: 'File is empty' }] };

  const columns = columnIndexes(header);
  if (typeof columns === 'string') return { drafts: [], errors: [{ row: 1, message: columns }] };
  if (body.length > MAX_IMPORT_ROWS) {
    return { drafts: [], errors: [{ row: 1, message: `Import is limited to ${MAX_IMPORT_ROWS} rows` }] };
  }

  const drafts: CreateTransactionInput[] = [];
  const errors: CsvRowError[] = [];
  body.forEach((cells, index) => {
    const draft = toDraft(cells, columns);
    if (typeof draft === 'string') errors.push({ row: index + 2, message: draft });
    else drafts.push(draft);
  });
  return { drafts, errors };
}
