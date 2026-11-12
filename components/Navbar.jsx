'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, ClipboardCheck, Users, FileSpreadsheet, Lock, Unlock } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { href: '/scan', label: 'Scan Barcode', icon: ScanLine, adminOnly: false },
    { href: '/izin', label: 'Izin & Piket', icon: ClipboardCheck, adminOnly: true },
    { href: '/master', label: 'Kelas & Siswa', icon: Users, adminOnly: true },
    { href: '/rekap', label: 'Rekap Laporan', icon: FileSpreadsheet, adminOnly: true },
  ];

  return (
    <nav className="no-print sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-blue-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-400 flex items-center justify-center text-white font-bold shadow-md">
              S1
            </div>
            <div>
              <span className="font-bold text-slate-800 block leading-tight">E-Absensi</span>
              <span className="text-[11px] font-medium text-teal-600">SMKN 1 Simpang Empat</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.adminOnly && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-0.5">Admin</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
