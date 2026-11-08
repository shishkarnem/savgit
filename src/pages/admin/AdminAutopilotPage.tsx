import React from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { MemeAutopilotManager } from '@/components/crm/MemeAutopilotManager';

export const AdminAutopilotPage: React.FC = () => {
  return (
    <SystemAdminLayout
      title="Автопилот рассылок и мемов"
      subtitle="Управление генерацией сатирических мемов в 07:00 МСК, случайной каскадной отправкой с 10:00 до 17:00 МСК и очередью Telegram-сообщений"
    >
      <div className="w-full space-y-6">
        <MemeAutopilotManager />
      </div>
    </SystemAdminLayout>
  );
};

export default AdminAutopilotPage;
