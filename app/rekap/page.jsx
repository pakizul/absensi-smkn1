'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminAuthModal from '../../components/AdminAuthModal';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function RekapPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [reportType, setReportType] = useState('harian');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from('classes')
        .select('*')
        .order('class_name')
        .then(({ data }) => {
          if (data) setClasses(data);
        });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchReport();
  }, [selectedClass, reportType, selectedDate, selectedMonth, isAdmin]);

  async function fetchReport() {
    let query = supabase
      .from('attendance')
      .select('*, students!inner(nisn, full_name, class_id, classes(class_name, major))');

    if (selectedClass) {
      query = query.eq('students.class_id', selectedClass);
    }

    if (reportType === 'harian') {
      query = query.eq('date', selectedDate);
    } else if (reportType === 'bulanan') {
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-31`;
      query = query.gte('date', start).lte('date', end);
    }

    const { data } = await query.order('date', { ascending: false });
    if (data) setRecords(data);
  }

  function exportToExcel() {
    let rows = [];

    if (reportType === 'harian') {
      rows = records.map((r, idx) => ({
        No: idx + 1,
        Tanggal: r.date,
        NISN: r.nisn,
        'Nama Siswa': r.students?.full_name,
        Kelas: r.students?.classes ? `${r.students.classes.class_name} (${r.students.classes.major})` : '-',
        'Jam Masuk': r.time_in ? new Date(r.time_in).toLocaleTimeString('id-ID') : '-',
        'Jam Pulang': r.time_out ? new Date(r.time_out).toLocaleTimeString('id-ID') : '-',
        Status: r.status,
        Keterangan: r.notes || '-',
      }));
    } else {
      const summary = {};
      records.forEach((r) => {
        if (!summary[r.nisn]) {
          summary[r.nisn] = {
            NISN: r.nisn,
            'Nama Siswa': r.students?.full_name,
            Kelas: r.students?.classes ? `${r.students.classes.class_name} (${r.students.classes.major})` : '-',
            Hadir: 0,
            Terlambat: 0,
            Sakit: 0,
            Izin: 0,
            Alpa: 0,
          };
        }
        if (summary[r.nisn][r.status] !== undefined) {
          summary[r.nisn][r.status] += 1;
        }
      });
      rows = Object.values(summary);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
    XLSX.writeFile(workbook, `Rekap_Absensi_${reportType}_${selectedDate}.xlsx`);
  }

  return (
    <>
      <AdminAuthModal onAuthenticated={() => setIsAdmin(true)} />
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rekapitulasi & Laporan Absensi</h1>
              <p className="text-sm text-slate-500">Unduh laporan format Excel untuk arsip harian, bulanan, dan semester.</p>
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md hover:opacity-95"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Jenis Rekap</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
              >
                <option value="harian">Rekap Harian</option>
                <option value="bulanan">Rekap Bulanan</option>
                <option value="semester">Akumulasi Semester (Semua Data)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Filter Kelas & Jurusan</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.major})
                  </option>
                ))}
              </select>
            </div>

            {reportType === 'harian' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                />
              </div>
            )}

            {reportType === 'bulanan' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Bulan</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                />
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">NISN</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas & Jurusan</th>
                  <th className="py-3 px-3">Masuk</th>
                  <th className="py-3 px-3">Pulang</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-xs text-slate-400">
                      Tidak ada data absensi pada filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-xs text-slate-600">{r.date}</td>
                      <td className="py-3 px-3 font-mono text-xs">{r.nisn}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{r.students?.full_name}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {r.students?.classes ? `${r.students.classes.class_name} (${r.students.classes.major})` : '-'}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {r.time_in ? new Date(r.time_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {r.time_out ? new Date(r.time_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">{r.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
