# Gunakan OS Debian Slim (Lebih stabil untuk Prisma)
FROM node:20-slim

# Install OpenSSL yang wajib dibutuhkan oleh Prisma Engine
RUN apt-get update -y && apt-get install -y openssl

# Set lokasi kerja
WORKDIR /app

# Salin package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin semua sisa file
COPY . .

# Eksekusi Prisma
RUN npx prisma generate

# Buka port
EXPOSE 3001

# Nyalakan server
CMD ["npm", "start"]