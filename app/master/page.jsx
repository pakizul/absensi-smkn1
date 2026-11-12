'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminAuthModal from '../../components/AdminAuthModal';
import * as XLSX from 'xlsx';
import { Trash2, Edit2, Printer, Upload, Download, Users, UserPlus, Search } from 'lucide-react';

const DEFAULT_CLASSES = [
  { id: 'ea807969-7ce9-4a55-8600-16c6d4d5db12', class_name: 'X DKV 1', major: 'DKV', grade: 'X' },
  { id: '2895fb1b-9b46-448e-ac1c-17bc5786e899', class_name: 'X DKV 2', major: 'DKV', grade: 'X' },
  { id: 'cbb52f10-d98e-4d66-951b-edc76df0fe90', class_name: 'X TKJ 1', major: 'TKJ', grade: 'X' },
  { id: '6695e73c-43f6-47e0-9889-4316cd27ca4f', class_name: 'X TKJ 2', major: 'TKJ', grade: 'X' },
  { id: '37e2c373-8b01-429f-99ec-fd579120970b', class_name: 'X TKR 1', major: 'TKR', grade: 'X' },
  { id: '05bee0fd-ffe2-4daf-87bc-5ed49c964912', class_name: 'X TKR 2', major: 'TKR', grade: 'X' },
  { id: '9a487ca8-ca97-4bca-80e2-b3143f4e8481', class_name: 'XI DKV', major: 'DKV', grade: 'XI' },
  { id: 'db90fe03-9d3f-45a8-ad90-43455f9eaaf8', class_name: 'XI TKJ 1', major: 'TKJ', grade: 'XI' },
  { id: '928285f7-7bb0-4053-aff7-53509d94d206', class_name: 'XI TKJ 2', major: 'TKJ', grade: 'XI' },
  { id: '4734800c-4dc3-44a8-ab8d-7e35439f93ab', class_name: 'XI TKR 1', major: 'TKR', grade: 'XI' },
  { id: '9eb0822b-0902-451f-bac8-4d7078f50dfa', class_name: 'XI TKR 2', major: 'TKR', grade: 'XI' },
  { id: 'ff02546e-8742-4702-9482-de460e95ccd6', class_name: 'XII DKV', major: 'DKV', grade: 'XII' },
  { id: 'ac770f8e-74ea-46b6-b24d-12562d617e1b', class_name: 'XII TKJ 1', major: 'TKJ', grade: 'XII' },
  { id: '6720a523-95b0-48ba-b5a6-32bb8e2a19a4', class_name: 'XII TKJ 2', major: 'TKJ', grade: 'XII' },
  { id: '68a4a532-2624-48b6-8105-05351024b217', class_name: 'XII TKR 1', major: 'TKR', grade: 'XII' },
  { id: '630e012a-6837-4bac-a336-00556ee9e536', class_name: 'XII TKR 2', major: 'TKR', grade: 'XII' },
];

