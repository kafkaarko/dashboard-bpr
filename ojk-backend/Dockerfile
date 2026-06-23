# Gunakan OS Linux versi ringan khusus Node.js
FROM node:20-alpine

# Set lokasi kerja di dalam mesin cloud
WORKDIR /app

# Salin package.json untuk mendeteksi library yang dibutuhkan
COPY package*.json ./

# Install semua dependencies (Express, Prisma, Cors, dll)
RUN npm install

# Salin seluruh sisa file kamu (termasuk folder data_ojk dan prisma) ke dalam mesin
COPY . .

# Eksekusi Prisma agar mengenali struktur database Supabase-mu
RUN npx prisma generate

# Buka jalur komunikasi di port 3001
EXPOSE 3001

# Perintah untuk menyalakan server
CMD ["npm", "start"]