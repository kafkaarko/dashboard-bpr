import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './Home';
import RekapTracker from './RekapTracker';
import CompareBPR from './CompareBPR';
import Login from './Login';
import ProtectedRoute from './ProtectedRoute';
import LaporanInternalDetail from './Laporan';
import Monitoring from './Monitoring';
import Broadcast from './Broadcast';
import Screener from './Screener';

const App = () => {
  return (
    <Routes>
      {/* Rute Publik: Siapa pun bisa buka halaman ini */}
      <Route path="/login" element={<Login />} />
      
      {/* Rute Terproteksi: Wajib lolos pemeriksaan ProtectedRoute */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/tracker" element={<RekapTracker />} />
        <Route path="/compare" element={<CompareBPR />} />
        <Route path="/laporan" element={<LaporanInternalDetail />} />
        <Route path="/monitor" element={<Monitoring />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/screener" element={<Screener />} />
      </Route>
    </Routes>
  );
};

export default App;