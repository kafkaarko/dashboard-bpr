const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const prisma = new PrismaClient();


 const login =  async(req,res) => { // <-- FIX 1: Tambah garis miring (/)
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
};

module.exports = login