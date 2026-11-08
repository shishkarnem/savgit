/**
 * Expert utilities and database mappings for SAV AI experts
 */

export interface ExpertData {
  id: string;
  pseudonym: string | null;
  greeting: string | null;
  real_name?: string | null;
  fio?: string | null;
  tools: string | null;
  spheres: string | null;
  cases: string | null;
  other_info: string | null;
  description: string | null;
  photo_url: string | null;
  status?: string | null;
  telegram?: string | null;
  telegram_id?: string | null;
  role?: string | null;
}

export const EXPERT_REAL_NAMES: Record<string, string> = {
  'Violet': 'Фридман Ольга Игоревна',
  'Ms.Violet': 'Фридман Ольга Игоревна',
  'White': 'Шишканов Алексей Сергеевич',
  'Dr.White': 'Шишканов Алексей Сергеевич',
  'Mr.White': 'Шишканов Алексей Сергеевич',
  'Copper': 'Карачев Виталий Владимирович',
  'Mr.Copper': 'Карачев Виталий Владимирович',
  'Aimatic': 'Власов Александр Сергеевич',
  'Mr.Aimatic': 'Власов Александр Сергеевич',
  'Obsidian': 'Филатов Олег Юрьевич',
  'Mr.Obsidian': 'Филатов Олег Юрьевич',
  'Purple': 'Кухтина Александра Андреевна',
  'Mr.Purple': 'Кухтина Александра Андреевна',
  'Ms.Purple': 'Кухтина Александра Андреевна',
  'Gold': 'Свентицкас Томас Альгирдо',
  'Mr.Gold': 'Свентицкас Томас Альгирдо',
  'Emerald': 'Бобков Александр',
  'Mr.Emerald': 'Бобков Александр',
  'Ultramarin': 'Цой Станислав Владимирович',
  'Ultramarine': 'Цой Станислав Владимирович',
  'Mr.Ultramarin': 'Цой Станислав Владимирович',
  'Mr.Ultramarine': 'Цой Станислав Владимирович',
  'Black': 'Свентицкас Светлана Владимировна',
  'Mrs.Black': 'Свентицкас Светлана Владимировна',
  'Poison': 'Терещенко Олег Игоревич',
  'Mr.Poison': 'Терещенко Олег Игоревич',
  'Green': 'Левагин Иван Олегович',
  'Mr.Green': 'Левагин Иван Олегович',
  'Silver': 'Маркова Олеся Петровна',
  'Mrs.Silver': 'Маркова Олеся Петровна',
  'Ruby': 'Берг Артём',
  'Mr.Ruby': 'Берг Артём',
  'Red': 'Катаев Лев Борисович',
  'Mr.Red': 'Катаев Лев Борисович',
  'Neuro': 'Веселовский Никита Сергеевич',
  'Dr.Neuro': 'Веселовский Никита Сергеевич',
  'Cian': 'Сотарев Илья Валерьевич',
  'Mr.Cian': 'Сотарев Илья Валерьевич',
  'Magenta': 'Слинкина Валентина Ангелова',
  'Mrs.Magenta': 'Слинкина Валентина Ангелова',
  'Crimson': 'Новосельцев Никита Владимирович',
  'Mr.Crimson': 'Новосельцев Никита Владимирович',
  'Coral': 'Рукавица Раиса Сергеевна',
  'Mrs.Coral': 'Рукавица Раиса Сергеевна',
  'Lemon': 'Варенов Евгений',
  'Mr.Lemon': 'Варенов Евгений',
  'Orange': 'Гулян Арарат Гарегинович',
  'Dr.Orange': 'Гулян Арарат Гарегинович',
  'Pink': 'Чадакин Андрей',
  'Mr.Pink': 'Чадакин Андрей',
  'Brown': 'Раевский Михаил Александрович',
  'Mr.Brown': 'Раевский Михаил Александрович',
  'Chrome': 'Бевз Алексей',
  'Mr.Chrome': 'Бевз Алексей',
  'Azure': 'Гаязов Алмаз Аликович',
  'Mr.Azure': 'Гаязов Алмаз Аликович',
  'Khaki': 'Абдулкаримов Жебир Харунович',
  'Mr.Khaki': 'Абдулкаримов Жебир Харунович',
  'Grey': 'Авруцкий Сергей Александрович',
  'Mr.Grey': 'Авруцкий Сергей Александрович',
  'Lilac': 'Мырзахметова Лаура Менлибаевна',
  'Mrs.Lilac': 'Мырзахметова Лаура Менлибаевна',
  'Indigo': 'Скворцова Полина Александровна',
  'Ms.Indigo': 'Скворцова Полина Александровна',
  'Scarlet': 'Мацуца Екатерина',
  'Pr.Scarlet': 'Мацуца Екатерина',
  'Yellow': 'Куранова Е.В.',
  'Mrs.Yellow': 'Куранова Е.В.',
  'Onyx': 'Медведев Александр Владимирович',
  'Dr.Onyx': 'Медведев Александр Владимирович',
  'Olive': 'Шестерикова Анна Михайловна',
  'Mrs.Olive': 'Шестерикова Анна Михайловна',
  'Sapphire': 'Небылицын Андрей Александрович',
  'Mr.Sapphire': 'Небылицын Андрей Александрович',
  'Cobalt': 'Курман Куанышбек Каиргельдыулы',
  'Mr.Cobalt': 'Курман Куанышбек Каиргельдыулы',
  'Teal': 'Артемьев Игорь Николаевич',
  'Mr.Teal': 'Артемьев Игорь Николаевич',
  'Blue': 'Апарин Владимир Ильич',
  'Mr.Blue': 'Апарин Владимир Ильич',
  'Magister': 'Убаева Динара Шукуруллаевна',
  'Mrs.Magister': 'Убаева Динара Шукуруллаевна',
};

