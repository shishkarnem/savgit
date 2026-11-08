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

console.log('--- ALL COLUMNS IN ROW 1 (PARENT) ---');
headers.forEach((h, idx) => {
  console.log(`Col ${idx} [${h}]: "${rows[1][idx] || ''}"`);
});

console.log('\n--- ALL COLUMNS IN ROW 2 (CHILD 1: Лайт) ---');
headers.forEach((h, idx) => {
  console.log(`Col ${idx} [${h}]: "${rows[2][idx] || ''}"`);
});

console.log('\n--- ALL COLUMNS IN ROW 3 (CHILD 2: Эконом) ---');
headers.forEach((h, idx) => {
  console.log(`Col ${idx} [${h}]: "${rows[3][idx] || ''}"`);
});

console.log('\n--- ALL COLUMNS IN ROW 6 (CHILD 5: VIP) ---');
headers.forEach((h, idx) => {
  console.log(`Col ${idx} [${h}]: "${rows[6][idx] || ''}"`);
});

console.log('\n--- ALL COLUMNS IN ROW 7 (NEXT PARENT) ---');
headers.forEach((h, idx) => {
  console.log(`Col ${idx} [${h}]: "${rows[7][idx] || ''}"`);
});
