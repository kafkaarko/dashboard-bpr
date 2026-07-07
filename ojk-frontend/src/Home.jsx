import React, { useState, useEffect } from 'react';
import {
  Search, Building2, AlertTriangle, FileSpreadsheet,
  ArrowRight, Users, Activity, Wallet, TrendingUp, Percent,
  Database,
  GitCompareIcon,
  GitCompareArrowsIcon,
  ReceiptPoundSterling,
  Monitor,
  LayoutDashboard,
  ChevronDown,
  HelpCircle,
  X,
  Sparkles,
  RefreshCw,
  RocketIcon,
  AlarmPlus,
  ScreenShare
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // --- STATE UNTUK RINGKASAN AI ---
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState(null);

  const navigate = useNavigate()

  // Contoh perubahan fetch di useEffect lu bor:
  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    api('/api/bpr-list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
      .then(result => {
        // Kalau lolos masuk sini, berarti status 200 OK
        if (result.success) {
          setDaftarBank(result.data);
        }
      })
      .catch(err => {
        console.error("Gagal ambil data akibat proteksi:", err);

        // Kita cek apakah pesan error-nya mengandung angka "401"
        if (err.message && err.message.includes('401')) {
          // 1. Hapus token spesifik
          localStorage.removeItem('auth_token');

          // 2. Tendang balik ke halaman login
          navigate('/login');
        }
      });
  }, [navigate]); // Tambahkan navigate di dependency array biar React gak protes
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!selectedBankId) return;
    setLoading(true);
    api(`/api/bpr/${selectedBankId}`, {
      method: 'GET',
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

  // --- FETCH RINGKASAN AI setiap kali bank yang dipilih berganti ---
  useEffect(() => {
    if (!selectedBankId) {
      setAiSummary(null);
      setAiError(null);
      return;
    }

    const token = localStorage.getItem("auth_token");
    setLoadingAi(true);
    setAiError(null);
    setAiSummary(null);

    api(`/api/ai-summary/${selectedBankId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(result => {
        if (result.success && result.data) {
          setAiSummary(result.data);
        } else {
          setAiError("Ringkasan AI tidak tersedia untuk bank ini.");
        }
        setLoadingAi(false);
      })
      .catch(err => {
        console.error("Gagal ambil ringkasan AI:", err);
        setAiError("Gagal membuat ringkasan AI. Coba lagi sebentar.");
        setLoadingAi(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });
  }, [selectedBankId, navigate]);

  const handleRegenerateAi = () => {
    if (!selectedBankId) return;
    const token = localStorage.getItem("auth_token");
    setLoadingAi(true);
    setAiError(null);

    api(`/api/ai-summary/${selectedBankId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(result => {
        if (result.success && result.data) setAiSummary(result.data);
        else setAiError("Ringkasan AI tidak tersedia untuk bank ini.");
        setLoadingAi(false);
      })
      .catch(() => {
        setAiError("Gagal membuat ringkasan AI. Coba lagi sebentar.");
        setLoadingAi(false);
      });
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_v2_features');
    if (!hasSeenTour) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    localStorage.setItem('has_seen_v2_features', 'true');
    setShowTutorial(false);
  };

  const handleTriggerTutorial = () => {
    setShowTutorial(true);
  };

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
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full mx-4 relative">
            <button
              onClick={handleCloseTutorial}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                Update Fitur v2.1
              </span>
            </div>

            <h3 className="text-base font-black text-slate-800 mb-2">
              🔥 Tiga Fitur Baru Telah Tersedia!
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Halo! Tim internal sekarang bisa menikmati beberapa modul analisis terbaru untuk mempermudah monitoring berkas OJK:
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="bg-blue-600 text-white p-2 rounded-lg h-fit">
                  <ReceiptPoundSterling size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">1. Boardcast</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Laporan semua bank yang terkena alert tanpa harus membuka satu satu</p>
                </div>
              </div>

              <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="bg-indigo-600 text-white p-2 rounded-lg h-fit">
                  <Monitor size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">2. Screener</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">Menampilkan semua bank yang NPL di atas lebih dari 5%.</p>
                </div>
              </div>

              <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="bg-indigo-600 text-white p-2 rounded-lg h-fit">
                  <RocketIcon size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">3. Ringkasan AI</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">pada Financial Executive Summary sekarang telah menghadirkan fitur ringkasan ai yang memudahkan untuk pengambilan keputusan.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCloseTutorial}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-blue-100"
            >
              Siap, Saya Paham!
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">

        {/* ========================================================= */}
        {/* MODAL TUTORIAL (OVERLAY LIGHTBOX) */}
        {/* ========================================================= */}

        {/* ========================================================= */}
        {/* HEADER BAR UTAMA */}
        {/* ========================================================= */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">

            {/* KIRI: LOGO & JUDUL */}
            <div className="flex items-center justify-center md:justify-start w-full md:w-auto gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-sm shadow-blue-200">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">
                  <Link to={"/"}>Bank<span className="text-blue-600">BPR</span></Link>
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Unified Executive Panel
                </p>
              </div>
            </div>

            {/* KANAN: MENU & SEARCH */}
            <div className="flex items-center justify-center md:justify-end gap-3 w-full md:w-auto">

              {/* WRAPPER MENU */}
              <div className="relative flex items-center gap-1">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100 focus:outline-none"
                >
                  <LayoutDashboard size={18} />
                  <span className="hidden sm:inline">Menu Fitur</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* TOMBOL TRIGGER TUTORIAL KECIL */}
                <button
                  onClick={handleTriggerTutorial}
                  title="Lihat info fitur baru"
                  className="p-1 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center"
                  style={{ width: '22px', height: '22px' }}
                >
                  <HelpCircle size={12} />
                </button>

                {/* ISI DROPDOWN FITUR */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-xl rounded-xl border border-slate-100 overflow-hidden z-50 flex flex-col">
                    <Link to="/tracker" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-slate-50">
                      <Database size={16} /> Data Tracker
                    </Link>
                    <Link to="/compare" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-slate-50">
                      <GitCompareArrowsIcon size={16} /> Compare Data
                    </Link>
                    <Link to="/laporan" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border-b border-slate-50">
                      <span className="flex items-center gap-3"><ReceiptPoundSterling size={16} /> Laporan</span>
                      {/* <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">BARU</span> */}
                    </Link>
                    <Link to="/monitor" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <span className="flex items-center gap-3"><Monitor size={16} /> Monitoring</span>
                      {/* <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">BARU</span> */}
                    </Link>
                    <Link to="/broadcast" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <span className="flex items-center gap-3"><AlarmPlus size={16} /> BroadCast</span>
                      <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">BARU</span>
                    </Link>
                    <Link to="/screener" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <span className="flex items-center gap-3"><ScreenShare size={16} /> Screener</span>
                      <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">BARU</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* SEARCH BAR */}
              <div className="relative w-full md:w-64 z-[40]">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari BPR (Nama / ID)..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => { if (searchTerm.length > 0) setShowDropdown(true) }}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
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
                RINGKASAN AI - muncul otomatis tiap buka 1 bank
               ========================================== */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shrink-0">
                  <Sparkles className="text-white" size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      Ringkasan AI
                      <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold animate-pulse">BARU</span>

                      {aiSummary?.jumlah_alert > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100">
                          {aiSummary.jumlah_alert} Alert
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={handleRegenerateAi}
                      disabled={loadingAi}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <RefreshCw size={13} className={loadingAi ? 'animate-spin' : ''} />
                      <span className="hidden sm:inline">Buat Ulang</span>
                    </button>
                  </div>

                  {loadingAi ? (
                    <div className="flex flex-col gap-2 py-1">
                      <div className="h-3 bg-slate-100 rounded-full animate-pulse w-full" />
                      <div className="h-3 bg-slate-100 rounded-full animate-pulse w-11/12" />
                      <div className="h-3 bg-slate-100 rounded-full animate-pulse w-3/4" />
                    </div>
                  ) : aiError ? (
                    <p className="text-sm text-rose-500">{aiError}</p>
                  ) : aiSummary?.ringkasan ? (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed">{aiSummary.ringkasan}</p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Dihasilkan otomatis oleh AI berdasarkan data periode {aiSummary.periode_label} — tetap verifikasi angka penting secara manual.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Ringkasan belum tersedia.</p>
                  )}
                </div>
              </div>
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
                  <h3 className="font-bold text-amber-700 flex items-center gap-2"><Activity size={18} /> 000003 - Kualitas Aset Detail (Kuartal Terakhir)</h3>
                </div>
                <div className="overflow-x-auto p-0">
                  {/* Filter: Hanya tampilkan data yang BUKAN rasio/persentase */}
                  {laporan.latest_000003.filter(item => !(item.label_bersih || item.label_asli).match(/rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i)).length === 0 ? (
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
                          .filter(item => !(item.label_bersih || item.label_asli).match(/rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i))
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
                  <h3 className="font-bold text-indigo-700 flex items-center gap-2"><Users size={18} /> 000005 - Pengurus & Saham (Kuartal Terakhir)</h3>
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
                              <td key={i} className="p-4 text-slate-700 font-medium">{val || "-"}</td>
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