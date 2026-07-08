import React, { useState, useEffect } from 'react';
import { Database, ServerCrash, CheckCircle2, Clock, Building2, HomeIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function RekapTracker() {
  const [rekapData, setRekapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    api('/api/rekap-bpr',{
      method:'GET',
      headers: {
      // WAJIB ADA: Format harus 'Bearer <token>' sesuai ekspektasi backend-mu
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json'
    },} 
  )
    
      .then(result => {
        if (result.success) setRekapData(result.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal menarik data rekap:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6 flex justify-center">
      <div className="w-full max-w-5xl">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Database className="text-blue-600" size={32} />
            Data Tracker
          </h1>
          <p className="text-slate-500 mt-2">Pemantauan *real-time* volume dokumen OJK yang berhasil diekstraksi ke dalam *database*.</p>
          <Link 
                        to="/" 
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-100"
                      >
                        <HomeIcon size={18} />
                        <span className="hidden sm:inline">Home</span>
                      </Link>
        </div>

        {/* TABEL REKAPITULASI */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
          ) : rekapData.length === 0 ? (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center">
              <ServerCrash size={48} className="text-rose-300 mb-3" />
              <p>Belum ada data operasional yang ditarik ke dalam database.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-700 w-1/4">Periode Laporan</th>
                  <th className="p-4 font-bold text-slate-700 w-2/4">BPR Konvensional (Volume File)</th>
                  <th className="p-4 font-bold text-slate-700 w-1/4 text-center">BPR Syariah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    
                    {/* KOLOM TRIWULAN */}
                    <td className="p-4">
                      <div className="font-bold text-lg text-slate-800">{item.triwulan_label}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Building2 size={12}/> {item.real_bpr.toLocaleString('id-ID')} / {item.forecast_bpr.toLocaleString('id-ID')} Entitas Bank
                      </div>
                    </td>

                    {/* KOLOM BPR KONVENSIONAL (PROGRESS BAR) */}
                    <td className="p-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-slate-700">
                          {item.real_file.toLocaleString('id-ID')} <span className="text-slate-400 font-normal">/ {item.forecast_file.toLocaleString('id-ID')} File</span>
                        </span>
                        <span className={`text-xs font-extrabold ${item.persentase >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {item.persentase}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${item.persentase >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(item.persentase, 100)}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        {item.persentase >= 100 
                          ? <><CheckCircle2 size={12} className="text-emerald-500"/> Selesai Diekstraksi</>
                          : <><Clock size={12} className="text-amber-500"/> Sedang Berjalan...</>
                        }
                      </div>
                    </td>

                    {/* KOLOM BPR SYARIAH (NEW FEATURE PLACEHOLDER) */}
                    <td className="p-4 text-center align-middle">
                      <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-slate-200">
                        🔒 Coming Soon
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}