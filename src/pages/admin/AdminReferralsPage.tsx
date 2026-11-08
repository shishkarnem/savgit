import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminReferralsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=partners" replace />;
};

export default AdminReferralsPage;
