import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCRMLogsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=sav_client_messages" replace />;
};

export default AdminCRMLogsPage;
