import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Sistem Kehadiran Siswa - SMKN 1 Simpang Empat',
  description: 'Aplikasi Absensi Siswa Berbasis Scan Barcode NISN',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
