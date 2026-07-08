import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Landmark, PiggyBank, TrendingUp, Building2, ArrowLeft,
  BarChart2, PieChart as PieChartIcon, Activity, Search, CalendarDays
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { api } from '../api';


// Cari value di dalam objek val_000001 / val_000003 (hasil mapValuesWithTrend di BE)
// berdasarkan beberapa regex yang harus SEMUA cocok dengan key label-nya.
// Dipakai karena nama label persis dari OJK suka beda-beda redaksionalnya

// ==========================================
// 1. FORMATTERS & UTILS
// ==========================================
// ==========================================
// 1. FORMATTERS & UTILS
// ==========================================
const formatRupiah = (angka) => `Rp ${Number(angka).toLocaleString('id-ID')}`;
const formatMilyar = (angka) => `${(angka / 1000000000).toFixed(1)}M`;
const formatPersen = (angka) => `${Number(angka).toFixed(2)}%`;

// FUNGSI BARU: Pemotong teks label OJK biar muat di Chart
const shortenLabel = (label) => {
  if (!label) return "";
  const str = label.toLowerCase();

  if (str.includes('kpmm')) return 'KPMM';
  if (str.includes('npl') && str.includes('gross')) return 'NPL Gross';
  if (str.includes('npl') && str.includes('net')) return 'NPL Net';
  if (str.includes('roa')) return 'ROA';
  if (str.includes('roe')) return 'ROE';
  if (str.includes('nim')) return 'NIM';
  if (str.includes('bopo')) return 'BOPO';
  if (str.includes('cash ratio')) return 'Cash Ratio';
  if (str.includes('ldr') || str.includes('loan to deposit')) return 'LDR';
  if (str.includes('rasio')) return 'ckpn/ppka'

  // Fallback: hapus awalan abjad (contoh "a. ", "b. ") dan ambil 3 kata pertama aja
  const clean = str.replace(/^[a-z]\.\s*/i, '').trim();
  const words = clean.split(' ');
  return words.length > 3 ? words.slice(0, 3).join(' ') + '...' : clean;
};

