const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');
const fs = require('fs');       // Modul bawaan Node.js untuk baca folder
const path = require('path');   // Modul bawaan Node.js untuk susun rute file


// --- ENDPOINT 1: AMBIL DAFTAR BANK UNIK ---
 const getUniqueBank = async (req, res) => {
  try {
    const daftarBank = await prisma.laporan_keuangan_bpr.findMany({
      select: { id_bank: true, nama_bank: true },
      distinct: ['id_bank'],
      orderBy: { nama_bank: 'asc' }
    });
    res.json({ success: true, data: daftarBank });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database Error' });
  }
};

// --- ENDPOINT 2: AMBIL DATA & RAKIT OTOMATIS UNTUK SPLIT SCREEN ---
// --- ENDPOINT 2: FORMAT DATA MATRIX + KALKULASI TREN OTOMATIS ---
// --- ENDPOINT 2: FORMAT DATA MATRIX + KALKULASI TREN OTOMATIS ---
 const getMatrixAndCalculate =  async (req, res) => {
  const { id_bank } = req.params;
  try {
    const dataBpr = await prisma.laporan_keuangan_bpr.findMany({
      where: { id_bank: id_bank },
      orderBy: [
        { periode_tahun: 'desc' },
        { periode_bulan: 'desc' }
      ]
    });

    if (!dataBpr || dataBpr.length === 0) {
      return res.json({ success: true, data: null });
    }

    // 1. Kumpulkan semua label unik
    const getLabels = (kode) => {
      return [...new Set(dataBpr.flatMap(row => 
        (row.data_keuangan?.[kode] || []).map(x => x.label_bersih || x.label_asli)
      ))]; 
    };

    const labels_000001 = getLabels("000001");
    const labels_000002 = getLabels("000002");
    const labels_000004 = getLabels("000004"); // <--- [TAMBAHAN 1] Ambil label 000004
    
    // Pisahkan Label 000003 menjadi dua: Nominal vs Rasio
    const allLabels_000003 = getLabels("000003");
    const regexRasio = /rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i;
    
    const labels_000003_nominal = allLabels_000003.filter(l => !l.match(regexRasio));
    const labels_000003_rasio = allLabels_000003.filter(l => l.match(regexRasio));

    // 2. Susun data jejeran triwulan + HITUNG TREN
    const columns = dataBpr.map((row, index) => {
      const dk = row.data_keuangan || {};
      const prevRow = dataBpr[index + 1] || null; 
      const prevDk = prevRow ? prevRow.data_keuangan : {};

      const mapValuesWithTrend = (arrNow, arrPrev) => {
        const res = {};
        if (Array.isArray(arrNow)) {
          arrNow.forEach(item => {
            const label = item.label_bersih || item.label_asli;
            
            // CEK APAKAH INI BARIS RASIO
            const isRatio = label.match(/rasio|kpmm|npl|roa|bopo|nim|ldr|cash ratio/i);

            // LOGIKA PINTAR: Curi angka dari kolom_L jika nilai Jumlah-nya 0/kosong
            let valNow = item.tahun_berjalan ?? item.nilai ?? 0;
            if (isRatio && (!valNow || valNow === 0) && item.kolom_L) {
              valNow = item.kolom_L;
            }
            
            let valPrev = 0;
            if (Array.isArray(arrPrev)) {
              const prevItem = arrPrev.find(x => (x.label_bersih || x.label_asli) === label);
              if (prevItem) {
                valPrev = prevItem.tahun_berjalan ?? prevItem.nilai ?? 0;
                if (isRatio && (!valPrev || valPrev === 0) && prevItem.kolom_L) {
                  valPrev = prevItem.kolom_L;
                }
              }
            }

            let tren = 0;
            let status = "tetap";

            if (valPrev !== 0) {
              tren = ((valNow - valPrev) / Math.abs(valPrev)) * 100;
              if (tren > 0) status = "naik";
              else if (tren < 0) status = "turun";
            }

            res[label] = {
              nilai: valNow,
              tren: Math.abs(tren).toFixed(1),
              status: status
            };
          });
        }
        return res;
      };
      
      return {
        tahun: row.periode_tahun,
        bulan: row.periode_bulan,
        triwulan: row.periode_bulan / 3,
        val_000001: mapValuesWithTrend(dk["000001"], prevDk["000001"]),
        val_000002: mapValuesWithTrend(dk["000002"], prevDk["000002"]),
        val_000003: mapValuesWithTrend(dk["000003"], prevDk["000003"]),
        val_000004: mapValuesWithTrend(dk["000004"], prevDk["000004"]) // <--- [TAMBAHAN 2] Mapping val_000004
      };
    });

    // 3. Ambil data 000003, 000004 dan 000005 HANYA dari tahun/kuartal terakhir untuk tabel bawah
    const latestRecord = dataBpr[0].data_keuangan || {};

    res.json({ 
      success: true, 
      data: {
        id_bank: dataBpr[0].id_bank,
        nama_bank: dataBpr[0].nama_bank,
        latest_year: dataBpr[0].periode_tahun,
        latest_bulan: dataBpr[0].periode_bulan,
        labels_000001,
        labels_000002,
        labels_000004, // <--- [TAMBAHAN 3] Kirim label 000004 ke FE
        labels_000003_nominal, 
        labels_000003_rasio,  
        columns, 
        latest_000003: latestRecord["000003"] || [],
        latest_000004: latestRecord["000004"] || [], // <--- [TAMBAHAN 4] Kirim data terbaru 000004
        latest_000005: latestRecord["000005"] || []
      }
    });

  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data' });
  }
};

