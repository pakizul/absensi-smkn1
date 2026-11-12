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

  // Form Filter Impor / Input Siswa Berdasarkan Jurusan & Kelas
  const [selectedMajorFilter, setSelectedMajorFilter] = useState('DKV');
  const [targetClassId, setTargetClassId] = useState('');

  // Form Satuan Siswa
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [printStudent, setPrintStudent] = useState(null);

  useEffect(() => {
    if (isAdmin) fetchMaster();
  }, [isAdmin]);

  async function fetchMaster() {
    const { data: cls } = await supabase.from('classes').select('*').order('class_name');
    if (cls) setClasses(cls);

    const { data: st } = await supabase
      .from('students')
      .select('*, classes(class_name, major)')
      .eq('status', 'active')
      .order('full_name');
    if (st) setStudents(st);
  }

  // Filter kelas sesuai pilihan jurusan
  const filteredClasses = classes.filter(c => c.major === selectedMajorFilter);

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!nisn || !fullName || !targetClassId) {
      alert('Mohon pilih Jurusan, Kelas, serta lengkapi NISN dan Nama Siswa.');
      return;
    }

    if (isEditing) {
      await supabase
        .from('students')
        .update({
          full_name: fullName,
          class_id: targetClassId,
          parent_phone: parentPhone,
        })
        .eq('nisn', nisn);
    } else {
      await supabase.from('students').insert([
        {
          nisn: nisn.trim(),
          full_name: fullName,
          class_id: targetClassId,
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
    if (st.classes?.major) setSelectedMajorFilter(st.classes.major);
    setTargetClassId(st.class_id || '');
    setParentPhone(st.parent_phone || '');
    setIsEditing(true);
  }

  async function handleDeleteStudent(targetNisn) {
    if (!confirm('Nonaktifkan siswa ini?')) return;
    await supabase.from('students').update({ status: 'inactive' }).eq('nisn', targetNisn);
    fetchMaster();
  }

  function resetStudentForm() {
    setNisn('');
    setFullName('');
    setParentPhone('');
    setIsEditing(false);
  }

  // Download Template Excel/CSV Siswa
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
      alert('Pilih Jurusan dan Kelas tujuan terlebih dahulu sebelum mengupload data siswa!');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const payload = data.map((row) => ({
        nisn: String(row['NISN'] || '').trim(),
        full_name: String(row['Nama Lengkap'] || '').trim(),
        class_id: targetClassId,
        parent_phone: String(row['No. HP Orang Tua'] || '').trim(),
        status: 'active',
      })).filter(r => r.nisn && r.full_name);

      if (payload.length > 0) {
        await supabase.from('students').upsert(payload);
        alert(`${payload.length} data siswa berhasil diimpor ke kelas yang dipilih!`);
        fetchMaster();
      } else {
        alert('Format file tidak valid atau kosong.');
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
            {/* Panel Pilihan Jurusan & Kelas untuk Impor / Input */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100">
              <h2 className="font-bold text-slate-800 mb-2">Pilih Jurusan & Kelas Tujuan</h2>
              <p className="text-xs text-slate-500 mb-4">
                Tentukan Jurusan dan Kelas terlebih dahulu sebelum mengupload file Excel/CSV atau menambah data siswa.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <option value="MM">Multimedia (MM)</option>
                    <option value="TAV">Teknik Pengolahan Audio Video (TAV)</option>
                    <option value="TKJ">Teknik Komputer & Jaringan (TKJ)</option>
                    <option value="TBSM">Teknik Bisnis Sepeda Motor (TBSM)</option>
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
                    <option value="">-- Pilih Kelas untuk Jurusan Ini --</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} ({c.major}) - Wali: {c.homeroom_teacher || '-'}
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
                  ⚠️ Silakan pilih <b>Jurusan</b> dan <b>Kelas</b> di panel atas terlebih dahulu sebelum menginput atau mengupload data siswa.
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
              <h2 className="font-bold text-slate-800 mb-4">Daftar Siswa Aktif ({students.length})</h2>
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
                    {students.map((st) => (
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
                    ))}
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
                      {printStudent.classes ? `${printStudent.classes.class_name} (${printStudent.classes.major})` : '-'}
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
