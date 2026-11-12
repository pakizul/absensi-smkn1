'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Printer, Upload } from 'lucide-react';

export default function MasterDataPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // Form Kelas
  const [className, setClassName] = useState('');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');

  // Form Siswa
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Modal Cetak Kartu NISN
  const [printStudent, setPrintStudent] = useState(null);

  useEffect(() => {
    fetchMaster();
  }, []);

  async function fetchMaster() {
    const { data: cls } = await supabase.from('classes').select('*').order('class_name');
    if (cls) setClasses(cls);

    const { data: st } = await supabase
      .from('students')
      .select('*, classes(class_name)')
      .eq('status', 'active')
      .order('full_name');
    if (st) setStudents(st);
  }

  async function handleAddClass(e) {
    e.preventDefault();
    if (!className) return;
    await supabase.from('classes').insert([{ class_name: className, homeroom_teacher: homeroomTeacher }]);
    setClassName('');
    setHomeroomTeacher('');
    fetchMaster();
  }

  async function handleDeleteClass(id) {
    if (!confirm('Hapus kelas ini?')) return;
    await supabase.from('classes').delete().eq('id', id);
    fetchMaster();
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!nisn || !fullName) return;

    if (isEditing) {
      await supabase
        .from('students')
        .update({
          full_name: fullName,
          class_id: selectedClassId || null,
          parent_phone: parentPhone,
        })
        .eq('nisn', nisn);
    } else {
      await supabase.from('students').insert([
        {
          nisn: nisn.trim(),
          full_name: fullName,
          class_id: selectedClassId || null,
          parent_phone: parentPhone,
          status: 'active',
        },
      ]);
    }

    resetStudentForm();
    fetchMaster();
  }

  function handleEditStudent(st) {
    setNisn(st.nisn);
    setFullName(st.full_name);
    setSelectedClassId(st.class_id || '');
    setParentPhone(st.parent_phone || '');
    setIsEditing(true);
  }

  async function handleDeleteStudent(targetNisn) {
    if (!confirm('Nonaktifkan/hapus siswa ini dari daftar aktif?')) return;
    await supabase.from('students').update({ status: 'inactive' }).eq('nisn', targetNisn);
    fetchMaster();
  }

  function resetStudentForm() {
    setNisn('');
    setFullName('');
    setSelectedClassId('');
    setParentPhone('');
    setIsEditing(false);
  }

  // Import CSV sederhana: format baris -> NISN,Nama Lengkap,NoHP
  async function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split('\n').slice(1); // Lewati header
    const payload = [];

    rows.forEach((row) => {
      const cols = row.split(',');
      if (cols[0] && cols[1]) {
        payload.push({
          nisn: cols[0].trim(),
          full_name: cols[1].trim(),
          class_id: selectedClassId || null,
          parent_phone: cols[2] ? cols[2].trim() : '',
          status: 'active',
        });
      }
    });

    if (payload.length > 0) {
      await supabase.from('students').upsert(payload);
      alert(`${payload.length} data siswa berhasil diimpor!`);
      fetchMaster();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Manajemen Kelas & Data Siswa</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tambah Kelas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <h2 className="font-bold text-slate-800 mb-4">Tambah Kelas Baru</h2>
          <form onSubmit={handleAddClass} className="space-y-3">
            <input
              type="text"
              placeholder="Nama Kelas (Misal: XI DKV 1)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
            />
            <input
              type="text"
              placeholder="Nama Wali Kelas"
              value={homeroomTeacher}
              onChange={(e) => setHomeroomTeacher(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Kelas</span>
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Daftar Kelas</h3>
            {classes.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-slate-800">{c.class_name}</p>
                  <p className="text-[11px] text-slate-500">Wali: {c.homeroom_teacher || '-'}</p>
                </div>
                <button onClick={() => handleDeleteClass(c.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom Kanan: Form & Tabel Siswa */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h2 className="font-bold text-slate-800">
                {isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru (NISN)'}
              </h2>
              <label className="cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100">
                <Upload className="w-3.5 h-3.5" />
                <span>Impor CSV Massal</span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>

            <form onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="NISN (Kode Barcode)"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                disabled={isEditing}
                required
                className="px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm disabled:opacity-60"
              />
              <input
                type="text"
                placeholder="Nama Lengkap Siswa"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
              />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="No. WhatsApp Orang Tua"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
              />

              <div className="sm:col-span-2 flex gap-2 mt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm"
                >
                  {isEditing ? 'Perbarui Data Siswa' : 'Simpan Siswa'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetStudentForm}
                    className="px-5 py-2.5 rounded-full bg-slate-200 text-slate-700 font-bold text-sm"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Tabel Daftar Siswa */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-4">Daftar Siswa Aktif ({students.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Lengkap</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {students.map((st) => (
                    <tr key={st.nisn} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-xs">{st.nisn}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{st.full_name}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{st.classes?.class_name || '-'}</td>
                      <td className="py-3 px-3 flex justify-end gap-1">
                        <button
                          onClick={() => setPrintStudent(st)}
                          title="Lihat / Cetak Barcode NISN"
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-full"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditStudent(st)}
                          title="Edit"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st.nisn)}
                          title="Hapus"
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview Kartu Barcode NISN */}
      {printStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="bg-gradient-to-br from-blue-600 to-emerald-400 text-white p-5 rounded-2xl">
              <p className="text-[10px] font-bold tracking-wider uppercase">Kartu Pelajar Digital</p>
              <h3 className="font-bold text-base mt-0.5">SMKN 1 SIMPANG EMPAT</h3>
              <div className="bg-white text-slate-900 rounded-xl p-4 mt-4">
                <p className="font-bold text-sm">{printStudent.full_name}</p>
                <p className="text-xs text-slate-500 mb-3">{printStudent.classes?.class_name || '-'}</p>
                {/* Barcode Code128 via API Gratis bwip-js */}
                <img
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${printStudent.nisn}&scale=2&height=10&includetext`}
                  alt={`Barcode ${printStudent.nisn}`}
                  className="mx-auto"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs"
              >
                Cetak Kartu
              </button>
              <button
                onClick={() => setPrintStudent(null)}
                className="flex-1 py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
