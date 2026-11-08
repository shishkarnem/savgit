import React from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { CronScheduleManager } from '@/components/admin/CronScheduleManager';

export const AdminCronPage: React.FC = () => {
  return (
    <SystemAdminLayout
      title="Фоновые задачи и Cron"
      subtitle="Управление периодическими задачами, расписанием автобэкапов в 06:00 МСК и интервалами синхронизации"
    >
      <div className="space-y-6">
        <CronScheduleManager />
      </div>
    </SystemAdminLayout>
  );
};

export default AdminCronPage;
