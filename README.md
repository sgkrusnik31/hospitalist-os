# Hospitalist OS v1.5 — Offline-first sync & productivity

## New in v1.5
- Optional **iPhone ↔ desktop synchronization** via your own Supabase project and account; local offline entry remains available without any account.
- Automatically attempts synchronization after local edits, on reconnection, on returning to the app, and periodically while open.
- **Conflict protection:** if the same entry changes on multiple devices, syncing pauses with explicit choices instead of silently overwriting records. Different entries are merged automatically after a common baseline is established.
- CPT dropdown remains vertical like Shift Type; CPT **Units** can log multiple same-code encounters, with total wRVU calculated as units × verified work RVU per unit.
- Monthly billing summary now displays coded encounter units, number of billing dates, and average wRVU per billing date.
- All finances and compensation tracking remain excluded.

## Deploy to GitHub Pages
1. **Export a JSON backup** from Settings & Backup on every device that already has app records.
2. Extract this ZIP. In your existing GitHub `hospitalist-os` repository, upload the CONTENTS of this directory to the repository root, replacing matching files. Do not upload an enclosing folder or backup data.
3. Commit. Once GitHub Pages deploys, open the website while online, refresh, and reopen installed iPhone/desktop versions online once to update the service worker. The app title should say v1.5 in your browser tab.
4. Existing v1.4.x local entries persist under the same browser storage key.

## Connect secure private sync (one-time setup)
You **must** configure a Supabase backend separately. Sync is not active just by uploading the files to GitHub Pages.

1. Create a [Supabase](https://supabase.com) project under an account you control. Protect your Supabase account with MFA.
2. In the Supabase dashboard, open **SQL Editor** and run the complete contents of `supabase_setup.sql`. It creates a one-row-per-user storage table, enables row-level security, and creates an atomic revision-checked write function.
3. Under **Authentication → Providers → Email**, enable email/password sign-in. Turn on email verification, ideally, and restrict sign-ups as desired. Configure the authorized Site URL for `https://sgkrusnik31.github.io/hospitalist-os/` as appropriate to the current Supabase Auth configuration.
4. Copy the **Project URL** and **publishable** key (begins `sb_publishable_`) from your Supabase project settings. **Never** use `sb_secret_`, `service_role`, database password, or JWT signing key in the app.
5. Open Hospitalist OS → **Settings & Backup** → synchronization. Paste URL and publishable key, click **Save sync settings**. Create an account using email/password, verify email if requested, then sign in. Click **Sync now**. Export a backup first.
6. On the second device, open the same updated website, enter the same project URL and publishable key, and sign in with the **same email account**. Click Sync now. Each device has its own offline cache but shares your cloud snapshot.
7. Edit a test shift on one device, wait for status "Synced", and open/refresh the other device while online. Test offline entry then reconnection.

### Important behavior
- **Initial setup:** if both devices already have independently-created records, the app stops and asks you which copy to keep. Export backups first. For best results, sync your main device before signing in on your other device.
- **Concurrent edits:** different records can merge automatically once both devices share a baseline. A conflicting edit to the same record, or delete-versus-edit, pauses and asks whether to keep the local or cloud copy. Choosing one copy **replaces the other entire copy**, so export backups before choosing. There is no automatic per-field conflict resolution.
- Data edits remain on the device if offline or a network request fails. The app retries when online. Cloud sync requires the same signed-in account on each device. Do not clear browser storage without saving a backup.
- If a phone and desktop are on different accounts, each account gets isolated cloud records. Signing out does not erase locally stored records.
- The PWA caches application code, **not** Supabase network requests. Sync tokens remain in the browser's local storage; use protected devices, strong passwords, and avoid shared/public computers.
- **NO patient information.** This app is NOT a HIPAA-compliant EHR, is not approved for protected health information, and has no Meditech integration. Use only shift, aggregate workload, GME activity, aggregated billing, and generic note templates without patient-identifiable clinical narratives. Do not upload JSON backups to GitHub.
- This prototype's security configuration must be reviewed before any higher-risk deployment. Do not store compensation or financial information here.

## Troubleshooting
- 'Not configured': add correct URL and publishable key in both devices.
- 'Invalid login credentials': check email verification, email/password and provider settings.
- 'Permission denied' / 'function not found': run the provided SQL script and confirm the function is in the `public` schema.
- 'Conflicting edits': export JSON backups before selecting a copy. Save records manually from the other backup if necessary.
- Old interface: open online once to update offline cache. Hard-refresh desktop if needed without clearing site data.
- Supabase service maintenance/network failure: local app and local record entry continue to work; a status message notes unsynced changes.
