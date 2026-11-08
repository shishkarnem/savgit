import { MarketplaceItem, ProductTab, ProductVariant } from '@/types';

export const INITIAL_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: '840361468312',
    tildaUid: '840361468312',
    sku: 'SAV-SHOES-01',
    brand: 'SAV AI',
    slug: '840361468312-ii-prodavets-obuvi',
    name: 'ИИ Продавец Обуви',
    category: 'SAV Торговля',
    niche: 'Обувные магазины, ритейл, бренды обуви и аксессуаров',
    shortDescription: 'Автоматизируйте продажи обуви с ИИ-ботом: консультации, подбор моделей, обработка заявок 24/7. Подключите Telegram, WhatsApp, сайт и CRM.',
    fullDescription: 'Универсальный цифровой консультант для магазинов обуви. Понимает контекст диалога, помогает покупателям определиться с выбором, подбирает размер по длине стопы, предлагает сопутствующие товары и принимает заказы.',
    textHtml: `<strong>ТАРИФЫ ОТЛИЧАЮТСЯ ФУНКЦИОНАЛОМ</strong><br />Подробнее на вкладке <strong>Тарифы</strong><br />Вы можете подобрать любой удобный Тариф на выбор:<br /><strong>Лайт, Эконом, Стандарт, Премиум, VIP</strong><br />Либо заказать <strong><a href="https://t.me/SAV_AIbot" target="_blank">БЕСПЛАТНЫЙ АУДИТ</a></strong> вашей текущей системы на возможность внедрения нейросетей в ваш бизнес от экспертов компании SAV AI.`,
    modificationsText: `Токены: Согласно тарифу; +10 млн токенов (600 ₽); +50 млн токенов (3 000 ₽); +200 млн токенов (12 000 ₽); +400 млн токенов (24 000 ₽)\nКанал связи: Телеграм бот (бесплатно), Чат на сайт (бесплатно), Телеграм личный (3 000 ₽), WhatsApp личный (3 000 ₽), WhatsApp Business (5 000 ₽), Instagram (2 500 ₽), Вконтакте (2 000 ₽), Одноклассники (1 000 ₽), Авито (2 000 ₽), Битрикс24 (бесплатно), amoCRM (бесплатно)`,
    price: 3600,
    maxPrice: 57600,
    period: 'руб',
    imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
    demoUrl: 'https://t.me/SAVPartnerBot',
    url: 'http://savbot.ru/tproduct/840361468312-ii-prodavets-obuvi',
    seoTitle: 'ИИ Продавец Обуви — Автоматизация продаж в ритейле | SAV AI',
    seoDescr: 'Готовый интеллектуальный консультант для обувных магазинов. Подбор размера, интеграция с CRM и мессенджерами 24/7.',
    seoKeywords: 'ии продавец обуви, бот для обувного магазина, чат-бот ритейл, автоматизация продаж обуви',
    features: [
      'Подбор размера по длине стопы и полноте',
      'Консультация по материалам, уходу и сезону',
      'Интеграция со складскими остатками',
      'Приём оплаты и оформление доставки'
    ],
    integrations: ['Telegram', 'WhatsApp', 'Чат на сайт', 'МойСклад', 'amoCRM', 'Битрикс24'],
    isPopular: true,
    rating: 4.9,
    salesCount: 180,
    setupTime: '2 часа',
    tabs: [
      {
        title: 'Тарифы',
        content: `<strong>SAV AI Продавец B2C Товары Торговля Лайт</strong><br />
1. Консультация по базе знаний<br />
2. Расчет цены по прайсу<br />
3. Отправка заявки в таблицу или в телеграм.<br />
4. Работа с возражениями<br />
5. Бот телеграм или на сайте<br />
6. 10млн токенов, 500 сообщений, 50 диалогов<br />
<strong>Абонентская плата в месяц: 3 600,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Эконом</strong><br />
1. Консультация по базе знаний, работа по скрипту продаж.<br />
2. Расчет цены по калькулятору и прайсу<br />
3. Отправка заявки в телеграм или в таблицу<br />
4. Работа с возражениями, отправка КП<br />
5. 3 мессенджера на выбор.<br />
6. 20млн токенов, 1000 сообщений, 100 диалогов<br />
<strong>Абонентская плата в месяц: 7 200,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Стандарт</strong><br />
1. Консультация по базе знаний любого объема<br />
2. Расчет цены по калькулятору, создание калькулятора.<br />
3. Отправка заявки в телеграм, в CRM, в чат или в таблицу<br />
4. Создание договора и счета<br />
5. Любое количество мессенджеров.<br />
6. 50млн токенов, 2500 сообщений, 250 диалогов<br />
<strong>Абонентская плата в месяц: 14 400,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Премиум</strong><br />
1. Консультация по нескольким базам знаний и продуктам<br />
2. Отправка заявки в CRM, настройка напоминаний.<br />
3. Система отправки напоминаний.<br />
4. 200млн токенов, 10000 сообщений, 1000 диалогов<br />
<strong>Абонентская плата в месяц: 28 800,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля VIP</strong><br />
1. Подключение ИИ Агентов и думающих LLM моделей.<br />
2. Интеграция по API со сторонними сервисами.<br />
3. 400млн токенов, 20000 сообщений, 2000 диалогов<br />
<strong>Абонентская плата в месяц: 57 600,00 руб.</strong>`
      },
      {
        title: 'Описание',
        content: `👟 <strong>ИИ-продавец обуви</strong> — это интеллектуальное решение, разработанное для автоматизации взаимодействия с клиентами, повышения конверсии продаж и оптимизации обслуживания.<br /><br />
<strong>Возможности и функции:</strong><br />
✅ Индивидуальная настройка под ваш ассортимент<br />
✅ Автоматическая обработка запросов 24/7<br />
✅ Точный подбор размеров, стилей и моделей обуви<br />
✅ Консультации по акциям, скидкам и уходу за материалами<br /><br />
<strong>Идеально подходит для:</strong><br />
• Магазинов спортивной и повседневной обуви<br />
• Классических и брендовых бутиков<br />
• Шоурумам и крупным онлайн-ритейлерам`
      },
      {
        title: 'Опции',
        content: `<strong>Токены можно докупать:</strong><br />
1. 10 млн. токенов = 600 руб.<br />
2. 50 млн. токенов = 3 000 руб.<br />
3. 200 млн. токенов = 12 000 руб.<br />
4. 400 млн. токенов = 24 000 руб.<br /><br />
<i>Токены к концу месяца не сгорают и переносятся на следующий месяц при оплате тарифа.</i><br /><br />
<strong>Вы можете подключить свои каналы связи:</strong><br />
🔹 Телеграм бот (бесплатно)<br />
🔹 Чат на сайт (бесплатно)<br />
🔹 WhatsApp / Instagram / VK / Авито (согласно выбранному тарифу)`
      }
    ],
    variants: [
      { id: '414541628802', tildaUid: '414541628802', parentUid: '840361468312', sku: '20001', tariff: 'Лайт', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Лайт', subtitle: 'Товары • B2C', price: 3600, oldPrice: 18000, editions: 'Тариф:Лайт;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png' },
      { id: '732296593372', tildaUid: '732296593372', parentUid: '840361468312', sku: '20002', tariff: 'Эконом', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Эконом', subtitle: 'Товары • B2C', price: 7200, oldPrice: 36000, editions: 'Тариф:Эконом;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png' },
      { id: '514647863732', tildaUid: '514647863732', parentUid: '840361468312', sku: '20003', tariff: 'Стандарт', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Стандарт', subtitle: 'Товары • B2C', price: 14400, oldPrice: 72000, editions: 'Тариф:Стандарт;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png' },
      { id: '162244908962', tildaUid: '162244908962', parentUid: '840361468312', sku: '20004', tariff: 'Премиум', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Премиум', subtitle: 'Товары • B2C', price: 28800, oldPrice: 144000, editions: 'Тариф:Премиум;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png' },
      { id: '828761860622', tildaUid: '828761860622', parentUid: '840361468312', sku: '20005', tariff: 'VIP', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: VIP', subtitle: 'Товары • B2C', price: 57600, oldPrice: 288000, editions: 'Тариф:VIP;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png' }
    ]
  },
  {
    id: '796673995232',
    tildaUid: '796673995232',
    sku: 'SAV-CLOTHES-01',
    brand: 'SAV AI',
    slug: '796673995232-ii-prodavets-odezhdi',
    name: 'ИИ Продавец Одежды',
    category: 'SAV Торговля',
    niche: 'Магазины повседневной и спортивной одежды, бутики, ритейл',
    shortDescription: 'Автоматизируйте продажи одежды: умный подбор образов, размеров по параметрам, консультации по тканям и оформление заказов 24/7.',
    fullDescription: 'Интеллектуальный помощник для магазинов одежды и брендов. Круглосуточно консультирует покупателей, рекомендует подходящие фасоны и размеры, помогает выбрать комплект и оформляет покупку в мессенджерах и на сайте.',
    textHtml: `<strong>ТАРИФЫ ОТЛИЧАЮТСЯ ФУНКЦИОНАЛОМ</strong><br />Подробнее на вкладке <strong>Тарифы</strong><br />Вы можете подобрать любой удобный Тариф на выбор:<br /><strong>Лайт, Эконом, Стандарт, Премиум, VIP</strong><br />Либо заказать <strong><a href="https://t.me/SAV_AIbot" target="_blank">БЕСПЛАТНЫЙ АУДИТ</a></strong> вашей текущей системы на возможность внедрения нейросетей в ваш бизнес от экспертов компании SAV AI.`,
    modificationsText: `Токены: Согласно тарифу; +10 млн токенов (600 ₽); +50 млн токенов (3 000 ₽); +200 млн токенов (12 000 ₽); +400 млн токенов (24 000 ₽)\nКанал связи: Телеграм бот (бесплатно), Чат на сайт (бесплатно), Телеграм личный (3 000 ₽), WhatsApp личный (3 000 ₽), WhatsApp Business (5 000 ₽), Instagram (2 500 ₽), Вконтакте (2 000 ₽), Одноклассники (1 000 ₽), Авито (2 000 ₽), Битрикс24 (бесплатно), amoCRM (бесплатно)`,
    price: 3600,
    maxPrice: 57600,
    period: 'руб',
    imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png',
    demoUrl: 'https://t.me/SAVPartnerBot',
    url: 'http://savbot.ru/tproduct/796673995232-ii-prodavets-odezhdi',
    seoTitle: 'ИИ Продавец Одежды — Умный консультант для магазинов одежды | SAV AI',
    seoDescr: 'Автоматизация продаж одежды с помощью ИИ. Подбор луков, размеров, консультация 24/7 в Telegram, WhatsApp и CRM.',
    seoKeywords: 'ии продавец одежды, чат бот для шоурума, бот для магазина одежды, fashion ai bot',
    features: [
      'Подбор образов и капсул одежды по предпочтениям',
      'Определение точного размера по росту и обхватам',
      'Консультация по тканям, составам и уходу',
      'Быстрая интеграция с CRM, МойСклад и маркетплейсами'
    ],
    integrations: ['Telegram', 'WhatsApp', 'Instagram', 'Чат на сайт', 'МойСклад', 'amoCRM', 'Битрикс24'],
    isPopular: true,
    rating: 4.9,
    salesCount: 165,
    setupTime: '2 часа',
    tabs: [
      {
        title: 'Тарифы',
        content: `<strong>SAV AI Продавец B2C Товары Торговля Лайт</strong><br />
1. Консультация по базе знаний<br />
2. Расчет цены по прайсу<br />
3. Отправка заявки в таблицу или в телеграм.<br />
4. Работа с возражениями<br />
5. Бот телеграм или на сайте<br />
6. 10млн токенов, 500 сообщений, 50 диалогов<br />
<strong>Абонентская плата в месяц: 3 600,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Эконом</strong><br />
1. Консультация по базе знаний, работа по скрипту продаж.<br />
2. Расчет цены по калькулятору и прайсу<br />
3. Отправка заявки в телеграм или в таблицу<br />
4. Работа с возражениями, отправка КП<br />
5. 3 мессенджера на выбор.<br />
6. 20млн токенов, 1000 сообщений, 100 диалогов<br />
<strong>Абонентская плата в месяц: 7 200,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Стандарт</strong><br />
1. Консультация по базе знаний любого объема<br />
2. Расчет цены по калькулятору, создание калькулятора.<br />
3. Отправка заявки в телеграм, в CRM, в чат или в таблицу<br />
4. Создание договора и счета<br />
5. Любое количество мессенджеров.<br />
6. 50млн токенов, 2500 сообщений, 250 диалогов<br />
<strong>Абонентская плата в месяц: 14 400,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля Премиум</strong><br />
1. Консультация по нескольким базам знаний и продуктам<br />
2. Отправка заявки в CRM, настройка напоминаний.<br />
3. Система отправки напоминаний.<br />
4. 200млн токенов, 10000 сообщений, 1000 диалогов<br />
<strong>Абонентская плата в месяц: 28 800,00 руб.</strong><br /><br />
<strong>SAV AI Продавец B2C Товары Торговля VIP</strong><br />
1. Подключение ИИ Агентов и думающих LLM моделей.<br />
2. Интеграция по API со сторонними сервисами.<br />
3. 400млн токенов, 20000 сообщений, 2000 диалогов<br />
<strong>Абонентская плата в месяц: 57 600,00 руб.</strong>`
      },
      {
        title: 'Описание',
        content: `👗 <strong>ИИ-продавец одежды</strong> — это интеллектуальное решение, разработанное для автоматизации взаимодействия с клиентами, повышения среднего чека и оптимизации обслуживания.<br /><br />
<strong>Возможности:</strong><br />
✅ Подбор луков и рекомендация сопутствующих аксессуаров<br />
✅ Консультации по тканям, составам и уходу за одеждой<br />
✅ Автоматическая проверка наличия размеров на складе<br />
✅ Бесшовная интеграция с мессенджерами и интернет-магазином`
      },
      {
        title: 'Опции',
        content: `<strong>Токены можно докупать:</strong><br />
1. 10 млн. токенов = 600 руб.<br />
2. 50 млн. токенов = 3 000 руб.<br />
3. 200 млн. токенов = 12 000 руб.<br />
4. 400 млн. токенов = 24 000 руб.<br /><br />
<i>Токены к концу месяца не сгорают и переносятся на следующий месяц при оплате тарифа.</i><br /><br />
<strong>Каналы связи на выбор:</strong><br />
🔹 Телеграм бот (бесплатно)<br />
🔹 Чат на сайт (бесплатно)<br />
🔹 WhatsApp / Instagram / VK / Авито (согласно тарифу)`
      }
    ],
    variants: [
      { id: '416076370802', tildaUid: '416076370802', parentUid: '796673995232', sku: '20006', tariff: 'Лайт', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Лайт', subtitle: 'Товары • B2C', price: 3600, oldPrice: 18000, editions: 'Тариф:Лайт;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png' },
      { id: '109466181682', tildaUid: '109466181682', parentUid: '796673995232', sku: '20007', tariff: 'Эконом', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Эконом', subtitle: 'Товары • B2C', price: 7200, oldPrice: 36000, editions: 'Тариф:Эконом;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png' },
      { id: '220801774752', tildaUid: '220801774752', parentUid: '796673995232', sku: '20008', tariff: 'Стандарт', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Стандарт', subtitle: 'Товары • B2C', price: 14400, oldPrice: 72000, editions: 'Тариф:Стандарт;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png' },
      { id: '514278765322', tildaUid: '514278765322', parentUid: '796673995232', sku: '20009', tariff: 'Премиум', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: Премиум', subtitle: 'Товары • B2C', price: 28800, oldPrice: 144000, editions: 'Тариф:Премиум;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png' },
      { id: '318737748952', tildaUid: '318737748952', parentUid: '796673995232', sku: '20010', tariff: 'VIP', categoryOption: 'Товары', segmentOption: 'B2C', name: 'Тариф: VIP', subtitle: 'Товары • B2C', price: 57600, oldPrice: 288000, editions: 'Тариф:VIP;Категория:Товары;Сегмент:B2C', imageUrl: 'https://static.tildacdn.com/stor3661-3033-4264-a163-313239356439/34914426.png' }
    ]
  },
  {
    id: '633830208872',
    tildaUid: '633830208872',
    sku: '3000001',
    brand: 'SAV AI',
    slug: '633830208872-tokeny-dlya-ii',
    name: 'Токены для ИИ',
    category: 'Токены',
    niche: 'Пополнение баланса токенов для ИИ-агентов',
    shortDescription: 'Пополнение баланса токенов для вашего ИИ-агента. Доступны пакеты от 10 млн до 400 млн токенов. Не сгорают и переносятся.',
    fullDescription: 'Пакеты токенов для расширения лимитов диалогов, обработки сложных запросов и работы с генеративными моделями.',
    price: 600,
    maxPrice: 24000,
    period: 'руб',
    imageUrl: 'https://static.tildacdn.com/stor3264-3966-4566-a265-373761313436/16074154.jpg',
    demoUrl: 'https://t.me/SAVPartnerBot',
    seoTitle: 'Купить токены для ИИ ботов SAV AI | Тарифы и пакеты',
    seoDescr: 'Пакеты токенов для ИИ-ботов от 10 млн до 400 млн токенов. Бессрочный перенос на следующий месяц.',
    seoKeywords: 'токены для ии, купить токены llm, токены для бота, баланс sav ai',
    features: [
      '+10 млн. токенов (600 ₽)',
      '+50 млн. токенов (3 000 ₽)',
      '+200 млн. токенов (12 000 ₽)',
      '+400 млн. токенов (24 000 ₽)'
    ],
    integrations: ['Все ИИ-боты SAV AI'],
    rating: 5.0,
    salesCount: 310,
    setupTime: 'Мгновенно',
    variants: [
      { id: 'tok-1', sku: 'TOK-10M', name: '+10 млн токенов', subtitle: 'Базовый пакет', price: 600 },
      { id: 'tok-2', sku: 'TOK-50M', name: '+50 млн токенов', subtitle: 'Оптимальный пакет', price: 3000 },
      { id: 'tok-3', sku: 'TOK-200M', name: '+200 млн токенов', subtitle: 'Бизнес пакет', price: 12000 },
      { id: 'tok-4', sku: 'TOK-400M', name: '+400 млн токенов', subtitle: 'Максимальный пакет', price: 24000 }
    ]
  },
  {
    id: 'ai-realty-seller',
    name: 'ИИ-Риелтор «Недвижимость 360»',
    category: 'Недвижимость',
    niche: 'Агентства недвижимости, застройщики, девелоперы',
    slug: 'ai-realty-seller',
    shortDescription: 'Автоматически квалифицирует покупателей, подбирает ЖК по параметрам, бюджету и ипотеке, записывает на просмотр объектов.',
    fullDescription: 'Готовое ИИ-решение для отдела продаж недвижимости. Виртуальный брокер круглосуточно консультирует покупателей по новостройкам и вторичному рынку, рассчитывает ипотечный платёж, формирует подборки квартир в PDF и фиксирует бронирование в вашей CRM (amoCRM / Битрикс24).',
    price: 15000,
    maxPrice: 45000,
    period: 'руб',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
    demoUrl: 'https://t.me/SAVPartnerBot',
    seoTitle: 'ИИ-Риелтор для агентств недвижимости и застройщиков | SAV AI',
    seoDescr: 'Виртуальный брокер для недвижимости: квалификация покупателей, подбор новостроек, расчет ипотеки и интеграция с CRM.',
    seoKeywords: 'ии риелтор, чат бот недвижимость, бот для застройщика, автоматизация продаж новостроек',
    features: [
      'Подбор объектов по 12 параметрам (бюджет, комнатность, район, ипотека)',
      'Интерактивный расчёт ипотеки с субсидированными ставками',
      'Запись клиентов на показ объекта с интеграцией в календарь',
      'Отработка возражений по ценам и срокам сдачи',
      'Автоматическая передача квалифицированного лида менеджеру'
    ],
    integrations: ['Telegram Bot', 'WhatsApp', 'amoCRM', 'Битрикс24', 'Авито Недвижимость', 'Чат на сайт'],
    isPopular: true,
    rating: 4.9,
    salesCount: 142,
    setupTime: '1 рабочий день',
    variants: [
      { id: 'v1', name: 'Тариф: Лайт', subtitle: 'Базовый подбор', sku: '20001', price: 15000 },
      { id: 'v2', name: 'Тариф: Стандарт', subtitle: 'Полный калькулятор', sku: '20002', price: 25000 },
      { id: 'v3', name: 'Тариф: VIP', subtitle: 'Интеграция CRM + PDF', sku: '20003', price: 45000 }
    ]
  },
  {
    id: 'ai-auto-salon',
    name: 'ИИ-Менеджер Автосалона',
    category: 'Автосалоны',
    niche: 'Продажа авто с пробегом, официальные дилеры, автоподбор',
    slug: 'ai-auto-salon',
    shortDescription: 'Квалифицирует лидов на покупку и обмен, оценивает б/у авто, записывает на тест-драйв и сервисные работы.',
    fullDescription: 'Специализированный онлайн-автоконсультант. Мгновенно отвечает на вопросы о комплектациях, рассрочках, спецпредложениях, делает предварительную оценку автомобиля клиента по программе трейд-ин и бронирует удобное время для тест-драйва.',
    price: 18000,
    maxPrice: 54000,
    period: 'руб',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    demoUrl: 'https://t.me/SAVPartnerBot',
    seoTitle: 'ИИ-Менеджер Автосалона — Автоматизация трейд-ин и тест-драйвов | SAV AI',
    seoDescr: 'Чат-бот для автодилеров: оценка авто по трейд-ин, запись на тест-драйв, ответы на Авито и Авто.ру.',
    seoKeywords: 'ии автосалон, бот автодилер, автоматизация трейд-ин, автобот',
    features: [
      'Оценка автомобиля по трейд-ин на основе года, пробега и состояния',
      'Подбор авто по комплектациям, цветам и бюджету',
      'Автоматическая запись на тест-драйв и в автосервис',
      'Интеграция с Авито и Авто.ру для мгновенных ответов покупателям',
      'Передача полных карточек клиентов в CRM'
    ],
    integrations: ['Авито', 'Auto.ru', 'Telegram', 'WhatsApp', 'amoCRM', 'Битрикс24'],
    isPopular: true,
    rating: 5.0,
    salesCount: 88,
    setupTime: '1 рабочий день',
    variants: [
      { id: 'auto-v1', name: 'Тариф: Базовый дилер', subtitle: 'Чат + Telegram', price: 18000 },
      { id: 'auto-v2', name: 'Тариф: Автосалон Плюс', subtitle: 'Авито + Auto.ru', price: 32000 },
      { id: 'auto-v3', name: 'Тариф: Премиум Дилерская сеть', subtitle: 'Полная автоматизация', price: 54000 }
    ]
  },
  {
    id: 'ai-clinic-admin',
    name: 'ИИ-Администратор Клиники & Стоматологии',
    category: 'Медицина',
    niche: 'Медицинские центры, косметология, стоматологии',
    slug: 'ai-clinic-admin',
    shortDescription: 'Записывает пациентов к врачам, информирует об услугах и ценах, отправляет напоминания о визитах.',
    fullDescription: 'Заботливый медицинский ассистент, который берет на себя 80% первичных обращений. Подбирает удобное время приёма, рассказывает об акциях и подготовке к процедурам, минимизирует неявки пациентов с помощью вежливых автоматических напоминаний.',
    price: 15000,
    maxPrice: 42000,
    period: 'руб',
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80',
    demoUrl: 'https://t.me/SAVPartnerBot',
    seoTitle: 'ИИ-Администратор для медицинских центров и стоматологий | SAV AI',
    seoDescr: 'Умная запись пациентов к врачам, интеграция с МИС и напоминания о визитах 24/7.',
    seoKeywords: 'ии клиника, бот для стоматологии, чат бот медицина, онлайн запись пациентов',
    features: [
      'Подбор свободного слота врача и подтверждение записи',
      'Автоматические напоминания за день и за 2 часа до визита',
      'Консультация по подготовке к анализам и процедурам',
      'Расчёт примерной стоимости лечения по прайсу',
      'Защита персональных данных и вежливое общение 24/7'
    ],
    integrations: ['WhatsApp', 'Telegram', 'ВКонтакте', 'МИС (MedDesk, YCLIENTS)', 'Битрикс24'],
    isPopular: true,
    rating: 4.9,
    salesCount: 165,
    setupTime: '1 рабочий день',
    variants: [
      { id: 'med-v1', name: 'Тариф: Кабинет врача', subtitle: 'Базовая запись', price: 15000 },
      { id: 'med-v2', name: 'Тариф: Клиника', subtitle: 'Интеграция МИС', price: 26000 },
      { id: 'med-v3', name: 'Тариф: Сеть медцентров', subtitle: 'Мультифилиал', price: 42000 }
    ]
  }
];

export const MARKETPLACE_CATEGORIES = [
  'Все',
  'SAV Торговля',
  'Недвижимость',
  'Автосалоны',
  'Медицина',
  'Токены',
  'Услуги',
  'B2B & Сервисы',
  'Загруженные из файла'
];

/**
 * Extracts unique categories from a list of marketplace items
 */
export function extractCategoriesFromItems(items: MarketplaceItem[]): string[] {
  const catSet = new Set<string>();
  catSet.add('Все');
  items.forEach(item => {
    if (item.category && item.category.trim()) {
      catSet.add(item.category.trim());
    }
  });
  return Array.from(catSet);
}

/**
 * Helper to parse a single Tab cell from Tilda / Spreadsheet export
 * Format can be:
 * - "info|#|Тарифы|#|<strong>...</strong>"
 * - "Тарифы:Описание тарифов..."
 * - or raw HTML/text with custom column title
 */
export function parseTabCell(raw: string | undefined, defaultTitle: string = 'Описание'): ProductTab | null {
  if (!raw || !raw.trim()) return null;
  let content = raw.trim();
  let title = defaultTitle;

  // Pattern 1: Tilda delimiter info|#|Tab Title|#|Content
  const infoMatch = content.match(/^info\|#\|([^|#]+)\|#\|([\s\S]*)$/i);
  if (infoMatch) {
    title = infoMatch[1].trim();
    content = infoMatch[2].trim();
  } else {
    const parts = content.split('|#|');
    if (parts.length >= 3) {
      title = parts[1].trim() || defaultTitle;
      content = parts.slice(2).join('|#|').trim();
    } else if (parts.length === 2) {
      title = parts[0].trim() || defaultTitle;
      content = parts[1].trim();
    }
  }

  // Strip all leftover info|#|...|#| tags inside content and title
  content = content.replace(/info\|#\|[^|#]+\|#\|/gi, '').trim();
  title = title.replace(/info\|#\|/gi, '').replace(/\|#\|/gi, '').trim();

  // Pattern 2: Title:Content (e.g. "Тарифы:текст..." or "Описание:текст...")
  if (title === defaultTitle) {
    const colonMatch = content.match(/^([а-яА-ЯёЁa-zA-Z0-9\s—–_-]{2,30}):([\s\S]+)$/);
    if (colonMatch && !content.startsWith('http')) {
      title = colonMatch[1].trim();
      content = colonMatch[2].trim();
    }
  }

  // Standardize titles
  if (/^тариф/i.test(title)) title = 'Тарифы и возможности';
  else if (/^описан/i.test(title)) title = 'Описание и функционал';
  else if (/^опци/i.test(title)) title = 'Опции и интеграции';

  return {
    title: title || defaultTitle,
    content: content || ''
  };
}

/**
 * Utility to parse CSV content into MarketplaceItem objects, automatically grouping 
 * 1 parent product + 5 package variants (6 rows total) into 1 consolidated product with variants & tabs.
 * This converts ~1200 rows of raw data into ~200 clean marketplace items.
 */
export function parseCsvContent(csvString: string): MarketplaceItem[] {
  try {
    if (!csvString || !csvString.trim()) return [];

    // Robust CSV parser supporting multiline cells enclosed in double quotes
    const parseCsvRows = (text: string): string[][] => {
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      // Smart delimiter detection from header line
      const firstLine = text.split(/\r?\n/)[0] || '';
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;

      let delimiter = ',';
      if (tabCount > semicolonCount && tabCount > commaCount) {
        delimiter = '\t';
      } else if (semicolonCount >= commaCount && semicolonCount > 0) {
        delimiter = ';';
      } else {
        delimiter = ',';
      }

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
          currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
          if (currentRow.some(cell => cell.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }

      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim().replace(/^"|"$/g, ''));
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
      }

      return rows;
    };

    const allRows = parseCsvRows(csvString);
    if (allRows.length <= 1) return [];

    const rawHeaders = allRows[0];
    const headers = rawHeaders.map(h => h.toLowerCase().trim());

    const getColIndex = (regex: RegExp): number => {
      return headers.findIndex(h => regex.test(h));
    };

    const uidIdx = getColIndex(/^tilda\s*uid/i);
    const parentUidIdx = getColIndex(/^parent\s*uid/i);
    const brandIdx = getColIndex(/^brand/i);
    const skuIdx = getColIndex(/^sku/i);
    const catIdx = getColIndex(/^category/i);
    const titleIdx = getColIndex(/^title|^name|^название/i);
    const descIdx = getColIndex(/^description|^описание/i);
    const textIdx = getColIndex(/^text|^текст|^html/i);
    const photoIdx = getColIndex(/^photo|^image|^фото|^картинка/i);
    const priceIdx = getColIndex(/^price$|^цена$/i);
    const oldPriceIdx = getColIndex(/^price\s*old|^старая\s*цена/i);
    const editionsIdx = getColIndex(/^editions|^модификац/i);
    const modTextIdx = getColIndex(/^modifications|^опции/i);
    const externalIdIdx = getColIndex(/^external\s*id|^внешний/i);
    const lengthIdx = getColIndex(/^length/i);
    const seoTitleIdx = getColIndex(/^seo\s*title/i);
    const seoDescrIdx = getColIndex(/^seo\s*descr/i);
    const seoKeywordsIdx = getColIndex(/^seo\s*keywords/i);
    const fbTitleIdx = getColIndex(/^fb\s*title/i);
    const fbDescrIdx = getColIndex(/^fb\s*descr/i);
    const urlIdx = getColIndex(/^url|^ссылка/i);

    // Tab columns: Tabs:1, Tabs:2, Tabs:3, Tab:Тарифы, Tab:Описание, Tab:Опции, Вкладка 1, etc.
    const tabCols: { idx: number; name: string }[] = [];
    rawHeaders.forEach((h, idx) => {
      if (/^tabs?:/i.test(h) || /^вкладка/i.test(h) || /^таб:/i.test(h)) {
        const cleanName = h.replace(/^tabs?:\s*|^вкладка\s*|^таб:\s*/i, '').trim();
        tabCols.push({ idx, name: cleanName });
      }
    });

    const itemsMap = new Map<string, MarketplaceItem>();
    let currentParent: MarketplaceItem | null = null;

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row || row.every(cell => !cell || !cell.trim())) continue;

      const getVal = (idx: number): string => (idx >= 0 && row[idx] ? row[idx].trim() : '');

      const uid = getVal(uidIdx);
      const parentUid = getVal(parentUidIdx);
      const brand = getVal(brandIdx);
      const sku = getVal(skuIdx);
      const category = getVal(catIdx);
      const title = getVal(titleIdx);
      const desc = getVal(descIdx);
      const textHtml = getVal(textIdx);
      const photo = getVal(photoIdx);
      const priceStr = getVal(priceIdx).replace(/[^\d.]/g, '');
      const price = parseFloat(priceStr) || 0;
      const oldPriceStr = getVal(oldPriceIdx).replace(/[^\d.]/g, '');
      const oldPrice = oldPriceStr ? parseFloat(oldPriceStr) : undefined;
      const editions = getVal(editionsIdx);
      const modText = getVal(modTextIdx);
      const externalId = getVal(externalIdIdx);
      const lengthVal = getVal(lengthIdx);
      const seoTitle = getVal(seoTitleIdx);
      const seoDescr = getVal(seoDescrIdx);
      const seoKeywords = getVal(seoKeywordsIdx);
      const fbTitle = getVal(fbTitleIdx);
      const fbDescr = getVal(fbDescrIdx);
      const rowUrl = getVal(urlIdx);

      // Determine if row is a Child Package Variant:
      // In Tilda / Google Sheets export:
      // 1. Editions contains 'Тариф:' (e.g. 'Тариф:Лайт', 'Тариф:Эконом', 'Тариф:Стандарт', 'Тариф:Премиум', 'Тариф:VIP')
      // 2. Title has ' - ' tariff naming (e.g. 'ИИ Продавец Обуви - Лайт - Товары - B2C')
      // 3. Category is empty AND we already have an active currentParent AND row has price or sku
      // 4. parentUid or lengthVal matches currentParent.tildaUid
      const hasTariffInEditions = /тариф:/i.test(editions);
      const hasParentNamePrefix = currentParent && title && title.toLowerCase().startsWith(currentParent.name.toLowerCase() + ' - ');
      const isChildVariantRow = Boolean(
        currentParent && (
          hasTariffInEditions ||
          hasParentNamePrefix ||
          (!category && (price > 0 || sku)) ||
          (lengthVal && currentParent.tildaUid && lengthVal === currentParent.tildaUid) ||
          (parentUid && currentParent.tildaUid && parentUid === currentParent.tildaUid)
        )
      );

      if (!isChildVariantRow) {
        // --- THIS IS A PARENT PRODUCT ---
        const cleanDesc = (desc || '').replace(/<[^>]*>?/gm, '').trim();
        const mainTitle = title || `ИИ-Решение ${i}`;
        const itemId = uid || sku || `item-${i}-${Date.now()}`;
        const slug = rowUrl ? rowUrl.split('/').pop()?.split('?')[0] : `${itemId}-${mainTitle.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '-')}`;

        // Extract Tabs for Parent row
        const tabs: ProductTab[] = [];
        tabCols.forEach(({ idx, name }) => {
          const tabRaw = row[idx];
          if (tabRaw && tabRaw.trim() && !tabRaw.includes('=+')) {
            let defaultTabName = 'Описание';
            if (name === '1' || name.toLowerCase().includes('тариф')) defaultTabName = 'Тарифы и возможности';
            else if (name === '2' || name.toLowerCase().includes('описан')) defaultTabName = 'Описание и функционал';
            else if (name === '3' || name.toLowerCase().includes('опци')) defaultTabName = 'Опции и интеграции';
            else if (name) defaultTabName = name;

            const parsed = parseTabCell(tabRaw, defaultTabName);
            if (parsed) tabs.push(parsed);
          }
        });

        // Default Tabs if none parsed from row
        if (tabs.length === 0) {
          tabs.push(
            {
              title: 'Тарифы',
              content: textHtml || 'Выберите подходящий тариф: Лайт, Эконом, Стандарт, Премиум или VIP.'
            },
            {
              title: 'Описание',
              content: cleanDesc || 'Готовый интеллектуальный консультант для автоматизации продаж и обслуживания клиентов 24/7.'
            },
            {
              title: 'Опции и каналы',
              content: 'Подключение: Telegram, WhatsApp, Чат на сайт, ВКонтакте, CRM (amoCRM, Битрикс24).'
            }
          );
        }

        const newItem: MarketplaceItem = {
          id: itemId,
          tildaUid: uid || itemId,
          sku: sku || undefined,
          brand: brand || 'SAV AI',
          slug,
          name: mainTitle,
          category: category || 'SAV Торговля',
          niche: desc || 'Автоматизация продаж и консультации 24/7',
          shortDescription: cleanDesc.slice(0, 160) + (cleanDesc.length > 160 ? '...' : ''),
          fullDescription: cleanDesc || 'Готовый интеллектуальный консультант для вашего бизнеса.',
          textHtml: textHtml || undefined,
          modificationsText: modText || undefined,
          price: price || 3600,
          maxPrice: 57600,
          period: 'руб',
          imageUrl: photo || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png',
          demoUrl: 'https://t.me/SAVPartnerBot',
          url: rowUrl || undefined,
          seoTitle: seoTitle || `${mainTitle} — Готовое решение для продаж | SAV AI`,
          seoDescr: seoDescr || cleanDesc.slice(0, 160),
          seoKeywords: seoKeywords || undefined,
          fbTitle: fbTitle || undefined,
          fbDescr: fbDescr || undefined,
          features: [
            'Круглосуточная консультация клиентов 24/7',
            'Индивидуальная адаптация под ваш ассортимент',
            'Быстрая интеграция с CRM и мессенджерами',
            'Работа со сложными возражениями и расчет цен'
          ],
          integrations: ['Telegram', 'WhatsApp', 'Чат на сайт', 'amoCRM', 'Битрикс24'],
          isPopular: true,
          rating: 4.9,
          salesCount: 120,
          setupTime: '2 часа',
          tabs,
          variants: []
        };

        itemsMap.set(itemId, newItem);
        currentParent = newItem;
      } else if (currentParent) {
        // --- THIS IS A CHILD PACKAGE VARIANT ROW (1 of the 5 packages) ---
        let tariffName = '';
        let categoryOption = '';
        let segmentOption = '';
        const extraTags: string[] = [];

        if (editions) {
          const parts = editions.split(';').map(s => s.trim()).filter(Boolean);
          parts.forEach(p => {
            const [k, v] = p.split(':').map(s => s.trim());
            if (k && v) {
              const kLower = k.toLowerCase();
              if (kLower === 'тариф') {
                tariffName = v;
              } else if (kLower === 'категория') {
                categoryOption = v;
                extraTags.push(v);
              } else if (kLower === 'сегмент') {
                segmentOption = v;
              } else {
                extraTags.push(`${k}: ${v}`);
              }
            }
          });
        }

        // Extract options from modifications / externalId if present
        if (!categoryOption && modText && modText.startsWith('Категория:')) {
          categoryOption = modText.replace(/^Категория:\s*/, '');
          extraTags.push(categoryOption);
        }
        if (!segmentOption && externalId && externalId.startsWith('Сегмент:')) {
          segmentOption = externalId.replace(/^Сегмент:\s*/, '');
          extraTags.push(segmentOption);
        }

        // If tariff name is not extracted from editions, parse from title
        if (!tariffName && title) {
          const tParts = title.split(' - ').map(s => s.trim());
          if (tParts.length > 1) {
            tariffName = tParts[1];
          } else {
            const tMatch = title.match(/(Лайт|Эконом|Стандарт|Премиум|VIP|Базовый|Продвинутый|Максимальный)/i);
            if (tMatch) {
              tariffName = tMatch[1];
            } else {
              tariffName = title;
            }
          }
        }

        // Direct product link if present in Tabs:2 or url
        const directUrl = (rowUrl && rowUrl.startsWith('http')) ? rowUrl : getVal(27);

        const variantName = tariffName ? `Тариф: ${tariffName}` : (title || `Вариант ${(currentParent.variants?.length || 0) + 1}`);
        const variantSubtitle = extraTags.length > 0 ? extraTags.join(' • ') : (editions || undefined);
        const variantPrice = price || currentParent.price || 3600;
        const variantOldPrice = oldPrice || (variantPrice ? variantPrice * 5 : 18000);

        const variantObj: ProductVariant = {
          id: uid || sku || `var-${currentParent.id}-${(currentParent.variants?.length || 0) + 1}`,
          tildaUid: uid,
          parentUid: parentUid || currentParent.tildaUid || currentParent.id,
          sku: sku || undefined,
          tariff: tariffName || undefined,
          categoryOption: categoryOption || undefined,
          segmentOption: segmentOption || undefined,
          name: variantName,
          subtitle: variantSubtitle,
          price: variantPrice,
          oldPrice: variantOldPrice,
          editions: editions || undefined,
          imageUrl: photo || currentParent.imageUrl,
          url: directUrl || undefined
        };

        if (!currentParent.variants) currentParent.variants = [];
        currentParent.variants.push(variantObj);

        // Update parent price range dynamically based on all child variants
        const prices = currentParent.variants.map(v => v.price).filter(p => p > 0);
        if (prices.length > 0) {
          currentParent.price = Math.min(...prices);
          currentParent.maxPrice = Math.max(...prices);
        }
      }
    }

    const result = Array.from(itemsMap.values());
    result.forEach(item => {
      if (item.variants && item.variants.length === 0) {
        delete item.variants;
      }
    });

    return result;
  } catch (err) {
    console.error('Error parsing CSV with full column metadata:', err);
    return [];
  }
}

/**
 * Utility to parse YML (Yandex Market XML) into MarketplaceItem objects
 */
export function parseYmlContent(ymlString: string): MarketplaceItem[] {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ymlString, 'text/xml');
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('YML Parse Error:', parseError.textContent);
      return [];
    }

    const offers = Array.from(xmlDoc.querySelectorAll('offer'));
    const categoriesMap: Record<string, string> = {};
    
    Array.from(xmlDoc.querySelectorAll('category')).forEach(cat => {
      const id = cat.getAttribute('id');
      if (id && cat.textContent) {
        categoriesMap[id] = cat.textContent.trim();
      }
    });

    const items: MarketplaceItem[] = offers.map((offer, index) => {
      const id = offer.getAttribute('id') || `yml-item-${index + 1}`;
      const name = offer.querySelector('name')?.textContent || 
                   offer.querySelector('title')?.textContent || 
                   offer.querySelector('model')?.textContent || 
                   `ИИ-Продавец ${index + 1}`;
      
      const priceText = offer.querySelector('price')?.textContent || '10000';
      const price = parseFloat(priceText) || 10000;
      
      const categoryId = offer.querySelector('categoryId')?.textContent;
      const categoryName = (categoryId && categoriesMap[categoryId]) || offer.querySelector('category')?.textContent || 'SAV Торговля';
      
      const rawDescription = offer.querySelector('description')?.textContent || 'Готовый ИИ-продавец, импортированный из YML каталога.';
      const cleanDesc = rawDescription.replace(/<[^>]*>?/gm, '').trim();
      
      const picture = offer.querySelector('picture')?.textContent || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
      const url = offer.querySelector('url')?.textContent || '';

      const paramElements = Array.from(offer.querySelectorAll('param'));
      const features: string[] = paramElements.map(p => {
        const pName = p.getAttribute('name');
        return pName ? `${pName}: ${p.textContent}` : p.textContent || '';
      }).filter(Boolean);

      if (features.length === 0) {
        features.push('Синхронизировано из YML каталога', 'Готово к запуску 24/7');
      }

      return {
        id: `yml-${id}`,
        name,
        category: categoryName,
        niche: categoryName,
        shortDescription: cleanDesc.slice(0, 150) + (cleanDesc.length > 150 ? '...' : ''),
        fullDescription: cleanDesc,
        price,
        period: 'руб',
        imageUrl: picture,
        demoUrl: url || 'https://t.me/SAVPartnerBot',
        features,
        integrations: ['Telegram', 'WhatsApp', 'Чат на сайт'],
        isPopular: index < 2,
        rating: 4.8,
        salesCount: Math.floor(Math.random() * 50) + 10,
        setupTime: '1 рабочий день'
      };
    });

    return items;
  } catch (err) {
    console.error('Error parsing YML:', err);
    return [];
  }
}
