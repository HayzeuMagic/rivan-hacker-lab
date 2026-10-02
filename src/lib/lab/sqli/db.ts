/**
 * Challenge 4 — SQL Injection
 * A deliberately vulnerable in-memory "MySQL-like" engine for the Aurora
 * Outfitters GearTrack catalog. It implements just enough SQL semantics for
 * realistic union-based, boolean-based and error-based injection inside the
 * isolated lab. It never talks to a real database.
 */

export const sqliFlag = 'RIVAN{sqli_union_extraction}'

type Cell = string | number
type Row = Cell[]

interface Table {
  columns: string[]
  rows: Row[]
}

const products: Table = {
  columns: ['id', 'name', 'category', 'price', 'stock'],
  rows: [
    [1, 'Summit 45L Pack', 'packs', 189.99, 14],
    [2, 'Ridgeline Daypack', 'packs', 89.5, 32],
    [3, 'Glacier 2P Tent', 'tents', 259.0, 8],
    [4, 'Stormwall 3P Tent', 'tents', 329.99, 5],
    [5, 'Merino Base Layer', 'apparel', 64.0, 41],
    [6, 'Windproof Shell', 'apparel', 142.75, 19],
    [7, 'Trailhead Compass', 'navigation', 28.99, 55],
    [8, 'Topo Map Set', 'navigation', 19.5, 63],
  ],
}

const users: Table = {
  columns: ['id', 'username', 'password', 'role'],
  rows: [
    [1, 'admin', 'Aur0ra!Adm1n#24', 'administrator'],
    [2, 'jpark', 'jpark-gear-2023', 'buyer'],
    [3, 'warehouse.ops', 'Ops!Warehouse1', 'staff'],
    [4, 'auditor', 'Audit!Read0nly', 'auditor'],
  ],
}

const secrets: Table = {
  columns: ['id', 'item', 'value'],
  rows: [
    [1, 'lab_flag', sqliFlag],
    [2, 'supplier_api_key', 'AKIA-AU-LAB-9F3D71C2E8B4'],
  ],
}

const tables: Record<string, Table> = {
  products,
  users,
  secrets,
  'information_schema.tables': {
    columns: ['table_name'],
    rows: [['products'], ['users'], ['secrets']],
  },
  'information_schema.columns': {
    columns: ['table_name', 'column_name'],
    rows: [
      ...products.columns.map((c): Row => ['products', c]),
      ...users.columns.map((c): Row => ['users', c]),
      ...secrets.columns.map((c): Row => ['secrets', c]),
    ],
  },
}

export type QueryResult = { ok: true; columns: string[]; rows: Row[] } | { ok: false; error: string }

function stripComments(sql: string): string {
  const commentIndex = (() => {
    const dash = sql.indexOf('--')
    const hash = sql.indexOf('#')
    if (dash === -1) return hash
    if (hash === -1) return dash
    return Math.min(dash, hash)
  })()
  return commentIndex === -1 ? sql : sql.slice(0, commentIndex)
}

function splitTopLevel(input: string, pattern: RegExp): string[] {
  // Sufficient for lab queries: literals never contain union/and/or separators in practice.
  return input.split(pattern)
}

function truthy(value: Cell): boolean {
  if (typeof value === 'number') return value !== 0
  return value !== '' && value !== '0'
}

function resolveOperand(raw: string, columns: string[], row: Row): Cell {
  const token = raw.trim()
  const quoted = token.match(/^'([\s\S]*)'$/)
  if (quoted) return quoted[1].replace(/\\'/g, "'")
  if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token)
  if (/^null$/i.test(token)) return ''
  const name = token.replace(/^[a-z0-9_]+\./i, '')
  const index = columns.findIndex((column) => column.toLowerCase() === name.toLowerCase())
  if (index === -1) throw new Error(`Unknown column '${token}' in 'field list'`)
  return row[index]
}

function likeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '[\\s\\S]*')
  return new RegExp(`^${escaped}$`, 'i')
}

