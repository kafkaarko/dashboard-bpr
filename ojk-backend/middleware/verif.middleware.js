// --- MIDDLEWARE KEAMANAN: CEK TOKEN AKSES ---
const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient();

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

module.exports = authMiddleware