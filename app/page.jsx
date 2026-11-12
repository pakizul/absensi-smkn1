'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { ScanLine, ClipboardCheck, Users, FileSpreadsheet, AlertTriangle, Clock, CheckCircle2, UserX, Search } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0, izinSakit: 0, alpa: 0, totalSiswa: 0 });
  const [warnings, setWarnings] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA');
    }, 1000);
    fetchDashboardData();
    return () => clearInterval(timer);
  }, []);

  async function fetchDashboardData() {
    const today = new Date().toISOString().split('T')[0];

    const { count: totalSiswa } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: todayAtt } = await supabase
      .from('attendance')
      .select('*, students(full_name, classes(class_name, major))')
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (todayAtt) {
      const hadir = todayAtt.filter((a) => a.status === 'Hadir').length;
      const terlambat = todayAtt.filter((a) => a.status === 'Terlambat').length;
      const izinSakit = todayAtt.filter((a) => a.status === 'Izin' || a.status === 'Sakit').length;
      const alpa = todayAtt.filter((a) => a.status === 'Alpa').length;

      setStats({
        hadir,
        terlambat,
        izinSakit,
        alpa,
        totalSiswa: totalSiswa || 0,
      });
      setRecentLogs(todayAtt.slice(0, 8));
    }

    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data: monthlyAtt } = await supabase
      .from('attendance')
      .select('nisn, status, students(full_name, parent_phone, classes(class_name, major))')
      .gte('date', firstDayOfMonth)
      .in('status', ['Sakit', 'Alpa']);

    if (monthlyAtt) {
      const grouped = {};
      monthlyAtt.forEach((item) => {
        if (!grouped[item.nisn]) {
          grouped[item.nisn] = {
            nisn: item.nisn,
            name: item.students?.full_name || item.nisn,
            className: item.students?.classes ? `${item.students.classes.class_name} (${item.students.classes.major})` : '-',
            phone: item.students?.parent_phone || '-',
            sakit: 0,
            alpa: 0,
          };
        }
        if (item.status === 'Sakit') grouped[item.nisn].sakit += 1;
        if (item.status === 'Alpa') grouped[item.nisn].alpa += 1;
      });

      const flagged = Object.values(grouped).filter((s) => s.alpa >= 3 || s.sakit >= 4);
      setWarnings(flagged);
    }
  }

  const filteredLogs = recentLogs.filter(
    (log) =>
      log.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.nisn.includes(searchQuery)
  );

  return (
    <div className="pb-12">
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-emerald-400 text-white pt-8 pb-20 px-4 sm:px-8 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-blue-100 text-xs sm:text-sm font-medium">Sistem Informasi Kehadiran Siswa</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">SMKN 1 Simpang Empat</h1>
            <p className="text-xs text-emerald-100 mt-1">
              Senin–Kamis: 07.30 - 16.30 | Jumat: 07.30 - 11.30
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-center border border-white/30">
              {currentTime || 'Memuat Jam...'}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-full bg-white text-slate-800 text-sm focus:outline-none shadow-md"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/scan" className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-md hover:shadow-xl transition-all border border-blue-50 flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
              <ScanLine className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Mulai Scan</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Pos Gerbang / Piket</span>
          </Link>

          <Link href="/izin" className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-md hover:shadow-xl transition-all border border-blue-50 flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Izin Keluar / Sakit</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Input Manual & Dispensasi</span>
          </Link>

          <Link href="/master" className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-md hover:shadow-xl transition-all border border-blue-50 flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Data Kelas & Siswa</span>
            <span className="text-[11px] text-slate-500 mt-0.5">CRUD & Cetak Kartu NISN</span>
          </Link>

          <Link href="/rekap" className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-md hover:shadow-xl transition-all border border-blue-50 flex flex-col items-center text-center group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Rekap Laporan</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Harian, Bulanan & Excel</span>
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Ringkasan Kehadiran Hari Ini</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Hadir Tepat Waktu</p>
                <p className="text-2xl font-bold text-slate-800">{stats.hadir}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Terlambat (&gt;07.30)</p>
                <p className="text-2xl font-bold text-slate-800">{stats.terlambat}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Sakit / Izin</p>
                <p className="text-2xl font-bold text-slate-800">{stats.izinSakit}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tanpa Keterangan</p>
                <p className="text-2xl font-bold text-slate-800">{stats.alpa}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
            <div className="flex items-center gap-2 text-rose-600 font-bold mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h2>Peringatan Dini (BK & Wali Kelas)</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Siswa dengan akumulasi Alpa &ge; 3 hari atau Sakit &ge; 4 hari bulan ini:
            </p>
            {warnings.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
                Belum ada siswa yang melewati ambang batas ketidakhadiran bulan ini.
              </div>
            ) : (
              <div className="space-y-3">
                {warnings.map((w) => (
                  <div key={w.nisn} className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{w.name}</p>
                      <p className="text-xs text-slate-500">{w.className} • WA Ortu: {w.phone}</p>
                    </div>
                    <div className="text-right">
                      {w.alpa > 0 && <span className="block text-[11px] font-bold text-rose-600">Alpa: {w.alpa}x</span>}
                      {w.sakit > 0 && <span className="block text-[11px] font-bold text-amber-600">Sakit: {w.sakit}x</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-4">Aktivitas Absensi Hari Ini</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas & Jurusan</th>
                    <th className="py-2.5 px-3">Jam Masuk</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-xs text-slate-400">
                        Belum ada data absensi tercatat hari ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono text-xs text-slate-600">{log.nisn}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{log.students?.full_name || '-'}</td>
                        <td className="py-3 px-3 text-xs text-slate-500">
                          {log.students?.classes ? `${log.students.classes.class_name} (${log.students.classes.major})` : '-'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600">
                          {log.time_in ? new Date(log.time_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              log.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-700'
                                : log.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