// // --- ENDPOINT 3 (BARU): DOWNLOAD FILE EXCEL ASLI ---
// // --- ENDPOINT 3 (BARU & DINAMIS): DOWNLOAD FILE EXCEL ASLI ---
//  const DownloadExcelFromFile = (req, res) => {

//   const { tahun, bulan, id_bank, kode_laporan } = req.params;

//   // 1. Konversi bulan menjadi format "Q" sesuai script Python terbarumu (3 -> Q1, 6 -> Q2)
//   const kuartalMap = { "3": "1", "6": "2", "9": "3", "12": "4" };
//   const q_label = kuartalMap[bulan] || bulan;

//   // Asumsi Path Induk: naik 1 folder dari 'ojk-backend' ke 'data_ojk'
//   const baseDataFolder = path.join(__dirname, 'data_ojk');

//   if (!fs.existsSync(baseDataFolder)) {
//     return res.status(404).send("Folder induk arsip OJK tidak ditemukan di server.");
//   }

//   // 2. Baca seluruh sub-folder kota yang ada di dalam 'data_ojk'
//   // (Ini akan mengumpulkan array seperti: ['Kab Bogor', 'Wil Kota Jakarta Barat', ...])
//   const cityFolders = fs.readdirSync(baseDataFolder, { withFileTypes: true })
//     .filter(dirent => dirent.isDirectory())
//     .map(dirent => dirent.name);

//   let foundFilePath = null;

//   // 3. RADAR PENCARI: Menyisir folder kota satu per satu
//   for (const city of cityFolders) {
//     // Susun jalur folder spesifik: data_ojk/{Nama Kota}/{Tahun}/Q{Bulan}
//     const targetFolder = path.join(baseDataFolder, city, tahun, `Q${q_label}`);
    
//     // Jika folder untuk kuartal tersebut eksis di kota ini, intip isinya
//     if (fs.existsSync(targetFolder)) {
//       const files = fs.readdirSync(targetFolder);
      
//       // Cari file yang ID Bank dan Kode Laporannya cocok
//       const targetFile = files.find(f => f.includes(`_${id_bank}_`) && f.includes(kode_laporan));
      
//       // Jika file ketemu, simpan jalurnya dan hentikan radar pencarian
//       if (targetFile) {
//         foundFilePath = path.join(targetFolder, targetFile);
//         break; 
//       }
//     }
//   }

//   // 4. Eksekusi pengiriman file
//   if (foundFilePath) {
//     // Meminta browser untuk langsung mengunduh file
//     res.download(foundFilePath); 
//   } else {
//     res.status(404).send("Dokumen Excel asli tidak ditemukan di seluruh arsip wilayah.");
//   }
// };

