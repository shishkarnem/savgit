import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCalculationsPage: React.FC = () => {
  return <Navigate to="/system-admin?table=sav_user_calculations" replace />;
};

export default AdminCalculationsPage;
