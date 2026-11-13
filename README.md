# Hospitalist OS — Installable offline PWA

## Deploy (required for iPhone/desktop installation)
Upload the **contents** of this folder to an HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages, or equivalent). The website needs HTTPS for service-worker caching; opening `index.html` directly from Files or a `file://` URL is NOT enough to install it as a PWA.

- iPhone: Open the HTTPS website in Safari → Share → Add to Home Screen → Add.
- Android: Open in Chrome → Install app / Add to Home screen.
- Chrome/Edge desktop: Open the HTTPS website → browser Install icon or menu → Install.
- First visit online downloads the app shell. After the first successful load, you can reopen it offline.

## Included
Dashboard, shift calendar, time and workload logs, **dedicated GME teaching-hour log with separate contract settings**, wRVU entry, payroll comparison (including observed paid-vs-scheduled hours), generic Meditech documentation templates, JSON backup/restore, CSV export. No server or account; records remain in the local browser origin's storage. No Google Calendar/Meditech/payroll integration.

## Security and backup
This is a personal operational tool, NOT a HIPAA-compliant EHR or a patient chart. Never enter PHI or identifiable encounter narratives. Never deploy this on a publicly accessible host with private records in the source. The code ships with **no data**. Records are stored in localStorage and can be lost when browser storage is cleared or the app is reinstalled. Export JSON backups frequently and store them safely. Each domain/browser/device has separate data (no cloud sync).

## Compensation
Default estimates: $108.50/hr base, $8.60 per wRVU, $750 call. These are editable and do not establish your employer's actual pay rules. CPT unit wRVU values must be verified and entered by the user.

## Preview locally
From the extracted folder, run `python3 -m http.server 8000` and visit `http://localhost:8000`. Desktop localhost can register service workers, but mobile installation needs HTTPS.

## GME module (v1.1)
GME activity hours can be logged by date, teaching category, start/end time, breaks and user-confirmed payable hours. The annual $36,000 reference and Dec 1, 2026 effective date are preconfigured; GME hourly rate is deliberately blank until confirmed. The GME estimates do not count toward hospitalist wages or RVU pay. Period CSV exports and JSON backup/restore include GME logs. Existing v1 browser data and backups migrate without deleting other records.
