# Sistem Kehadiran Siswa - SMKN 1 Simpang Empat

Aplikasi web absensi siswa berbasis scan barcode NISN menggunakan Next.js, Tailwind CSS, dan Supabase (siap deploy di Vercel).

## Cara Menjalankan di Lokal & Deploy ke Vercel

1. **Siapkan Environment Variables**
   - Ubah nama file `.env.local.example` menjadi `.env.local`.
   - Buka dashboard Supabase -> **Project Settings** -> **API**.
   - Salin `Project URL` ke `NEXT_PUBLIC_SUPABASE_URL` dan `anon public` key ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2. **Install Dependencies & Jalankan Lokal**
   ```bash
   npm install
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.

3. **Deploy ke Vercel**
   - Upload folder proyek ini ke repository GitHub.
   - Buka Vercel -> **Add New Project** -> Import repository tersebut.
   - Pada bagian **Environment Variables**, masukkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Klik **Deploy**.

## Fitur Utama
- **Scan Barcode NISN (`/scan`)**: Deteksi otomatis jam masuk (07.30), jam pulang (16.30 Senin-Kamis, 11.30 Jumat), serta animasi laser scanner.
- **Dashboard Utama (`/`)**: Statistik real-time dan *Early Warning System* untuk siswa yang sering Sakit / Alpa.
- **Izin Keluar & Susulan (`/izin`)**: Input manual Sakit/Izin susulan, serta pencatatan izin keluar sementara (kembali ke sekolah / langsung pulang).
- **Manajemen Kelas & Siswa (`/master`)**: Tambah/edit/hapus kelas dan siswa, cetak kartu barcode NISN, serta impor massal CSV.
- **Rekap & Laporan (`/rekap`)**: Filter harian/bulanan/semester serta ekspor langsung ke file Excel (`.xlsx`).
