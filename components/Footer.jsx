export default function Footer() {
  return (
    <footer className="no-print bg-slate-900 border-t border-slate-800 py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Banner Logo Memanjang */}
        <div className="w-full md:w-auto flex-1 max-w-xl">
          <div className="w-full bg-black rounded-xl overflow-hidden border border-slate-800 p-2 shadow-inner flex items-center justify-center">
            <img 
              src="/images/logo_footer.jpg" 
              alt="Logo Instansi & Ampat Studio" 
              className="w-full h-12 md:h-14 object-contain"
            />
          </div>
        </div>
        
        {/* Keterangan */}
        <div className="flex flex-col md:items-end text-center md:text-right">
          <p className="text-xs font-bold text-slate-300">Sistem Kehadiran Siswa • SMKN 1 Simpang Empat</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Design by <span className="font-bold text-teal-400">ampat studio</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
