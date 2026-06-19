import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('auth_token');
  
  // Jika tidak ada token, paksa pindah ke halaman login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Jika ada token, izinkan merender komponen internal di dalamnya (Outlet)
  return <Outlet />;
}