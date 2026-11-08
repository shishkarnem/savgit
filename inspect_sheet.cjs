const fs = require('fs');

const content = fs.readFileSync('sheet_export.csv', 'utf8');

function parseCSV(text) {
  const p = [];
  let row = [''];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' || c === ';') && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      p.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
    i++;
  }
  if (row.length > 1 || row[0] !== '') {
    p.push(row);
  }
  return p;
}

const rows = parseCSV(content);
const headers = rows[0];

console.log('=== HEADERS ===');
headers.forEach((h, i) => console.log(`[${i}] ${h}`));

for (let r = 1; r < Math.min(rows.length, 8); r++) {
  console.log(`\n=== ROW ${r} ===`);
  headers.forEach((h, i) => {
    const val = rows[r][i] || '';
    if (val) {
      console.log(`  ${h} [${i}]: ${val.length > 100 ? val.substring(0, 100) + '...' : val}`);
    }
  });
}
