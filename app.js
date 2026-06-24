/* ============================================================
   Writing Studio — app logic (generic build)
   No frameworks, no backend. Runs entirely in the browser.
   - Dictation:   Web Speech API (SpeechRecognition)
   - Read-aloud:  Web Speech API (SpeechSynthesis)
   - Feedback:    Web Audio API chimes + visual banners
   - Storage:     localStorage
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- Activity / prompt library ----------------
     Choice-based and interest-aligned. Language is declarative and
     low-pressure (invitations, not commands) per Sam's profile. */
  const ACTIVITIES = [
    {
      id: 'story',
      emoji: '📖',
      title: 'Tell a Story',
      desc: 'Make up a story about anything you want.',
      prompts: [
        'There is a door that only opens once a year. I wonder what is behind it.',
        'A kid finds a backpack that can hold anything. I\'m curious what they put in it.',
        'Two friends build something amazing together. I\'d love to hear what it is.',
        'Something strange happens on an ordinary Tuesday.'
      ],
      starters: ['One day', 'Once upon a time', 'At first', 'Suddenly', 'But then', 'After that',
                 'Later', 'Meanwhile', 'Out of nowhere', 'Just when', 'In the end', 'The best part was']
    },
    {
      id: 'science',
      emoji: '🔬',
      title: 'How Things Work',
      desc: 'Explain how something works or why something happens.',
      prompts: [
        'Something in the world works in a really clever way. I wonder which thing comes to mind.',
        'You might explain why the sky, the weather, or an animal does what it does.',
        'There could be a machine or gadget you\'d enjoy describing.',
        'You could explain something you know a lot about to a younger kid.'
      ],
      starters: ['It works by', 'First', 'Next', 'Then', 'After that', 'This happens because',
                 'For example', 'One important part', 'Another reason', 'Did you know', 'So that means', 'In the end']
    },
    {
      id: 'aboutme',
      emoji: '⭐',
      title: 'About Me',
      desc: 'Write about your day, your favorites, or your ideas.',
      prompts: [
        'I\'d love to hear about something you\'re really good at.',
        'There might be a favorite place you like to think about.',
        'You could describe the best thing that happened this week.',
        'If you could invent anything, I\'m curious what it would be.'
      ],
      starters: ['I like', 'My favorite', 'I am really good at', 'I think', 'I feel', 'One time',
                 'Something about me', 'I wish', 'I hope', 'The best part of my day', 'When I grow up', 'I will never forget']
    },
    {
      id: 'opinion',
      emoji: '💬',
      title: 'Share Your Opinion',
      desc: 'Say what you think and give reasons why.',
      prompts: [
        'I\'d love to hear what you think makes a perfect day.',
        'There might be a rule at school you think should change — you could say what and why.',
        'You could pick the best animal, game, or food and make your case for it.',
        'Maybe there\'s something you think everyone should try at least once.'
      ],
      starters: ['I think', 'I believe', 'In my opinion', 'One reason', 'Another reason', 'Also',
                 'For example', 'Some people think', 'But I disagree', 'Most importantly', 'That\'s why', 'So you can see']
    },
    {
      id: 'essay',
      emoji: '📝',
      title: 'Five-Paragraph Essay',
      desc: 'One big idea, three reasons, and a wrap-up. The planner helps you set it up.',
      prompts: [
        'Pick a topic you know a lot about. An essay is just one big idea explained with three reasons — open the planner to line them up.',
        'You might argue that schools should (or should not) have longer recess. Your big idea goes first, then three reasons, then a wrap-up.',
        'There\'s probably something you\'d change about your school or town. The essay can give your idea and three reasons for it.',
        'You could write about why a book, game, or place matters to you, with three reasons that back it up.'
      ],
      starters: ['In this essay', 'First', 'To begin', 'Second', 'Next', 'Another reason',
                 'For example', 'Most importantly', 'Third', 'Finally', 'In conclusion', 'As you can see']
    },
    {
      id: 'free',
      emoji: '✏️',
      title: 'Free Write',
      desc: 'No prompt. Write whatever is on your mind.',
      prompts: ['This space is yours. Whatever you\'re thinking about can go here.'],
      starters: ['Right now', 'I\'ve been thinking', 'Something on my mind', 'I wonder', 'I remember',
                 'You know what', 'The truth is', 'I want to say', 'Honestly', 'One thing is for sure']
    }
  ];

  /* ---------------- Figurative-language helper ----------------
     Tap a chip to drop a simile, metaphor, etc. into the writing.
     Blanks ( ___ ) invite Sam to fill in his own words. */
  const FIGURATIVE = [
    { label: 'Similes — compare with "like" or "as"',
      items: ['as busy as a bee', 'as brave as a lion', 'as quiet as a mouse', 'like a rocket', 'as ___ as a ___', 'like a ___'] },
    { label: 'Metaphors — say one thing IS another',
      items: ['My room is a jungle', 'The sky was a blanket', 'Her smile was sunshine', '___ is a ___'] },
    { label: 'Personification — things act like people',
      items: ['The wind whispered', 'The sun smiled', 'The leaves danced', 'The ___ ___'] },
    { label: 'Sound & big words',
      items: ['BOOM!', 'splash!', 'the floor creaked', 'It took a million years', 'the loudest sound ever'] }
  ];

  /* ---------------- Word-assist data ----------------
     High-frequency words (Fry/Dolch + common kid-writing words) used for
     autocomplete & word prediction. Custom dictionary words are added on top. */
  const COMMON_WORDS = [
    'the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you',
    'do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one',
    'all','would','there','their','what','so','up','out','if','about','who','get','which','go','me',
    'when','make','can','like','time','no','just','him','know','take','people','into','year','your',
    'good','some','could','them','see','other','than','then','now','look','only','come','over','think',
    'also','back','after','use','two','how','our','work','first','well','way','even','new','want',
    'because','any','these','give','day','most','is','are','was','were','been','has','had','did',
    'said','got','going','went','made','name','named','find','found','tell','ask','asked','feel','felt',
    'try','tried','leave','call','called','very','through','much','before','right','too','old','same',
    'big','little','great','small','another','here','thing','things','many','those','while','where',
    'why','once','again','always','never','every','everyone','everything','something','anything',
    'nothing','myself','yourself','really','maybe','please','thank','today','tomorrow','yesterday',
    'morning','night','school','friend','friends','family','teacher','student','mom','dad','brother',
    'sister','dog','cat','house','home','water','tree','book','story','write','writing','wrote','read',
    'play','played','playing','run','jump','fun','funny','happy','sad','angry','scared','excited',
    'food','world','place','reason','reasons','idea','ideas','animal','animals','color','number',
    'word','words','sentence','question','answer','favorite','beautiful','different','important',
    'together','almost','around','three','four','five','started','finished','learned','remember',
    'believe','wonder','wondered','imagine','looked','wanted','money','mother','father','children',
    'second','third','finally','next','first','example','enough','probably','sometimes','should','must'
  ];

  // Common misspellings → corrections (applied on space/punctuation when AutoCorrect is on).
  const COMMON_TYPOS = {
    teh:'the', adn:'and', taht:'that', thier:'their', recieve:'receive', wich:'which', alot:'a lot',
    becuase:'because', becasue:'because', fridn:'friend', freind:'friend', frist:'first', wnat:'want',
    waht:'what', dosnt:'doesn’t', dont:'don’t', cant:'can’t', wont:'won’t', im:'I’m',
    ive:'I’ve', didnt:'didn’t', wasnt:'wasn’t', isnt:'isn’t', favrite:'favorite',
    favorit:'favorite', bcoz:'because', gonna:'going to', wanna:'want to', cuz:'because', u:'you',
    ur:'your', r:'are', tommorow:'tomorrow', tomorow:'tomorrow', alway:'always', realy:'really',
    verey:'very', somthing:'something', wierd:'weird', wen:'when', wht:'what', hte:'the', nad:'and'
  };

  const BADGES = [
    { id: 'first',     emoji: '🌱', name: 'First Words',   desc: 'Finish your first writing.',        test: s => s.sessions >= 1 },
    { id: 'explorer',  emoji: '🧭', name: 'Word Explorer', desc: 'Write 100 words in all.',           test: s => s.totalWords >= 100 },
    { id: 'storyteller', emoji: '🐉', name: 'Storyteller',  desc: 'Write 150 words in one sitting.',   test: s => s.bestSession >= 150 },
    { id: 'streak3',   emoji: '🔥', name: 'On a Roll',     desc: 'Write 3 days in a row.',            test: s => s.streak >= 3 },
    { id: 'five',      emoji: '🏅', name: 'High Five',      desc: 'Finish 5 writings.',                test: s => s.sessions >= 5 },
    { id: 'voice',     emoji: '🎤', name: 'Big Voice',     desc: 'Use the talk button to write.',     test: s => s.usedDictation },
    { id: 'thinker',   emoji: '🧠', name: 'Big Thinker',   desc: 'Write 300 words in one sitting.',   test: s => s.bestSession >= 300 },
    { id: 'wordsmith', emoji: '🦉', name: 'Wordsmith',     desc: 'Write 500 words in all.',           test: s => s.totalWords >= 500 }
  ];

  /* ---------------- State ---------------- */
  const STORE_KEY = 'writingStudio.v1';
  const defaultState = {
    totalWords: 0,
    sessions: 0,
    bestSession: 0,
    streak: 0,
    lastWriteDate: null,
    usedDictation: false,
    earnedBadges: [],
    history: [],            // { date, activity, prompt, words, text }
    textScale: 1,
    contrast: false,
    customDictionary: [],   // adult-added words → feed suggestions
    shortcuts: [],          // [{ short, full }] AutoCorrect expansions
    wordSuggest: true,      // show word prediction strip
    autoCorrect: true,      // fix typos / expand shortcuts on space
    dailyWords: {},         // { 'YYYY-M-D': words written that day }
    dailyGoal: 50,          // daily word-count goal
    ideas: [],              // [{ text, date }] quick jotted ideas
    studentName: '',        // for the progress report
    teacherEmail: ''        // default recipient for emailed reports
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? Object.assign({}, defaultState, JSON.parse(raw)) : Object.assign({}, defaultState);
    } catch (e) {
      return Object.assign({}, defaultState);
    }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  let state = load();

  /* ---------------- DOM helpers ---------------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* ---------------- Audio feedback ---------------- */
  let audioCtx = null;
  function chime(kind = 'good') {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'big' ? [523, 659, 784, 1047] : [659, 880];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) { /* audio not available — silent fallback */ }
  }

  /* ---------------- Navigation ---------------- */
  function showView(name) {
    if (name !== 'write') document.body.classList.remove('focus-mode');
    $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    $$('.nav-btn').forEach(b => b.setAttribute('aria-current', b.dataset.view === name ? 'true' : 'false'));
    if (name === 'home') renderHome();
    if (name === 'progress') renderProgress();
    if (name === 'ideas') renderIdeas();
    window.scrollTo(0, 0);
  }
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#backHome').addEventListener('click', () => showView('home'));

  // "Different idea" — show another prompt from the current activity
  $('#shufflePrompt').addEventListener('click', () => {
    if (current) $('#promptText').textContent = pick(current.prompts);
  });

  /* ---------------- Accessibility toggles ---------------- */
  function applyPrefs() {
    document.documentElement.style.setProperty('--font-scale', state.textScale);
    document.body.classList.toggle('contrast', !!state.contrast);
  }
  $('#textSizeBtn').addEventListener('click', () => {
    const steps = [1, 1.15, 1.3, 1.5];
    const idx = steps.indexOf(state.textScale);
    state.textScale = steps[(idx + 1) % steps.length];
    applyPrefs(); save();
  });
  $('#contrastBtn').addEventListener('click', () => {
    state.contrast = !state.contrast; applyPrefs(); save();
  });

  /* ---------------- Home / dashboard ---------------- */
  function renderHome() {
    const hour = new Date().getHours();
    const tod = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    $('#greeting').innerHTML = `${tod}! <span class="wave">👋</span><br>What will you write today?`;

    $('#homeSnapshot').innerHTML = `
      <div class="chip-stat"><span class="em">✍️</span><strong>${state.totalWords}</strong><small>words<br>written</small></div>
      <div class="chip-stat"><span class="em">📚</span><strong>${state.sessions}</strong><small>writings<br>finished</small></div>
      <div class="chip-stat"><span class="em">🔥</span><strong>${state.streak}</strong><small>day<br>streak</small></div>
    `;
    $('#homeGoal').innerHTML = goalBarHTML();

    $('#activityGrid').innerHTML = ACTIVITIES.map(a => `
      <button class="activity-card" data-id="${a.id}">
        <div class="emoji">${a.emoji}</div>
        <div class="title">${a.title}</div>
        <div class="desc">${a.desc}</div>
      </button>
    `).join('');
    $$('.activity-card').forEach(card =>
      card.addEventListener('click', () => openActivity(card.dataset.id)));
  }

  /* ---------------- Write view ---------------- */
  let current = null;        // active activity
  let editingIndex = null;   // index in state.history when editing a past piece

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function openActivity(id, customPrompt) {
    current = ACTIVITIES.find(a => a.id === id) || ACTIVITIES[0];
    editingIndex = null;
    $('#finishBtn').textContent = 'I\'m finished';
    $('#promptText').textContent = customPrompt || pick(current.prompts);

    // sentence-starter chips
    $('#starterChips').innerHTML = current.starters
      .map(s => `<button type="button" class="chip" data-text="${s}">${s}…</button>`).join('');
    $$('#starterChips .chip').forEach(chip =>
      chip.addEventListener('click', () => insertText(chip.dataset.text)));

    // The five-paragraph essay uses its own structured builder instead
    // of the generic planner; every other activity uses the planner.
    const isEssay = current.id === 'essay';
    $('#essayOutline').hidden = !isEssay;
    $('#plannerWrap').hidden = isEssay;

    // reset planner + essay fields + editor + timer + feedback
    ESSAY_FIELDS.concat(['planBig', 'planD1', 'planD2', 'planD3'])
      .forEach(idp => { const el = $('#' + idp); if (el) el.value = ''; });
    $('#plannerWrap').open = false;
    $('#figWrap').open = false;
    $('#editor').value = '';
    $('#suggestStrip').hidden = true; $('#suggestStrip').innerHTML = '';
    dictationTarget = $('#editor');
    updateWordCount();
    stopBurst();
    $('#feedbackBanner').hidden = true;
    feedbackMilestones = new Set();
    stopDictation();

    showView('write');
    $('#editor').focus();
  }

  // Essay-builder field ids, in reading order.
  const ESSAY_FIELDS = ['esHook', 'esThesis', 'esB1', 'esB1d', 'esB2', 'esB2d', 'esB3', 'esB3d', 'esRestate', 'esClose'];

  // Assemble the essay parts into five formatted paragraphs in the editor.
  function buildEssay() {
    const g = id => ($('#' + id).value || '').trim();
    const paras = [];
    const intro = joinText(g('esHook'), g('esThesis'));
    if (intro) paras.push(intro);
    [['esB1', 'esB1d'], ['esB2', 'esB2d'], ['esB3', 'esB3d']].forEach(([t, d]) => {
      const body = joinText(g(t), g(d));
      if (body) paras.push(body);
    });
    const concl = joinText(g('esRestate'), g('esClose'));
    if (concl) paras.push(concl);

    if (!paras.length) {
      showBanner('Add a little to the essay parts first, then tap Build my essay.');
      return;
    }
    $('#editor').value = paras.join('\n\n');   // blank line between paragraphs
    dictationTarget = $('#editor');
    updateWordCount();
    showBanner('Your essay is built below — now you can edit it and read it aloud.');
    chime('good');
    $('#editor').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#editor').focus();
  }
  $('#buildEssay').addEventListener('click', buildEssay);

  // Drop text into whichever box is active (editor or an essay field).
  function insertText(text) {
    const el = targetEl();
    const needsSpace = el.value.length && !/\s$/.test(el.value);
    el.value += (needsSpace ? ' ' : '') + text + ' ';
    el.focus();
    if (el.id === 'editor') updateWordCount();
  }

  // Build the figurative-language chips once.
  function renderFigurative() {
    $('#figGroups').innerHTML = FIGURATIVE.map(g => `
      <div class="fig-group">
        <span class="fig-label">${g.label}</span>
        <div class="chips">
          ${g.items.map(t => `<button type="button" class="chip" data-text="${t}">${t}</button>`).join('')}
        </div>
      </div>
    `).join('');
    $$('#figGroups .chip').forEach(chip =>
      chip.addEventListener('click', () => insertText(chip.dataset.text)));
  }

  function countWords(str) {
    const t = str.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  let feedbackMilestones = new Set();
  function updateWordCount() {
    const n = countWords($('#editor').value);
    $('#wordCount').textContent = n === 1 ? '1 word' : `${n} words`;

    // Immediate, low-pressure encouragement at gentle milestones
    [25, 50, 100, 150].forEach(m => {
      if (n >= m && !feedbackMilestones.has(m)) {
        feedbackMilestones.add(m);
        const msgs = {
          25: 'Great start — 25 words already!',
          50: 'You\'re rolling — 50 words!',
          100: '100 words! That\'s a lot of good thinking.',
          150: 'Wow — 150 words. You\'re really saying a lot.'
        };
        showBanner(msgs[m]);
        chime(m >= 100 ? 'big' : 'good');
      }
    });
  }
  $('#editor').addEventListener('input', updateWordCount);

  function showBanner(msg) {
    const b = $('#feedbackBanner');
    b.textContent = msg;
    b.hidden = false;
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => { b.hidden = true; }, 3500);
  }

  /* ---------------- Short-burst timer ---------------- */
  let burstInterval = null;
  let burstRemaining = 0;
  $('#burstChoices').addEventListener('click', e => {
    const btn = e.target.closest('.burst-btn');
    if (!btn) return;
    startBurst(parseInt(btn.dataset.min, 10));
    $$('.burst-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
  $('#burstStop').addEventListener('click', stopBurst);

  function startBurst(minutes) {
    stopBurst(true);
    burstRemaining = minutes * 60;
    $('#burstChoices').hidden = true;
    $('#burstTimer').hidden = false;
    renderBurstClock();
    burstInterval = setInterval(() => {
      burstRemaining--;
      renderBurstClock();
      if (burstRemaining <= 10) $('#burstTimer').classList.add('lowtime');
      if (burstRemaining <= 0) {
        stopBurst();
        showBanner('Time\'s up — nice focus! Keep going or finish whenever you like.');
        chime('big');
      }
    }, 1000);
  }
  function renderBurstClock() {
    const m = Math.floor(burstRemaining / 60);
    const s = String(burstRemaining % 60).padStart(2, '0');
    $('#burstClock').textContent = `${m}:${s}`;
  }
  function stopBurst(keepChoices) {
    clearInterval(burstInterval);
    burstInterval = null;
    $('#burstTimer').hidden = true;
    $('#burstTimer').classList.remove('lowtime');
    if (!keepChoices) {
      $('#burstChoices').hidden = false;
      $$('.burst-btn').forEach(b => b.classList.remove('active'));
    }
  }

  /* ---------------- Dictation (speech-to-text) ---------------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isEdge = /\bEdg\//.test(navigator.userAgent);
  let recognition = null;
  let listening = false;
  let interimBase = '';      // text in the target field when a phrase starts
  let lastFatalError = null; // set on a real error so we stop re-arming
  let dictationTarget = null;// the field dictation writes into (defaults to editor)

  // Dictation follows focus: tap any box (the essay parts or the main editor)
  // and the talk button fills THAT box.
  document.addEventListener('focusin', e => {
    if (e.target.classList && e.target.classList.contains('dictatable')) {
      dictationTarget = e.target;
      if (listening) interimBase = dictationTarget.value;
    }
  });
  // The field dictation writes into — but never a hidden one. If the chosen
  // target isn't visible (e.g. a hidden essay box), fall back to the editor.
  function targetEl() {
    const el = dictationTarget;
    if (el && el.offsetParent !== null) return el;   // offsetParent === null ⇒ hidden
    return $('#editor');
  }

  // Join two text fragments with a single separating space when needed.
  function joinText(a, b) {
    if (!a) return b || '';
    if (!b) return a;
    return /\s$/.test(a) ? a + b : a + ' ' + b;
  }

  if (!SR) {
    $('#micBtn').disabled = true;
    $('#micLabel').textContent = 'Talking not supported';
    $('#micStatus').textContent = 'Tip: this browser can\'t do talk-to-write. Try Chrome — typing still works.';
  } else if (isEdge) {
    // Edge's speech service is unreliable on macOS (network errors). Steer to Chrome.
    $('#micBtn').disabled = true;
    $('#micLabel').textContent = 'Use Chrome to talk';
    $('#micStatus').textContent = 'Tip: talk-to-write works best in Google Chrome on this computer. Typing works fine here in Edge.';
  } else {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Lifecycle messages — show where things are so trouble is visible.
    recognition.onstart       = () => setStatus('Microphone on. Go ahead and talk…');
    recognition.onaudiostart  = () => setStatus('I can hear the microphone. Say your ideas…');
    recognition.onspeechstart = () => setStatus('Listening to you…');
    recognition.onnomatch     = () => setStatus('I heard sound but couldn\'t make out words — try again a bit louder.');

    recognition.onresult = e => {
      // Split this event's results into finalized vs. still-interim text.
      let finalText = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += tr + ' '; else interim += tr;
      }
      // Commit finalized text to the stable base ONCE.
      if (finalText.trim()) {
        interimBase = joinText(interimBase, finalText.trim());
        if (!state.usedDictation) { state.usedDictation = true; save(); }
      }
      // Always rebuild the target field as base + live interim. Rebuilding
      // (instead of appending interim onto itself) is what prevents
      // every phrase from being written twice.
      const el = targetEl();
      el.value = joinText(interimBase, interim);
      if (el.id === 'editor') updateWordCount();
    };

    recognition.onerror = ev => {
      // 'no-speech' / 'aborted' are routine — keep going, don't alarm the user.
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      lastFatalError = ev.error;
      const messages = {
        'not-allowed': 'The microphone is blocked. Click the mic/lock icon in the address bar and allow it, then tap Start talking again.',
        'service-not-allowed': 'Edge needs "Online speech recognition" turned on (Windows Settings ▸ Privacy ▸ Speech). On Mac, check your internet connection.',
        'network': 'Talk-to-write needs an internet connection and it can\'t reach the speech service right now. Typing still works.',
        'audio-capture': 'No microphone was found. Check that one is connected and selected.'
      };
      setStatus(messages[ev.error] || 'The microphone had trouble. You can try again or just type.');
    };

    // Re-arm continuous listening, but only if it ended without a fatal error
    // and we still want to listen. A short delay avoids a tight restart loop
    // that can swallow results on some browsers (incl. Edge).
    recognition.onend = () => {
      if (listening && !lastFatalError) {
        setTimeout(() => {
          if (listening) { try { recognition.start(); } catch (e) {} }
        }, 250);
      } else {
        setListening(false);
      }
    };
  }

  function setStatus(msg) { $('#micStatus').textContent = msg; }

  function setListening(on) {
    listening = on;
    $('#micBtn').classList.toggle('listening', on);
    $('#micLabel').textContent = on ? 'Stop talking' : 'Start talking';
    if (on) $('#micStatus').textContent = 'Listening… just say your ideas. I\'ll write them down.';
  }
  function startDictation() {
    if (!recognition) return;
    lastFatalError = null;
    interimBase = targetEl().value;
    try { recognition.start(); setListening(true); }
    catch (e) { /* already started */ }
  }
  function stopDictation() {
    if (!recognition) return;
    setListening(false);
    try { recognition.stop(); } catch (e) {}
  }
  $('#micBtn').addEventListener('click', () => listening ? stopDictation() : startDictation());

  /* ---------------- Read aloud ---------------- */
  $('#readAloudBtn').addEventListener('click', () => {
    const text = $('#editor').value.trim();
    if (!text || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    speechSynthesis.speak(u);
  });

  /* ---------------- Save to Word ----------------
     Builds a Word-readable .doc (HTML format that Microsoft Word opens
     and converts cleanly). No library or internet needed. */
  function downloadWord(text, title) {
    const clean = (text || '').trim();
    if (!clean) { showBanner('Write a few words first, then you can save it.'); return; }

    const safeTitle = (title || 'My Writing');
    const paragraphs = clean.split(/\n+/).map(p =>
      `<p style="font-size:14pt; line-height:1.6;">${escapeHtml(p)}</p>`).join('');
    const docHtml =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
      `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>${escapeHtml(safeTitle)}</title></head>` +
      `<body style="font-family:Calibri, Arial, sans-serif;">` +
      `<h1 style="font-size:20pt;">${escapeHtml(safeTitle)}</h1>` +
      paragraphs + `</body></html>`;

    const blob = new Blob(['﻿', docHtml], { type: 'application/msword' });
    const fileName = safeTitle.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') + '.doc';

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showBanner('Saved! Look in your Downloads folder for the Word file.');
  }
  $('#downloadBtn').addEventListener('click', () => {
    const title = (current ? current.title : 'My Writing');
    downloadWord($('#editor').value, title);
  });

  /* ---------------- Finish & save ---------------- */
  $('#finishBtn').addEventListener('click', finishWriting);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function daysBetween(a, b) {
    const ms = new Date(b.split('-')) - new Date(a.split('-'));
    return Math.round(ms / 86400000);
  }

  function finishWriting() {
    stopDictation();
    stopBurst();
    const text = $('#editor').value.trim();
    const words = countWords(text);
    if (words === 0) {
      showBanner('Add a few words first — even one sentence counts!');
      return;
    }

    // ----- Editing an existing piece: update it in place -----
    if (editingIndex !== null && state.history[editingIndex]) {
      const entry = state.history[editingIndex];
      state.totalWords += (words - entry.words);   // adjust by the difference
      if (state.totalWords < 0) state.totalWords = 0;
      if (words > entry.words) bumpDaily(words - entry.words);   // count added words today
      entry.words = words;
      entry.text = text;
      // best single writing may change if this was (or is now) the longest
      state.bestSession = state.history.reduce((m, h) => Math.max(m, h.words), 0);

      const newBadges = awardBadges();
      const wasEditing = true;
      editingIndex = null;
      save();
      celebrate(words, newBadges, wasEditing);
      return;
    }

    // ----- A brand-new piece -----
    state.totalWords += words;
    state.sessions += 1;
    state.bestSession = Math.max(state.bestSession, words);
    bumpDaily(words);

    // streak handling
    const today = todayStr();
    if (state.lastWriteDate) {
      const gap = daysBetween(state.lastWriteDate, today);
      if (gap === 1) state.streak += 1;
      else if (gap > 1) state.streak = 1;
      // gap === 0 → same day, streak unchanged
    } else {
      state.streak = 1;
    }
    state.lastWriteDate = today;

    // history (cap at 30 entries)
    state.history.unshift({
      date: today,
      activity: current ? current.title : 'Writing',
      prompt: $('#promptText').textContent,
      words,
      text
    });
    state.history = state.history.slice(0, 30);

    const newBadges = awardBadges();
    save();
    celebrate(words, newBadges);
  }

  // Add any badges newly earned by the current state; return the new ones.
  function awardBadges() {
    const newBadges = BADGES.filter(b => b.test(state) && !state.earnedBadges.includes(b.id));
    newBadges.forEach(b => state.earnedBadges.push(b.id));
    return newBadges;
  }

  // Open a past piece back up in the editor so it can be fixed.
  function editItem(index) {
    const h = state.history[index];
    if (!h) return;
    editingIndex = index;
    current = ACTIVITIES.find(a => a.title === h.activity) || null;

    $('#promptText').textContent = h.prompt || '—';
    $('#finishBtn').textContent = 'Save my changes';

    // Editing is direct text editing — hide the planners/builders.
    $('#essayOutline').hidden = true;
    $('#plannerWrap').hidden = false;
    $('#plannerWrap').open = false;
    $('#starterChips').innerHTML = '';

    $('#editor').value = h.text;
    dictationTarget = $('#editor');
    updateWordCount();
    stopBurst();
    stopDictation();
    // Don't fire milestone cheers while fixing an existing piece.
    feedbackMilestones = new Set([25, 50, 100, 150]);
    $('#feedbackBanner').hidden = true;

    showView('write');
    $('#editor').focus();
  }

  /* ---------------- Celebration ---------------- */
  function celebrate(words, newBadges, wasEditing) {
    chime('big');
    if (wasEditing) {
      $('#celebrateEmoji').textContent = newBadges.length ? newBadges[0].emoji : '✅';
      $('#celebrateTitle').textContent = newBadges.length ? `New badge: ${newBadges[0].name}!` : 'Changes saved!';
      $('#celebrateMsg').textContent = `Your writing is updated — it now has ${words} ${words === 1 ? 'word' : 'words'}.`;
      $('#celebrate').hidden = false;
      return;
    }
    $('#celebrateEmoji').textContent = newBadges.length ? newBadges[0].emoji : '🎉';
    $('#celebrateTitle').textContent = newBadges.length ? `New badge: ${newBadges[0].name}!` : 'Nice work!';
    let msg = `You wrote ${words} ${words === 1 ? 'word' : 'words'}. That's real writing.`;
    if (newBadges.length > 1) msg += ` You also earned ${newBadges.length - 1} more badge${newBadges.length - 1 > 1 ? 's' : ''}!`;
    $('#celebrateMsg').textContent = msg;
    $('#celebrate').hidden = false;
  }
  $('#celebrateClose').addEventListener('click', () => {
    $('#celebrate').hidden = true;
    showView('progress');
  });

  /* ---------------- Progress view ---------------- */
  function renderProgress() {
    $('#statCards').innerHTML = `
      <div class="stat-card"><div class="num">${state.totalWords}</div><div class="lbl">total words</div></div>
      <div class="stat-card"><div class="num">${state.sessions}</div><div class="lbl">writings finished</div></div>
      <div class="stat-card"><div class="num">${state.bestSession}</div><div class="lbl">best single writing</div></div>
      <div class="stat-card"><div class="num">${state.streak}</div><div class="lbl">day streak</div></div>
    `;
    $('#goalBar').innerHTML = goalBarHTML();
    renderWeekChart();

    $('#badgeGrid').innerHTML = BADGES.map(b => `
      <div class="badge ${state.earnedBadges.includes(b.id) ? 'earned' : ''}">
        <div class="badge-emoji">${b.emoji}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>
    `).join('');

    if (!state.history.length) {
      $('#historyList').innerHTML = `<p class="empty">Nothing yet — your finished writing will show up here.</p>`;
    } else {
      $('#historyList').innerHTML = state.history.map((h, i) => `
        <div class="history-item">
          <div class="hi-top"><span>${h.activity} · ${h.words} words</span><span>${h.date}</span></div>
          <div class="hi-text">${escapeHtml(h.text).slice(0, 400)}${h.text.length > 400 ? '…' : ''}</div>
          <div class="hi-actions">
            <button class="link-btn edit-entry" data-index="${i}">✏️ Edit this</button>
            <button class="link-btn dl-entry" data-index="${i}">⬇️ Save to Word</button>
          </div>
        </div>
      `).join('');
      $$('.edit-entry').forEach(b =>
        b.addEventListener('click', () => editItem(parseInt(b.dataset.index, 10))));
      $$('.dl-entry').forEach(b =>
        b.addEventListener('click', () => {
          const h = state.history[parseInt(b.dataset.index, 10)];
          if (h) downloadWord(h.text, h.activity);
        }));
    }
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('#resetBtn').addEventListener('click', () => {
    if (confirm('This clears all words, badges, and writing history. Start fresh?')) {
      state = Object.assign({}, defaultState, { textScale: state.textScale, contrast: state.contrast });
      save();
      renderProgress();
    }
  });

  /* ============================================================
     Word-assist engine: prediction/autocomplete + AutoCorrect
     ============================================================ */

  // All candidate words: custom dictionary first (teacher's words rank high),
  // then the common-word list. De-duplicated, lowercase keys.
  function wordPool() {
    const seen = new Set(), pool = [];
    for (const w of state.customDictionary.concat(COMMON_WORDS)) {
      const k = w.toLowerCase();
      if (!seen.has(k)) { seen.add(k); pool.push(w); }
    }
    return pool;
  }

  // The word currently being typed at the caret in the main editor.
  function currentToken() {
    const ed = $('#editor');
    const pos = ed.selectionStart;
    const upto = ed.value.slice(0, pos);
    const m = upto.match(/[A-Za-z']+$/);
    return m ? { start: pos - m[0].length, text: m[0] } : { start: pos, text: '' };
  }

  // Preserve the capitalization the student started with.
  function matchCase(typed, word) {
    return (typed && typed[0] === typed[0].toUpperCase())
      ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  }

  function renderSuggestions() {
    const strip = $('#suggestStrip');
    if (!state.wordSuggest || $('#editor').offsetParent === null) { strip.hidden = true; return; }
    const tok = currentToken();
    if (tok.text.length < 2) { strip.hidden = true; strip.innerHTML = ''; return; }
    const q = tok.text.toLowerCase();
    const matches = [];
    for (const w of wordPool()) {
      const lw = w.toLowerCase();
      if (lw.startsWith(q) && lw !== q) { matches.push(w); if (matches.length >= 5) break; }
    }
    if (!matches.length) { strip.hidden = true; strip.innerHTML = ''; return; }
    strip.innerHTML = '<span class="suggest-label">💡</span>' + matches
      .map(w => `<button type="button" class="suggest-chip">${escapeHtml(matchCase(tok.text, w))}</button>`).join('');
    $$('#suggestStrip .suggest-chip').forEach((b, i) =>
      b.addEventListener('click', () => applySuggestion(matches[i], tok)));
    strip.hidden = false;
  }

  function applySuggestion(word, tok) {
    const ed = $('#editor');
    const finalWord = matchCase(tok.text, word);
    const end = tok.start + tok.text.length;
    const before = ed.value.slice(0, tok.start), after = ed.value.slice(end);
    ed.value = before + finalWord + ' ' + after;
    const caret = (before + finalWord + ' ').length;
    ed.setSelectionRange(caret, caret);
    ed.focus();
    $('#suggestStrip').hidden = true; $('#suggestStrip').innerHTML = '';
    updateWordCount();
  }

  // Generate every word one edit away (Norvig-style: delete/transpose/replace/insert).
  function edits1(w) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const out = new Set();
    for (let i = 0; i <= w.length; i++) {
      const L = w.slice(0, i), R = w.slice(i);
      if (R) out.add(L + R.slice(1));                          // delete
      if (R.length > 1) out.add(L + R[1] + R[0] + R.slice(2)); // transpose
      for (const c of letters) {
        if (R) out.add(L + c + R.slice(1));                    // replace
        out.add(L + c + R);                                    // insert
      }
    }
    return out;
  }

  // Best correction for a misspelled word: a known word one edit away.
  // Only same-length-or-longer candidates (so "nam"→"name", never "→am"),
  // ranked by how common the word is.
  function bestCorrection(word) {
    const pool = wordPool();
    const set = new Set(pool.map(w => w.toLowerCase()));
    const lw = word.toLowerCase();
    if (set.has(lw)) return null;                              // already a real word
    const edits = edits1(lw);
    const cands = [];
    for (const e of edits) if (set.has(e) && e.length >= lw.length) cands.push(e);
    if (!cands.length) return null;
    const rank = {}; pool.forEach((w, i) => { const k = w.toLowerCase(); if (!(k in rank)) rank[k] = i; });
    cands.sort((a, b) => rank[a] - rank[b]);
    return cands[0];
  }

  // Decide if a just-typed word should be corrected/expanded.
  function correctionFor(word) {
    const lw = word.toLowerCase();
    if (state.customDictionary.some(w => w.toLowerCase() === lw)) return null;   // protect custom words
    const sc = state.shortcuts.find(s => s.short.toLowerCase() === lw);
    if (sc) return matchCase(word, sc.full);                                     // shortcut expansion
    if (COMMON_TYPOS[lw]) return matchCase(word, COMMON_TYPOS[lw]);              // known typo
    // General spelling fix — skip likely names (Capitalized) and very short words.
    const isCapitalized = word[0] !== word[0].toLowerCase();
    if (isCapitalized || word.length < 3) return null;
    const fix = bestCorrection(word);
    return fix ? matchCase(word, fix) : null;
  }

  // On a word boundary (space / punctuation), fix the preceding word.
  function maybeAutoCorrect(e) {
    if (!state.autoCorrect || e.inputType !== 'insertText') return;
    const trig = e.data || '';
    if (trig !== ' ' && !/[.!?,;:]/.test(trig)) return;
    const ed = $('#editor');
    const pos = ed.selectionStart;                 // caret sits just after the trigger char
    const m = ed.value.slice(0, pos - 1).match(/([A-Za-z']+)$/);
    if (!m) return;
    const word = m[1], fix = correctionFor(word);
    if (!fix || fix === word) return;
    const wordStart = pos - 1 - word.length;
    ed.value = ed.value.slice(0, wordStart) + fix + ed.value.slice(pos - 1);
    const caret = wordStart + fix.length + 1;       // keep the trigger char after the word
    ed.setSelectionRange(caret, caret);
    updateWordCount();
  }

  $('#editor').addEventListener('input', e => { maybeAutoCorrect(e); renderSuggestions(); });
  $('#editor').addEventListener('blur', () => setTimeout(() => { $('#suggestStrip').hidden = true; }, 200));

  /* ---------------- Settings (grown-up tools) ---------------- */
  function openSettings() { renderSettings(); $('#settings').hidden = false; }
  function closeSettings() { $('#settings').hidden = true; }

  function renderSettings() {
    $('#toggleSuggest').checked = state.wordSuggest;
    $('#toggleAutocorrect').checked = state.autoCorrect;
    $('#goalInput').value = state.dailyGoal;
    $('#studentNameInput').value = state.studentName || '';
    $('#teacherEmailInput').value = state.teacherEmail || '';
    $('#dictList').innerHTML = state.customDictionary.length
      ? state.customDictionary.map((w, i) =>
          `<li><span>${escapeHtml(w)}</span><button class="chip-x" data-type="dict" data-i="${i}" title="Remove">×</button></li>`).join('')
      : '<li class="empty">No words added yet.</li>';
    $('#scList').innerHTML = state.shortcuts.length
      ? state.shortcuts.map((s, i) =>
          `<li><span><strong>${escapeHtml(s.short)}</strong> → ${escapeHtml(s.full)}</span><button class="chip-x" data-type="sc" data-i="${i}" title="Remove">×</button></li>`).join('')
      : '<li class="empty">No shortcuts yet.</li>';
    $$('#settings .chip-x').forEach(b => b.addEventListener('click', () => {
      const i = parseInt(b.dataset.i, 10);
      if (b.dataset.type === 'dict') state.customDictionary.splice(i, 1);
      else state.shortcuts.splice(i, 1);
      save(); renderSettings();
    }));
  }

  function addDictWord() {
    const inp = $('#dictInput');
    const w = inp.value.trim();
    if (w && !state.customDictionary.some(x => x.toLowerCase() === w.toLowerCase())) {
      state.customDictionary.push(w); save();
    }
    inp.value = ''; inp.focus(); renderSettings();
  }
  function addShortcut() {
    const s = $('#scShort').value.trim(), f = $('#scFull').value.trim();
    if (s && f) {
      const existing = state.shortcuts.find(x => x.short.toLowerCase() === s.toLowerCase());
      if (existing) existing.full = f; else state.shortcuts.push({ short: s, full: f });
      save();
    }
    $('#scShort').value = ''; $('#scFull').value = ''; $('#scShort').focus(); renderSettings();
  }

  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsClose').addEventListener('click', closeSettings);
  $('#settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
  $('#dictAdd').addEventListener('click', addDictWord);
  $('#dictInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addDictWord(); } });
  $('#scAdd').addEventListener('click', addShortcut);
  $('#scFull').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addShortcut(); } });
  $('#toggleSuggest').addEventListener('change', e => { state.wordSuggest = e.target.checked; save(); if (!state.wordSuggest) $('#suggestStrip').hidden = true; });
  $('#toggleAutocorrect').addEventListener('change', e => { state.autoCorrect = e.target.checked; save(); });
  $('#goalInput').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    state.dailyGoal = (isNaN(v) || v < 0) ? 0 : v;
    save(); renderHome();
  });
  $('#studentNameInput').addEventListener('change', e => { state.studentName = e.target.value.trim(); save(); });
  $('#teacherEmailInput').addEventListener('change', e => { state.teacherEmail = e.target.value.trim(); save(); });

  /* ---------------- Productivity tracking ---------------- */
  function bumpDaily(n) {
    const t = todayStr();
    state.dailyWords[t] = (state.dailyWords[t] || 0) + n;
  }
  function todayWords() { return state.dailyWords[todayStr()] || 0; }

  function recentDays(n) {
    const base = new Date(), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      out.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), words: state.dailyWords[key] || 0 });
    }
    return out;
  }

  function goalBarHTML() {
    const done = todayWords(), goal = state.dailyGoal || 0;
    const pct = goal > 0 ? Math.min(100, Math.round(done / goal * 100)) : (done > 0 ? 100 : 0);
    const met = goal > 0 && done >= goal;
    return `<div class="goal-bar ${met ? 'met' : ''}">
      <div class="goal-top"><span>${met ? '🎉 Goal reached!' : '🎯 Today\'s goal'}</span>
        <span>${done}${goal > 0 ? ' / ' + goal : ''} words</span></div>
      <div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function renderWeekChart() {
    const days = recentDays(7), goal = state.dailyGoal || 0;
    const max = Math.max(goal, 1, ...days.map(d => d.words));
    $('#weekChart').innerHTML = days.map(d => {
      const h = Math.round(d.words / max * 100);
      const met = goal > 0 && d.words >= goal;
      return `<div class="bar-col">
        <div class="bar-wrap"><div class="bar ${met ? 'met' : ''}" style="height:${Math.max(h, 2)}%"></div></div>
        <div class="bar-num">${d.words}</div><div class="bar-lbl">${d.label}</div>
      </div>`;
    }).join('');
  }

  /* ---------------- Progress report (email via mailto) ----------------
     Builds a short text summary an adult can email to a teacher/parent.
     No server: it opens the family's own mail app with everything filled in.
     Kept brief because mailto links have a length limit and can't attach files. */
  function buildReportText() {
    const name = (state.studentName || 'The student').trim();
    const last7 = recentDays(7).map(d => `${d.label}:${d.words}`).join('  ');
    const recent = state.history.slice(0, 8)
      .map(h => `- ${h.activity} — ${h.words} words (${h.date})`).join('\n') || '- (none yet)';
    return [
      'Writing Quest — Progress Report',
      `Student: ${name}`,
      `Date: ${todayStr()}`,
      '',
      'TOTALS',
      `- Words written (all time): ${state.totalWords}`,
      `- Writings finished: ${state.sessions}`,
      `- Day streak: ${state.streak}`,
      `- Best single writing: ${state.bestSession} words`,
      '',
      `DAILY GOAL: ${state.dailyGoal} words/day`,
      `- Today so far: ${todayWords()} words`,
      `- Last 7 days — ${last7}`,
      '',
      'RECENT WRITINGS',
      recent,
      '',
      'Sent from Writing Quest'
    ].join('\n');
  }

  function emailReport() {
    const subject = `Writing Quest progress${state.studentName ? ' — ' + state.studentName : ''} (${todayStr()})`;
    const to = encodeURIComponent(state.teacherEmail || '');
    window.location.href =
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildReportText())}`;
  }

  function copyReport() {
    const text = buildReportText(), btn = $('#copyReportBtn');
    const done = () => { const o = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = o; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else { fallbackCopy(text, done); }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); done();
  }
  $('#emailReportBtn').addEventListener('click', emailReport);
  $('#copyReportBtn').addEventListener('click', copyReport);

  /* ---------------- Distraction-free Focus mode ---------------- */
  function enterFocus() { document.body.classList.add('focus-mode'); $('#editor').focus(); }
  function exitFocus() { document.body.classList.remove('focus-mode'); }
  $('#focusBtn').addEventListener('click', enterFocus);
  $('#focusExit').addEventListener('click', exitFocus);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { exitFocus(); closeGhost(); } });

  /* ---------------- Idea & Project workspace ----------------
     Jot quick ideas now; turn one into a full writing project later. */
  function renderIdeas() {
    if (!state.ideas.length) {
      $('#ideaList').innerHTML = `<p class="empty">No ideas yet. Jot anything you might want to write about — a topic, a character, a question.</p>`;
      return;
    }
    $('#ideaList').innerHTML = state.ideas.map((it, i) => `
      <div class="idea-item">
        <p class="idea-text">${escapeHtml(it.text)}</p>
        <div class="idea-actions">
          <button class="primary-btn idea-go" data-i="${i}">✍️ Turn into writing</button>
          <button class="link-btn idea-del" data-i="${i}">Delete</button>
        </div>
      </div>`).join('');
    $$('.idea-go').forEach(b => b.addEventListener('click', () => turnIntoWriting(parseInt(b.dataset.i, 10))));
    $$('.idea-del').forEach(b => b.addEventListener('click', () => {
      state.ideas.splice(parseInt(b.dataset.i, 10), 1); save(); renderIdeas();
    }));
  }
  function addIdea() {
    const inp = $('#ideaInput');
    const t = inp.value.trim();
    if (t) { state.ideas.unshift({ text: t, date: todayStr() }); save(); }
    inp.value = ''; inp.focus(); renderIdeas();
  }
  function turnIntoWriting(i) {
    const it = state.ideas[i];
    if (!it) return;
    openActivity('free', it.text);   // seed the prompt with the idea
  }
  $('#ideaAdd').addEventListener('click', addIdea);
  $('#ideaInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIdea(); } });

  /* ---------------- Ghostwriter (algorithmic idea sparks) ---------------- */
  const GW_CHAR = ['a curious kid', 'a talking dog', 'a friendly robot', 'a tiny dragon', 'an astronaut',
    'a clever detective', 'a young wizard', 'a brave mouse', 'a secret superhero', 'a sneaky pirate', 'a lonely giant'];
  const GW_PLACE = ['in a haunted house', 'on a faraway planet', 'deep under the ocean', 'at a brand-new school',
    'inside a video game', 'in a candy forest', 'on a deserted island', 'in a giant treehouse', 'in a city made of ice'];
  const GW_EVENT = ['discovers a hidden door', 'loses something important', 'makes a surprising new friend',
    'has to solve a tricky puzzle', 'finds a mysterious map', 'gets one wish granted', 'wakes up with a superpower',
    'must save the day before sunset', 'hears a strange noise at night', 'switches places with someone'];
  const GW_NUDGE = ['What happens next? Just write the very next thing.', 'Add what someone says out loud.',
    'Describe what you can see, hear, and smell right now.', 'How does the main character feel?',
    'What is the biggest surprise so far?', 'What could go wrong next?', 'Add one funny detail.',
    'Zoom in on one small thing and describe it.', 'What does the character want most right now?'];

  function generateSpark() {
    // Mix story-starter prompts with "keep going" nudges.
    if (Math.random() < 0.6) {
      return `Write about ${pick(GW_CHAR)} who ${pick(GW_EVENT)} ${pick(GW_PLACE)}.`;
    }
    return pick(GW_NUDGE);
  }
  function openGhost() { $('#ghostText').textContent = generateSpark(); $('#ghost').hidden = false; }
  function closeGhost() { $('#ghost').hidden = true; }
  $('#ghostBtn').addEventListener('click', openGhost);
  $('#ghostAnother').addEventListener('click', () => { $('#ghostText').textContent = generateSpark(); });
  $('#ghostClose').addEventListener('click', closeGhost);
  $('#ghost').addEventListener('click', e => { if (e.target.id === 'ghost') closeGhost(); });
  $('#ghostUse').addEventListener('click', () => {
    $('#promptText').textContent = $('#ghostText').textContent;
    closeGhost();
    $('#editor').focus();
  });

  /* ---------------- Init ---------------- */
  applyPrefs();
  renderFigurative();
  renderHome();
})();
