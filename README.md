# Spin & Win 🎡

Audience participation spinning wheel for meetups. Attendees join from their phones; the presenter controls the wheel.

**Live app:** https://ibxibx.github.io/wheel/

**Join page (phones):** https://ibxibx.github.io/wheel/join.html

## Running locally (with LAN access for phones)

```bash
npm install
node server.js
# Presenter: http://localhost:3000
# Phones:    http://<your-LAN-ip>:3000/join.html
```

Find your LAN IP: `ipconfig | findstr IPv4` (Windows)

## Stack
- Vanilla HTML/CSS/JS — no build step
- Firebase Realtime Database — live queue & wheel sync across devices
- BroadcastChannel API — instant same-browser tab sync
- Web Audio API — generated tick sounds, no audio files
- qrcodejs — QR code rendered in the presenter sidebar
