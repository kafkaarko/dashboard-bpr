import React, { useState, useEffect } from 'react';
import {
  Search, Building2, AlertTriangle, FileSpreadsheet,
  ArrowRight, Users, Activity, Wallet, TrendingUp, Percent,
  Database,
  GitCompareIcon,
  GitCompareArrowsIcon
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode'
import { api } from '../api';

const formatRupiah = (angka) => {
  if (angka === null || angka === undefined) return "-";
  if (angka === 0) return "Rp 0";
  return `Rp ${Number(angka).toLocaleString('id-ID')}`;
};

const formatPersen = (angka) => {
  if (angka === null || angka === undefined) return "-";
  if (angka === 0) return "0%";
  return `${Number(angka).toFixed(2)}%`;
};

const EmptyStateChart = ({ title }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-rose-200 flex flex-col items-center justify-center h-full min-h-[200px]">
    <AlertTriangle size={36} className="text-rose-400 mb-3" />
    <h3 className="text-rose-600 font-bold text-xs text-center uppercase">DATA {title} BELUM TERSEDIA</h3>
  </div>
);

export default function Home() {
  const [laporan, setLaporan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [daftarBank, setDaftarBank] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState("");



  // Contoh perubahan fetch di useEffect lu bor:
useEffect(() => {
  // 1. Ambil token dari localStorage (Pastikan key-nya sama saat kamu menaruhnya pas login)
  const token = localStorage.getItem('auth_token'); 

  // HAPUS jwtDecode(token) karena token kamu bukan JWT!

  // 2. Lakukan fetch ke backend
  api('/api/bpr-list', {
    method: 'GET',
    headers: {
      // Ini sudah benar, backend kamu akan membaca ini di `req.headers.authorization`
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(result => { 
      console.log("Respon dari server:", result); // Menggeser console.log ke sini agar tidak error
      
      if (result.success) {
        setDaftarBank(result.data); 
      }
    })
    .catch(err => console.error("Gagal ambil data akibat proteksi:", err));
}, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!selectedBankId) return;
    setLoading(true);
    api(`/api/bpr/${selectedBankId}`,{
      method:'GET',
      headers: {
      // WAJIB ADA: Format harus 'Bearer <token>' sesuai ekspektasi backend-mu
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json'
    }
    })

      .then(result => {
        if (result.success && result.data) setLaporan(result.data);
        else setLaporan(null);
        setLoading(false);
      })
  }, [selectedBankId]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 0) {
      const filtered = daftarBank.filter(bank =>
        (bank.nama_bank && bank.nama_bank.toLowerCase().includes(value.toLowerCase())) ||
        (bank.id_bank && bank.id_bank.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredBanks(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelectBank = (bank) => {
    setSelectedBankId(bank.id_bank);
    setSearchTerm(bank.nama_bank);
    setShowDropdown(false);
  };

  // --- COMPONENT: TREND INDICATOR IN TABLE ---
  const TrendBadge = ({ trenData }) => {
    if (!trenData || trenData.status === "tetap" || trenData.nilai === 0) return null;
    const isNaik = trenData.status === "naik";

    return (
      <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] font-bold ${isNaik ? 'text-emerald-500' : 'text-rose-500'}`}>
        <span>{isNaik ? '↑' : '↓'}</span>
        <span>{trenData.tren}%</span>
        <span className="text-slate-400 font-normal ml-1">vs Q Lalu</span>
      </div>
    );
  };

  // --- MERAKIT DATA UNTUK GRAFIK ---
  const chartData = laporan ? [...laporan.columns].reverse().map(col => ({
    name: `Q${col.triwulan} '${col.tahun.toString().substr(2)}`,
    aset: col.val_000001["total aset"]?.nilai || 0,
    laba: col.val_000002["jumlah laba (rugi) tahun berjalan"]?.nilai || 0
  })) : [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* FIXED NAVBAR */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1400px] mx-auto w-full">
          
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                <Link to={"/"}>Bank<span className="text-blue-600">BPR</span></Link>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unified Executive Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full justify-end">
            
            <Link 
              to="/tracker" 
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
            >
              <Database size={18} />
              <span className="hidden sm:inline">Data Tracker</span>
            </Link>
             <Link 
              to="/compare" 
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
            >
              <GitCompareArrowsIcon size={18} />
              <span className="hidden sm:inline">Compare Data</span>
            </Link>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                type="text" placeholder="Cari BPR (Nama / ID)..."
                value={searchTerm} onChange={handleSearchChange} onFocus={() => { if (searchTerm.length > 0) setShowDropdown(true) }}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
              />
              {showDropdown && (
                <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl overflow-auto border border-slate-100">
                  {filteredBanks.map(bank => (
                    <li key={bank.id_bank} onClick={() => handleSelectBank(bank)} className="cursor-pointer p-3 hover:bg-blue-50 border-b border-slate-50">
                      <span className="font-bold">{bank.id_bank}</span> - <span className="text-sm">{bank.nama_bank}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* RENDER KONTEN */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 flex flex-col gap-6">
        {!selectedBankId ? (
          <div className="flex flex-1 items-center justify-center flex-col text-center py-20">
            <ArrowRight size={64} className="text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-700">Financial Executive Summary</h2>
            <p className="text-slate-500">Silakan cari entitas bank pada kolom di atas.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-1 items-center justify-center py-30">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : !laporan ? (
          <div className="flex flex-1 items-center justify-center flex-col py-20">
            <FileSpreadsheet size={48} className="text-rose-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-700">Data Tidak Ditemukan</h2>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-300">

            {/* TITLE BLOCK */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">{laporan.nama_bank}</h2>
              <p className="text-slate-500 text-sm">Arsip Historis Komparatif Makro & Mikro</p>
            </div>

            {/* ==========================================
                AREA 1 (ATAS): GRAFIK DIPISAH (ASET & LABA)
               ========================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <Wallet size={20} className="text-blue-500" /> Tren Pertumbuhan Total Aset
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${(val / 1000000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip formatter={(val) => formatRupiah(val)} cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="aset" name="Total Aset" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" /> Kinerja Laba Bersih
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${(val / 1000000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip formatter={(val) => formatRupiah(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="laba" name="Laba Berjalan" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ==========================================
                AREA 2 (TENGAH): MATRIX SPREADSHEET TABLE
               ========================================== */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                    <tr>
                      <th className="p-4 sticky left-0 bg-slate-100 z-30 w-72 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-bold text-slate-700">
                        POS / KETERANGAN
                      </th>
                      {laporan.columns.map((col, i) => (
                        <th key={i} className="p-4 min-w-[200px] text-right border-r border-slate-200 font-bold text-slate-800 text-base">
                          <div className="mb-2">Q{col.triwulan} {col.tahun}</div>
                          <div className="flex justify-end gap-1 font-normal text-xs">
                            <a href={`${api}/api/download/${col.tahun}/${col.bulan}/${laporan.id_bank}/BPK-901-000001`} className="bg-white border border-slate-300 px-2 py-1 rounded hover:bg-blue-50 text-slate-500">📥 01</a>
                            <a href={`${api}/api/download/${col.tahun}/${col.bulan}/${laporan.id_bank}/BPK-901-000002`} className="bg-white border border-slate-300 px-2 py-1 rounded hover:bg-blue-50 text-slate-500">📥 02</a>
                            <a href={`${api}/api/download/${col.tahun}/${col.bulan}/${laporan.id_bank}/BPK-901-000003`} className="bg-white border border-slate-300 px-2 py-1 rounded hover:bg-blue-50 text-slate-500">📥 03</a>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">

                    {/* 000001 - POSISI KEUANGAN */}
                    <tr className="bg-blue-50/60">
                      <td colSpan={laporan.columns.length + 1} className="p-3 font-extrabold text-blue-700 sticky left-0 uppercase tracking-widest text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        📊 000001 - POSISI KEUANGAN
                      </td>
                    </tr>
                    {laporan.labels_000001.map((label, idx) => (
                      <tr key={`pos-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10 font-medium text-slate-700 capitalize shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {label}
                        </td>
                        {laporan.columns.map((col, i) => {
                          const cellData = col.val_000001[label];
                          return (
                            <td key={`val1-${i}`} className="p-3 text-right border-r border-slate-100 align-top">
                              <div className="text-slate-800 font-mono font-semibold">{formatRupiah(cellData?.nilai)}</div>
                              <TrendBadge trenData={cellData} />
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* 000002 - LABA RUGI */}
                    <tr className="bg-emerald-50/60 border-t-2 border-slate-200">
                      <td colSpan={laporan.columns.length + 1} className="p-3 font-extrabold text-emerald-700 sticky left-0 uppercase tracking-widest text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        📈 000002 - LABA RUGI
                      </td>
                    </tr>
                    {laporan.labels_000002.map((label, idx) => (
                      <tr key={`lr-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10 font-medium text-slate-700 capitalize shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {label}
                        </td>
                        {laporan.columns.map((col, i) => {
                          const cellData = col.val_000002[label];
                          return (
                            <td key={`val2-${i}`} className="p-3 text-right border-r border-slate-100 align-top">
                              <div className="text-slate-800 font-mono font-semibold">{formatRupiah(cellData?.nilai)}</div>
                              <TrendBadge trenData={cellData} />
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* 000003 - RASIO KEUANGAN (%) */}
                    {laporan.labels_000003_rasio && laporan.labels_000003_rasio.length > 0 && (
                      <>
                        <tr className="bg-amber-50/60 border-t-2 border-slate-200">
                          <td colSpan={laporan.columns.length + 1} className="p-3 font-extrabold text-amber-700 sticky left-0 uppercase tracking-widest text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            ⚡ 000003 - RASIO KEUANGAN (%)
                          </td>
                        </tr>
                        {laporan.labels_000003_rasio.map((label, idx) => (
                          <tr key={`rasio-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 sticky left-0 bg-white border-r border-slate-200 z-10 font-medium text-slate-700 capitalize shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              {label}
                            </td>
                            {laporan.columns.map((col, i) => {
                              const cellData = col.val_000003?.[label];
                      
                              return (
                                <td key={`val3rasio-${i}`} className="p-3 text-right border-r border-slate-100 align-top">
                                  <div className="text-slate-800 font-mono font-semibold">{formatPersen(cellData?.nilai)}</div>
                                  <TrendBadge trenData={cellData} />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            {/* ==========================================
                AREA 3 (BAWAH): KUALITAS ASET & PENGURUS (STACK VERTIKAL)
               ========================================== */}
            <div className="flex flex-col gap-8 pb-10">
              
              {/* --- 000003 KUALITAS ASET (FULL WIDTH DENGAN 6 KOLOM KOLEKTIBILITAS) --- */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-amber-50 border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
                  <h3 className="font-bold text-amber-700 flex items-center gap-2"><Activity size={18}/> 000003 - Kualitas Aset Detail (Kuartal Terakhir)</h3>
                  <a href={`${api}/api/download/${laporan.latest_year}/${laporan.latest_bulan}/${laporan.id_bank}/BPK-901-000003`} className="text-[10px] bg-white border border-amber-200 px-3 py-1.5 rounded hover:bg-amber-100 text-amber-700 font-bold transition-colors">📥 Unduh 03</a>
                </div>
                <div className="overflow-x-auto p-0">
                  {/* Filter: Hanya tampilkan data yang BUKAN rasio/persentase */}
                  {laporan.latest_000003.filter(item => !(item.label_bersih||item.label_asli).match(/rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i)).length === 0 ? (
                    <EmptyStateChart title="Kualitas Aset" /> 
                  ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      
                      {/* HEADER 6 KOLOM KOLEKTIBILITAS */}
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th rowSpan="2" className="p-4 text-slate-700 font-bold border-r border-slate-200 align-middle">Pos</th>
                          <th colSpan="6" className="p-2 text-center text-slate-700 font-bold border-b border-slate-200 bg-amber-50/30">Nominal Dalam Ribuan Rupiah</th>
                        </tr>
                        <tr>
                          <th className="p-3 text-center text-slate-600 font-semibold border-r border-slate-200">L</th>
                          <th className="p-3 text-center text-slate-600 font-semibold border-r border-slate-200">DPK</th>
                          <th className="p-3 text-center text-slate-600 font-semibold border-r border-slate-200">KL</th>
                          <th className="p-3 text-center text-slate-600 font-semibold border-r border-slate-200">D</th>
                          <th className="p-3 text-center text-slate-600 font-semibold border-r border-slate-200">M</th>
                          <th className="p-3 text-center text-slate-800 font-bold bg-amber-50/50">Jumlah</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {laporan.latest_000003
                          .filter(item => !(item.label_bersih||item.label_asli).match(/rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i))
                          .map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            
                            <td className="p-4 font-medium text-slate-700 border-r border-slate-100">{item.label_asli}</td>
                            
                            {/* RENDER 6 ANGKA DARI DATABASE */}
                            <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">{formatRupiah(item.kolom_L)}</td>
                            <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">{formatRupiah(item.kolom_DPK)}</td>
                            <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">{formatRupiah(item.kolom_KL)}</td>
                            <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">{formatRupiah(item.kolom_D)}</td>
                            <td className="p-3 text-right font-mono text-slate-600 border-r border-slate-100">{formatRupiah(item.kolom_M)}</td>
                            
                            {/* KOLOM JUMLAH BERWARNA LEBIH TEGAS */}
                            <td className="p-3 text-right font-mono font-bold text-slate-800 bg-amber-50/20">
                              {formatRupiah(item.nilai)}
                            </td>
                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              
              {/* --- 000005 INFORMASI PENGURUS (FULL WIDTH DI BAWAHNYA) --- */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-indigo-50 border-b border-slate-200 p-4 sticky top-0 z-10 flex justify-between items-center">
                  <h3 className="font-bold text-indigo-700 flex items-center gap-2"><Users size={18}/> 000005 - Pengurus & Saham (Kuartal Terakhir)</h3>
                  <a href={`${api}/api/download/${laporan.latest_year}/${laporan.latest_bulan}/${laporan.id_bank}/BPK-901-000005`} className="text-[10px] bg-white border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-100 text-indigo-700 font-bold transition-colors">📥 Unduh 05</a>
                </div>
                <div className="overflow-x-auto p-0">
                  {laporan.latest_000005.length === 0 ? (
                    <EmptyStateChart title="Informasi Lainnya" /> 
                  ) : (
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {Object.keys(laporan.latest_000005[0]).map((k, i) => (
                            <th key={i} className="p-4 text-slate-600 font-bold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {laporan.latest_000005.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="p-4 text-slate-700 font-medium">{val||"-"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}} />
    </div>
  );
}