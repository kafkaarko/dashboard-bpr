// ================================================================
// UTIL: KERANJANG (BUCKET) BPR
// ================================================================
// Dipakai di Screener.jsx (buat "petik" bank satu-satu ke keranjang)
// dan Home.jsx (buat nambahin bank yang lagi dibuka ke keranjang).
// Data disimpan di localStorage biar gak hilang pas user refresh.
// ================================================================

const BUCKET_KEY = 'bpr_bucket';

export const getBucket = () => {
  try {
    const raw = localStorage.getItem(BUCKET_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca keranjang:', err);
    return [];
  }
};

const saveBucket = (items) => {
  try {
    localStorage.setItem(BUCKET_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Gagal menyimpan keranjang:', err);
  }
};

export const isInBucket = (idBank) => getBucket().some((b) => b.id_bank === idBank);

// item minimal butuh field id_bank. Field lain (nama_bank, aset, laba, kpmm,
// npl, roa, bopo, cash_ratio, ldr, jumlah_alert, periode_label) opsional,
// dipakai buat ditampilkan ringkas di panel keranjang.
export const addToBucket = (item) => {
  const bucket = getBucket();
  if (!item || !item.id_bank) return bucket;
  if (bucket.some((b) => b.id_bank === item.id_bank)) return bucket; // sudah ada, gak usah dobel
  const updated = [...bucket, { ...item, ditambahkan_pada: new Date().toISOString() }];
  saveBucket(updated);
  return updated;
};

export const removeFromBucket = (idBank) => {
  const updated = getBucket().filter((b) => b.id_bank !== idBank);
  saveBucket(updated);
  return updated;
};

export const clearBucket = () => {
  saveBucket([]);
  return [];
};