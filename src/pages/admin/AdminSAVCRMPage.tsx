import React from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import AdminCRM from '@/pages/AdminCRM';

export const AdminSAVCRMPage: React.FC = () => {
  return (
    <SystemAdminLayout
      title="CRM Клиенты и Лиды"
      subtitle="База клиентов SAV AI, воронка продаж, фильтрация и управление сделками"
    >
      <div className="w-full rounded-2xl border border-white/10 backdrop-blur-2xl bg-black/25 p-3 sm:p-5 overflow-hidden shadow-2xl">
        <AdminCRM />
      </div>
    </SystemAdminLayout>
  );
};
