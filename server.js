// LexiLearn Prototype Backend (Node.js/Express)

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مجلدات
const PUBLIC  = path.join(__dirname, 'public');
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

app.use(express.static(PUBLIC));
app.use('/uploads', express.static(UPLOADS));

// Multer config
const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, UPLOADS),
  filename:    (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// دروس تجريبية
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

// بيانات الجلسات في الذاكرة
const sessions = new Map();
function makeId(){ return Math.random().toString(36).slice(2, 10); }

// ========== APIs ==========

// سؤال
app.get('/api/day/:day/question/:idx', (req,res)=>{
  const day = parseInt(req.params.day,10);
  const idx = parseInt(req.params.idx,10)-1;
  const lesson = LESSONS[day] || LESSONS[1];
  const question = lesson.questions[idx] || lesson.questions[lesson.questions.length-1];
  res.json({ topic: lesson.topic, question });
});

// جواب (هنا حطينا فقط محاكاة بسيطة)
app.post('/api/day/:day/answer/:idx', upload.single('audio'), (req,res)=>{
  const transcript = 'Demo transcript';
  res.json({
    transcript,
    correction: transcript + ' (corrected)',
    note: 'Demo feedback',
    saved: !!req.file,
    file: req.file ? req.file.filename : null
  });
});

// إغلاق يوم (ملخص عادي)
app.post('/api/day/:day/finish', (req,res)=>{
  const { answers } = req.body || { answers: [] };
  res.json({
    summary: answers || [],
    daysCompleted: 1,
    performance: "Improving"
  });
});

// ====== الجلسة الكاملة ======

// حفظ الجلسة
app.post('/api/session/finalize', upload.single('audio'), (req,res)=>{
  const id = makeId();
  const transcript = req.body.transcript || '';
  const day = parseInt(req.body.day || '1', 10);
  const audioFile = req.file ? req.file.filename : null;
  sessions.set(id, { id, day, transcript, audioFile });
  res.json({ id });
});

// استرجاع الجلسة
app.get('/api/session/:id', (req,res)=>{
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json({
    id: s.id,
    day: s.day,
    audioUrl: s.audioFile ? '/uploads/' + s.audioFile : '',
    transcript: s.transcript
  });
});

// توليد PDF بسيط بدون مكتبات خارجية
app.get('/api/session/:id/pdf', (req,res)=>{
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).send('Not found');

  const text = (s.transcript || '').replace(/\r/g,'');
  const lines = text.split('\n');
  const wrapped = [];
  lines.forEach(line=>{
    while(line.length > 90){
      wrapped.push(line.slice(0,90));
      line = line.slice(90);
    }
    wrapped.push(line);
  });

  // بناء PDF يدويًا
  const objects = [];
  const add = str => { objects.push(str); return objects.length; };

  const fontObj = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let content = 'BT /F1 12 Tf 50 780 Td ';
  wrapped.forEach((ln,i)=>{
    if(i>0) content += 'T* ';
    const safe = ln.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
    content += `(${safe}) Tj `;
  });
  content += 'ET';
  const contentObj = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const pageObj   = add(`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>`);
  const pagesObj  = add(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);
  const catalogObj= add(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  const writeObj = (i, body)=>{
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${i} 0 obj\n${body}\nendobj\n`;
  };
  writeObj(1, objects[0]);
  writeObj(2, objects[1]);
  writeObj(3, objects[2]);
  writeObj(4, objects[3]);
  writeObj(5, objects[4]);

  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for(let i=1;i<=5;i++){
    pdf += String(offsets[i]).padStart(10,'0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size 6 /Root 5 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="lexilearn-transcript-day${s.day}.pdf"`);
  res.send(pdf);
});

// ========== تشغيل ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));
