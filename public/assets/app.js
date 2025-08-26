// LexiLearn — Timed flow + full-session recording + transcript (standalone redirect)

const state = {
  day: 1, totalDays: 60, topic: null,
  qIndex: 0, qTotal: 6,
  answers: [],
  // per-question recording
  stream: null, mediaRecorder: null, chunks: [], blob: null,
  // full session recording (mic from start to finish)
  sessionRec: null, sessionChunks: [], sessionBlob: null,
  // STT
  rec: null, recSupported: ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window),
  // timer
  totalSecs: 5, timeLeft: 5, timerId: null,
  // transcript log for conversation page
  lines: [],
  started: false
};

const el = id => document.getElementById(id);

/* ---------- UI ---------- */
function fillDots(){
  const dots = el('day-dots'); if(!dots) return;
  dots.innerHTML = ''; const howMany = 20;
  for(let i=1;i<=howMany;i++){ const s=document.createElement('span'); if(i<state.day) s.classList.add('active'); dots.appendChild(s); }
}
function updateProgress(){
  el('day-num').textContent = state.day;
  el('start-day-num').textContent = state.day;
  el('progress-fill').style.width = `${(state.day/state.totalDays)*100}%`; fillDots();
}
function showLesson(){
  el('lesson-stage')?.classList.remove('hidden');
  el('summary')?.classList.add('hidden');
  el('finish')?.classList.add('hidden');
  el('feedback')?.classList.add('hidden');
}
function setTimer(sec){ el('timer').textContent = String(sec); }
function setFire(percent){ el('fire').style.width = `${Math.max(0, Math.min(100, percent*100))}%`; }

/* ---------- TTS with progressive text + push to lines ---------- */
function speakProgress(text, targetId){
  return new Promise(resolve=>{
    const target = el(targetId); if (!target) { state.lines.push({role:'system', text}); return resolve(); }
    target.textContent = '';
    let supported = true;
    try{ new SpeechSynthesisUtterance(''); } catch{ supported=false; }
    const done = () => { target.textContent = text; state.lines.push({ role:'system', text }); resolve(); };

    if(!supported){ target.textContent = text; return done(); }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';

    if ('onboundary' in u){
      let idx = 0;
      u.onboundary = (e)=>{ if (e.name === 'word' || e.charIndex != null){ idx = e.charIndex || idx; target.textContent = text.slice(0, idx); } };
    } else {
      let i = 0; const step = ()=>{
        target.textContent = text.slice(0, i);
        if (i < text.length){ i += 2; setTimeout(step, 20); }
      }; step();
    }
    u.onend = done;
    try{ speechSynthesis.speak(u); } catch { done(); }
  });
}

/* ---------- API (demo endpoints you already have; keep as-is) ---------- */
async function getQuestion(idx){
  const r = await fetch(`/api/day/${state.day}/question/${idx}`); return r.json();
}
async function submitAnswer(idx, blob){
  const fd = new FormData(); fd.append('audio', blob, `answer-${idx}.webm`);
  const r = await fetch(`/api/day/${state.day}/answer/${idx}`, { method:'POST', body: fd });
  return r.json();
}

/* ---------- Per-question recording ---------- */
async function ensureStream(){
  if (state.stream) return state.stream;
  state.stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1, sampleRate:48000 }
  });
  return state.stream;
}
async function startRecorder(){
  const stream = await ensureStream();
  state.chunks = [];
  state.mediaRecorder = new MediaRecorder(stream, { mimeType:'audio/webm' });
  state.mediaRecorder.ondataavailable = e=>{ if(e.data?.size>0) state.chunks.push(e.data); };
  state.mediaRecorder.onstop = ()=>{ state.blob = new Blob(state.chunks, { type:'audio/webm' }); };
  state.mediaRecorder.start();
}
function stopRecorder(){
  try { if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop(); } catch {}
}

/* ---------- Full-session recording (mic only) ---------- */
async function startFullSessionRecording(){
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1 }
  });
  state.sessionChunks = [];
  state.sessionRec = new MediaRecorder(mic, { mimeType:'audio/webm' });
  state.sessionRec.ondataavailable = e => { if (e.data?.size>0) state.sessionChunks.push(e.data); };
  state.sessionRec.onstop = () => { state.sessionBlob = new Blob(state.sessionChunks, { type:'audio/webm' }); };
  state.sessionRec.start();
}
function stopFullSessionRecording(){
  try { state.sessionRec?.state === 'recording' && state.sessionRec.stop(); } catch {}
}

/* ---------- STT (live) ---------- */
function setupRecognition(){
  if (!state.recSupported) return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
  rec.onresult = (e)=>{
    let interim = ''; let final = el('stt-live').getAttribute('data-final') || '';
    for (let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal){ final = (final ? final+' ' : '') + t.trim(); }
      else interim = t;
    }
    el('stt-live').textContent = interim || final || '—';
    el('stt-live').setAttribute('data-final', final);
  };
  rec.onerror = ()=>{}; rec.onend = ()=>{};
  return rec;
}
function startRecognition(){
  if (!state.recSupported) return;
  el('stt-live').textContent = '—'; el('stt-live').setAttribute('data-final','');
  state.rec = setupRecognition(); try { state.rec?.start(); } catch {}
}
function stopRecognition(){ try { state.rec?.stop(); } catch {} }
function commitUserText(){
  const userFinal = el('stt-live').getAttribute('data-final') || '';
  if (userFinal.trim()) state.lines.push({ role:'user', text: userFinal.trim() });
}

