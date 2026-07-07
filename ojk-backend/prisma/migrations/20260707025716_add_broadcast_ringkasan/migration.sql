-- CreateTable
CREATE TABLE "laporan_keuangan_bpr" (
    "id_bank" TEXT NOT NULL,
    "nama_bank" TEXT NOT NULL,
    "periode_tahun" INTEGER NOT NULL,
    "periode_bulan" INTEGER NOT NULL,
    "data_keuangan" JSONB NOT NULL,

    CONSTRAINT "laporan_keuangan_bpr_pkey" PRIMARY KEY ("id_bank","periode_tahun","periode_bulan")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_ringkasan" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periode_label" TEXT NOT NULL,
    "jumlah_bank" INTEGER NOT NULL,
    "jumlah_alert" INTEGER NOT NULL,
    "konten" TEXT NOT NULL,

    CONSTRAINT "broadcast_ringkasan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
