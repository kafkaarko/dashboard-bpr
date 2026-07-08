import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Filter, Search, ArrowUpDown, LayoutList, ShoppingBasket, CheckCircle2, X, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getBucket, addToBucket, removeFromBucket, clearBucket } from './utils/BucketStore';

const formatRupiah = (angka) => {
  if (angka === null || angka === undefined) return "-";
  if (angka === 0) return "Rp 0";
  return `Rp ${Number(angka).toLocaleString('id-ID')}`;
};

const formatPersen = (angka) => {
  if (angka === null || angka === undefined) return "-";
  return `${Number(angka).toFixed(2)}%`;
};

// Chip filter cepat, threshold-nya SAMA dengan ALERT_RULES di backend (bprController.js).
// Kalau backend diubah, samakan juga di sini biar konsisten.
const QUICK_FILTERS = [
  { key: 'kpmm', label: 'KPMM < 8%', test: (row) => row.kpmm !== null && row.kpmm < 8 },
  { key: 'npl', label: 'NPL > 5%', test: (row) => row.npl !== null && row.npl > 5 },
  { key: 'roa', label: 'ROA Negatif', test: (row) => row.roa !== null && row.roa < 0 },
  { key: 'bopo', label: 'BOPO > 94%', test: (row) => row.bopo !== null && row.bopo > 94 },
  { key: 'cash_ratio', label: 'Cash Ratio < 4.05%', test: (row) => row.cash_ratio !== null && row.cash_ratio < 4.05 },
  { key: 'ldr', label: 'LDR > 94%', test: (row) => row.ldr !== null && row.ldr > 94 },
  { key: 'alert', label: 'Ada Alert', test: (row) => row.jumlah_alert > 0 },
];

const COLUMNS = [
  { key: 'nama_bank', label: 'Nama Bank', align: 'left' },
  { key: 'aset', label: 'Total Aset', align: 'right', format: formatRupiah },
  { key: 'laba', label: 'Laba/Rugi', align: 'right', format: formatRupiah },
  { key: 'kpmm', label: 'KPMM', align: 'right', format: formatPersen },
  { key: 'npl', label: 'NPL', align: 'right', format: formatPersen },
  { key: 'roa', label: 'ROA', align: 'right', format: formatPersen },
  { key: 'bopo', label: 'BOPO', align: 'right', format: formatPersen },
  { key: 'cash_ratio', label: 'Cash Ratio', align: 'right', format: formatPersen },
  { key: 'ldr', label: 'LDR', align: 'right', format: formatPersen },
  { key: 'jumlah_alert', label: 'Alert', align: 'right' },
];

