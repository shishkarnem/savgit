import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminCRMProfilesPage: React.FC = () => {
  return <Navigate to="/system-admin?table=sav_telegram_profiles" replace />;
};

export default AdminCRMProfilesPage;
