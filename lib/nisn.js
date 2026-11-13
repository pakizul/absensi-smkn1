// NISN selalu 10 digit. Excel/CSV sering membuang angka 0 di depan, jadi dipulihkan di sini.
export function normalizeNisn(v) {
  let s = String(v ?? '').trim().replace(/^'+/, '').replace(/\s+/g, '');
  if (/^\d+$/.test(s) && s.length < 10) s = s.padStart(10, '0');
  return s;
}

// Nomor HP Indonesia: angka 0 di depan juga sering hilang (8123... -> 08123...)
export function normalizePhone(v) {
  let s = String(v ?? '').trim().replace(/^'+/, '').replace(/[\s-]+/g, '');
  if (/^8\d{8,12}$/.test(s)) s = '0' + s;
  return s;
}
