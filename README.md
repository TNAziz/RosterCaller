# Roster Caller

An iPhone web app for cold calling: picks a random student, shows their photo, and lets you mark **Answered**, **No answer**, or **Absent**. Attendance and call history are kept per class and can be exported as CSV.

All rosters, photos, and records are stored **only on the phone** (IndexedDB). Nothing is uploaded anywhere.

## Install on iPhone

1. Host this folder on any HTTPS site (e.g. GitHub Pages: repo **Settings → Pages → Deploy from branch → `main` / root**).
2. Open the URL in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen**. Launch it from the home-screen icon from then on (it works offline, and iOS keeps its data more reliably than in a browser tab).

## Use

- **Roster tab**: add students one at a time (take/choose a photo), paste a list of names, or import photos named after each student (`Jane Doe.jpg`, `Doe, Jane.jpg`). Tap 📷 next to a name to add a photo. Tap **Present/Absent** to set today's attendance.
- **Call tab**: tap **Pick a student**, then mark the result. Absent students are never picked. With *Fair rotation* on (Settings), everyone present is called once before anyone is called again that day.
- **History tab**: browse by date, delete mistaken marks, and **Export** a call log, per-student summary, or attendance-by-date CSV.
- **Settings (gear)**: multiple classes, back up / restore all data (including photos) as a JSON file. Back up occasionally: deleting the app from the home screen deletes its data.