/**
 * Gets real name of an expert from DB field or dictionary
 */
export function getExpertRealName(expert: any): string {
  if (!expert) return '';
  if (expert.real_name && typeof expert.real_name === 'string' && expert.real_name.trim().length > 1) {
    return expert.real_name.trim();
  }
  if (expert.fio && typeof expert.fio === 'string' && expert.fio.trim().length > 1) {
    return expert.fio.trim();
  }

  const pseudo = (expert.pseudonym || '').trim();
  const greeting = (expert.greeting || '').trim();
  const full = `${greeting}${pseudo}`.trim();

  if (EXPERT_REAL_NAMES[full]) return EXPERT_REAL_NAMES[full];
  if (EXPERT_REAL_NAMES[pseudo]) return EXPERT_REAL_NAMES[pseudo];

  // Try case-insensitive
  for (const [key, val] of Object.entries(EXPERT_REAL_NAMES)) {
    if (key.toLowerCase() === full.toLowerCase() || key.toLowerCase() === pseudo.toLowerCase()) {
      return val;
    }
  }

  return '';
}

/**
 * Formats expert pseudonym with greeting e.g. Ms.Violet
 */
export function formatExpertPseudonym(expert: any): string {
  if (!expert) return '';
  const greeting = expert.greeting ? expert.greeting.trim() : '';
  const pseudo = expert.pseudonym ? expert.pseudonym.trim() : '';
  return `${greeting}${pseudo}`.trim() || 'Эксперт SAV AI';
}

/**
 * Formats full display title with both real name and pseudonym
 * e.g. "Фридман Ольга Игоревна (Ms.Violet)"
 */
export function formatExpertFullTitle(expert: any): string {
  if (!expert) return '';
  const realName = getExpertRealName(expert);
  const pseudonym = formatExpertPseudonym(expert);

  if (realName && pseudonym && !realName.toLowerCase().includes(pseudonym.toLowerCase())) {
    return `${realName} (${pseudonym})`;
  }
  return realName || pseudonym || 'Эксперт SAV AI';
}

/**
 * Cleans text for Markdown presentation:
 * 1. Strips system tokens like ✂️✂️✂️, ##IMG:...##, ##INLINE:...##
 * 2. Excludes personal contacts (telegrams, phones) to respect privacy
 */
export function cleanExpertMarkdown(text?: string | null): string {
  if (!text) return '';
  let cleaned = text
    .replace(/##IMG:[^#]+##/g, '')
    .replace(/##INLINE:[^#]+##/g, '')
    .replace(/✂️+/g, '')
    .replace(/Прямой контакт:[^\n]+/gi, '')
    .replace(/Контакт:[^\n]+/gi, '')
    .replace(/Telegram:[^\n]+/gi, '')
    .replace(/Телеграм:[^\n]+/gi, '')
    .replace(/@[a-zA-Z0-9_]{4,}/g, '')
    .replace(/\+7\s?\(?\d{3}\)?\s?\d{3}-?\d{2}-?\d{2}/g, '')
    .replace(/8\s?\(?\d{3}\)?\s?\d{3}-?\d{2}-?\d{2}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}
