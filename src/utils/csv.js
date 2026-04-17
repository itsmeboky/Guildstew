/**
 * Tiny CSV builder + downloader for the admin dashboard's
 * "Export CSV" buttons.
 *
 * Pass an array of plain-object rows; the column set is derived
 * from the first row unless `columns` is provided. Cells are
 * stringified, escaped per RFC 4180 (quote, double quotes inside,
 * commas, newlines).
 */

function escape(value) {
  if (value === null || value === undefined) return '';
  let str;
  if (value instanceof Date) str = value.toISOString();
  else if (typeof value === 'object') str = JSON.stringify(value);
  else str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const header = cols.join(',');
  const lines = rows.map((row) => cols.map((c) => escape(row[c])).join(','));
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename, rows, columns) {
  const csv = rowsToCsv(rows || [], columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
