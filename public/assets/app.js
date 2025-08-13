// LexiLearn Prototype Frontend (vanilla JS)
const state = {
  day: 1,
  totalDays: 60,
  topic: null,
  qIndex: 0,
  qTotal: 6,
  mediaRecorder: null,
  chunks: [],
  answers: [], // {q, transcript, correction, note}
};

const el = (id)=>document.getElementById(id);

function fillDots(){
  const dots = el('day-dots');
  dots.innerHTML = '';
  const howMany = 20; // just show first 20 days at a glance
  for(let i=1;i<=howMany;i++){
    const s = document.createElement('span');
    if(i < state.day) s.classList.add('active');
    dots.appendChild(s);
  }
}

function speak(text){
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch(e){ console.warn('speechSynthesis not available'); }
}

async function getQuestion(idx){
  const res = await fetch(`/api/day/${state.day}/question/${idx}`);
  return res.json();
}

async function submitAnswer(idx, blob){
  const fd = new FormData();
  fd.append('audio', blob, `answer-${idx}.webm`);
  const res = await fetch(`/api/day/${state.day}/answer/${idx}`, { method:'POST', body: fd });
  return res.json();
}

function updateProgress(){
  el('day-num').textContent = state.day;
  el('start-day-num').textContent = state.day;
  el('progress-fill').style.width = `${(state.day/state.totalDays)*100}%`;
  fillDots();
}

function showLesson(){
  el('lesson-stage').classList.remove('hidden');
  el('summary').classList.add('hidden');
  el('finish').classList.add('hidden');
  el('feedback').classList.add('hidden');
}

async function startDay(){
  state.qIndex = 1;
  state.answers = [];
  updateProgress();
  showLesson();
  const meta = await getQuestion(state.qIndex);
  state.topic = meta.topic;
  el('topic-name').textContent = state.topic;
  el('q-total').textContent = state.qTotal;
  el('q-index').textContent = state.qIndex;
  el('q-text').textContent = meta.question;
}

async function nextQuestion(){
  if(state.qIndex < state.qTotal){
    state.qIndex++;
    const meta = await getQuestion(state.qIndex);
    el('q-index').textContent = state.qIndex;
    el('q-text').textContent = meta.question;
    el('feedback').classList.add('hidden');
  }else{
    el('finish').classList.remove('hidden');
  }
}

function enableRecordingUI(start=true){
  el('start-rec').disabled = !start ? true : false;
  el('stop-rec').disabled = !start ? false : true;
  el('submit-answer').disabled = true;
}

async function initRecorder(){
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.mediaRecorder = new MediaRecorder(stream);
  state.chunks = [];
  state.mediaRecorder.ondataavailable = e => { if(e.data.size>0) state.chunks.push(e.data); };
  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.chunks, { type:'audio/webm' });
    const url = URL.createObjectURL(blob);
    const preview = el('preview');
    preview.src = url; preview.hidden = false;
    el('submit-answer').disabled = false;
    state._lastBlob = blob;
  };
}

async function handleSubmit(){
  el('submit-answer').disabled = true;
  const res = await submitAnswer(state.qIndex, state._lastBlob);
  el('transcript').textContent = res.transcript;
  el('correction').textContent = res.correction;
  el('note').textContent = res.note;
  el('feedback').classList.remove('hidden');
  speak(`Correction: ${res.correction}. ${res.note}`);
  state.answers.push({ q: el('q-text').textContent, ...res });
}

function renderSummary(items){
  el('sum-day').textContent = state.day;
  const wrap = el('summary-list');
  wrap.innerHTML = '';
  items.forEach((it, i)=>{
    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <div class="q-item">
        <p><strong>Q${i+1}:</strong> ${it.question}</p>
        <p><strong>Your Answer:</strong> ${it.transcript}</p>
        <p><strong>Correction:</strong> ${it.correction}</p>
        <p class="note"><strong>Feedback:</strong> ${it.note}</p>
      </div>`;
    wrap.appendChild(card);
  });
}

async function finishDay(){
  const res = await fetch(`/api/day/${state.day}/finish`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ answers: state.answers })
  });
  const data = await res.json();
  renderSummary(data.summary);
  el('lesson-stage').classList.add('hidden');
  el('summary').classList.remove('hidden');
  el('days-completed').textContent = data.daysCompleted;
  el('performance').textContent = data.performance;
}

document.addEventListener('DOMContentLoaded', ()=>{
  updateProgress();
  fillDots();

  el('start-day').addEventListener('click', startDay);
  el('play-question').addEventListener('click', ()=>{ speak(el('q-text').textContent) });

  el('start-rec').addEventListener('click', async ()=>{
    await initRecorder();
    state.mediaRecorder.start();
    enableRecordingUI(false);
  });
  el('stop-rec').addEventListener('click', ()=>{
    state.mediaRecorder.stop();
    enableRecordingUI(true);
  });
  el('submit-answer').addEventListener('click', handleSubmit);
  el('next-question').addEventListener('click', nextQuestion);
  el('finish-day').addEventListener('click', finishDay);
});
