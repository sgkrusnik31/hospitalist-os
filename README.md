# Hospitalist OS v1.3 — Clinical Productivity Edition

Installable, offline-capable PWA for work scheduling, aggregate workload, wRVU productivity, GME time, and blank Meditech documentation templates. **No financial or compensation tracking.**

## Install / update on GitHub Pages
1. Open the existing app on each device and export a JSON backup under Settings & Backup before deployment.
2. Upload **the contents of this directory** to the root of your `hospitalist-os` repository, replacing the previous app files. Commit changes. GitHub Pages publishes your existing address.
3. After deployment, refresh the website online once, allowing the updated service worker to cache the new files. Reopen installed iPhone/desktop app while online once for the upgrade.
4. Confirm the title shows v1.3 and there is no Payroll or Compensation section.

## Data migration and financial privacy
v1.3 intentionally uses a new browser storage key (`hospitalist-os-clinical-v1`) and copies only clinical-operations fields from earlier versions (`hospitalist-os-v1`) **on first load**: shifts (date, type, start/end, actual/paid hours, operational note), work (aggregate counts), billing (CPT, units and wRVUs only), and GME (hours and activity category). It never copies hourly rates, annual compensation, dollar-denominated bonuses, home-call stipends, or paycheck history into v1.3. Previous version's browser storage **is not deleted automatically**, so you can still return to the previous version or export a backup before deleting it; clearing the browser's site data removes both old and new data. Financial columns in old JSON backups are ignored on import into v1.3. For maximum separation, manually clear old site data only after saving a backup and noting it will erase your v1.3 local data too.

Your data stays on this device/browser. There is no automatic syncing between devices. Export backups regularly; browser storage can be cleared by the browser or operating system. Avoid uploading JSON exports to the public GitHub repository.

## Sections
- Dashboard: monthly logged shifts, actual vs timesheet hours, admissions, encounters, and wRVU units.
- Shift Calendar: shifts and estimated two-day post-call restriction flags (verify actual restrictions).
- Time & Workload: shifts, hours, daily census/admissions/discharges and resident-team census with usual 20/14 cap hints.
- CPT & wRVU Activity: service-date CPT, units, manually verified wRVU per unit, productivity-only summaries and CSV export.
- GME Hours: category, start/end, break, recorded hours, monthly/all-time hours, CSV export. Date minimum December 1, 2026.
- Note Builder: generic blank, patient-free Meditech templates, copying, TXT export.
- Settings: clinical-only JSON import/export and erase.

## Privacy and safety
**Not a HIPAA-reviewed system, not an EHR, and not approved to contain PHI.** Do not enter patient names, MRNs, DOBs, encounter IDs, room numbers or identifying medical narratives. Data entered into this app resides in unencrypted browser local storage and is not synchronized. Avoid resident identities or names. The app contains no pre-entered patient data.

On mobile, install from Safari using Share → Add to Home Screen. On desktop, open in Chrome or Edge and select Install. HTTPS required for reliable service-worker offline caching.
