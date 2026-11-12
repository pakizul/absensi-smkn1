// Semua perhitungan tanggal/jam memakai WITA (Asia/Makassar), apa pun zona waktu perangkat.
const TZ = 'Asia/Makassar';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function wita(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    date: `${o.year}-${o.month}-${o.day}`,   // YYYY-MM-DD
    month: `${o.year}-${o.month}`,           // YYYY-MM
    minutes: Number(o.hour) * 60 + Number(o.minute),
    dow: DAYS.indexOf(o.weekday),            // 0 = Minggu ... 5 = Jumat
  };
}

export const todayWITA = () => wita().date;

// Awal & akhir bulan yang valid (menghindari tanggal 31 untuk bulan 30 hari / Februari)
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}` };
}

export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '-';
