-- =====================================================================
-- E-ABSENSI SMKN 1 SIMPANG EMPAT - SKEMA DATABASE SUPABASE
-- Jalankan seluruh isi file ini di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan berulang (idempotent), kecuali blok RESET di bawah.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (OPSIONAL) RESET: hapus tabel lama yang strukturnya salah.
-- ! MENGHAPUS SEMUA DATA di keempat tabel. Hapus tanda "--" hanya jika
-- ! tabel lama sudah ada dan Anda siap mengimpor ulang data siswa.
-- ---------------------------------------------------------------------
-- drop table if exists public.leave_logs  cascade;
-- drop table if exists public.attendance  cascade;
-- drop table if exists public.students    cascade;
-- drop table if exists public.classes     cascade;

-- 1. KELAS --------------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  class_name  text not null unique,                       -- dipakai upsert onConflict:'class_name'
  major       text not null,                              -- DKV / TKJ / TKR
  grade       text not null check (grade in ('X','XI','XII')),
  created_at  timestamptz not null default now()
);

-- 2. SISWA --------------------------------------------------------------
-- nisn = isi barcode Code128 = kunci utama (dipakai upsert onConflict:'nisn')
create table if not exists public.students (
  nisn          text primary key,
  nis           text,                                     -- opsional, bisa dipakai sebagai isi barcode
  full_name     text not null,
  class_id      uuid references public.classes(id) on update cascade on delete set null,
  parent_phone  text,
  photo_url     text,
  status        text not null default 'active' check (status in ('active','inactive')),
  created_at    timestamptz not null default now()
);
create index if not exists students_class_idx  on public.students(class_id);
create index if not exists students_status_idx on public.students(status);
-- Untuk database yang sudah dibuat dengan skema lama: tambahkan kolom NIS
alter table public.students add column if not exists nis text;
create unique index if not exists students_nis_key on public.students(nis) where nis is not null and nis <> '';

-- 3. ABSENSI HARIAN (1 baris per siswa per tanggal) --------------------
create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  nisn         text not null references public.students(nisn) on update cascade on delete cascade,
  date         date not null,                             -- tanggal WITA (YYYY-MM-DD)
  time_in      timestamptz,
  time_out     timestamptz,
  status       text not null check (status in ('Hadir','Terlambat','Sakit','Izin','Alpa')),
  notes        text,
  recorded_by  text,
  created_at   timestamptz not null default now(),
  unique (nisn, date)                                     -- cegah dobel absen
);
create index if not exists attendance_date_idx on public.attendance(date);

-- 4. IZIN KELUAR (sementara / pulang awal) ----------------------------
create table if not exists public.leave_logs (
  id           uuid primary key default gen_random_uuid(),
  nisn         text not null references public.students(nisn) on update cascade on delete cascade,
  leave_time   timestamptz not null default now(),
  return_time  timestamptz,
  reason       text not null,
  approved_by  text not null,
  status       text not null default 'Out' check (status in ('Out','Returned','Permanent_Home')),
  created_at   timestamptz not null default now()
);
create index if not exists leave_nisn_status_idx on public.leave_logs(nisn, status);
create index if not exists leave_time_idx        on public.leave_logs(leave_time desc);

-- 5. DATA AWAL KELAS (ID sama persis dengan DEFAULT_CLASSES di app/master) --
insert into public.classes (id, class_name, major, grade) values
  ('ea807969-7ce9-4a55-8600-16c6d4d5db12','X DKV 1','DKV','X'),
  ('2895fb1b-9b46-448e-ac1c-17bc5786e899','X DKV 2','DKV','X'),
  ('cbb52f10-d98e-4d66-951b-edc76df0fe90','X TKJ 1','TKJ','X'),
  ('6695e73c-43f6-47e0-9889-4316cd27ca4f','X TKJ 2','TKJ','X'),
  ('37e2c373-8b01-429f-99ec-fd579120970b','X TKR 1','TKR','X'),
  ('05bee0fd-ffe2-4daf-87bc-5ed49c964912','X TKR 2','TKR','X'),
  ('9a487ca8-ca97-4bca-80e2-b3143f4e8481','XI DKV','DKV','XI'),
  ('db90fe03-9d3f-45a8-ad90-43455f9eaaf8','XI TKJ 1','TKJ','XI'),
  ('928285f7-7bb0-4053-aff7-53509d94d206','XI TKJ 2','TKJ','XI'),
  ('4734800c-4dc3-44a8-ab8d-7e35439f93ab','XI TKR 1','TKR','XI'),
  ('9eb0822b-0902-451f-bac8-4d7078f50dfa','XI TKR 2','TKR','XI'),
  ('ff02546e-8742-4702-9482-de460e95ccd6','XII DKV','DKV','XII'),
  ('ac770f8e-74ea-46b6-b24d-12562d617e1b','XII TKJ 1','TKJ','XII'),
  ('6720a523-95b0-48ba-b5a6-32bb8e2a19a4','XII TKJ 2','TKJ','XII'),
  ('68a4a532-2624-48b6-8105-05351024b217','XII TKR 1','TKR','XII'),
  ('630e012a-6837-4bac-a336-00556ee9e536','XII TKR 2','TKR','XII')
on conflict (class_name) do nothing;

-- 6. AKSES (RLS) --------------------------------------------------------
-- Aplikasi memakai kunci "anon" dari browser, jadi anon harus boleh
-- membaca, menambah, dan mengubah. Hapus data tidak diizinkan
-- (siswa hanya dinonaktifkan lewat kolom status).
do $$
declare t text;
begin
  foreach t in array array['classes','students','attendance','leave_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists app_select on public.%I', t);
    execute format('drop policy if exists app_insert on public.%I', t);
    execute format('drop policy if exists app_update on public.%I', t);
    execute format('create policy app_select on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy app_insert on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy app_update on public.%I for update to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Muat ulang cache skema API agar relasi (join) langsung terbaca
notify pgrst, 'reload schema';
