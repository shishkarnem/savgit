import { GOOGLE_SHEET_ID, FALLBACK_PLANS } from '../constants';
import { PlanData, Sphere, Segment, Category, PlanLevel } from '../types';

export async function fetchPlansFromDatabase(filters: {
  sphere: Sphere;
  segment: Segment;
  category: Category;
  paymentType?: 'monthly' | 'onetime';
}): Promise<PlanData[]> {
  try {
    const res = await fetch('/api/v1/ai/tariffs/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sphere: filters.sphere,
        segment: filters.segment,
        category: filters.category,
        payment_type: filters.paymentType || 'monthly'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.plans) && data.plans.length > 0) {
        return data.plans.map((p: any) => {
          const monthly = p.monthlyPrice || p.finalPrice || p.priceMonth || 0;
          const onetime = p.onetimePrice || Math.round(monthly / 0.2);
          const currentPrice = filters.paymentType === 'onetime' ? onetime : monthly;
          return {
            tariffName: p.tariffName || `SAV AI Продавец ${p.package}`,
            package: p.package as PlanLevel,
            sphere: filters.sphere,
            segment: filters.segment,
            category: filters.category,
            fullDescription: p.description || '',
            monthlyPrice: monthly,
            onetimePrice: onetime,
            priceMonth: currentPrice,
            photoUrl: p.photoUrl || '',
            features: p.features || [],
            baseFeatures: p.features || [],
            messengerOptions: p.messengerOptions || [],
            duration: p.duration || '1 месяц',
            breakdown: p.breakdown
          };
        });
      }
    }
  } catch (err) {
    console.warn('API tariff calculation error, falling back:', err);
  }

  // Fallback to Google Sheets or hardcoded calculation
  return fetchPlansFromSheet(filters);
}

export async function fetchPlansFromSheet(filters: {
  sphere: Sphere;
  segment: Segment;
  category: Category;
  paymentType?: 'monthly' | 'onetime';
}): Promise<PlanData[]> {
  const isOnetime = filters.paymentType === 'onetime';
  try {
    const tq = `SELECT A, C, D, E, F, G, H, I WHERE D MATCHES '(?s).*${filters.sphere}.*' AND E = '${filters.segment}' AND F = '${filters.category}'`;
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=${encodeURIComponent(tq)}`;

    const response = await fetch(url);
    const text = await response.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)?.[1];
    if (jsonStr) {
      const data = JSON.parse(jsonStr);
      const rows = data.table.rows;

      if (rows && rows.length > 0) {
        return rows.map((row: any) => {
          const rawPrice = Number(row.c[6]?.v) || 0;
          const monthlyPrice = rawPrice;
          const onetimePrice = Math.round(rawPrice / 0.2);
          const finalPrice = isOnetime ? onetimePrice : monthlyPrice;
          return {
            tariffName: row.c[0]?.v || '',
            package: row.c[1]?.v as PlanLevel,
            sphere: row.c[2]?.v as Sphere,
            segment: row.c[3]?.v as Segment,
            category: row.c[4]?.v as Category,
            fullDescription: row.c[5]?.v || '',
            monthlyPrice,
            onetimePrice,
            priceMonth: finalPrice,
            photoUrl: row.c[7]?.v || ''
          };
        });
      }
    }
  } catch (error) {
    console.warn("Sheet fetch error:", error);
  }

  // Deterministic local multiplier calculation fallback based on exact BD ProTalk coefficients
  const sphereMultiplier: Record<string, number> = {
    'Строительство': 1.2,
    'Здоровье': 0.9,
    'Производство': 1.1,
    'Образование': 1.0,
    'Реклама': 0.8,
    'Транспорт': 1.2,
    'Технологии': 1.1,
    'Досуг': 0.8,
    'Торговля': 0.9,
    'Другое': 1.0
  };

  const catMult = filters.category === 'Услуги' ? 0.8 : 1.0;
  const segMult = filters.segment === 'B2C' ? 0.8 : 1.0;
  const sphMult = sphereMultiplier[filters.sphere] || 1.0;
  const totalMult = sphMult * catMult * segMult;

  return FALLBACK_PLANS.map(p => {
    const monthlyPrice = Math.round((p.priceMonth || 10000) * totalMult);
    const onetimePrice = Math.round(monthlyPrice / 0.2);
    const finalPrice = isOnetime ? onetimePrice : monthlyPrice;
    return {
      tariffName: `SAV AI Продавец ${p.package}`,
      package: p.package as PlanLevel,
      sphere: filters.sphere,
      segment: filters.segment,
      category: filters.category,
      fullDescription: p.fullDescription || '',
      monthlyPrice,
      onetimePrice,
      priceMonth: finalPrice,
      photoUrl: p.photoUrl || ''
    };
  });
}

export async function fetchSpecificPlan(filters: {
  sphere: Sphere;
  segment: Segment;
  category: Category;
  package: PlanLevel;
  paymentType?: 'monthly' | 'onetime';
}): Promise<PlanData | null> {
  const allPlans = await fetchPlansFromDatabase({
    sphere: filters.sphere,
    segment: filters.segment,
    category: filters.category,
    paymentType: filters.paymentType
  });

  const matched = allPlans.find(p => p.package === filters.package);
  if (matched) return matched;

  return null;
}

