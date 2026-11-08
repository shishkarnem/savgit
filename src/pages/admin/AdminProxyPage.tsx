import React from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { SystemAdminProxySection } from '@/components/admin/SystemAdminProxySection';

export const AdminProxyPage: React.FC = () => {
  return (
    <SystemAdminLayout
      title="Telegram Прокси и Бэкап 06:00"
      subtitle="Антиблокировочный шлюз для Telegram API и автоматическое резервное копирование BD ProTalk в 06:00 МСК"
    >
      <div className="space-y-6">
        <SystemAdminProxySection />
      </div>
    </SystemAdminLayout>
  );
};

export default AdminProxyPage;
