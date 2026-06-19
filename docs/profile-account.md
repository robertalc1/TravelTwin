# Pagina de profil / cont (`/[locale]/profile`)

**Fișier:** `src/app/[locale]/(main)/profile/page.tsx`

Pagina are un header (avatar + nume + email) și 4 tab-uri: **Personal Info**,
**My Trips**, **Favorites**, **Settings**. Mai jos doar funcțiile nou-adăugate
(înainte erau placeholder-uri).

## 1. Schimbare parolă (Personal Info)
Card „Password" extensibil. Buton **Change** → formular: parolă curentă + nouă +
confirmare, fiecare cu show/hide.

Logica:
1. Validare client: nouă ≥ 6 caractere, = confirmare, ≠ parola curentă.
2. **Re-autentificare** cu parola curentă (`signInWithPassword`) — Supabase NU
   verifică parola veche la `updateUser`, deci o confirmăm manual. Parolă greșită
   → „Current password is incorrect".
3. `supabase.auth.updateUser({ password })` → toast „Password updated".

Conturile **OAuth-only** (Google/Facebook, fără provider `email`) nu au parolă →
văd o notă în loc de formular.

## 2. Ștergere cont (Settings → Danger zone)
Ștergere reală, în 2 pași: buton **Delete Account** → input unde trebuie tastat
**exact email-ul contului** ca să se activeze butonul final **Permanently delete**.

Logica:
1. `supabase.rpc('delete_user')` — funcție SQL `SECURITY DEFINER` care șterge
   rândurile userului (`favorites`, `saved_trips`, `profiles`) + rândul din
   `auth.users`. Rulează cu privilegii de owner, dar șterge doar `auth.uid()`.
2. `supabase.auth.signOut()` → redirect la homepage.

**De ce RPC și nu service-role:** browserul folosește anon key, care nu poate
atinge `auth.users`. Nu există `SUPABASE_SERVICE_ROLE_KEY` configurat, deci
funcția SECURITY DEFINER e calea corectă pe Supabase Free.

## 3. Upload poză de profil (avatar)
Cercul avatarului din header are un buton cu iconiță **cameră**. Click → file
picker (doar imagini, max 5 MB).

Logica:
1. Upload în Storage bucket `avatars`, path `‹uid›/avatar.‹ext›`, cu `upsert: true`.
2. `getPublicUrl` → URL public; se adaugă `?v=<timestamp>` ca să spargă cache-ul
   CDN (path-ul e stabil la upsert).
3. Se salvează URL-ul în `profiles.avatar_url`.
4. Afișare imediată prin state local optimist (`useUser` n-are refetch); fallback
   pe inițiale când nu există poză.

## ⚠️ Migrații SQL necesare (rulează manual în Supabase SQL Editor)
Supabase Free nu aplică automat fișierele din `supabase/migrations/`. Funcțiile de
mai sus **nu merg** până nu rulezi:

| Fișier | Ce creează |
|---|---|
| `supabase/migrations/20260619_delete_user_function.sql` | funcția `delete_user()` (necesară pt. #2) |
| `supabase/migrations/20260619_avatars_storage_bucket.sql` | bucket-ul `avatars` + politicile RLS (necesare pt. #3) |

Ambele sunt idempotente (safe de re-rulat). Schimbarea parolei (#1) nu necesită
nimic — folosește doar API-ul de auth.
