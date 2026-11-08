import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCRMMessagesPage: React.FC = () => {
  return <Navigate to="/admin/crm/messages" replace />;
};

export default AdminCRMMessagesPage;