// --- ENDPOINT 4 (BARU): REKAPITULASI HASIL SCRAPING ---
 const scaraping = async (req, res) => {
  try {
    // 1. Suruh database mengelompokkan data berdasarkan tahun dan bulan
    const rekap = await prisma.laporan_keuangan_bpr.groupBy({
      by: ['periode_tahun', 'periode_bulan'],
      _count: {
        id_bank: true, // Menghitung ada berapa BPR yang berhasil disedot di periode tersebut
      },
      orderBy: [
        { periode_tahun: 'desc' },
        { periode_bulan: 'desc' },
      ],
    });

    // 2. Format datanya agar siap disantap Frontend
    const FORECAST_BPR_NASIONAL = 1400; // Asumsi total BPR se-Indonesia

    const formattedData = rekap.map(item => {
      const realBpr = item._count.id_bank;
      // Karena 1 BPR punya 5 file (01, 02, 03, 04, 05)
      const forecastFile = FORECAST_BPR_NASIONAL * 5; 
      const realFile = realBpr * 5; 
      
      const persentase = ((realFile / forecastFile) * 100).toFixed(1);

      return {
        triwulan_label: `Q${item.periode_bulan / 3} ${item.periode_tahun}`,
        tahun: item.periode_tahun,
        bulan: item.periode_bulan,
        real_bpr: realBpr,
        forecast_bpr: FORECAST_BPR_NASIONAL,
        real_file: realFile,
        forecast_file: forecastFile,
        persentase: Number(persentase)
      };
    });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Database Error pada Rekap:", error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data rekapitulasi' });
  }
};


 const downloadExcel =  async (req, res) => {
  const { id_bank } = req.params;
 
  try {
    // 1. Ambil SEMUA periode untuk bank ini (bukan cuma yang terakhir!)
    //    Diurutkan dari yang PALING LAMA -> PALING BARU, biar kolom Excel
    //    urutannya sama persis dengan tabel di web (kiri = lama, kanan = baru)
    const semuaPeriode = await prisma.laporan_keuangan_bpr.findMany({
      where: { id_bank: id_bank },
      orderBy: [
        { periode_tahun: 'asc' },
        { periode_bulan: 'asc' }
      ]
    });
 
    if (!semuaPeriode || semuaPeriode.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }
 
    const periodeTerakhir = semuaPeriode[semuaPeriode.length - 1];
 
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OJK Dashboard Internal';
 
    // 2. Mapping kode OJK ke Nama Sheet
    const sheetNames = {
      "000001": "Neraca",
      "000002": "Laba Rugi",
      "000003": "Rasio Bank",
      "000004": "Kontinjensi",
      "000005": "Pengurus"
    };
 
    // 3. Label yang harus dibold + di-highlight biru (SAMA PERSIS dengan isHeaderRow di web)
    const HEADER_LABELS = [
      "ASET", "LIABILITAS", "EKUITAS",
      "PENDAPATAN DAN BEBAN OPERASIONAL", "PENDAPATAN BUNGA",
      "KAP DAN RASIO", "REKENING ADMINISTRASI", "KREDIT YANG DIBERIKAN",
      "DIREKSI", "DEWAN KOMISARIS",
      "TAGIHAN KOMITMEN", "KEWAJIBAN KOMITMEN",
      "TAGIHAN KONTINJENSI", "KEWAJIBAN KONTINJENSI",
      "REKENING ADMINISTRATIF LAINNYA"
    ];
    const isHeaderLabel = (label) => label && HEADER_LABELS.includes(String(label).trim().toUpperCase());
 
    // Format "Mar-25" dari bulan+tahun, SAMA PERSIS dengan formatPeriodeExcel di web
    const formatPeriode = (bulan, tahun) => {
      const mapBulan = { 3: "Mar", 6: "Jun", 9: "Sep", 12: "Des" };
      const thShort = String(tahun).substring(2);
      return `${mapBulan[bulan] || 'B' + bulan}-${thShort}`;
    };
 
    // Style umum: header sheet biru cetar
    const applyHeaderStyle = (row) => {
      row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.height = 22;
    };
 
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
 
    // ============================================================
    // SHEET 000001 - 000004: MATRIX LABEL x PERIODE (mirip tabel web)
    // ============================================================
    ["000001", "000002", "000003", "000004"].forEach((kode) => {
      const sheet = workbook.addWorksheet(sheetNames[kode]);
 
      // Kumpulkan urutan label dari SELURUH periode (union, urut kemunculan pertama)
      const labelOrder = [];
      const seen = new Set();
      semuaPeriode.forEach((periode) => {
        const arr = periode.data_keuangan?.[kode];
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            const label = item.label_asli || item.label_bersih;
            if (label && !seen.has(label)) {
              seen.add(label);
              labelOrder.push(label);
            }
          });
        }
      });
 
      // Header kolom: "Keterangan / Pos" + 1 kolom per periode
      sheet.columns = [
        { header: 'Keterangan / Pos Akuntansi', key: 'label', width: 45 },
        ...semuaPeriode.map((periode, i) => ({
          header: formatPeriode(periode.periode_bulan, periode.periode_tahun),
          key: `p${i}`,
          width: 18,
        })),
      ];
      applyHeaderStyle(sheet.getRow(1));
      sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]; // freeze mirip sticky header/kolom di web
 
      // Isi baris
      labelOrder.forEach((label) => {
        const rowValues = { label };
        semuaPeriode.forEach((periode, i) => {
          const arr = periode.data_keuangan?.[kode] || [];
          const item = arr.find((x) => (x.label_asli || x.label_bersih) === label);
          const val = item ? (item.nilai ?? item.tahun_berjalan) : null;
          rowValues[`p${i}`] = (val === null || val === undefined) ? '-' : val;
        });
 
        const row = sheet.addRow(rowValues);
        const isHeader = isHeaderLabel(label);
 
        row.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          if (colNumber === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: isHeader ? 0 : 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            if (typeof cell.value === 'number') {
              // Format angka: pakai koma ribuan, dan tampilkan "-" untuk nilai 0 (sama seperti web)
              cell.numFmt = '#,##0;-#,##0;"-"';
            }
          }
          if (isHeader) {
            cell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2FE' } };
          }
        });
      });
 
      if (labelOrder.length === 0) {
        sheet.addRow({ label: 'Data tidak tersedia untuk sheet ini.' });
      }
    });
 
    // ============================================================
    // SHEET 000005 - PENGURUS: 4 KOLOM FLAT (mirip tabel Pengurus di web)
    // Diambil dari periode TERAKHIR saja (data pengurus tidak per-kuartal)
    // ============================================================
    const dataPengurus = periodeTerakhir.data_keuangan?.["000005"] || [];
    const sheetPengurus = workbook.addWorksheet(sheetNames["000005"]);
 
    sheetPengurus.columns = [
      { header: 'Pemegang Saham', key: 'pemegangSaham', width: 32 },
      { header: 'Ultimate Shareholders', key: 'ultimateShareholders', width: 28 },
      { header: 'Pemegang Saham Pengendali (Ya/Tidak)', key: 'pengendali', width: 30 },
      { header: 'Anggota Direksi BPR dan Anggota Dewan Komisaris BPR', key: 'direksiKomisaris', width: 40 },
    ];
    applyHeaderStyle(sheetPengurus.getRow(1));
    sheetPengurus.views = [{ state: 'frozen', ySplit: 1 }];
 
    if (dataPengurus.length === 0) {
      sheetPengurus.addRow({ pemegangSaham: 'Data pengurus tidak tersedia.' });
    } else {
      dataPengurus.forEach((item) => {
        const direksiValue =
          item["Anggota Direksi BPR dan Anggota Dewan Komisaris BPR"] ??
          item.label_asli ??
          item.label_bersih ??
          "-";
 
        const row = sheetPengurus.addRow({
          pemegangSaham: item["Pemegang Saham"] || "-",
          ultimateShareholders: item["Ultimate Shareholders"] || "-",
          pengendali: item["Pemegang Saham Pengendali (Ya/Tidak)"] || "-",
          direksiKomisaris: direksiValue,
        });
 
        const isHeader = isHeaderLabel(direksiValue);
        row.eachCell((cell) => {
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (isHeader) {
            cell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2FE' } };
          }
        });
      });
    }
 
    // 4. Kirim sebagai file Excel ke Browser
    const namaFileSafe = (periodeTerakhir.nama_bank || 'BPR').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Laporan_${namaFileSafe}_${periodeTerakhir.periode_tahun}Q${periodeTerakhir.periode_bulan / 3}.xlsx`
    );
 
    await workbook.xlsx.write(res);
    
 
  } catch (error) {
    console.error("Gagal export excel:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat membuat Excel" });
  }
};


// ================================================================
// FITUR BARU 1: ALERT & THRESHOLD WARNING (STANDAR OJK UNTUK BPR)
// ================================================================
// Referensi Angka:
// 1. KPMM: POJK No. 5/POJK.03/2015 (Minimal 12% untuk BPR)
// 2. NPL: Standar baku OJK (Maksimal 5%)
// 3. BOPO: Standar TKS BPR (Maksimal 94%)
// 4. ROA: Standar TKS BPR (Minimal 1.225% untuk predikat "Sehat")
// 5. Cash Ratio: Standar TKS Likuiditas BPR (Minimal 4.05%)
// 6. LDR: Standar batas atas likuiditas kredit BPR (94.75%)
// ================================================================

const ALERT_RULES = [
  {
    kode: 'KPMM',
    keyword: /kpmm/i,
    op: '<',
    threshold: 12,
    severity: 'high',
    pesan: (v) => `KPMM ${v.toFixed(2)}% — di bawah ambang batas minimum OJK untuk BPR (12%)`,
  },
  {
    kode: 'NPL',
    keyword: /npl/i,
    op: '>',
    threshold: 5,
    severity: 'high',
    pesan: (v) => `NPL ${v.toFixed(2)}% — melebihi batas wajar OJK (maksimal 5%)`,
  },
  {
    kode: 'BOPO',
    keyword: /bopo/i,
    op: '>',
    threshold: 94,
    severity: 'medium',
    pesan: (v) => `BOPO ${v.toFixed(2)}% — melebihi batas maksimal efisiensi operasional (94%)`,
  },
  {
    kode: 'ROA',
    keyword: /roa/i,
    op: '<',
    threshold: 1.225,
    severity: 'medium',
    pesan: (v) => `ROA ${v.toFixed(2)}% — di bawah standar "Sehat" OJK (1.225%)${v < 0 ? ', indikasi bank merugi' : ''}`,
  },
  {
    kode: 'CASH_RATIO',
    keyword: /cash ratio/i,
    op: '<',
    threshold: 4.05,
    severity: 'high',
    pesan: (v) => `Cash Ratio ${v.toFixed(2)}% — di bawah standar minimum likuiditas tunai BPR (4.05%)`,
  },
  {
    kode: 'LDR',
    keyword: /ldr/i,
    op: '>',
    threshold: 94.75,
    severity: 'low',
    pesan: (v) => `LDR ${v.toFixed(2)}% — melebihi batas toleransi likuiditas kredit (94.75%)`,
  },
];
// Cek satu nilai terhadap satu rule
const cekRule = (rule, nilai) => {
  if (nilai === null || nilai === undefined || Number.isNaN(Number(nilai))) return false;
  const v = Number(nilai);
  return rule.op === '<' ? v < rule.threshold : v > rule.threshold;
};

// Evaluasi seluruh alert untuk 1 record data_keuangan (1 bank, 1 periode)
const evaluateAlerts = (dataKeuangan) => {
  const alerts = [];
  const rasioArr = dataKeuangan?.["000003"] || [];

  rasioArr.forEach((item) => {
    const label = item.label_bersih || item.label_asli || "";
    const rule = ALERT_RULES.find((r) => r.keyword.test(label));
    if (!rule) return;

    // sama seperti logika di getMatrixAndCalculate: rasio kadang nyangkut di kolom_L
    let nilai = item.tahun_berjalan ?? item.nilai ?? null;
    if ((nilai === null || nilai === undefined || nilai === 0) && item.kolom_L) {
      nilai = item.kolom_L;
    }

    if (cekRule(rule, nilai)) {
      alerts.push({
        kode: rule.kode,
        label_asli: label,
        severity: rule.severity,
        nilai: Number(nilai),
        pesan: rule.pesan(Number(nilai)),
      });
    }
  });

  // Cek tambahan: laba rugi tahun berjalan negatif (dari sheet 000002)
  const labaArr = dataKeuangan?.["000002"] || [];
  const labaItem = labaArr.find((x) =>
    (x.label_bersih || x.label_asli || "").toLowerCase().includes('jumlah laba (rugi) tahun berjalan')
  );
  if (labaItem) {
    const nilaiLaba = Number(labaItem.tahun_berjalan ?? labaItem.nilai ?? 0);
    if (nilaiLaba < 0) {
      alerts.push({
        kode: 'LABA_RUGI',
        label_asli: labaItem.label_asli || labaItem.label_bersih,
        severity: 'high',
        nilai: nilaiLaba,
        pesan: `Bank mencatat kerugian pada periode berjalan (Rp ${nilaiLaba.toLocaleString('id-ID')})`,
      });
    }
  }

  return alerts;
};

const severityRank = { high: 0, medium: 1, low: 2 };
const severityTertinggi = (alerts) => {
  if (alerts.some((a) => a.severity === 'high')) return 'high';
  if (alerts.some((a) => a.severity === 'medium')) return 'medium';
  return 'low';
};

// --- ENDPOINT: ALERT UNTUK 1 BANK (periode terbaru bank tsb) ---
const getAlertsForBank = async (req, res) => {
  const { id_bank } = req.params;
  try {
    const latestRecord = await prisma.laporan_keuangan_bpr.findFirst({
      where: { id_bank },
      orderBy: [{ periode_tahun: 'desc' }, { periode_bulan: 'desc' }],
    });

    if (!latestRecord) {
      return res.json({ success: true, data: { id_bank, alerts: [] } });
    }

    const alerts = evaluateAlerts(latestRecord.data_keuangan);

    res.json({
      success: true,
      data: {
        id_bank: latestRecord.id_bank,
        nama_bank: latestRecord.nama_bank,
        periode_label: `Q${latestRecord.periode_bulan / 3} ${latestRecord.periode_tahun}`,
        jumlah_alert: alerts.length,
        severity_tertinggi: alerts.length ? severityTertinggi(alerts) : null,
        alerts,
      },
    });
  } catch (error) {
    console.error("Gagal menghitung alert bank:", error);
    res.status(500).json({ success: false, error: 'Gagal menghitung alert' });
  }
};

// --- ENDPOINT: RINGKASAN ALERT SEMUA BANK (watchlist, periode terbaru masing-masing) ---
const getAlertsSummary = async (req, res) => {
  try {
    // Catatan performa: query ini narik SEMUA baris lalu ambil 1 terbaru per bank
    // di memory (mirip pola getUniqueBank/scaraping yang sudah ada di file ini).
    // Kalau datanya sudah jutaan baris, ini titik pertama yang perlu dioptimasi
    // (misal pakai raw query DISTINCT ON, atau tabel snapshot terpisah).
    const semua = await prisma.laporan_keuangan_bpr.findMany({
      orderBy: [{ periode_tahun: 'desc' }, { periode_bulan: 'desc' }],
    });

    const latestPerBank = new Map();
    semua.forEach((row) => {
      if (!latestPerBank.has(row.id_bank)) {
        latestPerBank.set(row.id_bank, row);
      }
    });

    const hasil = [];
    latestPerBank.forEach((row) => {
      const alerts = evaluateAlerts(row.data_keuangan);
      if (alerts.length > 0) {
        hasil.push({
          id_bank: row.id_bank,
          nama_bank: row.nama_bank,
          periode_label: `Q${row.periode_bulan / 3} ${row.periode_tahun}`,
          jumlah_alert: alerts.length,
          severity_tertinggi: severityTertinggi(alerts),
          alerts,
        });
      }
    });

    hasil.sort(
      (a, b) =>
        severityRank[a.severity_tertinggi] - severityRank[b.severity_tertinggi] ||
        b.jumlah_alert - a.jumlah_alert
    );

    res.json({ success: true, data: hasil });
  } catch (error) {
    console.error("Gagal mengambil ringkasan alert:", error);
    res.status(500).json({ success: false, error: 'Gagal mengambil ringkasan alert' });
  }
};


// ================================================================
// FITUR BARU 2: SUBMISSION / DATA COMPLETENESS TRACKER
// ================================================================
// Logikanya: cari periode TERBARU yang ada di database (dari SELURUH
// bank), lalu bandingkan siapa saja yang sudah lapor di periode itu
// vs siapa yang lapor di periode SEBELUMNYA tapi belum muncul di
// periode terbaru. Itu yang dianggap "belum submit".
// ================================================================

const getPeriodeSebelumnya = (tahun, bulan) => {
  if (bulan <= 3) return { tahun: tahun - 1, bulan: 12 };
  return { tahun, bulan: bulan - 3 };
};

const getSubmissionTracker = async (req, res) => {
  try {
    // 1. Cari periode paling baru yang tercatat di DB
    const periodeTerbaruRow = await prisma.laporan_keuangan_bpr.findFirst({
      orderBy: [{ periode_tahun: 'desc' }, { periode_bulan: 'desc' }],
      select: { periode_tahun: true, periode_bulan: true },
    });

    if (!periodeTerbaruRow) {
      return res.json({
        success: true,
        data: { periode_label: null, sudah_lapor: [], belum_lapor: [] },
      });
    }

    const { periode_tahun, periode_bulan } = periodeTerbaruRow;
    const periodeSebelumnya = getPeriodeSebelumnya(periode_tahun, periode_bulan);

    // 2. Ambil bank yang lapor di periode terbaru
    const sudahLapor = await prisma.laporan_keuangan_bpr.findMany({
      where: { periode_tahun, periode_bulan },
      select: { id_bank: true, nama_bank: true },
      orderBy: { nama_bank: 'asc' },
    });
    const idSudahLaporSet = new Set(sudahLapor.map((b) => b.id_bank));

    // 3. Ambil bank yang lapor di periode SEBELUMNYA (baseline "yang biasanya lapor")
    const laporSebelumnya = await prisma.laporan_keuangan_bpr.findMany({
      where: { periode_tahun: periodeSebelumnya.tahun, periode_bulan: periodeSebelumnya.bulan },
      select: { id_bank: true, nama_bank: true },
      orderBy: { nama_bank: 'asc' },
    });

    // 4. Bank yang ada di periode sebelumnya tapi TIDAK ada di periode terbaru
    const belumLapor = laporSebelumnya.filter((b) => !idSudahLaporSet.has(b.id_bank));

    const totalBaseline = laporSebelumnya.length;
    const persentase = totalBaseline > 0 ? ((sudahLapor.length / totalBaseline) * 100).toFixed(1) : null;

    res.json({
      success: true,
      data: {
        periode_label: `Q${periode_bulan / 3} ${periode_tahun}`,
        periode_sebelumnya_label: `Q${periodeSebelumnya.bulan / 3} ${periodeSebelumnya.tahun}`,
        total_sudah_lapor: sudahLapor.length,
        total_baseline_periode_sebelumnya: totalBaseline,
        total_belum_lapor: belumLapor.length,
        persentase_kelengkapan: persentase ? Number(persentase) : null,
        sudah_lapor: sudahLapor,
        belum_lapor: belumLapor,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil status submission:", error);
    res.status(500).json({ success: false, error: 'Gagal mengambil status submission' });
  }
};


module.exports  = {
  getUniqueBank,
  getMatrixAndCalculate,
  downloadExcel,
//   DownloadExcelFromFile,
  scaraping,
  getAlertsForBank,
  getAlertsSummary,
  getSubmissionTracker,
}