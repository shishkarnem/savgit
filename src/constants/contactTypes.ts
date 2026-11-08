import { Send, MessageSquare, Phone, Mail, Zap, Globe, Share2 } from 'lucide-react';

export interface ContactTypeOption {
  id: string;
  label: string;
  icon: any;
  placeholder: string;
}

export const CONTACT_TYPES: ContactTypeOption[] = [
  { id: 'Telegram', label: 'Telegram', icon: Send, placeholder: '@username или ссылка на профиль' },
  { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare, placeholder: '+7 (999) 000-00-00 (WhatsApp)' },
  { id: 'Телефон', label: 'Телефон', icon: Phone, placeholder: '+7 (999) 000-00-00' },
  { id: 'Email', label: 'Email', icon: Mail, placeholder: 'name@company.ru' },
  { id: 'MAX', label: 'MAX', icon: Zap, placeholder: 'ID или контакт в MAX' },
  { id: 'Сетка', label: 'Сетка', icon: Globe, placeholder: 'Профиль в Сетке' },
  { id: 'ВКонтакте', label: 'ВКонтакте', icon: Share2, placeholder: 'vk.com/username или id' },
];
