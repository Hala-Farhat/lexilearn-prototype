# LexiLearn — Daily Lesson Prototype (Voice-first)

Branding: Palestine theme — flag colors, kufiya net pattern, olive (sumud).

## What this demo does
- Start Day -> topic, Q1..Q6
- Play question (TTS via Web Speech API)
- Record your answer (MediaRecorder)
- Upload to Node.js backend (Multer)
- Fake STT + naive grammar correction (for demo)
- Speak the correction (TTS)
- Finish -> Summary screen + simple stats

> Designed to match the attached prototype sections: **Starting the Lesson**, **Lesson Begins**, **Real-Time Feedback**, **End of the Lesson**, **Sidebar**.

## Run locally
```bash
cd lexilearn-prototype
npm install
npm start
# then open http://localhost:3000
```

> Microphone permissions are required. Works on most desktop browsers over `http://localhost`.

## Files
- `public/index.html` — pure HTML
- `public/assets/styles.css` — pure CSS (flag colors, kufiya pattern, olive motif)
- `public/assets/app.js` — pure JS (MediaRecorder, flow, API calls)
- `server.js` — Node.js (Express + Multer) backend
- `uploads/` — saved audio files
- `public/assets/logo.svg`, `kufiya.svg`, `olive.svg` — brand assets

## What’s missing (planned next)
- Real STT (Whisper) and grammar feedback (LLM) instead of demo placeholders
- Real TTS service (e.g., Polly) or server-generated audio responses
- User accounts + DB (e.g., PostgreSQL) to store sessions
- Multi-day progress persistence and analytics
- Mobile polish + accessibility testing
