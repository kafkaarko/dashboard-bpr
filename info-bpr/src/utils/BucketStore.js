// src/utils/bucketStore.js

const STORAGE_KEY = 'bpr_bucket';

// Ambil seluruh isi keranjang dari localStorage
export const getBucket = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca bucket:', err);
    return [];
  }
};

// Simpan seluruh array bucket ke localStorage
const saveBucket = (bucket) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bucket));
  } catch (err) {
    console.error('Gagal menyimpan bucket:', err);
  }
};

// Tambah 1 item bank ke keranjang (kalau id_bank sudah ada, replace/update datanya)
export const addToBucket = (item) => {
  if (!item || !item.id_bank) return;
  const bucket = getBucket();
  const idx = bucket.findIndex((b) => b.id_bank === item.id_bank);

  if (idx >= 0) {
    bucket[idx] = item; // update kalau sudah ada
  } else {
    bucket.push(item); // tambah baru
  }
  saveBucket(bucket);
};

// Hapus 1 bank dari keranjang berdasarkan id_bank
export const removeFromBucket = (id_bank) => {
  const bucket = getBucket().filter((b) => b.id_bank !== id_bank);
  saveBucket(bucket);
};

// Cek apakah suatu id_bank sudah ada di dalam keranjang
export const isInBucket = (id_bank) => {
  if (!id_bank) return false;
  return getBucket().some((b) => b.id_bank === id_bank);
};

// Kosongkan seluruh isi keranjang
export const clearBucket = () => {
  saveBucket([]);
};