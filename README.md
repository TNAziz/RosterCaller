# Roster Caller

An iPhone web app for calling on students. It picks a student at random, shows their photo and name, and lets you mark **Answered**, **No answer**, or **Absent**. Every mark is saved with the date and can be exported as CSV. A separate **Learn** mode helps you practice students' names.

All rosters, photos, and records are stored **only on the phone** (IndexedDB). Nothing is uploaded anywhere, including the roster PDF: it is read on the phone by [pdf.js](https://mozilla.github.io/pdf.js/), which is bundled with the app in `vendor/pdfjs`.

## Install on iPhone

1. Host this folder on any HTTPS site (e.g. GitHub Pages: repo **Settings → Pages → Deploy from branch → `main` / root**). Only the app's code is hosted; no student data ever goes there.
2. Open the URL in **Safari** on the iPhone (iOS 16.4 or later).
3. Tap **Share → Add to Home Screen**. Launch it from the home-screen icon from then on. It works offline, and iOS keeps its data more reliably than in a browser tab.

## Add a class

- **Import roster PDF** (recommended): download your class photo roster PDF (e.g. NC State's *Faculty Class Photo Roster*), save it to Files, then tap **Import PDF** on the Roster tab. The app reads each student's photo, name, student ID, and pronouns (from names like `Jane Doe (she/her/hers)`), and flags students marked `*` for additional FERPA restrictions. Importing a newer roster later updates students instead of duplicating them. You can delete the PDF afterwards.
- Or add students one at a time, paste a list of names, or import photos named after each student (`Jane Doe.jpg`, `Doe, Jane.jpg`).

## Use

- **Call**: tap **Pick a student**. Faces slide past and stop on a student; tap the result. With *Call least-called first* on (Settings), students who have been called the fewest times (since you last tapped *Reset call balance*, or ever) are picked first. The count never resets on its own; reset it in Settings, e.g. at the start of a new semester. History and exports keep every record either way. Absent students are never picked.
- **Learn**: practice names with flashcards (tap to reveal, then *Knew it* / *Missed it*) or multiple choice. Names you miss come back sooner. Practice never affects call records.
- **Roster**: search, set today's attendance (Present/Absent), and edit names, pronouns, photos, and IDs.
- **History**: browse by date, delete mistaken marks, and **Export CSV**: call log, per-student summary, or attendance by date. Exports include student IDs so they line up with your gradebook.
- **Settings (gear)**: classes, accent color, and **back up / restore** all data (including photos) as a JSON file. Back up now and then: removing the app from the home screen deletes its data.

## Privacy

Student photos and records are part of students' educational records. This app keeps them on your device only. Treat exported CSVs and backup files the same way you treat the roster PDF. The repository's `.gitignore` blocks PDFs, CSVs, and backup files so they cannot be committed by accident.

## Development

Plain HTML/CSS/JS with no build step. `roster-pdf.js` holds the PDF reader. When you change any file, bump `VERSION` in `sw.js` so installed copies pick up the update.

pdf.js is © Mozilla, Apache License 2.0 (`vendor/pdfjs/LICENSE`).
