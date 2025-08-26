<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LexiLearn — Daily Lesson Prototype</title>
  <link rel="stylesheet" href="/assets/styles.css"/>
</head>
<body>
<header class="brand">
  <div class="brand-left">
    <img src="/assets/logo.svg" class="logo" alt="LexiLearn Palestine Logo"/>
    <div class="brand-titles">
      <h1>LexiLearn</h1>
      <p class="subtitle">60-Day Voice Challenge</p>
    </div>
  </div>
  <div class="progress">
    <div class="progress-label">Day <span id="day-num">1</span> of 60</div>
    <div class="progress-bar"><span id="progress-fill" style="width:4%;"></span></div>
  </div>
</header>

<main class="container">
  <aside class="sidebar">
    <div class="card">
      <h3>Challenge Progress</h3>
      <div class="dots" id="day-dots"></div>
      <ul class="stats">
        <li>Days Completed: <strong id="days-completed">0</strong></li>
        <li>Performance: <strong id="performance">—</strong></li>
      </ul>
    </div>
    <div class="card motif">
      <img src="/assets/olive.svg" alt="Olive branch"/>
      <p class="motif-text">Colors of the flag • Kufiya net • Olive • Sumud</p>
    </div>
  </aside>

  <section class="lesson">
    <div class="card hero-min">
      <h3 id="topic">Today’s topic is: <span id="topic-name">—</span></h3>
      <p class="q-label">Question <span id="q-index">1</span> / <span id="q-total">6</span></p>
      <p id="q-text" class="hidden">—</p>
    </div>

    <!-- حوار متزامن -->
    <div class="card convo">
      <div class="line system">
        <span class="who">System</span>
        <span id="tts-live" class="live"></span>
      </div>
      <div class="line user">
        <span class="who">You</span>
        <span id="stt-live" class="live">—</span>
      </div>
      <div class="line corr">
        <span class="who">Correction</span>
        <span id="corr-live" class="live"></span>
      </div>
    </div>

    <!-- مؤقّت لهب -->
    <div class="card timer-wrap">
      <div class="fire-timer">
        <div id="fire" class="flame-bar"></div>
        <div class="fire-glow"></div>
        <div class="ticks"></div>
        <div class="timer-num">⏱ <span id="timer">60</span>s</div>
      </div>
      <audio id="preview" controls class="preview" hidden></audio>
    </div>

    <!-- فيدباك وملخّص -->
    <div class="card feedback hidden" id="feedback">
      <h4>Feedback</h4>
      <p><strong>Transcript:</strong> <span id="transcript">—</span></p>
      <p><strong>Correction:</strong> <span id="correction">—</span></p>
      <p><strong>Note:</strong> <span id="note">—</span></p>
    </div>

    <div class="finish hidden" id="finish">
      <button id="finish-day" class="primary wide">Finish Today’s Session</button>
    </div>

    <div id="summary" class="hidden summary card">
      <h3>Day <span id="sum-day">1</span> — Summary</h3>
      <div id="summary-list"></div>
    </div>
  </section>
</main>

<!-- زر البداية تحت -->
<div class="toolbar">
  <button id="start-day" class="primary">🔊 Start Day <span id="start-day-num">1</span></button>
</div>

<footer class="footer">
  <p>LexiLearn Prototype • Voice-first learning • Inspired by Palestine — flag colors • kufiya • olive • sumud</p>
</footer>

<script src="/assets/app.js"></script>


<!-- مكتبة jsPDF -->
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>

</body>
</html>
