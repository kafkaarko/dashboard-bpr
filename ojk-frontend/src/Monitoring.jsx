import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle2, ClipboardList,
  ShieldAlert, XCircle, Search, ChevronDown, X, Wallet, TrendingUp,
  ExternalLink, Percent
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const SEVERITY_STYLE = {
  high: { badge: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500', label: 'Tinggi' },
  medium: { badge: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500', label: 'Sedang' },
  low: { badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: 'Rendah' },
};

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <Icon size={36} className="text-slate-300 mb-3" />
    <p className="text-sm text-slate-400 font-medium">{text}</p>
  </div>
);

const formatRupiah = (angka) => {
  if (angka === null || angka === undefined) return "-";
  if (angka === 0) return "Rp 0";
  return `Rp ${Number(angka).toLocaleString('id-ID')}`;
};

// Rule tampilan rasio di kartu "Cek Bank Tertentu".
// SAMA seperti ALERT_RULES di backend (bprController.js) — cuma dipakai
// untuk pewarnaan di UI, bukan sumber kebenaran. Kalau threshold backend
// diubah, samakan juga di sini biar warnanya konsisten.
const RATIO_DISPLAY_RULES = [
  { keyword: /kpmm/i, label: 'KPMM', op: '<', threshold: 8 },
  { keyword: /npl/i, label: 'NPL', op: '>', threshold: 5 },
  { keyword: /bopo/i, label: 'BOPO', op: '>', threshold: 94 },
  { keyword: /roa/i, label: 'ROA', op: '<', threshold: 0 },
  { keyword: /cash ratio/i, label: 'Cash Ratio', op: '<', threshold: 4.05 },
  { keyword: /ldr/i, label: 'LDR', op: '>', threshold: 94 },
];

const cekRasioBermasalah = (label, nilai) => {
  if (nilai === null || nilai === undefined || Number.isNaN(Number(nilai))) return false;
  const rule = RATIO_DISPLAY_RULES.find((r) => r.keyword.test(label));
  if (!rule) return false;
  const v = Number(nilai);
  return rule.op === '<' ? v < rule.threshold : v > rule.threshold;
};

export default function Monitoring() {
  const navigate = useNavigate();

  const [alertData, setAlertData] = useState([]);
  const [loadingAlert, setLoadingAlert] = useState(true);

  const [trackerData, setTrackerData] = useState(null);
  const [loadingTracker, setLoadingTracker] = useState(true);

  const [searchBelumLapor, setSearchBelumLapor] = useState("");

  // --- STATE UNTUK PANEL "CEK BANK TERTENTU" ---
  const [daftarBank, setDaftarBank] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [bankData, setBankData] = useState(null);
  const [loadingBankData, setLoadingBankData] = useState(false);

  // combobox pencarian bank (pola sama seperti LaporanInternalDetail.jsx)
  const [bankSearchTerm, setBankSearchTerm] = useState("");
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    api('/api/alerts', { method: 'GET', headers })
      .then((result) => {
        if (result.success) setAlertData(result.data);
        setLoadingAlert(false);
      })
      .catch((err) => {
        console.error("Gagal ambil alert:", err);
        setLoadingAlert(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });

    api('/api/submission-tracker', { method: 'GET', headers })
      .then((result) => {
        if (result.success) setTrackerData(result.data);
        setLoadingTracker(false);
      })
      .catch((err) => {
        console.error("Gagal ambil submission tracker:", err);
        setLoadingTracker(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });
  }, [navigate]);

  // 1. FETCH DAFTAR BANK UNTUK COMBOBOX "CEK BANK TERTENTU"
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    api('/api/bpr-list', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(result => {
        if (result.success) {
          setDaftarBank(result.data);
          // Sengaja TIDAK auto-pilih bank pertama di sini (beda dari LaporanInternalDetail),
          // karena panel ini sifatnya "cek sewaktu-waktu", biarkan kosong sampai user cari.
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

  // 2. FETCH HISTORIS DETAIL KEUANGAN BPR UNTUK BANK YANG DIPILIH
  useEffect(() => {
    if (!selectedBank) return;
    const token = localStorage.getItem('auth_token');
    setLoadingBankData(true);

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
        setLoadingBankData(false);
      })
      .catch(err => {
        console.error("Gagal ambil detail bank:", err);
        setLoadingBankData(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });
  }, [selectedBank, navigate]);

  // SINKRONKAN TEKS INPUT DENGAN BANK YANG SEDANG TERPILIH
  useEffect(() => {
    const bankTerpilih = daftarBank.find(b => b.id_bank === selectedBank);
    if (bankTerpilih) {
      setBankSearchTerm(`${bankTerpilih.id_bank} - ${bankTerpilih.nama_bank}`);
    }
  }, [selectedBank, daftarBank]);

  // TUTUP DROPDOWN JIKA KLIK DI LUAR
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target)) {
        setIsBankDropdownOpen(false);
        const bankTerpilih = daftarBank.find(b => b.id_bank === selectedBank);
        if (bankTerpilih) {
          setBankSearchTerm(`${bankTerpilih.id_bank} - ${bankTerpilih.nama_bank}`);
        } else {
          setBankSearchTerm("");
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [daftarBank, selectedBank]);

  const filteredBankList = daftarBank.filter((bank) => {
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

  // Ambil kolom periode TERBARU (paling kanan, karena columns sudah lama->baru)
  const kolomTerbaru = bankData?.columns?.[bankData.columns.length - 1] || null;

  // Rasio-rasio kunci dari periode terbaru, buat ditampilkan di kartu
  const rasioKunci = kolomTerbaru
    ? Object.entries(kolomTerbaru.val_000003 || {})
        .filter(([label]) => RATIO_DISPLAY_RULES.some((r) => r.keyword.test(label)))
        .map(([label, data]) => ({ label, nilai: data.nilai, bermasalah: cekRasioBermasalah(label, data.nilai) }))
    : [];

  const asetTerbaru = kolomTerbaru?.val_000001?.["total aset"]?.nilai ?? null;
  const labaTerbaru = kolomTerbaru?.val_000002?.["jumlah laba (rugi) tahun berjalan"]?.nilai ?? null;

  const belumLaporFiltered = (trackerData?.belum_lapor || []).filter((b) =>
    (b.nama_bank || '').toLowerCase().includes(searchBelumLapor.toLowerCase()) ||
    (b.id_bank || '').toLowerCase().includes(searchBelumLapor.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* HEADER - selaras dengan Home.jsx */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1400px] mx-auto w-full flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Infor BPR-<span className="text-blue-600">Data N/A</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alert & Kelengkapan Laporan</p>
            </div>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Kembali</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 flex flex-col gap-6">

        {/* ============================================================
            PANEL SUBMISSION TRACKER
           ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <ClipboardList className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Kelengkapan Laporan (Submission Tracker)</h2>
                {trackerData?.periode_label && (
                  <p className="text-xs text-slate-500">
                    Periode terbaru: <span className="font-semibold text-slate-700">{trackerData.periode_label}</span>
                    {' '}— dibandingkan dengan {trackerData.periode_sebelumnya_label}
                  </p>
                )}
              </div>
            </div>

            {trackerData?.persentase_kelengkapan !== null && trackerData?.persentase_kelengkapan !== undefined && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">{trackerData.persentase_kelengkapan}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelengkapan</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-600">{trackerData.total_sudah_lapor}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sudah Upload</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-rose-500">{trackerData.total_belum_lapor}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belum Upload</div>
                </div>
              </div>
            )}
          </div>

          {loadingTracker ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !trackerData || trackerData.total_baseline_periode_sebelumnya === 0 ? (
            <EmptyState icon={ClipboardList} text="Belum ada cukup data periode untuk dibandingkan." />
          ) : trackerData.belum_lapor.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Semua bank yang biasanya lapor sudah submit periode ini." />
          ) : (
            <div className="p-5">
              <div className="relative mb-4 max-w-sm">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari bank yang belum lapor..."
                  value={searchBelumLapor}
                  onChange={(e) => setSearchBelumLapor(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">ID Bank</th>
                      <th className="p-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Nama Bank</th>
                      <th className="p-3 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {belumLaporFiltered.map((bank) => (
                      <tr key={bank.id_bank} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-500">{bank.id_bank}</td>
                        <td className="p-3 font-semibold text-slate-700">{bank.nama_bank}</td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                            <XCircle size={12} /> Belum Upload
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            PANEL ALERT & THRESHOLD WARNING
           ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center gap-3">
            <div className="bg-rose-50 p-2 rounded-lg">
              <ShieldAlert className="text-rose-600" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Watchlist — Bank dengan Indikator Bermasalah</h2>
              <p className="text-xs text-slate-500">
                Dihitung dari periode terbaru masing-masing bank. Ambang batas bersifat contoh, sesuaikan dengan ketentuan yang berlaku.
              </p>
            </div>
          </div>

          {loadingAlert ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : alertData.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Tidak ada bank yang menembus ambang batas saat ini." />
          ) : (
            <div className="divide-y divide-slate-100">
              {alertData.map((bank) => {
                const sev = SEVERITY_STYLE[bank.severity_tertinggi] || SEVERITY_STYLE.low;
                return (
                  <div key={bank.id_bank} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Building2 size={18} className="text-slate-400" />
                        <div>
                          <span className="font-bold text-slate-800">{bank.nama_bank}</span>
                          <span className="text-xs text-slate-400 ml-2 font-mono">{bank.id_bank}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{bank.periode_label}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${sev.badge}`}>
                          {sev.label} · {bank.jumlah_alert} Alert
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pl-7">
                      {bank.alerts.map((alert, idx) => {
                        const s = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.low;
                        return (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
                            <span className="text-slate-600">{alert.pesan}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}