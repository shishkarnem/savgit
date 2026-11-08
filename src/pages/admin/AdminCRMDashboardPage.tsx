import React from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import CRMDashboard from '@/pages/CRMDashboard';

export const AdminCRMDashboardPage: React.FC = () => {
  return (
    <SystemAdminLayout
      title="Аналитика CRM"
      subtitle="Метрики конверсий, статистика воронки, выручка и активность клиентов"
    >
      <div className="w-full rounded-2xl border border-white/10 backdrop-blur-2xl bg-black/25 p-3 sm:p-5 overflow-hidden shadow-2xl">
        <CRMDashboard />
      </div>
    </SystemAdminLayout>
  );
};
