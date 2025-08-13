// LexiLearn Prototype Backend (Node.js/Express)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(__dirname, 'uploads');
app.use(express.static(PUBLIC));

// Storage
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
const storage = multer.diskStorage({
  destination: function(req, file, cb){ cb(null, UPLOADS) },
  filename: function(req, file, cb){ cb(null, Date.now() + '-' + file.originalname) }
});
const upload = multer({ storage });

// Simple in-memory lesson content for demo
const LESSONS = {
  1: {
    topic: 'Daily Routines',
    questions: [
      'What do you usually do in the morning?',
      'What time do you start studying or working?',
      'How do you get to your university or workplace?',
      'What do you eat for lunch?',
      'What do you do in the evening to relax?',
      'What time do you usually go to bed?'
    ]
  }
};

function fakeSpeechToText(){ 
  // Demo: we are not transcribing; we will return a placeholder
  // In real app, call Whisper or similar here.
  const samples = [
    'I drink coffee and read news',
    'I go to work at nine',
    'I take the bus to university',
    'I eat sandwich for lunch',
    'I watch series and relax',
    'I sleep at ten'
  ];
  return samples[Math.floor(Math.random()*samples.length)];
}

function simpleGrammarCorrection(text){
  // Extremely naive demo "corrections"
  let t = text.trim();
  // Capitalize first letter
  if(t.length>0) t = t[0].toUpperCase() + t.slice(1);
  // Add "a" before singular common nouns (very rough!)
  t = t.replace(/\b(I (?:eat|have|drink)) (coffee|sandwich|tea)\b/gi, (m,a,b)=>`${a} a ${b}`);
  // article for times
  t = t.replace(/\b(go|start) work\b/gi, '$1 to work');
  // Ensure present simple 'I' usage
  t = t.replace(/\bI goes\b/gi, 'I go');
  return {
    correction: t,
    note: "Basic correction applied (demo). Real app uses STT + grammar model."
  };
}

// API: get a question
app.get('/api/day/:day/question/:idx', (req, res) => {
  const day = parseInt(req.params.day, 10);
  const idx = parseInt(req.params.idx, 10) - 1;
  const lesson = LESSONS[day] || LESSONS[1];
  const question = lesson.questions[idx] || lesson.questions[lesson.questions.length-1];
  res.json({ topic: lesson.topic, question });
});

// API: submit answer audio
app.post('/api/day/:day/answer/:idx', upload.single('audio'), (req, res) => {
  const transcript = fakeSpeechToText();
  const { correction, note } = simpleGrammarCorrection(transcript);
  res.json({ transcript, correction, note, saved: !!req.file, file: req.file ? req.file.filename : null });
});

// API: finish day -> summary + simple stats
app.post('/api/day/:day/finish', (req, res) => {
  const { answers } = req.body || { answers: [] };
  const summary = (answers || []).map((a, i) => ({
    question: a.q,
    transcript: a.transcript,
    correction: a.correction,
    note: a.note
  }));
  res.json({
    summary,
    daysCompleted: 1,
    performance: "Improving"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log('LexiLearn prototype running on http://localhost:'+PORT);
});
