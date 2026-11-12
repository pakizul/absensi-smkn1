export default function Footer() {
  return (
    <footer className="no-print bg-white/80 backdrop-blur-md border-t border-slate-100 py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center p-1 shadow-sm">
            <img 
              src="/images/logo_footer.jpg" 
              alt="Logo Ampat Studio & SMKN 1 Simpang Empat" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Sistem Kehadiran Siswa • SMKN 1 Simpang Empat</p>
            <p className="text-[11px] text-slate-500">Kabupaten Banjar, Kalimantan Selatan</p>
          </div>
        </div>
        
        <div className="text-xs text-slate-600 font-medium">
          Design by <span className="font-bold text-teal-600">ampat studio</span>
        </div>
      </div>
    </footer>
  );
}
