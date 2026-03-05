(() => {
  const scriptEl = document.currentScript;
  const levelKey = (scriptEl.dataset.levelKey || 'beginner').toLowerCase();
  const levelLabel = scriptEl.dataset.levelLabel || levelKey.charAt(0).toUpperCase() + levelKey.slice(1);
  const textPath = scriptEl.dataset.txtPath;
  const PASSWORD = 'Abrorbek';
  const storageKey = 'ua_session';

  const shield = document.getElementById('shield');
  const passwordForm = document.getElementById('passwordForm');
  const passwordInput = document.getElementById('passwordInput');
  const passwordFeedback = document.getElementById('passwordFeedback');
  const nameForm = document.getElementById('nameForm');
  const fullNameInput = document.getElementById('fullName');
  const testArea = document.getElementById('testArea');
  const questionsEl = document.getElementById('questions');
  const passageEl = document.getElementById('passage');
  const submitBtn = document.getElementById('submitTest');
  const resultPanel = document.getElementById('resultPanel');
  const statusEl = document.getElementById('statusBadge');

  let questions = [];
  let answerKey = {};
  let answers = {};
  let passageText = '';
  let loaded = false;
  let submitted = false;

  const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (existing.name) fullNameInput.value = existing.name;
  if (existing.tests?.[levelKey]?.answers) answers = { ...existing.tests[levelKey].answers };

  function sanitize(line) {
    // Remove bullet points including the specific ef 82 b7 character
    return line.replace(/^[\u00B7\u2022\u2023\u25E6\u2022\u2023\u2022\uD83D\uDCDD\uf0b7]+/, '').trim();
  }

  function parseText(raw) {
    const lines = raw.split(/\r?\n/);
    let current = null;
    let capPassage = false;
    questions = []; answerKey = {}; passageText = '';
    let currentSection = '';

    for (const line of lines) {
      const c = sanitize(line);
      if (!c) continue;

      // Track sections
      if (/Part \d+: Grammar/i.test(c)) { currentSection = 'Grammar'; continue; }
      if (/Part \d+: Vocabulary/i.test(c)) { currentSection = 'Vocabulary'; continue; }
      if (/Part \d+: Reading/i.test(c)) { currentSection = 'Reading'; continue; }

      // Handle passage text
      if (/read the passage below and answer the questions/i.test(c)) { 
        capPassage = true; 
        continue; 
      }

      if (capPassage && !/^(Part|Answer Key|Placement Test)/i.test(c) && !c.match(/^\d+\.\d+\./)) {
        passageText += (passageText ? ' ' : '') + c;
        continue;
      }

      // Parse questions with exact format
      const qm = c.match(/^(\d+)\.\d+\.\s*(.+)$/);
      if (qm) {
        capPassage = false;
        current = { 
          number: qm[1], 
          prompt: qm[2], 
          choices: [],
          section: currentSection
        };
        questions.push(current);
        continue;
      }

      // Parse A/B/C/D choices with bullet points
      const cm = c.match(/^([A-D])\)\s*(.+)$/i);
      if (cm && current) {
        current.choices.push({ key: cm[1].toUpperCase(), text: cm[2] });
        continue;
      }

      // Parse answer key
      const am = c.match(/^(\d+)\.\s*([A-D])$/i);
      if (am) { 
        answerKey[am[1]] = am[2].toUpperCase(); 
      }
    }
  }

  function renderIndicators() {
    const total = Object.keys(answerKey).length;
    let indicators = '';
    for (let i = 1; i <= total; i++) {
      const color = answers[i] ? '#16a34a' : '#fff';
      indicators += `<span style="display:inline-block;width:24px;height:24px;margin:2px;border:1px solid #ccc;text-align:center;line-height:24px;font-size:0.8rem;background:${color};cursor:pointer;" onclick="scrollToQuestion(${i})">${i}</span>`;
    }
    const indicatorsEl = document.getElementById('questionIndicators');
    if (indicatorsEl) {
      indicatorsEl.innerHTML = '<p style="font-size:0.9rem;margin-bottom:8px;"></p><div>' + indicators + '</div>';
    }
  }

  function scrollToQuestion(num) {
    const questionEl = document.querySelector(`[data-qnum="${num}"]`);
    if (questionEl) {
      questionEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
    
  function renderQuestions() {
    questionsEl.innerHTML = '';
    let lastSection = '';
    let passageInserted = false;
    
    // Insert indicators div if not present
    if (!document.getElementById('questionIndicators')) {
      const indicatorsDiv = document.createElement('div');
      indicatorsDiv.id = 'questionIndicators';
      indicatorsDiv.style.position = 'fixed';
      indicatorsDiv.style.bottom = '20px';
      indicatorsDiv.style.left = '20px';
      indicatorsDiv.style.right = '20px';
      indicatorsDiv.style.background = 'rgba(255, 255, 255, 0.95)';
      indicatorsDiv.style.padding = '10px';
      indicatorsDiv.style.borderRadius = '8px';
      indicatorsDiv.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
      indicatorsDiv.style.zIndex = '100';
      indicatorsDiv.style.textAlign = 'center';
      testArea.appendChild(indicatorsDiv);
    }
    
    questions.forEach((q) => {
      // Add section header when section changes
      if (q.section && q.section !== lastSection) {
        lastSection = q.section;
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.innerHTML = `<h3 class="section-title">${q.section}</h3>`;
        questionsEl.appendChild(sectionHeader);
        
        // Insert reading passage after Grammar section and before Reading questions
        if (q.section === 'Reading' && !passageInserted && passageText.trim()) {
          passageInserted = true;
          const passageDiv = document.createElement('div');
          passageDiv.id = 'passage';
          passageDiv.innerHTML = `<p class="passage-label">Reading Passage</p><p class="passage-text">${passageText}</p>`;
          questionsEl.appendChild(passageDiv);
        }
      }
      
      const art = document.createElement('article');
      art.className = 'question';
      art.dataset.qnum = q.number;
      art.innerHTML = `<p class="q-prompt"><span class="q-num">${q.number}.</span> ${q.prompt}</p><div class="choices"></div>`;
      const choicesDiv = art.querySelector('.choices');
      q.choices.forEach((ch) => {
        const lbl = document.createElement('label');
        lbl.className = 'choice';
        lbl.innerHTML = `<input type="radio" name="q${q.number}" value="${ch.key}"><span class="choice-key">${ch.key}</span><span class="choice-text">${ch.text}</span>`;
        const radio = lbl.querySelector('input');
        if (answers[q.number] === ch.key) radio.checked = true;
        radio.addEventListener('change', () => {
          answers = { ...answers, [q.number]: ch.key };
          persistDraft();
          updateSubmitButton();
          renderIndicators();
        });
        choicesDiv.appendChild(lbl);
      });
      questionsEl.appendChild(art);
    });

    // Add reset button if not already present
    if (!document.getElementById('resetTest')) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn';
      resetBtn.id = 'resetTest';
      resetBtn.textContent = 'Reset Progress';
      resetBtn.addEventListener('click', () => {
        if (confirm("You will lose all answers. Are you sure?")) {
          answers = {};
          persistDraft();
          renderQuestions();
          updateSubmitButton();
        }
      });
      submitBtn.parentNode.appendChild(resetBtn);
    }
    renderIndicators();
  }

  function persistDraft() {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({
      ...stored,
      name: stored.name || fullNameInput.value || '',
      tests: { ...(stored.tests || {}), [levelKey]: { answers, level: levelKey } }
    }));
  }

  function showPassage() {
    // Passage is now embedded in renderQuestions, so hide the separate passage element
    passageEl.style.display = 'none';
  }

  async function loadTest() {
    if (!textPath) return;
    try {
      const res = await fetch(textPath);
      parseText(await res.text());
      renderQuestions();
      showPassage();
      loaded = true;
      updateSubmitButton();
    } catch (e) {
      statusEl.textContent = 'Failed to load test.';
    }
  }

  function submitResults() {
    const correct = Object.entries(answerKey).filter(([num, ans]) => answers[num] === ans).length;
    const total = Object.keys(answerKey).length;
    const percentage = Math.round((correct / total) * 100);
    
    localStorage.clear();
    showResultPanel(correct, total, percentage);
  }
  
  function showResultPanel(correct, total, percentage, message = 'Test completed') {
    let indicators = '';
    for (let i = 1; i <= total; i++) {
      const color = answers[i] ? '#16a34a' : '#fff';
      indicators += `<span style="display:inline-block;width:24px;height:24px;margin:2px;border:1px solid #ccc;text-align:center;line-height:24px;font-size:0.8rem;background:${color};">${i}</span>`;
    }
    resultPanel.classList.remove('hidden');
    resultPanel.innerHTML = `
      <div class="score-row">
        <span class="score-num">${correct}</span>
        <span class="score-denom">/${total}</span>
        <span class="score-pct">${percentage}%</span>
      </div>
      <p class="score-name">${fullNameInput.value.trim() || 'Anonymous'} — ${levelLabel}</p>
      <p style="font-size: 0.85rem; color: #666; margin-top: 8px;">${message}</p>
      <div style="margin-top:16px;">
        <p style="font-size:0.9rem;margin-bottom:8px;">Question Status:</p>
        <div>${indicators}</div>
      </div>
    `;
  }

  function showPasswordModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    `;
    
    modalContent.innerHTML = `
      <h2 style="margin: 0 0 16px 0; font-size: 1.5rem; font-weight: 700; color: #111;">Confirm Submission</h2>
      <p style="margin: 0 0 24px 0; color: #666; font-size: 0.9rem;">Enter the password to submit your test results.</p>
      <form id="confirmPasswordForm" style="display:flex;flex-direction:column;gap:12px">
        <input id="confirmPasswordInput" type="text" placeholder="Enter password" required style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; font-size: 0.95rem; color: #111; outline: none;" />
        <p id="confirmPasswordFeedback" class="err hidden" style="font-size: 0.8rem; color: #e00;">Incorrect password.</p>
        <button type="submit" style="background: #111; color: #fff; border: none; border-radius: 8px; padding: 11px 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer;">Submit Results</button>
        <button type="button" id="cancelConfirm" style="background: #f0f0f0; color: #666; border: none; border-radius: 8px; padding: 11px 20px; font-size: 0.9rem; font-weight: 600; cursor: pointer;">Cancel</button>
      </form>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const confirmPasswordForm = document.getElementById('confirmPasswordForm');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const confirmPasswordFeedback = document.getElementById('confirmPasswordFeedback');
    const cancelBtn = document.getElementById('cancelConfirm');
    
    confirmPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (confirmPasswordInput.value.trim() === PASSWORD) {
        document.body.removeChild(modal);
        submitted = true;
        submitBtn.disabled = true;
        submitResults();
      } else {
        confirmPasswordFeedback.classList.remove('hidden');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value.trim() === PASSWORD) {
      passwordFeedback.classList.add('hidden');
      passwordForm.classList.add('hidden');
      nameForm.classList.remove('hidden');
      passwordInput.value = '';
    } else {
      passwordFeedback.classList.remove('hidden');
    }
  });

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fullNameInput.value.trim();
    if (!name) return;
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({ ...stored, name, tests: { ...(stored.tests || {}), [levelKey]: { answers, level: levelKey } } }));
    shield.classList.add('hidden');
    testArea.classList.remove('hidden');
    statusEl.textContent = name;
    if (!loaded) loadTest();
  });

  function checkAllQuestionsAnswered() {
    const totalQuestions = Object.keys(answerKey).length;
    const answeredQuestions = Object.keys(answers).length;
    return answeredQuestions === totalQuestions;
  }

  function updateSubmitButton() {
    if (!loaded || submitted) return;
    const allAnswered = checkAllQuestionsAnswered();
    submitBtn.disabled = !allAnswered;
    submitBtn.textContent = allAnswered ? 'Submit answers' : `Answer all questions (${Object.keys(answers).length}/${Object.keys(answerKey).length})`;
  }

  submitBtn.addEventListener('click', () => {
    if (!loaded || submitted) return;
    if (!checkAllQuestionsAnswered()) {
      return;
    }
    showPasswordModal();
  });

  if (existing.name) {
    shield.classList.add('hidden');
    testArea.classList.remove('hidden');
    statusEl.textContent = existing.name;
    loadTest();
  }
})();
