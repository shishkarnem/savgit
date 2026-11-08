import React from 'react';
import { Navigate } from 'react-router-dom';

export const AdminGreenlandHQPage: React.FC = () => {
  return <Navigate to="/greenland/admin" replace />;
};

export default AdminGreenlandHQPage;
