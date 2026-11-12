# Sistem Kehadiran Siswa - SMKN 1 Simpang Empat

Aplikasi absensi siswa berbasis scan barcode NISN (Next.js, Tailwind CSS, Supabase, siap deploy di Vercel).

## Setup database
1. Supabase > SQL Editor > New query, tempel isi `supabase/schema.sql`, lalu Run.
   (Jika tabel lama sudah ada, hapus tanda `--` pada blok RESET di awal file. Ini menghapus data lama.)
2. Isi environment variable di `.env.local` atau Vercel > Settings > Environment Variables, lalu Redeploy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Buka menu Data Siswa, impor siswa lewat Excel, lalu cetak barcode NISN atau langsung coba scan.

## Tabel
`classes` (kelas) · `students` (siswa, kunci: nisn) · `attendance` (1 baris per siswa per tanggal) · `leave_logs` (izin keluar).

## Catatan perbaikan
- Tanggal dan jam kini dihitung dalam WITA (sebelumnya memakai UTC sehingga scan sebelum 08.00 WITA tercatat di tanggal kemarin).
- Semua simpan/ubah data mengecek error dan menampilkan pesan dari Supabase (sebelumnya gagal tanpa pemberitahuan).
- Rekap bulanan tidak lagi memakai tanggal 31 untuk semua bulan.
