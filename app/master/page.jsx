'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminAuthModal from '../../components/AdminAuthModal';
import * as XLSX from 'xlsx';
import { Trash2, Edit2, Printer, Upload, Download } from 'lucide-react';

export default function MasterDataPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedGradeFilter, setSelectedGradeFilter] = useState('X');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState('DKV');
  const [targetClassId, setTargetClassId] = useState('');

  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [printStudent, setPrintStudent] = useState(null);

  useEffect(() => {
    if (isAdmin) fetchMaster();
  }, [isAdmin]);

  async function fetchMaster() {
    // 1. Fetch classes from Supabase
    let { data: cls, error: clsErr } = await supabase.from('classes').select('*').order('class_name');
    
    if (clsErr || !cls || cls.length === 0) {
      // Insert default required classes so Supabase generates valid UUIDs
      const defaultClasses = [
        { class_name: 'X DKV 1', major: 'DKV', grade: 'X' },
        { class_name: 'X DKV 2', major: 'DKV', grade: 'X' },
        { class_name: 'X TKJ 1', major: 'TKJ', grade: 'X' },
        { class_name: 'X TKJ 2', major: 'TKJ', grade: 'X' },
        { class_name: 'X TKR 1', major: 'TKR', grade: 'X' },
        { class_name: 'X TKR 2', major: 'TKR', grade: 'X' },
        { class_name: 'XI DKV', major: 'DKV', grade: 'XI' },
        { class_name: 'XI TKJ 1', major: 'TKJ', grade: 'XI' },
        { class_name: 'XI TKJ 2', major: 'TKJ', grade: 'XI' },
        { class_name: 'XI TKR 1', major: 'TKR', grade: 'XI' },
        { class_name: 'XI TKR 2', major: 'TKR', grade: 'XI' },
        { class_name: 'XII DKV', major: 'DKV', grade: 'XII' },
        { class_name: 'XII TKJ 1', major: 'TKJ', grade: 'XII' },
        { class_name: 'XII TKJ 2', major: 'TKJ', grade: 'XII' },
        { class_name: 'XII TKR 1', major: 'TKR', grade: 'XII' },
        { class_name: 'XII TKR 2', major: 'TKR', grade: 'XII' },
      ];
      
      await supabase.from('classes').upsert(defaultClasses, { onConflict: 'class_name' });
      
      // Re-fetch to get real UUIDs from Supabase
      const { data: refetchedCls } = await supabase.from('classes').select('*').order('class_name');
      cls = refetchedCls || [];
    }

    setClasses(cls);

    const { data: st } = await supabase
      .from('students')
      .select('*, classes(class_name, major)')
      .eq('status', 'active')
      .order('full_name');
    
    if (st) {
      setStudents(st);
    }
  }

  const filteredClasses = classes.filter(c => {
    const matchMajor = (c.major || '').toUpperCase() === selectedMajorFilter.toUpperCase();
    const matchGrade = (c.class_name || '').toUpperCase().startsWith(selectedGradeFilter.toUpperCase());
    return matchMajor && matchGrade;
  });

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!nisn || !fullName || !targetClassId) {
      alert('Mohon pilih Tingkat, Jurusan, Kelas, serta lengkapi NISN dan Nama Siswa.');
      return;
    }

    const payload = {
      nisn: nisn.trim(),
      full_name: fullName.trim(),
      class_id: targetClassId,
      parent_phone: parentPhone.trim(),
      status: 'active',
    };

    if (isEditing) {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: fullName.trim(),
          class_id: targetClassId,
          parent_phone: parentPhone.trim(),
        })
        .eq('nisn', nisn.trim());
      if (error) {
        alert('Gagal memperbarui siswa ke Supabase: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('students').upsert([payload], { onConflict: 'nisn' });
      if (error) {
        alert('Gagal menyimpan siswa ke Supabase: ' + error.message);
        return;
      }
    }

    resetStudentForm();
    await fetchMaster();
    alert('Data siswa berhasil disimpan ke database Supabase!');
  }

  function handleEditStudent(st) {
    setNisn(st.nisn);
    setFullName(st.full_name);
    if (st.classes?.major) setSelectedMajorFilter(st.classes.major);
    if (st.classes?.class_name) {
      if (st.classes.class_name.toUpperCase().startsWith('X ')) setSelectedGradeFilter('X');
      else if (st.classes.class_name.toUpperCase().startsWith('XI ')) setSelectedGradeFilter('XI');
      else if (st.classes.class_name.toUpperCase().startsWith('XII ')) setSelectedGradeFilter('XII');
    }
    setTargetClassId(st.class_id || '');
    setParentPhone(st.parent_phone || '');
    setIsEditing(true);
  }

  async function handleDeleteStudent(targetNisn) {
    if (!confirm('Nonaktifkan siswa ini?')) return;
    const { error } = await supabase.from('students').update({ status: 'inactive' }).eq('nisn', targetNisn);
    if (error) {
      alert('Gagal menghapus siswa: ' + error.message);
      return;
    }
    await fetchMaster();
  }

  function resetStudentForm() {
    setNisn('');
    setFullName('');
    setParentPhone('');
    setIsEditing(false);
  }

  function downloadTemplate() {
    const templateData = [
      { NISN: "1234567890", "Nama Lengkap": "Contoh Siswa", "No. HP Orang Tua": "081234567890" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    XLSX.writeFile(workbook, "Template_Impor_Siswa_SMKN1.xlsx");
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!targetClassId) {
      alert('Pilih Tingkat, Jurusan, dan Kelas tujuan terlebih dahulu sebelum mengupload data siswa!');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const payload = data.map((row) => ({
          nisn: String(row['NISN'] || row['nisn'] || row['Nisn'] || '').trim(),
          full_name: String(row['Nama Lengkap'] || row['nama lengkap'] || row['Nama'] || row['nama'] || '').trim(),
          class_id: targetClassId,
          parent_phone: String(row['No. HP Orang Tua'] || row['no hp orang tua'] || row['Telepon'] || row['telepon'] || '').trim(),
          status: 'active',
        })).filter(r => r.nisn && r.full_name);

        if (payload.length > 0) {
          const { error } = await supabase.from('students').upsert(payload, { onConflict: 'nisn' });
          if (error) {
            alert('Gagal mengimpor ke Supabase: ' + error.message);
          } else {
            alert(`Berhasil! ${payload.length} data siswa telah tersimpan dan disinkronkan ke database Supabase.`);
            await fetchMaster();
          }
        } else {
          alert('Format kolom file Excel tidak dikenali. Pastikan terdapat kolom header "NISN" dan "Nama Lengkap".');
        }
      } catch (err) {
        alert('Terjadi kesalahan membaca file Excel: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  }

  return (
    <>
      <AdminAuthModal onAuthenticated={() => setIsAdmin(true)} />
      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Manajemen Data Siswa</h1>

          <div className="space-y-6">
            {/* Panel Pilihan Tingkat, Jurusan & Kelas untuk Impor / Input */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
              <h2 className="font-bold text-slate-800 mb-2">Pilih Tingkat, Jurusan & Kelas Tujuan</h2>
              <p className="text-xs text-slate-500 mb-4">
                Tentukan Tingkat Kelas (X, XI, XII) dan Jurusan (DKV, TKJ, TKR) terlebih dahulu sebelum mengupload file Excel/CSV atau menambah data siswa ke database Supabase.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Tingkat Kelas</label>
                  <select
                    value={selectedGradeFilter}
                    onChange={(e) => {
                      setSelectedGradeFilter(e.target.value);
                      setTargetClassId('');
                    }}
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Jurusan</label>
                  <select
                    value={selectedMajorFilter}
                    onChange={(e) => {
                      setSelectedMajorFilter(e.target.value);
                      setTargetClassId('');
                    }}
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="DKV">Desain Komunikasi Visual (DKV)</option>
                    <option value="TKJ">Teknik Komputer & Jaringan (TKJ)</option>
                    <option value="TKR">Teknik Kendaraan Ringan (TKR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Kelas</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Form Tambah/Edit Satuan Siswa */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <h2 className="font-bold text-slate-800">
                  {isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Satuan'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template Excel</span>
                  </button>
                  <label className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${!targetClassId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Excel / CSV Siswa</span>
                    <input 
                      type="file" 
                      accept=".csv, .xlsx, .xls" 
                      onChange={handleExcelUpload} 
                      disabled={!targetClassId} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {!targetClassId && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
                  ⚠️ Silakan pilih <b>Tingkat</b>, <b>Jurusan</b>, dan <b>Kelas</b> di panel atas terlebih dahulu sebelum menginput atau mengupload data siswa.
                </div>
              )}

              <form onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <input
                  type="text"
                  placeholder="No. WhatsApp Orang Tua"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                />

                <div className="sm:col-span-3 flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={!targetClassId}
                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm disabled:opacity-50"
                  >
                    {isEditing ? 'Perbarui Data Siswa' : 'Simpan Siswa ke Kelas Terpilih'}
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
              <h2 className="font-bold text-slate-800 mb-4">Daftar Siswa Aktif di Database ({students.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Kelas & Jurusan</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-xs text-slate-400">
                          Belum ada data siswa di database Supabase. Silakan upload file Excel atau tambah siswa baru.
                        </td>
                      </tr>
                    ) : (
                      students.map((st) => (
                        <tr key={st.nisn} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono text-xs">{st.nisn}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{st.full_name}</td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            {st.classes ? `${st.classes.class_name} (${st.classes.major})` : '-'}
                          </td>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {printStudent && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="bg-gradient-to-br from-blue-600 to-emerald-400 text-white p-5 rounded-2xl">
                  <p className="text-[10px] font-bold tracking-wider uppercase">Kartu Pelajar Digital</p>
                  <h3 className="font-bold text-base mt-0.5">SMKN 1 SIMPANG EMPAT</h3>
                  <div className="bg-white text-slate-900 rounded-xl p-4 mt-4">
                    <p className="font-bold text-sm">{printStudent.full_name}</p>
                    <p className="text-xs text-slate-500 mb-3">
                      {printStudent.classes ? `${printStudent.classes.image ? '' : printStudent.classes.class_name} (${printStudent.classes.major})` : '-'}
                    </p>
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
      )}
    </>
  );
}
