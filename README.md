# Expense Tracker

<p align="center">
  <a href="#preview-tampilan">
    <img src="./public/readme-cover.svg" alt="Expense Tracker dashboard preview" width="100%" />
  </a>
</p>

<p align="center">
  A polished personal finance tracker built with Next.js, Prisma, PostgreSQL, and secure session-based authentication.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2.1-0F172A?style=flat-square" alt="Next.js 16.2.1" />
  <img src="https://img.shields.io/badge/React-19.2.4-0EA5E9?style=flat-square" alt="React 19.2.4" />
  <img src="https://img.shields.io/badge/Prisma-7.6.0-1E293B?style=flat-square" alt="Prisma 7.6.0" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-10B981?style=flat-square" alt="PostgreSQL Neon" />
</p>

<p align="center">
  <a href="https://your-project-name.vercel.app"><strong>Live Demo</strong></a> ·
  <a href="#akses-halaman"><strong>Page Links</strong></a> ·
  <a href="#preview-tampilan"><strong>Preview</strong></a> ·
  <a href="#fitur-utama"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#menjalankan-secara-lokal"><strong>Local Setup</strong></a> ·
  <a href="#struktur-proyek"><strong>Project Structure</strong></a>
</p>

## Live Demo

Demo online dapat diakses di Vercel:

`https://your-project-name.vercel.app`

## Akses Halaman

Link utama aplikasi:

- Login: `https://your-project-name.vercel.app/`
- Register: `https://your-project-name.vercel.app/` lalu pilih tab `Register`
- Dashboard: `https://your-project-name.vercel.app/` setelah berhasil login

## Ringkasan

Project ini adalah aplikasi expense tracker full-stack dengan fokus pada alur yang cepat:
pengguna bisa register atau login, membuat transaksi pemasukan dan pengeluaran, lalu
langsung melihat total balance, total income, total expense, chart arus kas, insight
otomatis, dan daftar transaksi yang bisa dicari serta difilter berdasarkan kategori
dan tipe transaksi.

Desain antarmuka memakai App Router dengan server-first data loading, sementara data
disimpan di PostgreSQL melalui Prisma. Session login dikelola di server dengan cookie
`httpOnly` agar alurnya tetap sederhana dan aman untuk aplikasi personal finance kecil
sampai menengah.

## Fitur Utama

- Autentikasi custom dengan register, login, logout, dan password hashing.
- Session berbasis database dengan cookie `httpOnly`.
- Dashboard transaksi dalam satu halaman dengan ringkasan balance, income, dan expense.
- Chart bulanan untuk membandingkan pemasukan, pengeluaran, dan balance.
- Insight cepat seperti saving rate bulan ini, rata-rata transaksi, dan transaksi terbesar.
- Form transaksi untuk pemasukan dan pengeluaran dengan kategori bawaan.
- Pencarian transaksi berdasarkan judul, kategori, dan catatan.
- Filter kategori dan tipe transaksi untuk memfokuskan daftar yang sedang dilihat.
- Ringkasan kategori pengeluaran dominan untuk membaca pola belanja lebih cepat.
- Rendering data dari server menggunakan Next.js App Router dan Server Actions.

## Preview Tampilan

### Login

<p>
  <a href="https://your-project-name.vercel.app/">
    <img src="./public/readme-login.svg" alt="Preview halaman login Expense Tracker" width="100%" />
  </a>
</p>

### Register

<p>
  <a href="https://your-project-name.vercel.app/">
    <img src="./public/readme-register.svg" alt="Preview halaman register Expense Tracker" width="100%" />
  </a>
</p>

### Dashboard

<p>
  <a href="https://your-project-name.vercel.app/">
    <img src="./public/readme-dashboard.svg" alt="Preview halaman dashboard Expense Tracker" width="100%" />
  </a>
</p>

## Tech Stack

- Next.js 16
- React 19
- Prisma 7
- PostgreSQL
- Tailwind CSS 4
- TypeScript

## Highlight UI

- Dashboard dirancang mobile-first dengan grid yang tetap rapi saat dibuka di layar kecil.
- Preview README memakai mockup desktop dan mobile agar perubahan UI lebih mudah dipahami.
- Warna dan card layout dibuat ringan supaya data keuangan tetap jadi fokus utama.

## Menjalankan Secara Lokal

### 1. Install dependency

```bash
npm install
```

### 2. Siapkan environment variable

Buat atau sesuaikan file `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/expense_tracker?schema=public"
```

Atau salin dari template:

```bash
cp .env.example .env
```

### 3. Siapkan database

Jika database masih kosong, jalankan:

```bash
npx prisma migrate dev --name init
```

Jika Anda memakai database lama yang pernah dipakai project lain dan Prisma mendeteksi
`drift`, gunakan database baru yang bersih atau reset schema development terlebih dahulu:

```bash
npx prisma migrate reset
```

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000` di browser.

## Prisma Notes

Project ini memakai generator `prisma-client` di Prisma 7, jadi koneksi database tidak
didefinisikan di `schema.prisma`. URL database dibaca dari [`prisma.config.ts`](./prisma.config.ts), dan Prisma client diinisialisasi memakai adapter PostgreSQL di [`lib/prisma.ts`](./lib/prisma.ts).

Urutan pembacaan env di project ini:

- Runtime aplikasi: `POSTGRES_PRISMA_URL` → `POSTGRES_URL` → `DATABASE_URL`
- Prisma CLI dan migrations: `POSTGRES_URL_NON_POOLING` → `DATABASE_URL_UNPOOLED` → fallback ke runtime URL

Konfigurasi ini cocok untuk deployment ke Vercel Postgres yang ditenagai Neon, karena
runtime bisa memakai koneksi pooled sementara Prisma CLI tetap bisa memakai direct
connection jika environment variable non-pooling tersedia.

## Deploy ke Vercel

1. Push repository ke GitHub.
2. Import project ke Vercel.
3. Tambahkan integration Vercel Postgres atau Neon Postgres.
4. Pastikan environment variable berikut tersedia di Vercel:

```env
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
```

5. Redeploy project.

Catatan:

- Jangan gunakan `localhost` untuk deployment Vercel.
- Script `postinstall` di project ini akan menjalankan `prisma generate` otomatis saat install dependency di build environment.
- Repo ini sudah menyertakan [`vercel.json`](./vercel.json) dengan build command `npm run build:vercel`, jadi Vercel akan otomatis menjalankan `prisma migrate deploy` sebelum `next build`.
- Build command tersebut membutuhkan direct database URL di `POSTGRES_URL_NON_POOLING` agar migration production bisa diterapkan saat deploy.

## Struktur Proyek

```text
app/
  actions/           Server actions untuk auth dan transaksi
  generated/prisma/  Prisma client hasil generate
  page.tsx           Entry page utama
components/
  auth-panel.tsx     UI login dan register
  dashboard-client.tsx
lib/
  auth.ts            Session, hashing, dan helper autentikasi
  prisma.ts          Inisialisasi Prisma client + adapter PostgreSQL
prisma/
  migrations/        Riwayat migrasi database
  schema.prisma      Definisi model Prisma
public/
  readme-cover.svg   Visual header untuk README
```

## Workflow Pengembangan

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
```

## Roadmap Pengembangan

- Menambahkan edit dan delete transaksi.
- Menambahkan pagination atau virtualized list jika data transaksi makin besar.
- Menambahkan test untuk auth flow dan transaction actions.

## License

Project ini menggunakan lisensi [MIT](./LICENSE).
