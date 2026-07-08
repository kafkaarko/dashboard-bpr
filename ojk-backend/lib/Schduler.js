// scheduler.js
//
// Jalankan `npm install node-cron` dulu sebelum ini dipakai.
// Lalu di entrypoint server kamu (index.js / app.js / server.js),
// tambahkan baris: require('./scheduler');
// (cukup di-require sekali, TIDAK perlu dipanggil sebagai fungsi)

const cron = require('node-cron');
const { generateBroadcastRingkasan } = require('../controller/bpr.controller');

// Jadwal: tiap hari jam 10:00 waktu Jakarta.
// Format cron: menit jam tanggal bulan hari-dalam-minggu
cron.schedule(
  '1 0 * * *',
  async () => {
    console.log('[CRON] Membuat broadcast ringkasan harian...');
    try {
      const hasil = await generateBroadcastRingkasan();
      console.log(
        `[CRON] Broadcast berhasil dibuat — ${hasil.jumlah_bank} bank kena alert, ${hasil.jumlah_alert} total alert.`
      );
    } catch (err) {
      console.error('[CRON] Gagal membuat broadcast ringkasan:', err);
    }
  },
  {
    timezone: 'Asia/Jakarta',
  }
);

console.log('[CRON] Scheduler broadcast ringkasan harian aktif (10:00 WIB).');