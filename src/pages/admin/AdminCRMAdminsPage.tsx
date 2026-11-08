import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCRMAdminsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=crm_admins" replace />;
};

export default AdminCRMAdminsPage;