export default function Screener() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeChips, setActiveChips] = useState([]); // array of QUICK_FILTERS keys
  const [sortConfig, setSortConfig] = useState({ key: 'aset', direction: 'desc' });

  // --- STATE UNTUK KERANJANG (BUCKET) ---
  // "Petik" bank yang menarik ke sini, kayak metik buah, biar bisa diolah/dibandingkan
  // di satu tempat. Disimpan ke localStorage biar gak ilang pas refresh.
  const [bucket, setBucket] = useState([]);
  const [showBucket, setShowBucket] = useState(false);

  useEffect(() => {
    setBucket(getBucket());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    // 1. Ambil data keranjang saat ini untuk diambil list ID-nya
    const currentBucket = getBucket();
    const idsParam = currentBucket.map(item => item.id_bank).join(',');

    // 2. Kirim list ID lewat query parameter '?ids='
    api(`/api/screener?ids=${idsParam}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((result) => {
        if (result.success) setData(result.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal ambil data screener:", err);
        setLoading(false);
        if (err.message && err.message.includes('401')) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      });
  }, [navigate]);

  const toggleChip = (key) => {
    setActiveChips((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const isPicked = (idBank) => bucket.some((b) => b.id_bank === idBank);

  const toggleBucketRow = (row) => {
    if (isPicked(row.id_bank)) {
      setBucket(removeFromBucket(row.id_bank));
    } else {
      setBucket(addToBucket(row));
    }
  };

  const handleRemoveFromBucket = (idBank) => {
    setBucket(removeFromBucket(idBank));
  };

  const handleClearBucket = () => {
    setBucket(clearBucket());
  };

  const hasilFilter = useMemo(() => {
    let rows = data.filter((row) =>
      (row.nama_bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.id_bank || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    activeChips.forEach((chipKey) => {
      const chip = QUICK_FILTERS.find((c) => c.key === chipKey);
      if (chip) rows = rows.filter(chip.test);
    });

    const { key, direction } = sortConfig;
    rows = [...rows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') {
        return direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return direction === 'asc' ? va - vb : vb - va;
    });

    return rows;
  }, [data, searchTerm, activeChips, sortConfig]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1400px] mx-auto w-full flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutList className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Info BPR-<span className="text-blue-600">MONITORING</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {loading ? 'Memuat...' : `${hasilFilter.length} dari ${data.length} bank ditampilkan`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TOMBOL BUKA KERANJANG */}
            <button
              onClick={() => setShowBucket(true)}
              className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-100"
            >
              <ShoppingBasket size={18} />
              <span className="hidden sm:inline">wacthlist</span>
              {bucket.length > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {bucket.length}
                </span>
              )}
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

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 flex flex-col gap-4">

        {/* FILTER PANEL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau ID bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              <Filter size={13} /> Filter Cepat:
            </span>
            {QUICK_FILTERS.map((chip) => {
              const active = activeChips.includes(chip.key);
              return (
                <button
                  key={chip.key}
                  onClick={() => toggleChip(chip.key)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
            {activeChips.length > 0 && (
              <button
                onClick={() => setActiveChips([])}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* TABEL SCREENER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : hasilFilter.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={36} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Tidak ada bank yang cocok dengan filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10"></th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`p-3 font-bold text-slate-600 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortConfig.key === col.key && <ArrowUpDown size={11} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hasilFilter.map((row) => {
                    const picked = isPicked(row.id_bank);
                    return (
                    <tr key={row.id_bank} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => toggleBucketRow(row)}
                          title={picked ? "Keluarkan dari wacthlist" : "Petik ke wacthlist"}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            picked
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200'
                          }`}
                        >
                          {picked ? <CheckCircle2 size={16} /> : <ShoppingBasket size={16} />}
                        </button>
                      </td>
                      <td className="p-3">
                        <Link to={`/laporan/${row.id_bank}`} className="font-bold text-slate-800 hover:text-blue-600">
                          {row.nama_bank}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-mono">{row.id_bank} · {row.periode_label}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">{formatRupiah(row.aset)}</td>
                      <td className={`p-3 text-right font-mono ${row.laba < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatRupiah(row.laba)}</td>
                      <td className={`p-3 text-right font-mono ${row.kpmm !== null && row.kpmm < 8 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.kpmm)}</td>
                      <td className={`p-3 text-right font-mono ${row.npl !== null && row.npl > 5 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.npl)}</td>
                      <td className={`p-3 text-right font-mono ${row.roa !== null && row.roa < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.roa)}</td>
                      <td className={`p-3 text-right font-mono ${row.bopo !== null && row.bopo > 94 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.bopo)}</td>
                      <td className={`p-3 text-right font-mono ${row.cash_ratio !== null && row.cash_ratio < 4.05 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.cash_ratio)}</td>
                      <td className={`p-3 text-right font-mono ${row.ldr !== null && row.ldr > 94 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatPersen(row.ldr)}</td>
                      <td className="p-3 text-right">
                        {row.jumlah_alert > 0 ? (
                          <span className="inline-flex text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                            {row.jumlah_alert}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          TOMBOL MENGAMBANG + PANEL KERANJANG (drawer sendiri)
         ========================================== */}
      {!showBucket && bucket.length > 0 && (
        <button
          onClick={() => setShowBucket(true)}
          className="fixed bottom-6 right-6 z-[90] bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-200 px-5 py-3.5 flex items-center gap-2 font-bold text-sm transition-all"
        >
          <ShoppingBasket size={18} />
          Lihat wacthlist
          <span className="bg-white text-emerald-700 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
            {bucket.length}
          </span>
        </button>
      )}

      {showBucket && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowBucket(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBasket size={18} className="text-emerald-600" /> wacthlist BPR
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{bucket.length} bank dipilih</p>
              </div>
              <button onClick={() => setShowBucket(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {bucket.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                  <ShoppingBasket size={40} className="mb-3 text-slate-300" />
                  <p className="text-sm font-medium">wacthlist masih kosong</p>
                  <p className="text-xs mt-1 max-w-[220px]">Klik ikon wacthlist di setiap baris tabel untuk memetik bank ke sini</p>
                </div>
              ) : (
                bucket.map((item) => (
                  <div key={item.id_bank} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/laporan/${item.id_bank}`} className="font-bold text-sm text-slate-800 hover:text-blue-600 truncate block">
                        {item.nama_bank}
                      </Link>
                      <div className="text-[10px] text-slate-400 font-mono">{item.id_bank} {item.periode_label ? `· ${item.periode_label}` : ''}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-500">
                        <span>Aset: {formatRupiah(item.aset)}</span>
                        <span>NPL: {formatPersen(item.npl)}</span>
                        <span>KPMM: {formatPersen(item.kpmm)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromBucket(item.id_bank)}
                      title="Keluarkan dari wachtlist"
                      className="text-slate-300 hover:text-rose-500 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {bucket.length > 0 && (
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={handleClearBucket}
                  className="w-full text-xs font-bold text-rose-500 hover:text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl py-2.5 transition-colors"
                >
                  Kosongkan wachtlist
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}