'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { ScanLine, CheckCircle2, AlertCircle, LogOut, RotateCcw } from 'lucide-react';

export default function ScanPage() {
  const [nisnInput, setNisnInput] = useState('');
  const [scanMode, setScanMode] = useState('IN');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    focusInput();
    document.addEventListener('click', focusInput);
    return () => document.removeEventListener('click', focusInput);
  }, []);

  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (err) {}
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const nisn = nisnInput.trim();
    if (!nisn || loading) return;

    setLoading(true);
    setNisnInput('');

    try {
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('*, classes(class_name, major)')
        .eq('nisn', nisn)
        .single();

      if (studentErr || !student) {
        playBeep(false);
        setFeedback({
          type: 'error',
          title: 'NISN Tidak Terdaftar',
          message: `Kode barcode (${nisn}) tidak ditemukan dalam database siswa.`,
        });
        setLoading(false);
        return;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const dayOfWeek = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const { data: activeLeave } = await supabase
        .from('leave_logs')
        .select('*')
        .eq('nisn', nisn)
        .eq('status', 'Out')
        .order('leave_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeLeave) {
        await supabase
          .from('leave_logs')
          .update({ return_time: now.toISOString(), status: 'Returned' })
          .eq('id', activeLeave.id);

        playBeep(true);
        setFeedback({
          type: 'success',
          badge: 'Kembali ke Sekolah',
          student,
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
          note: `Tercatat kembali dari izin: ${activeLeave.reason}`,
        });
        setLoading(false);
        return;
      }

      const { data: existingAtt } = await supabase
        .from('attendance')
        .select('*')
        .eq('nisn', nisn)
        .eq('date', today)
        .maybeSingle();

      if (scanMode === 'IN') {
        if (existingAtt) {
          playBeep(false);
          setFeedback({
            type: 'warning',
            title: 'Sudah Absen Masuk',
            message: `${student.full_name} sudah tercatat masuk hari ini dengan status ${existingAtt.status}.`,
          });
          setLoading(false);
          return;
        }

        const isLate = totalMinutes > 7 * 60 + 30;
        const status = isLate ? 'Terlambat' : 'Hadir';

        await supabase.from('attendance').insert([
          {
            nisn,
            date: today,
            time_in: now.toISOString(),
            status,
            recorded_by: 'Scanner Gerbang',
          },
        ]);

        playBeep(true);
        setFeedback({
          type: 'success',
          badge: status,
          student,
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
          note: isLate ? 'Melewati batas masuk pukul 07.30' : 'Kehadiran masuk berhasil dicatat',
        });
      } else {
        const minPulangMinutes = dayOfWeek === 5 ? 11 * 60 + 30 : 16 * 60 + 30;
        if (totalMinutes < minPulangMinutes) {
          playBeep(false);
          setFeedback({
            type: 'warning',
            title: 'Belum Waktunya Pulang',
            message:
              dayOfWeek === 5
                ? 'Jadwal pulang hari Jumat adalah pukul 11.30. Gunakan menu Izin Piket jika pulang awal.'
                : 'Jadwal pulang Senin–Kamis adalah pukul 16.30. Gunakan menu Izin Piket jika pulang awal.',
          });
          setLoading(false);
          return;
        }

        if (!existingAtt) {
          await supabase.from('attendance').insert([
            {
              nisn,
              date: today,
              time_out: now.toISOString(),
              status: 'Hadir',
              notes: 'Scan pulang tanpa scan masuk',
              recorded_by: 'Scanner Gerbang',
            },
          ]);
        } else {
          await supabase
            .from('attendance')
            .update({ time_out: now.toISOString() })
            .eq('id', existingAtt.id);
        }

        playBeep(true);
        setFeedback({
          type: 'success',
          badge: 'Absen Pulang',
          student,
          time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
          note: 'Selamat jalan, hati-hati di jalan!',
        });
      }
    } catch (error) {
      playBeep(false);
      setFeedback({
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Gagal terhubung ke database Supabase.',
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-400 flex flex-col items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl w-full max-w-lg p-6 sm:p-8 text-slate-800 relative overflow-hidden">
        <div className="text-center mb-6">
          <span className="bg-teal-100 text-teal-700 text-xs font-bold px-3.5 py-1 rounded-full">
            POS PIKET & GERBANG UTAMA
          </span>
          <h1 className="text-2xl font-bold mt-2.5 text-slate-900">Scan Barcode NISN</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Arahkan barcode kartu pelajar ke alat pemindai
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
          <button
            type="button"
            onClick={() => setScanMode('IN')}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              scanMode === 'IN'
                ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md'
                : 'text-slate-600'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Scan Masuk / Kembali</span>
          </button>
          <button
            type="button"
            onClick={() => setScanMode('OUT')}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              scanMode === 'OUT'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-md'
                : 'text-slate-600'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Scan Pulang</span>
          </button>
        </div>

        <div className="relative w-full h-56 bg-slate-900 rounded-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center border-4 border-teal-400/50">
          <ScanLine className="w-10 h-10 text-teal-400/40 mb-2" />
          <span className="text-slate-400 text-xs font-medium">
            {loading ? 'Memproses data...' : 'Scanner Siap Membaca NISN...'}
          </span>

          <div className="absolute w-56 h-32 border-2 border-dashed border-teal-300/80 rounded-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute w-full h-1 bg-red-500 shadow-[0_0_12px_#ef4444] animate-scan-laser"></div>
          </div>
        </div>

        <form onSubmit={handleScanSubmit} className="mt-4">
          <input
            ref={inputRef}
            type="text"
            value={nisnInput}
            onChange={(e) => setNisnInput(e.target.value)}
            placeholder="Ketik NISN lalu tekan Enter untuk simulasi..."
            className="w-full px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-center text-sm focus:outline-none focus:border-teal-500"
            autoFocus
          />
        </form>

        {feedback && (
          <div
            className={`mt-5 p-4 rounded-2xl border transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-teal-200 flex items-center justify-center font-bold text-teal-800 text-lg shrink-0 overflow-hidden">
                  {feedback.student.photo_url ? (
                    <img src={feedback.student.photo_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    feedback.student.full_name.charAt(0)
                  )}
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white ${
                      feedback.badge === 'Terlambat' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  >
                    {feedback.badge}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-1">{feedback.student.full_name}</h3>
                  <p className="text-xs text-slate-600">
                    {feedback.student.classes ? `${feedback.student.classes.class_name} (${feedback.student.classes.major})` : '-'}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">
                    {feedback.time} • {feedback.note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    feedback.type === 'warning' ? 'text-amber-600' : 'text-rose-600'
                  }`}
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{feedback.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{feedback.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          Batas Masuk: <strong className="text-slate-700">07.30</strong> • Pulang Sen–Kam:{' '}
          <strong className="text-slate-700">16.30</strong> • Jumat: <strong className="text-slate-700">11.30</strong>
        </div>
      </div>
    </div>
  );
}
