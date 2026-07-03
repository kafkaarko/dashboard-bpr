const express = require('express');
const cors = require('cors');
const fs = require('fs');       // Modul bawaan Node.js untuk baca folder
const path = require('path');   // Modul bawaan Node.js untuk susun rute file
const app = express();
const dotenv = require('dotenv')
const  bprRoute  = require('./routes/bpr.routes');
const  authRoute  = require('./routes/auth.route');

dotenv.config()
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials:true
})); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api',authRoute)
app.use('/api',bprRoute)
// --- KODE BARU (VERCEL READY) ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend berjalan di port ${PORT}`);
});
// Wajib di-export agar Vercel bisa membacanya
module.exports = app;