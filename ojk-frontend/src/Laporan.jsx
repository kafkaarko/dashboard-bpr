import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Table, Search, Building2, ChevronDown, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';


export default function LaporanInternalDetail() {
  const navigate = useNavigate();

  // STATE UTUK DATA BANNER & SELECTION
  const [daftarBank, setDaftarBank] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [bankData, setBankData] = useState(null);

  // STATE UNTUK COMBOBOX PENCARIAN BANK (search-as-you-type)
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef(null);
  
  // STATE UNTUK UI TAB & PENCARIAN
  const [activeTab, setActiveTab] = useState("000001");
  const [searchTerm, setSearchTerm] = useState("");

const tabMenu = [
    { id: "000001", title: "Neraca" },
    { id: "000002", title: "Laba Rugi" },
    { id: "000003", title: "Rasio" },
    { id: "000004", title: "Kontinjensi" }, // <-- Typo dikit gue benerin jadi kapital
    { id: "000005", title: "Pengurus" },
  ];

  // Kolom statis khusus tab Pengurus (000005) — BUKAN kolom per-periode
  const pengurusColumns = [
    { key: "Pemegang Saham", label: "Pemegang Saham" },
    { key: "Ultimate Shareholders", label: "Ultimate Shareholders" },
    { key: "Pemegang Saham Pengendali (Ya/Tidak)", label: "Pemegang Saham Pengendali (Ya/Tidak)" },
    { key: "Anggota Direksi BPR dan Anggota Dewan Komisaris BPR", label: "Anggota Direksi BPR dan Anggota Dewan Komisaris BPR" },
  ];

  // 1. FETCH LIST BPR UNTUK DROPDOWN
  useEffect(() => {
    const token = localStorage.getItem('auth_token'); 
    api('/api/bpr-list', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(result => { 
        if (result.success) {
          setDaftarBank(result.data); 
          if (result.data.length > 0) setSelectedBank(result.data[0].id_bank);
        }
      })
      .catch(err => {
        console.error("Gagal ambil daftar bank:", err);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token'); 
          navigate('/login'); 
        }
      });
  }, [navigate]);

  // 2. FETCH HISTORIS DETAIL KEUANGAN BPR
  useEffect(() => {
    if (!selectedBank) return;
    const token = localStorage.getItem('auth_token'); 

    api(`/api/bpr/${selectedBank}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(result => { 
        if (result.success) {
          // Susun kolom dari periode terlama ke terbaru (kiri ke kanan) mirip Excel asli
          const reversedColumns = [...result.data.columns].reverse();
          setBankData({ ...result.data, columns: reversedColumns }); 
        }
      })
      .catch(err => {
        console.error("Gagal ambil detail bank:", err);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token'); 
          navigate('/login'); 
        }
      });
  }, [selectedBank, navigate]);

  // FIX ACTION: JANGAN pakai helper api() untuk unduh biner file. Gunakan native window.fetch murni!
  const handleDownloadExcel = async () => {
  const token = localStorage.getItem('auth_token');
  const baseUrl = import.meta.env.VITE_API_URL
  try {
    // KOREKSI: Tembak langsung ke port server backend lu (3001)
    const response = await window.fetch(`${baseUrl}/api/export/excel/${selectedBank}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Jika server ngasih error (404/500), baca pesan errornya
      const errText = await response.text();
      console.error("Error dari server:", errText);
      throw new Error("Gagal mengambil file Excel dari server.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Laporan_Internal_${selectedBank}_${bankData?.nama_bank || 'BPR'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
  } catch (error) {
    console.error("Download Error:", error);
    alert("Gagal mengunduh file Excel karena masalah pembacaan biner data.");
  }
};

  // FORMAT PERIODE AGAR 1:1 SAMA SEPERTI EXCEL (Contoh: Q1 2025 -> Mar-25)
  const formatPeriodeExcel = (triwulan, tahun) => {
    const mapBulan = { 1: "Mar", 2: "Jun", 3: "Sep", 4: "Des" };
    const thShort = String(tahun).substring(2);
    return `${mapBulan[triwulan] || 'Q' + triwulan}-${thShort}`;
  };

  // AMBIL LABEL DATA BERDASARKAN TAB AKTIF (dipakai untuk tab 000001-000004 saja)
  const getLabelsForActiveTab = () => {
    if (!bankData) return [];
    if (activeTab === "000001") return bankData.labels_000001 || [];
    if (activeTab === "000002") return bankData.labels_000002 || [];
    if (activeTab === "000003") return [...(bankData.labels_000003_nominal || []), ...(bankData.labels_000003_rasio || [])];
   // --- FIX ACTION: Ambil dari latest_000004 (Data Terakhir) agar tidak looping 5x ---
    if (activeTab === "000004") {
      return bankData.latest_000004.map(x => x.label_bersih || x.label_asli).filter(Boolean);
    }
    return [];
  };

  const labels = getLabelsForActiveTab();
  const filteredLabels = labels.filter(label => 
    label && label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // SINKRONKAN TEKS INPUT DENGAN BANK YANG SEDANG TERPILIH (saat dropdown ditutup)
  useEffect(() => {
    const bankTerpilih = daftarBank.find(b => b.id_bank === selectedBank);
    if (bankTerpilih) {
      setBankSearchTerm(`${bankTerpilih.id_bank} - ${bankTerpilih.nama_bank}`);
    }
  }, [selectedBank, daftarBank]);

  // TUTUP DROPDOWN JIKA USER KLIK DI LUAR AREA COMBOBOX
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target)) {
        setIsBankDropdownOpen(false);
        // Kalau user tidak memilih apa-apa, kembalikan teks ke bank yang masih aktif
        const bankTerpilih = daftarBank.find(b => b.id_bank === selectedBank);
        if (bankTerpilih) {
          setBankSearchTerm(`${bankTerpilih.id_bank} - ${bankTerpilih.nama_bank}`);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [daftarBank, selectedBank]);

  // DAFTAR BANK YANG SUDAH DISARING SESUAI KETIKAN USER
  const filteredBankList = daftarBank.filter(bank => {
    const term = bankSearchTerm.toLowerCase();
    return (
      bank.id_bank?.toLowerCase().includes(term) ||
      bank.nama_bank?.toLowerCase().includes(term)
    );
  });

  const handlePilihBank = (bank) => {
    setSelectedBank(bank.id_bank);
    setBankSearchTerm(`${bank.id_bank} - ${bank.nama_bank}`);
    setIsBankDropdownOpen(false);
  };

  // BARIS MENTAH UNTUK TAB PENGURUS (000005) — sudah flat per baris, TIDAK di-loop per periode
  const getPengurusRows = () => {
    if (!bankData?.latest_000005) return [];
    if (!searchTerm) return bankData.latest_000005;

    const term = searchTerm.toLowerCase();
    return bankData.latest_000005.filter(row =>
      pengurusColumns.some(col => {
        const val = row[col.key] ?? row.label_asli ?? row.label_bersih ?? "";
        return String(val).toLowerCase().includes(term);
      })
    );
  };

  const pengurusRows = getPengurusRows();

  // DETEKSI APAKAH BARIS INI SEBUAH HEADER / JUDUL UTAMA (ASET, EKUITAS, dll)
  const isHeaderRow = (label) => {
    if (!label) return false;
    const txt = label.trim().toUpperCase();
    return (
      txt === "ASET" || 
      txt === "LIABILITAS" || 
      txt === "EKUITAS" || 
      txt === "PENDAPATAN DAN BEBAN OPERASIONAL" ||
      txt === "PENDAPATAN BUNGA" ||
      txt === "KAP DAN RASIO" ||
      txt === "REKENING ADMINISTRASI" ||
      txt === "KREDIT YANG DIBERIKAN" ||
      txt === "DIREKSI" ||
      txt === "DEWAN KOMISARIS" ||
      // --- TAMBAHAN HEADER KONTINJENSI (000004) BIAR WARNANYA BIRU TEBEL ---
      txt === "TAGIHAN KOMITMEN" ||
      txt === "KEWAJIBAN KOMITMEN" ||
      txt === "TAGIHAN KONTINJENSI" ||
      txt === "KEWAJIBAN KONTINJENSI" ||
      txt === "REKENING ADMINISTRATIF LAINNYA"
    );
  };

  const isPengurusTab = activeTab === "000005";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* FIXED NAVBAR - selaras dengan Home.jsx */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1400px] mx-auto w-full flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Table className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Laporan <span className="text-blue-600">Internal</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Spreadsheet Monitoring Internal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Kembali</span>
            </Link>
            <button
              onClick={handleDownloadExcel}
              disabled={!bankData}
              // disabled
              className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors px-4 py-2.5 rounded-xl shadow-sm"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Download (.XLSX)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 flex flex-col gap-6">

        {/* KONTROL PANEL (CARI BANK & CARI POSISI) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div ref={bankDropdownRef}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Entitas Bank Perekonomian Rakyat</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3.5 top-3 text-slate-400 z-10" />
              <input
                type="text"
                value={bankSearchTerm}
                onChange={(e) => {
                  setBankSearchTerm(e.target.value);
                  setIsBankDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsBankDropdownOpen(true);
                  setBankSearchTerm(""); // kosongkan biar gampang ketik ulang
                }}
                placeholder="Ketik kode atau nama BPR..."
                className="w-full pl-11 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {bankSearchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setBankSearchTerm("");
                    setIsBankDropdownOpen(true);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown size={16} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              )}

              {isBankDropdownOpen && (
                <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {filteredBankList.length > 0 ? (
                    filteredBankList.map((bank) => (
                      <button
                        key={bank.id_bank}
                        type="button"
                        onClick={() => handlePilihBank(bank)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          bank.id_bank === selectedBank ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        <span className="font-bold">{bank.id_bank}</span> - {bank.nama_bank}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">Bank tidak ditemukan.</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Penyaringan Keterangan / Pos Akuntansi</label>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik kata kunci (misal: Kas, Deposito, Laba)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* NAVIGATION TAB + TABEL, DIBUNGKUS SATU CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* NAVIGATION TAB (STYLE SHEET EXCEL) */}
          <div className="bg-slate-50 px-4 pt-2 flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
            {tabMenu.map(tab => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm(""); 
                  }}
                  className={`px-5 py-2.5 text-xs font-bold rounded-t-lg border-t border-x transition-all whitespace-nowrap ${
                    isSelected 
                      ? 'bg-white text-blue-600 border-slate-200 shadow-sm z-10 font-black' 
                      : 'bg-transparent text-slate-500 border-transparent hover:bg-blue-50/60 hover:text-blue-600'
                  }`}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>

          {/* AREA EMBED SPREADSHEET MATRIX TABLE */}
          <div className="p-4 sm:p-6 bg-white overflow-x-auto max-h-[550px] custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse border border-slate-200 shadow-sm">
              <thead className="bg-slate-50 sticky top-0 z-20 border-b border-slate-300">
                {isPengurusTab ? (
                  <tr className="divide-x divide-slate-200">
                    {pengurusColumns.map((col, i) => (
                      <th key={i} className="p-3 font-bold text-slate-700 bg-slate-50 min-w-[220px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                ) : (
                  <tr className="divide-x divide-slate-200">
                    <th className="p-3 font-bold text-slate-700 bg-slate-100 min-w-[320px] shadow-inner">Posisi Tanggal Laporan (Akun Akuntansi)</th>
                    {bankData?.columns?.map((col, i) => (
                      <th key={i} className="p-3 font-bold text-slate-700 text-right bg-slate-50 min-w-[130px]">
                        {formatPeriodeExcel(col.triwulan, col.tahun)}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>

              <tbody className="bg-white divide-y divide-slate-100">
                {isPengurusTab ? (
                  // --- RENDER KHUSUS TAB PENGURUS: 1 TABEL FLAT, TIDAK LOOP PER PERIODE ---
                  pengurusRows.length > 0 ? (
                    pengurusRows.map((row, idx) => {
                      const direksiValue =
                        row["Anggota Direksi BPR dan Anggota Dewan Komisaris BPR"] ??
                        row.label_asli ??
                        row.label_bersih ??
                        "-";
                      const isHeader = isHeaderRow(direksiValue);

                      return (
                        <tr
                          key={idx}
                          className={`divide-x divide-slate-100 transition-colors ${
                            isHeader
                              ? 'bg-blue-50/60 font-bold text-slate-900 border-y border-slate-200'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <td className="p-2.5 border-r border-slate-200">{row["Pemegang Saham"] || "-"}</td>
                          <td className="p-2.5 border-r border-slate-200">{row["Ultimate Shareholders"] || "-"}</td>
                          <td className="p-2.5 border-r border-slate-200">{row["Pemegang Saham Pengendali (Ya/Tidak)"] || "-"}</td>
                          <td className={`p-2.5 ${isHeader ? 'font-extrabold text-blue-700' : ''}`}>{direksiValue}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={pengurusColumns.length} className="p-12 text-center text-slate-400 font-medium">
                        {searchTerm ? `Pencarian "${searchTerm}" tidak ditemukan di lembar Pengurus.` : "Data pengurus tidak tersedia."}
                      </td>
                    </tr>
                  )
                ) : (
                  // --- RENDER STANDAR: LABEL x PERIODE (000001-000004) ---
                  filteredLabels.length > 0 ? (
                    filteredLabels.map((label, idx) => {
                      const isHeader = isHeaderRow(label);
                      
                      return (
                        <tr 
                          key={idx} 
                          className={`divide-x divide-slate-100 transition-colors ${
                            isHeader 
                              ? 'bg-blue-50/60 font-bold text-slate-900 border-y border-slate-200' 
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {/* Kolom Keterangan */}
                          <td className={`p-2.5 border-r border-slate-200 tracking-wide ${isHeader ? 'pl-3 font-extrabold text-blue-700' : 'pl-6'}`}>
                            {label}
                          </td>
                          
                          {/* Kolom Periode Angka Dinamis */}
                          {bankData?.columns?.map((col, i) => {
                            let val = "-";
                            const keyTab = `val_${activeTab}`;
                            
                            if (col[keyTab] && col[keyTab][label]) {
                              val = col[keyTab][label].nilai;
                            }

                            return (
                              <td key={i} className={`p-2.5 text-right font-mono ${isHeader ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                {typeof val === 'number' 
                                  ? (val === 0 ? '-' : val.toLocaleString('id-ID')) 
                                  : val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={(bankData?.columns?.length || 0) + 1} className="p-12 text-center text-slate-400 font-medium">
                        {searchTerm ? `Pencarian "${searchTerm}" tidak ditemukan di lembar ${tabMenu.find(t => t.id === activeTab)?.title}.` : "Data historis tidak tersedia."}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* SHEET FOOTER STATUS */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-[10px] font-bold text-slate-400 flex justify-between items-center">
            <span>KODE ENTITAS: {selectedBank || '-'}</span>
            <span className="uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">READY SPREADSHEET VIEW</span>
          </div>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}} />
    </div>
  );
}