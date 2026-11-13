# Hospitalist OS v1.4.1 — Clinical Productivity Edition

## What changed
- **Off day** in Shift Type: saving Off forces zero actual and paid hours and removes start/end times; excluded from shift count while shown in calendar.
- **Compact CPT dropdown** in CPT & wRVU, populated with commonly used inpatient hospitalist codes. Opening the dropdown shows a vertical scrollable list; selecting a code autofills code, label and verified 2026 **work** RVU when available. Manual edits are possible. Additional codes require rate verification.
- Preset source: 2026 CMS PFS / SGO 2026 work RVU table. Review the current-year CMS RVU file and your employer's coding guidance as needed. This is not coding or reimbursement advice.
- **Cross-device sync is NOT included yet**. GitHub Pages stores only public static app files. Automatic secure synchronization requires a separately configured authenticated backend, per-user security policies, conflict handling and consent. Local JSON backup/restore remains available.

## Upgrade from v1.3
1. Export JSON backup from the original app if any entries exist.
2. Upload the contents of this folder (not the enclosing folder) to the ROOT of the same GitHub repository and commit. Do not upload backups to public GitHub.
3. Open the website online, refresh, then relaunch installed apps online once to update offline cache.
4. Existing browser-local records are preserved under the same storage key; no compensation tracking is added.

## Clinical privacy
No patient-identifiable data. Do not enter PHI, MRNs, names or identifiable narratives into the app or any future sync backend.

## v1.4.1 layout correction
Replaced the oversized horizontal CPT cards with a native select control located in the CPT code field, matching the Shift Type control. Existing local billing data is preserved. The 2026 preset values remain editable after selection.
