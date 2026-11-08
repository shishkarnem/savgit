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

const allRows = parseCSV(content);
const headers = allRows[0];

console.log('Total rows:', allRows.length);

// Robust identification of columns
const getColIdx = (regex) => headers.findIndex(h => regex.test(h));

const uidIdx = getColIdx(/^tilda\s*uid/i);
const brandIdx = getColIdx(/^brand/i);
const skuIdx = getColIdx(/^sku/i);
const catIdx = getColIdx(/^category/i);
const titleIdx = getColIdx(/^title/i);
const descIdx = getColIdx(/^description/i);
const textIdx = getColIdx(/^text/i);
const photoIdx = getColIdx(/^photo/i);
const priceIdx = getColIdx(/^price$/i);
const oldPriceIdx = getColIdx(/^price\s*old/i);
const editionsIdx = getColIdx(/^editions/i);
const modTextIdx = getColIdx(/^modifications/i);
const externalIdIdx = getColIdx(/^external\s*id/i);
const parentUidIdx = getColIdx(/^parent\s*uid/i);
const lengthIdx = getColIdx(/^length/i);
const urlIdx = getColIdx(/^url/i);

// Tab columns
const tabCols = [];
headers.forEach((h, idx) => {
  if (/^tab/i.test(h) || /вкладка/i.test(h)) {
    tabCols.push({ h, idx });
  }
});

console.log('Found Tab columns:', tabCols);

const products = [];
let currentProduct = null;

for (let r = 1; r < allRows.length; r++) {
  const row = allRows[r];
  if (!row || row.every(c => !c || !c.trim())) continue;

  const getVal = (idx) => (idx >= 0 && row[idx] ? row[idx].trim() : '');

  const uid = getVal(uidIdx);
  const brand = getVal(brandIdx);
  const sku = getVal(skuIdx);
  const category = getVal(catIdx);
  const title = getVal(titleIdx);
  const desc = getVal(descIdx);
  const textHtml = getVal(textIdx);
  const photo = getVal(photoIdx);
  const rawPrice = getVal(priceIdx).replace(/[^\d.]/g, '');
  const price = parseFloat(rawPrice) || 0;
  const rawOldPrice = getVal(oldPriceIdx).replace(/[^\d.]/g, '');
  const oldPrice = parseFloat(rawOldPrice) || 0;
  const editions = getVal(editionsIdx);
  const modifications = getVal(modTextIdx);
  const externalId = getVal(externalIdIdx);
  const rawParentUid = getVal(parentUidIdx);
  const lengthVal = getVal(lengthIdx); // Tilda sometimes puts parent UID in Length column
  const rowUrl = getVal(urlIdx);

  // Check if this row is a child variant:
  // Signals of child row:
  // 1. Editions contains 'Тариф:' (e.g. 'Тариф:Лайт')
  // 2. Title has ' - ' (e.g. 'ИИ Продавец Обуви - Лайт...')
  // 3. Category is empty AND we already have a currentProduct
  // 4. lengthVal matches currentProduct.tildaUid
  const isEditionsVariant = /тариф:/i.test(editions);
  const isTitleVariant = currentProduct && title.startsWith(currentProduct.name + ' - ');
  const isChildRow = isEditionsVariant || isTitleVariant || (currentProduct && !category && (price > 0 || sku));

  if (!isChildRow) {
    // This is a PARENT PRODUCT!
    const cleanDesc = (desc || '').replace(/<[^>]*>?/gm, '').trim();
    currentProduct = {
      id: uid || `prod_${r}`,
      tildaUid: uid,
      brand: brand || 'SAV AI',
      sku: sku || undefined,
      category: category || 'SAV Торговля',
      name: title || `Продукт ${r}`,
      niche: desc || undefined,
      shortDescription: cleanDesc || 'Интеллектуальный помощник для автоматизации продаж',
      fullDescription: cleanDesc || undefined,
      textHtml: textHtml || undefined,
      imageUrl: photo || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
      price: price || 3600,
      maxPrice: 57600,
      period: 'руб',
      tabs: [],
      variants: []
    };

    // Extract options/modifiers from row overflow if present
    const optionsList = [];
    headers.forEach((h, hIdx) => {
      const cellVal = getVal(hIdx);
      if (cellVal && cellVal.includes('=+')) {
        optionsList.push(cellVal);
      }
    });
    if (optionsList.length > 0) {
      currentProduct.optionsList = optionsList;
    }

    products.push(currentProduct);
  } else if (currentProduct) {
    // This is a CHILD PACKAGE VARIANT!
    let tariffName = '';
    if (editions) {
      const parts = editions.split(';').map(s => s.trim());
      for (const p of parts) {
        const [k, v] = p.split(':').map(s => s.trim());
        if (k && v && /тариф/i.test(k)) {
          tariffName = v;
        }
      }
    }
    if (!tariffName && title) {
      const tMatch = title.match(/-\s*(Лайт|Эконом|Стандарт|Премиум|VIP|Базовый|Продвинутый|Максимальный)/i);
      if (tMatch) {
        tariffName = tMatch[1];
      }
    }

    const editionUid = uid;
    const directUrl = getVal(27) || (rowUrl.includes('http') ? rowUrl : '');

    const variant = {
      id: uid || `var_${currentProduct.id}_${currentProduct.variants.length + 1}`,
      tildaUid: uid,
      parentUid: currentProduct.tildaUid,
      sku: sku || undefined,
      tariff: tariffName || (title ? title.split(' - ')[1] : `Тариф ${currentProduct.variants.length + 1}`),
      name: `Тариф: ${tariffName || title}`,
      price: price || 3600,
      oldPrice: oldPrice || (price ? price * 5 : 18000),
      editions: editions || undefined,
      categoryOption: modifications?.replace(/^Категория:/, '') || undefined,
      segmentOption: externalId?.replace(/^Сегмент:/, '') || undefined,
      url: directUrl || undefined
    };

    currentProduct.variants.push(variant);

    // Update parent price boundaries
    if (price > 0) {
      if (!currentProduct.price || price < currentProduct.price) {
        currentProduct.price = price;
      }
      if (!currentProduct.maxPrice || price > currentProduct.maxPrice) {
        currentProduct.maxPrice = price;
      }
    }
  }
}

console.log('\n=== PARSED RESULT ===');
console.log('Total Products Created:', products.length);
products.forEach((p, idx) => {
  console.log(`\nProduct [${idx + 1}] ID=${p.id} Name="${p.name}" Category="${p.category}" BasePrice=${p.price}₽ MaxPrice=${p.maxPrice}₽ VariantsCount=${p.variants.length}`);
  p.variants.forEach((v, vIdx) => {
    console.log(`   -> Variant [${vIdx + 1}]: Tariff="${v.tariff}" SKU="${v.sku}" Price=${v.price}₽ OldPrice=${v.oldPrice}₽ UID=${v.tildaUid}`);
  });
});
