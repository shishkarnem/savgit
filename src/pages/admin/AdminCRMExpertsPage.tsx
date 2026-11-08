import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCRMExpertsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=experts" replace />;
};

export default AdminCRMExpertsPage;
