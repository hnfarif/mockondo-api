# Mockondo

Mockondo adalah simulator response API dengan React + Vite + Tailwind. Dashboard menyimpan draft lokal di browser. Saat dideploy ke Vercel, folder `api/` menambahkan endpoint publik dan CRUD admin.

## API publik

```text
https://<domain>/m/<slug>
```

## Menjalankan di localhost

Untuk dashboard saja:

```bash
npm install
npm run dev
```

Untuk dashboard sekaligus serverless API, salin `.env.example` menjadi `.env.local`, isi token dan kredensial storage, lalu jalankan:

```bash
npx vercel dev
```

Vercel CLI biasanya menjalankan aplikasi di `http://localhost:3000`. Endpoint lokal tersedia di `http://localhost:3000/m/<slug>`.

## Setup Vercel

Tambahkan environment variables berikut:

```text
KV_REST_API_URL=...       # Upstash Redis REST URL
KV_REST_API_TOKEN=...     # Upstash Redis REST token
MOCKONDO_ADMIN_TOKEN=...  # token untuk endpoint admin
MOCKONDO_CORS_ORIGIN=*    # sebaiknya diisi origin aplikasi pemanggil
```

Dashboard melakukan login ke `/api/auth/login`. Token admin hanya dikirim saat login; server menyimpan session ID di Redis dan mengirimkannya sebagai cookie `HttpOnly`, sehingga token tidak disimpan di browser.

Contoh membuat mock:

```bash
curl -X POST https://<domain>/api/admin/mocks \
  -H "Authorization: Bearer <MOCKONDO_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"slug":"products","method":"GET","status":200,"delay":500,"headers":{"X-Mockondo":"true"},"body":{"data":[{"id":1}]}}'
```

Service eksternal kemudian dapat memanggil `GET https://<domain>/m/products`.

Tanpa `KV_REST_API_URL` dan `KV_REST_API_TOKEN`, API memakai memory proses sebagai fallback lokal. Fallback ini tidak persisten dan tidak cocok untuk production serverless.