export default function MasterDataPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [students, setStudents] = useState([]);

  // Filter untuk Manajemen / Lihat Siswa
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('X');
  const [selectedMajorFilter, setSelectedMajorFilter] = useState('DKV');
  const [targetClassId, setTargetClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    try {
      let { data: cls, error: clsErr } = await supabase.from('classes').select('*').order('class_name');
      
      if (!clsErr && cls && cls.length > 0) {
        setClasses(cls);
      } else {
        if (clsErr) alert('Gagal memuat kelas: ' + clsErr.message + '. Pastikan supabase/schema.sql sudah dijalankan.');
        await supabase.from('classes').upsert(DEFAULT_CLASSES.map(c => ({ class_name: c.class_name, major: c.major, grade: c.grade })), { onConflict: 'class_name' });
        const { data: refetched } = await supabase.from('classes').select('*').order('class_name');
        if (refetched && refetched.length > 0) {
          setClasses(refetched);
        }
      }

      const { data: st, error: stErr } = await supabase
        .from('students')
        .select('*, classes(id, class_name, major, grade)')
        .eq('status', 'active')
        .order('full_name');
      
      if (stErr) alert('Gagal memuat siswa: ' + stErr.message);
      if (st) {
        setStudents(st);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredClasses = classes.filter(c => {
    const matchMajor = (c.major || '').toUpperCase() === selectedMajorFilter.toUpperCase();
    // Cocokkan grade secara tepat (misal: 'X' tidak boleh match 'XI' atau 'XII')
    const firstWord = (c.class_name || '').trim().split(' ')[0].toUpperCase();
    const matchGrade = (c.grade || '').toUpperCase() === selectedGradeFilter.toUpperCase() || 
                       firstWord === selectedGradeFilter.toUpperCase();
    return matchMajor && matchGrade;
  });

  // Filter siswa berdasarkan tab aktif dan pencarian/kelas
  const displayedStudents = students.filter(st => {
    const matchSearch = (st.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (st.nisn || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'list' && targetClassId) {
      return matchSearch && st.class_id === targetClassId;
    }
    return matchSearch;
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
        alert('Gagal memperbarui siswa: ' + error.message);
        return;
      }
      alert('Data siswa berhasil diperbarui!');
    } else {
      const { error } = await supabase.from('students').upsert([payload], { onConflict: 'nisn' });
      if (error) {
        alert('Gagal menyimpan siswa: ' + error.message);
        return;
      }
      alert('Data siswa berhasil disimpan ke database!');
    }

    resetStudentForm();
    await fetchMaster();
    setActiveTab('list');
  }

  function handleEditStudent(st) {
    setNisn(st.nisn);
    setFullName(st.full_name);
    if (st.classes?.major) setSelectedMajorFilter(st.classes.major);
    if (st.classes?.grade) setSelectedGradeFilter(st.classes.grade);
    else if (st.classes?.class_name) {
      if (st.classes.class_name.toUpperCase().startsWith('X ')) setSelectedGradeFilter('X');
      else if (st.classes.class_name.toUpperCase().startsWith('XI ')) setSelectedGradeFilter('XI');
      else if (st.classes.class_name.toUpperCase().startsWith('XII ')) setSelectedGradeFilter('XII');
    }
    setTargetClassId(st.class_id || '');
    setParentPhone(st.parent_phone || '');
    setIsEditing(true);
    setActiveTab('add');
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
      alert('Pilih Kelas Spesifik tujuan terlebih dahulu sebelum upload!');
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
            alert(`Berhasil! ${payload.length} data siswa telah disinkronkan ke database.`);
            await fetchMaster();
            setActiveTab('list');
          }
        } else {
          alert('Format kolom file Excel tidak dikenali. Pastikan terdapat kolom "NISN" dan "Nama Lengkap".');
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manajemen Data Siswa</h1>
              <p className="text-xs text-slate-500">Kelola data siswa, lihat daftar per kelas, update data, dan impor Excel.</p>
            </div>

            {/* Navigasi Tab */}
            <div className="flex bg-slate-200/70 p-1 rounded-full">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Users className="w-4 h-4" />
                <span>Lihat Siswa Kelas</span>
              </button>
              <button
                onClick={() => { setActiveTab('add'); resetStudentForm(); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'add' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah & Impor Siswa</span>
              </button>
            </div>
          </div>

          {/* Panel Filter Tingkat, Jurusan & Kelas */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 mb-6">
            <h2 className="font-bold text-slate-800 mb-2">Filter Tingkat & Jurusan Kelas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Tingkat Kelas</label>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => {
                    setSelectedGradeFilter(e.target.value);
                    setTargetClassId('');
                  }}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 font-medium text-slate-800"
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
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                >
                  <option value="DKV">Desain Komunikasi Visual (DKV)</option>
                  <option value="TKJ">Teknik Komputer & Jaringan (TKJ)</option>
                  <option value="TKR">Teknik Kendaraan Ringan (TKR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Kelas Spesifik</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 font-bold text-blue-600 bg-blue-50/50"
                >
                  <option value="">-- Pilih Kelas Spesifik --</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TAB 1: LIHAT SISWA KELAS */}
          {activeTab === 'list' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Daftar Siswa Kelas</h2>
                  <p className="text-xs text-slate-500">Menampilkan siswa aktif berdasarkan filter kelas atau pencarian nama/NISN.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NISN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="py-3 px-3">NISN</th>
                      <th className="py-3 px-3">Nama Lengkap</th>
                      <th className="py-3 px-3">Kelas & Jurusan</th>
                      <th className="py-3 px-3">No. HP Orang Tua</th>
                      <th className="py-3 px-3 text-right">Aksi / Update</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {displayedStudents.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-xs text-slate-400">
                          Tidak ada data siswa yang ditemukan pada kelas atau pencarian ini.
                        </td>
                      </tr>
                    ) : (
                      displayedStudents.map((st) => (
                        <tr key={st.nisn} className="hover:bg-slate-50">
                          <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-600">{st.nisn}</td>
                          <td className="py-3.5 px-3 font-semibold text-slate-900">{st.full_name}</td>
                          <td className="py-3.5 px-3 text-xs">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">
                              {st.classes ? `${st.classes.class_name}` : '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-xs text-slate-600">{st.parent_phone || '-'}</td>
                          <td className="py-3.5 px-3 flex justify-end items-center gap-2 relative">
                            <button
                              onClick={() => setPrintStudent(st)}
                              title="Lihat / Cetak Barcode NISN"
                              className="p-2 text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Dropdown / Tombol Update yang berisi Edit dan Hapus */}
                            <details className="relative group">
                              <summary className="list-none cursor-pointer px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Update ▾</span>
                              </summary>
                              <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 flex flex-col">
                                <button
                                  onClick={() => handleEditStudent(st)}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Edit Data</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(st.nisn)}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TAMBAH & UPDATE DATA / IMPOR EXCEL */}
          {activeTab === 'add' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <h2 className="font-bold text-slate-800 text-lg">
                    {isEditing ? 'Update Data Siswa' : 'Tambah Siswa Satuan'}
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
                    ⚠️ Silakan pilih <b>Kelas Spesifik</b> pada panel filter di atas terlebih dahulu sebagai tujuan penyimpanan siswa.
                  </div>
                )}

                <form onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NISN (Kode Barcode)</label>
                    <input
                      type="text"
                      placeholder="Masukkan NISN siswa..."
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      disabled={isEditing}
                      required
                      className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Siswa</label>
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap..."
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp Orang Tua</label>
                    <input
                      type="text"
                      placeholder="Contoh: 08123456789"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-3 flex gap-2 mt-2">
                    <button
                      type="submit"
                      disabled={!targetClassId}
                      className="flex-1 py-3 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm shadow-md disabled:opacity-50"
                    >
                      {isEditing ? 'Perbarui / Update Data Siswa' : 'Simpan Siswa Baru ke Database'}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => { resetStudentForm(); setActiveTab('list'); }}
                        className="px-6 py-3 rounded-full bg-slate-200 text-slate-700 font-bold text-sm"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

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
                    Tutup,
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
