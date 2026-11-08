import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminLogsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=audit_logs" replace />;
};

export default AdminLogsPage;
