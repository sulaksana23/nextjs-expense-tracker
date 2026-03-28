# Expense Tracker

<p align="center">
  <img src="./public/readme-cover.svg" alt="Expense Tracker dashboard preview" width="100%" />
</p>

<p align="center">
  A polished personal finance tracker built with Next.js, Prisma, PostgreSQL, and secure session-based authentication.
</p>

<p align="center">
  <a href="#fitur-utama"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#menjalankan-secara-lokal"><strong>Local Setup</strong></a> ·
  <a href="#struktur-proyek"><strong>Project Structure</strong></a>
</p>

## Ringkasan

Project ini adalah aplikasi expense tracker full-stack dengan fokus pada alur yang cepat:
pengguna bisa register atau login, membuat transaksi pemasukan dan pengeluaran, lalu
langsung melihat total balance, total income, total expense, dan daftar transaksi yang
bisa difilter berdasarkan kategori.

Desain antarmuka memakai App Router dengan server-first data loading, sementara data
disimpan di PostgreSQL melalui Prisma. Session login dikelola di server dengan cookie
`httpOnly` agar alurnya tetap sederhana dan aman untuk aplikasi personal finance kecil
sampai menengah.

## Fitur Utama

- Autentikasi custom dengan register, login, logout, dan password hashing.
- Session berbasis database dengan cookie `httpOnly`.
- Dashboard transaksi dalam satu halaman dengan ringkasan balance, income, dan expense.
- Form transaksi untuk pemasukan dan pengeluaran dengan kategori bawaan.
- Filter kategori untuk memfokuskan daftar transaksi yang sedang dilihat.
- Rendering data dari server menggunakan Next.js App Router dan Server Actions.

## Tech Stack

- Next.js 16
- React 19
- Prisma 7
- PostgreSQL
- Tailwind CSS 4
- TypeScript

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
- Menambahkan chart bulanan untuk tren pemasukan dan pengeluaran.
- Menambahkan pagination atau virtualized list jika data transaksi makin besar.
- Menambahkan test untuk auth flow dan transaction actions.

## License

Project ini menggunakan lisensi [MIT](./LICENSE).