// INI FUNGSI ASLINYA, JANGAN PAKAI TITIK TIGA (...)
const findValByPattern = (obj, patterns = []) => {
  if (!obj) return null;
  const key = Object.keys(obj).find((k) => patterns.every((p) => p.test(k)));
  if (!key) return null;
  const v = obj[key]?.nilai;
  return (v === null || v === undefined) ? null : Number(v);
};
// ==========================================
// 2. REUSABLE COMPONENT: BANK PANEL
// ==========================================
const BankPanel = ({ data }) => {
  if (!data) return (
    <div className="bg-white/50 border border-dashed border-slate-300 rounded-2xl h-[600px] flex flex-col items-center justify-center text-slate-400">
      <Search size={48} className="mb-4 text-slate-300" />
      <p className="font-bold">Belum ada entitas yang dipilih</p>
      <p className="text-sm">Gunakan kolom pencarian di atas</p>
    </div>
  );

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-sm">
          <p className="font-bold text-slate-700 mb-1">{data.name}</p>
          <p className="text-blue-600 font-mono">{formatRupiah(data.value)}</p>
          {data.persen !== undefined && (
            <p className="text-slate-400 text-xs mt-0.5">{data.persen}% dari total</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomRasioTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-sm">
          <p className="font-bold text-slate-700 mb-1">{d.name}</p>
          <p className="text-blue-600 font-mono">{formatPersen(d.value)}</p>
        </div>
      );
    }
    return null;
  };

  const chartColorsRasio = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-xl"><Building2 className="text-slate-600" size={28} /></div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{data.nama}</h2>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mt-1">Status: Normal</p>
        </div>
        {data.periode_label && (
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold">
            <CalendarDays size={14} /> {data.periode_label}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2"><Wallet size={16} /> <span className="text-xs font-bold uppercase">Total Aset</span></div>
          <div className="text-lg font-bold text-slate-800 font-mono">{formatRupiah(data.kpi.aset)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2"><Landmark size={16} /> <span className="text-xs font-bold uppercase">Kredit (OS)</span></div>
          <div className="text-lg font-bold text-slate-800 font-mono">{formatRupiah(data.kpi.kredit)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2"><PiggyBank size={16} /> <span className="text-xs font-bold uppercase">Total DPK</span></div>
          <div className="text-lg font-bold text-slate-800 font-mono">{formatRupiah(data.kpi.dpk)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2"><TrendingUp size={16} /> <span className="text-xs font-bold uppercase">Laba Bersih</span></div>
          <div className="text-lg font-bold text-emerald-600 font-mono">{formatRupiah(data.kpi.laba)}</div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><BarChart2 size={18} className="text-blue-500" /> Portofolio & Kolektibilitas</h3>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${data.npl_gross > 5 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              NPL Gross: {data.npl_gross}%
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${data.npl_net > 5 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              NPL Net: {data.npl_net !== null ? `${data.npl_net}%` : '-'}
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.kredit} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatMilyar} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(val) => formatRupiah(val)} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {data.kredit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm mb-2"><PieChartIcon size={18} className="text-purple-500" /> Komposisi DPK</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.dpk} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                  label={({ persen }) => `${persen}%`}
                  labelLine={false}
                >
                  {data.dpk.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm mb-4"><Activity size={18} className="text-amber-500" /> BOPO vs Laba</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.kinerja} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={formatMilyar} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={formatPersen} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val, name) => name === 'BOPO (%)' ? formatPersen(val) : formatRupiah(val)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar yAxisId="left" dataKey="laba_bersih" name="Laba Bersih" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="bopo" name="BOPO (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TAMBAHAN: 2 chart rasio, dipecah otomatis berdasarkan besar nilainya
          Chart 1 -> rasio dengan nilai < 50%  (mis. KPMM, NPL, ROA, Cash Ratio, LDR biasanya di sini)
          Chart 2 -> rasio dengan nilai >= 50% (mis. BOPO biasanya di sini) */}
      {/* ======================================================== */}
      {/* PERBAIKAN LAYOUT: Diubah jadi flex-col biar FULL WIDTH */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* RASIO BANK - TREN 5 KUARTAL BERJEJER (BATANG)              */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-6">

        {/* CHART RASIO < 50% */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm mb-4">
            <Activity size={18} className="text-emerald-500" /> RASIO KPMM,CASHRATIO,NIM,ROAL
          </h3>
          <div className="h-72">
            {data.rasio_bawah_50_data && data.rasio_bawah_50_keys.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.rasio_bawah_50_data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatPersen} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />

                  <Tooltip
                    formatter={(val) => formatPersen(val)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />

                  {/* Render garis dinamis per rasio */}
                  {data.rasio_bawah_50_keys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={chartColorsRasio[i % chartColorsRasio.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 0, fill: chartColorsRasio[i % chartColorsRasio.length] }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Tidak ada data rasio &lt; 50%</div>
            )}
          </div>
        </div>

        {/* CHART RASIO >= 50% */}
        <div className="h-72">
          {data.rasio_atas_50_data && data.rasio_atas_50_keys.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rasio_atas_50_data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatPersen} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => formatPersen(val)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />

                {/* Warna disilang dikit dari chart atasnya biar estetik */}
                {data.rasio_atas_50_keys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={chartColorsRasio[(i + 3) % chartColorsRasio.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 0, fill: chartColorsRasio[(i + 3) % chartColorsRasio.length] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">Tidak ada data rasio &ge; 50%</div>
          )}
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGE: KOMPARASI BPR
// ==========================================
export default function CompareBPR() {
  const [daftarBank, setDaftarBank] = useState([]);

  // State untuk Bank A
  const [searchTermA, setSearchTermA] = useState("");
  const [filteredBanksA, setFilteredBanksA] = useState([]);
  const [showDropdownA, setShowDropdownA] = useState(false);
  const [dataBankA, setDataBankA] = useState(null);

  // State untuk Bank B
  const [searchTermB, setSearchTermB] = useState("");
  const [filteredBanksB, setFilteredBanksB] = useState([]);
  const [showDropdownB, setShowDropdownB] = useState(false);
  const [dataBankB, setDataBankB] = useState(null);

  // Ambil list BPR saat komponen dimuat
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    api('/api/bpr-list', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })

      .then(result => { if (result.success) setDaftarBank(result.data); })
      .catch(err => console.error("Error fetch list:", err));
  }, []);

  // Fungsi Parser untuk mengubah data API mentah menjadi format MOCK yang dibutuhkan Chart
  const fetchAndParseData = async (id_bank, setBankDataState) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await api(`/api/bpr/${id_bank}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });


      if (res.success && res.data) {
        const raw = res.data;
        const latest = raw.columns[0]; // Kuartal terakhir

        // --- LOGIKA KALKULASI MANUAL KARENA FORMAT OJK ---

        // 1. Hitung Total DPK (Tabungan + Deposito)
        const tabungan = latest.val_000001["a. tabungan"]?.nilai || 0;
        const deposito = latest.val_000001["b. deposito"]?.nilai || 0;
        const totalDpkOjk = tabungan + deposito;

        // 1b. TAMBAHAN: Simpanan dari bank lain & Pinjaman yang diterima
        // Dicari pakai pattern-matching karena redaksi label OJK suka bervariasi
        const simpananBankLain = findValByPattern(latest.val_000001, [/simpanan/i, /bank lain/i]) || 0;
        const pinjamanDiterima = findValByPattern(latest.val_000001, [/pinjaman/i, /diterima/i]) || 0;

        // 2. Hitung Total Kredit (Pihak Terkait + Tidak Terkait)
        const kreditTerkait = latest.val_000003["c. kepada non bank - pihak terkait"]?.nilai || 0;
        const kreditTidakTerkait = latest.val_000003["d. kepada non bank - pihak tidak terkait"]?.nilai || 0;
        const totalKreditOjk = kreditTerkait + kreditTidakTerkait;

        // 3. Ambil baris "jumlah aset produktif" untuk mendapatkan data rincian NPL yang akurat
        const barisKolektibilitas = raw.latest_000003.find(x => x.label_bersih === 'jumlah aset produktif') || {};

        // 4. TAMBAHAN: NPL Net (di samping NPL Gross yang sudah ada)
        // 4. PERBAIKAN: NPL Net (Cari key pastinya dulu, kalau gagal baru pakai pattern)
        const nplNet = latest.val_000003["e. non performing loan (npl) net"]?.nilai
          ?? findValByPattern(latest.val_000003, [/npl/i, /net/i]);

        // 5. PERBAIKAN: Pecah rasio & gunakan fungsi shortenLabel
        // 5. PERBAIKAN: Rasio Bank Historis (5 Kuartal Terakhir)
        const labelsRasio = raw.labels_000003_rasio || [];
        const columns5 = raw.columns.slice(0, 5).reverse(); // 5 kuartal (lama -> baru)

        const trendRasioBawah = [];
        const trendRasioAtas = [];
        const keysBawah = new Set();
        const keysAtas = new Set();

        columns5.forEach(col => {
          // Format periode misal: Q1 '25, Q1 '26
          const periode = `Q${col.triwulan} '${col.tahun.toString().substr(2)}`;
          const itemBawah = { periode };
          const itemAtas = { periode };

          labelsRasio.forEach(label => {
            const lowerLabel = label.toLowerCase();
            if (lowerLabel.includes('non performing loan') || lowerLabel.includes('npl')) {
              return;
            }
            const val = col.val_000003?.[label]?.nilai;
            if (val !== null && val !== undefined && !Number.isNaN(Number(val))) {
              const numVal = Number(val);
              const shortName = shortenLabel(label); // Pakai fungsi pemendek lu

              // Cek nilai kuartal TERBARU buat nentuin dia masuk grup <50 atau >=50
              // Biar konsisten dari kuartal ke kuartal dia gak lompat-lompat chart
              const latestVal = latest.val_000003?.[label]?.nilai;
              const latestNum = Number(latestVal);

              if (latestNum < 50) {
                itemBawah[shortName] = numVal;
                keysBawah.add(shortName);
              } else {
                itemAtas[shortName] = numVal;
                keysAtas.add(shortName);
              }
            }
          });

          trendRasioBawah.push(itemBawah);
          trendRasioAtas.push(itemAtas);
        });

        // 6. Persentase komposisi DPK (tabungan, deposito, simpanan bank lain, pinjaman diterima)
        const totalDpkChart = tabungan + deposito + simpananBankLain + pinjamanDiterima;
        const pct = (v) => (totalDpkChart > 0 ? ((v / totalDpkChart) * 100).toFixed(1) : '0.0');

        // --- PETA DATA REAL KE FORMAT KOMPONEN KITA ---
        const parsedData = {
          nama: raw.nama_bank,
          periode_label: `Q${latest.triwulan} ${latest.tahun}`, // TAMBAHAN: label periode yang sedang ditampilkan
          kpi: {
            aset: latest.val_000001["total aset"]?.nilai || 0,
            kredit: totalKreditOjk, // Menggunakan hasil kalkulasi
            dpk: totalDpkOjk,       // Menggunakan hasil kalkulasi
            laba: latest.val_000002["jumlah laba (rugi) tahun berjalan"]?.nilai || 0
          },
          npl_gross: latest.val_000003["d. non performing loan (npl) gross"]?.nilai || 0,
          npl_net: nplNet, // TAMBAHAN

          // Menggunakan barisKolektibilitas (Jumlah Aset Produktif)
          kredit: [
            { name: "Lancar", value: barisKolektibilitas.kolom_L || 0, color: "#10b981" },
            { name: "DPK", value: barisKolektibilitas.kolom_DPK || 0, color: "#eab308" },
            { name: "Kurang Lancar", value: barisKolektibilitas.kolom_KL || 0, color: "#f97316" },
            { name: "Diragukan", value: barisKolektibilitas.kolom_D || 0, color: "#ef4444" },
            { name: "Macet", value: barisKolektibilitas.kolom_M || 0, color: "#b91c1c" }
          ],

          dpk: [
            { name: "Tabungan", value: tabungan, color: "#3b82f6", persen: pct(tabungan) },
            { name: "Deposito", value: deposito, color: "#8b5cf6", persen: pct(deposito) },
            { name: "Simpanan Bank Lain", value: simpananBankLain, color: "#06b6d4", persen: pct(simpananBankLain) },
            { name: "Pinjaman Diterima", value: pinjamanDiterima, color: "#f43f5e", persen: pct(pinjamanDiterima) }
          ],

          // TAMBAHAN: dua kelompok rasio untuk 2 chart baru
          rasio_bawah_50_data: trendRasioBawah,
          rasio_bawah_50_keys: Array.from(keysBawah),
          rasio_atas_50_data: trendRasioAtas,
          rasio_atas_50_keys: Array.from(keysAtas),

          // Ambil 4 kuartal terakhir dan balik posisinya (lama -> terbaru)
          kinerja: raw.columns.slice(0, 4).reverse().map(col => ({
            periode: `Q${col.triwulan} ${col.tahun.toString().substr(2)}`,
            laba_bersih: col.val_000002["jumlah laba (rugi) tahun berjalan"]?.nilai || 0,
            bopo: col.val_000003["f. biaya operasional terhadap pendapatan operasional (bopo)"]?.nilai || 0
          }))
        };

        setBankDataState(parsedData);
      }
    } catch (err) {
      console.error("Gagal parse data bank:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

      {/* HEADER NAVBAR */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm shrink-0 sticky top-0">
        <div className="px-6 py-4 flex justify-between items-center gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><Building2 className="text-white" size={24} /></div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Info BPR-<span className="text-indigo-600">Compare</span></h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Head-to-Head Analytics</p>
            </div>
          </div>
          <div>
            <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100 hover:bg-indigo-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-indigo-100">
              <ArrowLeft size={18} /> <span className="hidden sm:inline">Kembali ke Matrix</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN KONTEN 50:50 GRID */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">

          {/* KOLOM KIRI (BANK A) */}
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between border-b-2 border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Entitas 01</span>
                {dataBankA?.periode_label && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {dataBankA.periode_label}
                  </span>
                )}
              </div>
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            </div>

            {/* SEARCH BANK A */}
            <div className="relative w-full mb-6">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text" placeholder="Cari BPR Pertama..."
                value={searchTermA}
                onChange={(e) => {
                  setSearchTermA(e.target.value);
                  setFilteredBanksA(daftarBank.filter(b => (b.nama_bank || "").toLowerCase().includes(e.target.value.toLowerCase())));
                  setShowDropdownA(e.target.value.length > 0);
                }}
                className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
              {showDropdownA && (
                <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl overflow-auto border border-slate-100">
                  {filteredBanksA.map(bank => (
                    <li key={bank.id_bank} onClick={() => {
                      setSearchTermA(bank.nama_bank);
                      setShowDropdownA(false);
                      fetchAndParseData(bank.id_bank, setDataBankA);
                    }} className="cursor-pointer p-3 hover:bg-blue-50 border-b border-slate-50 font-medium">
                      {bank.id_bank} - {bank.nama_bank}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <BankPanel data={dataBankA} />
          </div>

          {/* KOLOM KANAN (BANK B) */}
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between border-b-2 border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Entitas 02 (Pembanding)</span>
                {dataBankB?.periode_label && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    {dataBankB.periode_label}
                  </span>
                )}
              </div>
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
            </div>

            {/* SEARCH BANK B */}
            <div className="relative w-full mb-6">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text" placeholder="Cari BPR Pembanding..."
                value={searchTermB}
                onChange={(e) => {
                  setSearchTermB(e.target.value);
                  setFilteredBanksB(daftarBank.filter(b => (b.nama_bank || "").toLowerCase().includes(e.target.value.toLowerCase())));
                  setShowDropdownB(e.target.value.length > 0);
                }}
                className="w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
              {showDropdownB && (
                <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl overflow-auto border border-slate-100">
                  {filteredBanksB.map(bank => (
                    <li key={bank.id_bank} onClick={() => {
                      setSearchTermB(bank.nama_bank);
                      setShowDropdownB(false);
                      fetchAndParseData(bank.id_bank, setDataBankB);
                    }} className="cursor-pointer p-3 hover:bg-indigo-50 border-b border-slate-50 font-medium">
                      {bank.id_bank} - {bank.nama_bank}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <BankPanel data={dataBankB} />
          </div>

        </div>
      </main>
    </div>
  );
}