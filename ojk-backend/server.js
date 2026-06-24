const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');       // Modul bawaan Node.js untuk baca folder
const path = require('path');   // Modul bawaan Node.js untuk susun rute file
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const app = express();
const prisma = new PrismaClient();
const dotenv = require('dotenv')

dotenv.config()
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials:true
})); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MIDDLEWARE KEAMANAN: CEK TOKEN AKSES ---
const authMiddleware = async (req, res, next) => {
  // Ambil token dari header Authorization (Format standar: Bearer <token>)
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Akses ditolak, silakan login terlebih dahulu" });
  }

  const token = authHeader.split(' ')[1]; // Memotong kata 'Bearer '

  try {
    // Cari di database apakah ada user yang memiliki token ini
    const userExist = await prisma.user.findFirst({ where: { token: token } });
    
    if (!userExist) {
      return res.status(401).json({ success: false, message: "Sesi Anda telah berakhir, silakan login ulang" });
    }

    // Jika token valid, simpan data user ke objek request dan izinkan lanjut ke endpoint
    req.user = userExist;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan keamanan pada server" });
  }
};

// Rute untuk halaman depan API
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: "OJK Dashboard API is running perfectly on Vercel 🚀",
    version: "1.0.0"
  });
});

// --- ENDPOINT 1: AMBIL DAFTAR BANK UNIK ---
app.get('/api/bpr-list', authMiddleware, async (req, res) => {
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
});

// --- ENDPOINT 2: AMBIL DATA & RAKIT OTOMATIS UNTUK SPLIT SCREEN ---
// --- ENDPOINT 2: FORMAT DATA MATRIX + KALKULASI TREN OTOMATIS ---
// --- ENDPOINT 2: FORMAT DATA MATRIX + KALKULASI TREN OTOMATIS ---
app.get('/api/bpr/:id_bank',authMiddleware, async (req, res) => {
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
        val_000003: mapValuesWithTrend(dk["000003"], prevDk["000003"]) // Tarik utuh tanpa di-filter
      };
    });

    // 3. Ambil data 000003 dan 000005 HANYA dari tahun/kuartal terakhir untuk tabel bawah
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
        labels_000003_nominal, // Kirim ke FE
        labels_000003_rasio,   // Kirim ke FE
        columns, 
        latest_000003: latestRecord["000003"] || [],
        latest_000005: latestRecord["000005"] || []
      }
    });

  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data' });
  }
});

// --- ENDPOINT 3 (BARU): DOWNLOAD FILE EXCEL ASLI ---
// --- ENDPOINT 3 (BARU & DINAMIS): DOWNLOAD FILE EXCEL ASLI ---
app.get('/api/download/:tahun/:bulan/:id_bank/:kode_laporan',authMiddleware, (req, res) => {
  const { tahun, bulan, id_bank, kode_laporan } = req.params;

  // 1. Konversi bulan menjadi format "Q" sesuai script Python terbarumu (3 -> Q1, 6 -> Q2)
  const kuartalMap = { "3": "1", "6": "2", "9": "3", "12": "4" };
  const q_label = kuartalMap[bulan] || bulan;

  // Asumsi Path Induk: naik 1 folder dari 'ojk-backend' ke 'data_ojk'
  const baseDataFolder = path.join(__dirname, 'data_ojk');

  if (!fs.existsSync(baseDataFolder)) {
    return res.status(404).send("Folder induk arsip OJK tidak ditemukan di server.");
  }

  // 2. Baca seluruh sub-folder kota yang ada di dalam 'data_ojk'
  // (Ini akan mengumpulkan array seperti: ['Kab Bogor', 'Wil Kota Jakarta Barat', ...])
  const cityFolders = fs.readdirSync(baseDataFolder, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let foundFilePath = null;

  // 3. RADAR PENCARI: Menyisir folder kota satu per satu
  for (const city of cityFolders) {
    // Susun jalur folder spesifik: data_ojk/{Nama Kota}/{Tahun}/Q{Bulan}
    const targetFolder = path.join(baseDataFolder, city, tahun, `Q${q_label}`);
    
    // Jika folder untuk kuartal tersebut eksis di kota ini, intip isinya
    if (fs.existsSync(targetFolder)) {
      const files = fs.readdirSync(targetFolder);
      
      // Cari file yang ID Bank dan Kode Laporannya cocok
      const targetFile = files.find(f => f.includes(`_${id_bank}_`) && f.includes(kode_laporan));
      
      // Jika file ketemu, simpan jalurnya dan hentikan radar pencarian
      if (targetFile) {
        foundFilePath = path.join(targetFolder, targetFile);
        break; 
      }
    }
  }

  // 4. Eksekusi pengiriman file
  if (foundFilePath) {
    // Meminta browser untuk langsung mengunduh file
    res.download(foundFilePath); 
  } else {
    res.status(404).send("Dokumen Excel asli tidak ditemukan di seluruh arsip wilayah.");
  }
});

// --- ENDPOINT 4 (BARU): REKAPITULASI HASIL SCRAPING ---
app.get('/api/rekap-bpr',authMiddleware, async (req, res) => {
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
});

app.post('/api/login', async(req,res) => { // <-- FIX 1: Tambah garis miring (/)
  const { email, password } = req.body;
  
  // FIX 2: Ubah semua .send("...") menjadi .json({ message: "..." })
  if(!email || !password) return res.status(400).json({ message: "Semua field wajib diisi" });
    
  try {
    const userExist = await prisma.user.findUnique({ where: { email } });
    
    // Hacker suka nyari tahu email mana yang terdaftar. Sebaiknya errornya disamakan,
    // tapi kalau lu mau gini dulu buat belajar/testing, gak masalah.
    if(!userExist) return res.status(404).json({ message: "Email tidak ada, silahkan register dulu" });
    
    const passwordBcrypt = await bcrypt.compare(password, userExist.password);
    if(!passwordBcrypt) return res.status(401).json({ message: "Password tidak sama" });  
  
    const token = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: userExist.id },
      data: { token: token }
    });

    return res.status(200).json({
      message: "Login berhasil",
      token: token
    });
    
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});


// --- KODE BARU (VERCEL READY) ---
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Backend lokal berjalan di http://localhost:${PORT}`);
  });
}

// Wajib di-export agar Vercel bisa membacanya
module.exports = app;