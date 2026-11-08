export type Segment = 'B2C' | 'B2B';
export type Category = 'Товары' | 'Услуги';
export type Sphere = 'Строительство' | 'Здоровье' | 'Производство' | 'Образование' | 'Реклама' | 'Транспорт' | 'Технологии' | 'Досуг' | 'Торговля' | 'Другое';
export type PlanLevel = 'Лайт' | 'Эконом' | 'Стандарт' | 'Премиум' | 'VIP';

export interface BusinessInfo {
  company_name?: string;
  segment: Segment;
  category: Category;
  sphere: Sphere;
  description: string;
  praise: string;
  package?: string;
  image_url?: string;
}

export interface PlanData {
  tariffName: string;
  name?: string;
  custom_title?: string;
  custom_description?: string;
  key_benefits?: string[];
  package: PlanLevel;
  sphere: Sphere;
  segment: Segment;
  category: Category;
  fullDescription: string;
  priceMonth: number;
  monthlyPrice?: number;
  onetimePrice?: number;
  photoUrl: string;
  features?: string[];
  baseFeatures?: string[];
  messengerOptions?: string[];
  duration?: string;
  roiHighlight?: string;
  roi_highlight?: string;
  blueprintMarkdown?: string;
  full_blueprint_markdown?: string;
  breakdown?: any;
}

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  imageUrl?: string;
  buttons?: string[][];
  type?: 'intro' | 'classification' | 'plans' | 'plan_details';
}

export enum UserRole {
  GUEST = 'GUEST',
  RESIDENT = 'RESIDENT',
  ARCHITECT = 'ARCHITECT',
  MINISTER = 'MINISTER',
  CHANCELLOR = 'CHANCELLOR'
}

export enum PageView {
  HOME = 'HOME',
  IMMIGRATION = 'IMMIGRATION',
  CONSTITUTION = 'CONSTITUTION',
  PROFILE = 'PROFILE'
}

export type Language = 'ru' | 'olbanian';
export type Theme = 'light' | 'dark';

export interface CitizenStats {
  promoCode: string;
  totalClients: number;
  totalEarnings: number;
  nextPayoutDate: string;
  status: 'Active' | 'Pending' | 'Green-Card Holder';
}

export interface Transaction {
  id: number;
  clientName: string;
  date: string;
  amount: number;
  payout: number;
  status: 'Paid' | 'Processing';
}

export interface CityNode {
  id: string;
  name: string;
  top: string;
  left: string;
  logo?: string;
  description?: string;
  link?: string;
  linkText?: string;
}

export interface InlineButton {
  text: string;
  type: 'url' | 'callback' | 'webapp';
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  subtitle?: string;
  tildaUid?: string;
  parentUid?: string;
  sku?: string;
  tariff?: string;
  categoryOption?: string;
  segmentOption?: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  editions?: string;
  url?: string;
  features?: string[];
  options?: Record<string, string>;
}

export interface ProductTab {
  title: string;
  content: string;
}

export interface MarketplaceItem {
  id: string;
  tildaUid?: string;
  name: string;
  category: string;
  niche: string;
  sku?: string;
  brand?: string;
  slug?: string;
  shortDescription: string;
  fullDescription: string;
  textHtml?: string;
  modificationsText?: string;
  tabs?: ProductTab[];
  tab2Content?: string;
  price: number;
  maxPrice?: number;
  period?: string;
  imageUrl?: string;
  demoUrl?: string;
  url?: string;
  seoTitle?: string;
  seoDescr?: string;
  seoKeywords?: string;
  fbTitle?: string;
  fbDescr?: string;
  features: string[];
  integrations: string[];
  isPopular?: boolean;
  rating?: number;
  salesCount?: number;
  setupTime?: string;
  variants?: ProductVariant[];
}