function evalTerm(term: string, columns: string[], row: Row): boolean {
  let t = term.trim()
  while (t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1).trim()
  const comparison = t.match(/^([\s\S]+?)\s*(=|!=|<>|>=|<=|>|<|like)\s*([\s\S]+)$/i)
  if (!comparison) return truthy(resolveOperand(t, columns, row))

  const left = resolveOperand(comparison[1], columns, row)
  const right = resolveOperand(comparison[3], columns, row)
  const op = comparison[2].toLowerCase()

  if (op === 'like') return likeToRegex(String(right)).test(String(left))

  let cmp: number
  if (typeof left === 'number' && typeof right === 'number') {
    cmp = left === right ? 0 : left < right ? -1 : 1
  } else {
    const a = String(left)
    const b = String(right)
    cmp = a === b ? 0 : a < b ? -1 : 1
  }

  switch (op) {
    case '=':
      return cmp === 0
    case '!=':
    case '<>':
      return cmp !== 0
    case '>':
      return cmp > 0
    case '<':
      return cmp < 0
    case '>=':
      return cmp >= 0
    case '<=':
      return cmp <= 0
    default:
      return false
  }
}

function evalCondition(condition: string, columns: string[], row: Row): boolean {
  const orParts = splitTopLevel(condition, /\s+or\s+/i)
  return orParts.some((orPart) => splitTopLevel(orPart, /\s+and\s+/i).every((term) => evalTerm(term, columns, row)))
}

function evalSelect(part: string): QueryResult {
  const withFrom = part.match(/^\s*select\s+([\s\S]+?)\s+from\s+([a-z0-9_.]+)(?:\s+where\s+([\s\S]+?))?\s*$/i)
  if (!withFrom) {
    const literal = part.match(/^\s*select\s+([\s\S]+)$/i)
    if (!literal) throw new Error(`You have an error in your SQL syntax near '${part.slice(0, 24)}'`)
    const items = literal[1].split(',').map((item) => item.trim())
    const values = items.map((item) => resolveOperand(item, [], []))
    return { ok: true, columns: items.map((_, i) => `${i + 1}`), rows: [values] }
  }

  const tableName = withFrom[2].toLowerCase()
  const table = tables[tableName]
  if (!table) throw new Error(`Table 'aurora.${tableName.replace(/.*\./, '')}' doesn't exist`)

  const items = withFrom[1].split(',').map((item) => item.trim())
  const where = withFrom[3]
  const selectedRows = table.rows.filter((row) => (where ? evalCondition(where, table.columns, row) : true))

  if (items.length === 1 && items[0] === '*') {
    return { ok: true, columns: [...table.columns], rows: selectedRows.map((row) => [...row]) }
  }

  const rows = selectedRows.map((row) => items.map((item) => resolveOperand(item, table.columns, row)))
  return { ok: true, columns: items, rows }
}

export function runQuery(rawSql: string): QueryResult {
  const sql = stripComments(rawSql).trim().replace(/;+\s*$/, '')
  if (!sql) return { ok: false, error: 'Query was empty' }

  const quoteCount = (sql.match(/(?<!\\)'/g) ?? []).length
  if (quoteCount % 2 === 1) {
    const tail = sql.slice(Math.max(0, sql.length - 30))
    return {
      ok: false,
      error: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${tail}' at line 1`,
    }
  }

  try {
    const parts = splitTopLevel(sql, /\s+union\s+(?:all\s+)?/i)
    const base = evalSelect(parts[0])
    if (!base.ok) return base

    for (const unionPart of parts.slice(1)) {
      const next = evalSelect(unionPart)
      if (!next.ok) return next
      if (next.columns.length !== base.columns.length) {
        return { ok: false, error: 'The used SELECT statements have a different number of columns' }
      }
      base.rows.push(...next.rows)
    }
    return base
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'SQL execution failed' }
  }
}

/** Builds the catalog query exactly the way the vulnerable GearTrack module does. */
export function buildCategoryQuery(category: string): string {
  return `SELECT id, name, category, price, stock FROM products WHERE category = '${category}'`
}

export function buildSearchQuery(term: string): string {
  return `SELECT id, name, category, price, stock FROM products WHERE name LIKE '%${term}%'`
}

export function buildLoginQuery(username: string, password: string): string {
  return `SELECT id, username, role FROM users WHERE username = '${username}' AND password = '${password}'`
}

export function usersTableDump() {
  return users.rows.map((row) => ({ id: row[0], username: row[1], password: row[2], role: row[3] }))
}
