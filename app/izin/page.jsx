'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { todayWITA } from '../../lib/time';
import AdminAuthModal from '../../components/AdminAuthModal';
import { ClipboardCheck, DoorOpen, RotateCcw } from 'lucide-react';

export default function IzinPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState([]);
  const [activeLeaves, setActiveLeaves] = useState([]);

  const [leaveNisn, setLeaveNisn] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [leaveType, setLeaveType] = useState('Out');

  const [manualNisn, setManualNisn] = useState('');
  const [manualDate, setManualDate] = useState(todayWITA());
  const [manualStatus, setManualStatus] = useState('Sakit');
  const [manualNotes, setManualNotes] = useState('');

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  async function fetchData() {
    const { data: st, error: stErr } = await supabase
      .from('students')
      .select('nisn, full_name, classes(class_name, major)')
      .eq('status', 'active')
      .order('full_name');
    if (stErr) alert('Gagal memuat siswa: ' + stErr.message);
    if (st) setStudents(st);

    const { data: lv, error: lvErr } = await supabase
      .from('leave_logs')
      .select('*, students(full_name, classes(class_name, major))')
      .order('leave_time', { ascending: false })
      .limit(15);
    if (lvErr) alert('Gagal memuat log izin: ' + lvErr.message);
    if (lv) setActiveLeaves(lv);
  }

  async function handleLeaveSubmit(e) {
    e.preventDefault();
    if (!leaveNisn || !leaveReason || !approvedBy) return;

    const now = new Date().toISOString();
    const { error: leaveErr } = await supabase.from('leave_logs').insert([
      {
        nisn: leaveNisn,
        leave_time: now,
        reason: leaveReason,
        approved_by: approvedBy,
        status: leaveType,
      },
    ]);
    if (leaveErr) {
      alert('Gagal mencatat izin keluar: ' + leaveErr.message);
      return;
    }

    if (leaveType === 'Permanent_Home') {
      const today = todayWITA();
      const note = `Pulang awal: ${leaveReason} (Acc: ${approvedBy})`;
      const { data: att, error: attErr } = await supabase
        .from('attendance')
        .select('id')
        .eq('nisn', leaveNisn)
        .eq('date', today)
        .maybeSingle();
      if (attErr) {
        alert('Izin tercatat, tetapi gagal membaca absensi: ' + attErr.message);
        return;
      }

      const { error: saveErr } = att
        ? await supabase.from('attendance').update({ time_out: now, notes: note }).eq('id', att.id)
        : await supabase
            .from('attendance')
            .insert([{ nisn: leaveNisn, date: today, time_out: now, status: 'Hadir', notes: note, recorded_by: 'Guru Piket' }]);
      if (saveErr) {
        alert('Izin tercatat, tetapi gagal memperbarui absensi: ' + saveErr.message);
        return;
      }
    }

    alert('Data izin keluar berhasil dicatat!');
    setLeaveNisn('');
    setLeaveReason('');
    setApprovedBy('');
    fetchData();
  }

  async function handleMarkReturned(id) {
    const { error } = await supabase
      .from('leave_logs')
      .update({ return_time: new Date().toISOString(), status: 'Returned' })
      .eq('id', id);
    if (error) {
      alert('Gagal menandai kembali: ' + error.message);
      return;
    }
    fetchData();
  }

  async function handleManualAttendance(e) {
    e.preventDefault();
    if (!manualNisn || !manualDate) return;

    const { data: existing, error: readErr } = await supabase
      .from('attendance')
      .select('id')
      .eq('nisn', manualNisn)
      .eq('date', manualDate)
      .maybeSingle();
    if (readErr) {
      alert('Gagal membaca absensi: ' + readErr.message);
      return;
    }

    const { error } = existing
      ? await supabase
          .from('attendance')
          .update({ status: manualStatus, notes: manualNotes, recorded_by: 'Guru Piket' })
          .eq('id', existing.id)
      : await supabase.from('attendance').insert([
          {
            nisn: manualNisn,
            date: manualDate,
            status: manualStatus,
            notes: manualNotes,
            recorded_by: 'Guru Piket',
          },
        ]);
    if (error) {
      alert('Gagal menyimpan status: ' + error.message);
      return;
    }

    alert('Status ketidakhadiran berhasil diperbarui!');
    setManualNisn('');
    setManualNotes('');
  }

  return (
    <>
      <AdminAuthModal onAuthenticated={() => setIsAdmin(true)} />
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Layanan Piket & Perizinan Siswa</h1>
            <p className="text-sm text-slate-500">
              Pencatatan izin keluar di tengah jam pelajaran serta input Sakit/Izin yang kabarnya terlambat sampai.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
              <div className="flex items-center gap-2.5 text-blue-600 font-bold mb-4">
                <DoorOpen className="w-5 h-5" />
                <h2>Izin Keluar Lingkungan Sekolah</h2>
              </div>

              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Siswa</label>
                  <select
                    value={leaveNisn}
                    onChange={(e) => setLeaveNisn(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Nama / NISN Siswa --</option>
                    {students.map((s) => (
                      <option key={s.nisn} value={s.nisn}>
                        {s.full_name} ({s.classes ? `${s.classes.class_name} - ${s.classes.major}` : '-'}) - {s.nisn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Izin Keluar</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveType('Out')}
                      className={`py-2 px-3 rounded-full text-xs font-bold border ${
                        leaveType === 'Out'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Sementara (Balik Lagi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveType('Permanent_Home')}
                      className={`py-2 px-3 rounded-full text-xs font-bold border ${
                        leaveType === 'Permanent_Home'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Langsung Pulang Awal
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Keperluan / Alasan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Mengurus KTP, Sakit perut..."
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Disetujui Oleh (Guru Piket)</label>
                  <input
                    type="text"
                    placeholder="Nama Guru..."
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm shadow-md hover:opacity-95 transition-all"
                >
                  Catat Izin Keluar
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-teal-100">
              <div className="flex items-center gap-2.5 text-teal-600 font-bold mb-4">
                <ClipboardCheck className="w-5 h-5" />
                <h2>Input Manual Sakit / Izin (Kabar Susulan)</h2>
              </div>

              <form onSubmit={handleManualAttendance} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Siswa</label>
                  <select
                    value={manualNisn}
                    onChange={(e) => setManualNisn(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Pilih Nama / NISN Siswa --</option>
                    {students.map((s) => (
                      <option key={s.nisn} value={s.nisn}>
                        {s.full_name} ({s.classes ? `${s.classes.class_name} - ${s.classes.major}` : '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                    >
                      <option value="Sakit">Sakit (S)</option>
                      <option value="Izin">Izin (I)</option>
                      <option value="Alpa">Tanpa Keterangan (A)</option>
                      <option value="Hadir">Hadir (Koreksi)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan / Bukti Surat</label>
                  <input
                    type="text"
                    placeholder="Contoh: Surat dokter, WA Orang Tua..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm shadow-md hover:opacity-95 transition-all"
                >
                  Simpan Perubahan Status
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8">
            <h2 className="font-bold text-slate-800 mb-4">Log Izin Keluar-Masuk Siswa</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="py-2.5 px-3">Siswa</th>
                    <th className="py-2.5 px-3">Jam Keluar</th>
                    <th className="py-2.5 px-3">Keperluan & Pemberi Izin</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {activeLeaves.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">{item.students?.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {item.students?.classes ? `${item.students.classes.class_name} (${item.students.classes.major})` : '-'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {new Date(item.leave_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <p className="text-slate-800 font-medium">{item.reason}</p>
                        <p className="text-slate-400">Acc: {item.approved_by}</p>
                      </td>
                      <td className="py-3 px-3">
                        {item.status === 'Out' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                            Sedang di Luar
                          </span>
                        )}
                        {item.status === 'Returned' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                            Kembali ({new Date(item.return_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                        {item.status === 'Permanent_Home' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                            Pulang Awal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {item.status === 'Out' && (
                          <button
                            onClick={() => handleMarkReturned(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Tandai Kembali</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
