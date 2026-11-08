import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminContractsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=contracts" replace />;
};

export default AdminContractsPage;