/* ---------- Timer / Fire ---------- */
function startTimer(seconds=5){
  clearTimer();
  state.totalSecs = seconds; state.timeLeft = seconds; setTimerUI();
  state.timerId = setInterval(()=>{
    state.timeLeft -= 1; setTimerUI();
    if (state.timeLeft <= 0){
      clearTimer(); stopRecognition(); stopRecorder();
      setTimeout(processAnswerAndContinue, 150);
    }
  }, 1000);
}
function setTimerUI(){ el('timer').textContent = String(state.timeLeft); setFire(state.timeLeft / state.totalSecs); }
function clearTimer(){ if (state.timerId){ clearInterval(state.timerId); state.timerId=null; } }

/* ---------- Flow ---------- */
async function askCurrentQuestion(){
  const meta = await getQuestion(state.qIndex);
  if (!state.topic) state.topic = meta.topic;
  el('topic-name').textContent = state.topic;
  el('q-total').textContent = state.qTotal;
  el('q-index').textContent = state.qIndex;

  // reset live UI
  el('tts-live').textContent = ''; el('stt-live').textContent = '—'; el('stt-live').setAttribute('data-final','');
  el('corr-live').textContent = ''; el('feedback').classList.add('hidden');

  await speakProgress(`Question ${state.qIndex}. ${meta.question}`, 'tts-live');

  await startRecorder();        // per-question rec (for demo server)
  startRecognition();           // live preview
  startTimer(5);                // fire timer
}

async function processAnswerAndContinue(){
  // send short answer blob (demo)
  const res = await submitAnswer(state.qIndex, state.blob);
  const transcript = res.transcript || el('stt-live').getAttribute('data-final') || '—';

  el('transcript').textContent = transcript;
  el('correction').textContent = res.correction ?? '—';
  el('note').textContent = res.note ?? '—';
  el('feedback').classList.remove('hidden');

  state.answers.push({ q: `Q${state.qIndex}`, transcript, correction: res.correction, note: res.note });

  // add to full transcript
  commitUserText();
  const corrText = `Correction: ${res.correction || '—'}. ${res.note || ''}`;
  await speakProgress(corrText, 'corr-live');
  state.lines.push({ role:'correction', text: corrText });

  if (state.qIndex < state.qTotal){
    state.qIndex++; await askCurrentQuestion();
  } else {
    await speakProgress("Great job! You finished all questions for today.", 'tts-live');
    el('finish').classList.remove('hidden');
  }
}

async function startDay(){
  if (state.started) return;            // prevent double start
  state.started = true;
  const btn = document.getElementById('start-day'); if (btn) btn.disabled = true;

  state.qIndex = 1; state.answers = []; state.lines = [];
  updateProgress(); showLesson();

  // start full-session recording
  await startFullSessionRecording();

  // intro
  await speakProgress("Welcome! Great decision to start today.", 'tts-live');
  await speakProgress(`This is Day ${state.day} of your 60-day speaking challenge.`, 'tts-live');

  // preload topic
  const meta = await getQuestion(state.qIndex);
  state.topic = meta.topic; el('topic-name').textContent = state.topic;

  await speakProgress(`Today's topic is: ${state.topic}. You will have one minute per question.`, 'tts-live');

  await askCurrentQuestion();
}

/* ---------- Finish → Standalone page via localStorage (no API) ---------- */
function buildFullTranscript(){
  return state.lines.map(l=>{
    const who = l.role==='system'?'System': l.role==='user'?'You':'Correction';
    return `${who}: ${l.text}`;
  }).join('\n');
}

async function finalizeAndGoStandalone(){
  // stop everything
  stopRecognition(); clearTimer(); stopRecorder();
  stopFullSessionRecording();
  await new Promise(r=> setTimeout(r, 300));

  const fullText = buildFullTranscript();

  // prepare audio url (or empty blob if none)
  let audioUrl = '';
  try{
    const blob = state.sessionBlob || new Blob([], { type:'audio/webm' });
    audioUrl = URL.createObjectURL(blob);
  }catch{ /* ignore */ }

  // store to localStorage
  try{
    localStorage.setItem('lexi-text', fullText || '—');
    localStorage.setItem('lexi-audio', audioUrl || '');
  }catch(e){
    console.warn('localStorage failed:', e);
  }

  // go to standalone page
  window.location.href = 'conversation.html';
}

/* ---------- Wiring ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  updateProgress(); fillDots();

  const startBtn  = document.getElementById('start-day');
  const finishBtn = document.getElementById('finish-day');

  if (startBtn){
    startBtn.addEventListener('click', async ()=>{
      try{
        await navigator.mediaDevices.getUserMedia({ audio: true }); // mic permission
        await startDay();
      }catch(err){
        console.error(err);
        alert('Please allow microphone access and open via http://localhost:3000');
      }
    });
  }

  if (finishBtn){
    // open standalone page with localStorage payload
    finishBtn.addEventListener('click', finalizeAndGoStandalone);
  }
});
