import { useState, useEffect } from 'react';
import { ArrowLeft, Radio, RefreshCw, CalendarClock, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon size={36} className="text-slate-300 mb-3" />
    <p className="text-sm text-slate-400 font-medium">{text}</p>
  </div>
);

const formatTanggal = (isoString) => {
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export default function Broadcast() {
  const navigate = useNavigate();
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const muatBroadcast = () => {
    const token = localStorage.getItem('auth_token');
    return api('/api/broadcast', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  };

  useEffect(() => {
    setLoading(true);
    muatBroadcast()
      .then((result) => {
        if (result.success) setDaftar(result.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal ambil broadcast:", err);
        setLoading(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });
  }, [navigate]);

  const handleGenerateManual = () => {
    const token = localStorage.getItem('auth_token');
    setGenerating(true);
    api('/api/broadcast/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((result) => {
        if (result.success) {
          setDaftar((prev) => [result.data, ...prev]);
        }
        setGenerating(false);
      })
      .catch((err) => {
        console.error("Gagal generate broadcast:", err);
        setGenerating(false);
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1400px] mx-auto w-full flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Radio className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Broadcast <span className="text-blue-600">Ringkasan</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ringkasan AI Terjadwal Harian</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateManual}
              disabled={generating}
              className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 transition-colors px-4 py-2.5 rounded-xl shadow-sm"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{generating ? 'Membuat...' : 'Generate Sekarang'}</span>
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Kembali</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-6 flex flex-col gap-4">
        <p className="text-xs text-slate-500 -mt-1 mb-2">
          Ringkasan otomatis dibuat AI tiap hari jam 09:00 WIB berdasarkan bank yang menembus ambang batas peringatan.
          Tombol "Generate Sekarang" hanya untuk testing / kebutuhan mendadak di luar jadwal.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : daftar.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <EmptyState icon={Radio} text="Belum ada broadcast yang pernah dibuat." />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {daftar.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <CalendarClock size={14} />
                      {formatTanggal(item.tanggal)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.periode_label}</span>
                      {item.jumlah_bank > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100">
                          <ShieldAlert size={11} /> {item.jumlah_bank} Bank · {item.jumlah_alert} Alert
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Semua Normal
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.konten}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}