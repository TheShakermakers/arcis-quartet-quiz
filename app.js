(function () {
  const screens = {
    start: document.getElementById("startScreen"),
    game: document.getElementById("gameScreen"),
    end: document.getElementById("endScreen"),
  };

  const els = {
    startBtn: document.getElementById("startBtn"),
    marathonBtn: document.getElementById("marathonBtn"),
    againBtn: document.getElementById("againBtn"),
    reviewBtn: document.getElementById("reviewBtn"),
    score: document.getElementById("scoreValue"),
    streak: document.getElementById("streakValue"),
    questionNumber: document.getElementById("questionNumber"),
    questionTotal: document.getElementById("questionTotal"),
    timer: document.getElementById("timerValue"),
    category: document.getElementById("categoryValue"),
    difficulty: document.getElementById("difficultyValue"),
    question: document.getElementById("questionText"),
    answers: document.getElementById("answers"),
    feedback: document.getElementById("feedback"),
    nerveFill: document.getElementById("nerveFill"),
    nerveValue: document.getElementById("nerveValue"),
    finalScore: document.getElementById("finalScore"),
    finalAccuracy: document.getElementById("finalAccuracy"),
    finalStreak: document.getElementById("finalStreak"),
    verdictTitle: document.getElementById("verdictTitle"),
    verdictText: document.getElementById("verdictText"),
    missedList: document.getElementById("missedList"),
    lifelines: {
      claus: document.getElementById("lifelineClaus"),
      bernardo: document.getElementById("lifelineBernardo"),
      sonia: document.getElementById("lifelineSonia"),
      jure: document.getElementById("lifelineJure"),
    },
  };

  const letters = ["A", "B", "C", "D"];
  let state = null;
  let timerId = null;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function setScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
    screens[name].classList.add("is-active");
  }

  function playTone(type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "right" ? "triangle" : "sawtooth";
    osc.frequency.value = type === "right" ? 660 : 150;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.19);
  }

  function startGame(length) {
    clearInterval(timerId);
    state = {
      questions: shuffle(window.CHAMBER_QUESTIONS).slice(0, length),
      index: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      answered: 0,
      nerve: 68,
      timeLeft: 25,
      locked: false,
      secondGuess: false,
      protected: false,
      misses: [],
      currentOptions: [],
    };
    els.questionTotal.textContent = state.questions.length;
    Object.values(els.lifelines).forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-disabled");
    });
    setScreen("game");
    renderQuestion();
  }

  function renderQuestion() {
    clearInterval(timerId);
    const item = state.questions[state.index];
    state.locked = false;
    state.secondGuess = false;
    state.protected = false;
    state.timeLeft = difficultyTime(item.difficulty);
    state.currentOptions = shuffle(item.options);

    els.questionNumber.textContent = state.index + 1;
    els.category.textContent = item.category;
    els.difficulty.textContent = item.difficulty;
    els.question.textContent = item.question;
    els.feedback.textContent = "";
    els.timer.textContent = state.timeLeft;
    els.answers.innerHTML = "";

    state.currentOptions.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "answer-btn";
      button.type = "button";
      button.dataset.option = option;
      button.innerHTML = `<span class="answer-key">${letters[index]}</span><span class="answer-copy"></span>`;
      button.querySelector(".answer-copy").textContent = option;
      button.addEventListener("click", () => chooseAnswer(option, button));
      els.answers.appendChild(button);
    });

    updateHud();
    timerId = setInterval(tick, 1000);
  }

  function difficultyTime(difficulty) {
    if (difficulty === "Finale") return 19;
    if (difficulty === "Hard") return 22;
    return 25;
  }

  function tick() {
    state.timeLeft -= 1;
    els.timer.textContent = state.timeLeft;
    if (state.timeLeft <= 0) {
      clearInterval(timerId);
      markMiss("Time ran out");
    }
  }

  function chooseAnswer(option, button) {
    if (state.locked) return;
    const item = state.questions[state.index];
    const isCorrect = option === item.answer;

    if (!isCorrect && state.secondGuess) {
      state.secondGuess = false;
      button.disabled = true;
      button.classList.add("is-wrong", "is-disabled");
      els.feedback.textContent = "Tenor retry: one more entrance.";
      playTone("wrong");
      return;
    }

    state.locked = true;
    clearInterval(timerId);
    if (isCorrect) {
      state.correct += 1;
      state.answered += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.score += 100 + state.timeLeft * 4 + Math.min(state.streak, 8) * 15;
      state.nerve = Math.min(100, state.nerve + 5);
      button.classList.add("is-correct");
      els.feedback.textContent = item.note;
      playTone("right");
    } else {
      markWrongButton(button);
      markMiss(option);
      return;
    }
    revealAnswer();
    updateHud();
    setTimeout(nextQuestion, 1550);
  }

  function markWrongButton(button) {
    button.classList.add("is-wrong");
  }

  function markMiss(choice) {
    const item = state.questions[state.index];
    state.locked = true;
    state.answered += 1;
    state.streak = 0;
    if (state.protected) {
      state.nerve = Math.max(0, state.nerve - 2);
      els.feedback.textContent = `Jure saved the floor. Correct: ${item.answer}. ${item.note}`;
    } else {
      state.nerve = Math.max(0, state.nerve - 11);
      els.feedback.textContent = `Correct: ${item.answer}. ${item.note}`;
    }
    state.misses.push({
      question: item.question,
      answer: item.answer,
      note: item.note,
      choice,
    });
    playTone("wrong");
    revealAnswer();
    updateHud();
    setTimeout(nextQuestion, 1850);
  }

  function revealAnswer() {
    const item = state.questions[state.index];
    [...els.answers.children].forEach((button) => {
      button.disabled = true;
      button.classList.add("is-disabled");
      if (button.dataset.option === item.answer) {
        button.classList.add("is-correct");
      }
    });
  }

  function nextQuestion() {
    state.index += 1;
    if (state.index >= state.questions.length || state.nerve <= 0) {
      finishGame();
      return;
    }
    renderQuestion();
  }

  function updateHud() {
    els.score.textContent = state.score.toLocaleString("en-US");
    els.streak.textContent = state.streak;
    els.nerveFill.style.width = `${state.nerve}%`;
    els.nerveValue.textContent = `${state.nerve}%`;
  }

  function finishGame() {
    clearInterval(timerId);
    const accuracy = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
    els.finalScore.textContent = state.score.toLocaleString("en-US");
    els.finalAccuracy.textContent = `${accuracy}%`;
    els.finalStreak.textContent = state.bestStreak;

    const verdict = getVerdict(accuracy, state.score, state.nerve);
    els.verdictTitle.textContent = verdict.title;
    els.verdictText.textContent = verdict.text;

    renderMisses();
    els.missedList.hidden = true;
    els.reviewBtn.textContent = "Review Misses";
    setScreen("end");
  }

  function getVerdict(accuracy, score, nerve) {
    if (accuracy >= 90 && nerve > 70) {
      return {
        title: "Chamber Music Royalty",
        text: "Claus entered cleanly, Bernardo knew the footnotes, Sonia kept the line, and Jure made the finale sound inevitable.",
      };
    }
    if (accuracy >= 75) {
      return {
        title: "General Rehearsal Survived",
        text: "A few questionable cadences, but the quartet walked off with dignity and at least one excellent anecdote.",
      };
    }
    if (score > 1200) {
      return {
        title: "Historically Informed Guessing",
        text: "The answers were occasionally brave, occasionally true, and always delivered with chamber-music confidence.",
      };
    }
    return {
      title: "Please Start at Letter A",
      text: "The ensemble nerve is dented, the snack table is empty, and someone mentioned Stockhausen again.",
    };
  }

  function renderMisses() {
    if (!state.misses.length) {
      els.missedList.innerHTML = "<p>No misses. Suspiciously professional.</p>";
      return;
    }
    els.missedList.innerHTML = state.misses
      .map(
        (miss) => `<article><h3>${escapeHtml(miss.question)}</h3><p><strong>${escapeHtml(
          miss.answer,
        )}</strong> - ${escapeHtml(miss.note)}</p></article>`,
      )
      .join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return map[char];
    });
  }

  function useClaus() {
    const item = state.questions[state.index];
    const wrongButtons = [...els.answers.children].filter(
      (button) => button.dataset.option !== item.answer && !button.disabled,
    );
    const target = shuffle(wrongButtons)[0];
    if (!target) return;
    target.disabled = true;
    target.classList.add("is-disabled");
    els.lifelines.claus.disabled = true;
    els.feedback.textContent = "Claus points the soprano bell away from one trap.";
  }

  function useBernardo() {
    state.timeLeft += 10;
    els.timer.textContent = state.timeLeft;
    els.lifelines.bernardo.disabled = true;
    els.feedback.textContent = "Bernardo finds ten extra seconds in the alto part.";
  }

  function useSonia() {
    state.secondGuess = true;
    els.lifelines.sonia.disabled = true;
    els.feedback.textContent = "Sonia marks one graceful second entrance.";
  }

  function useJure() {
    state.protected = true;
    els.lifelines.jure.disabled = true;
    els.feedback.textContent = "Jure puts the baritone underneath the entire room.";
  }

  els.startBtn.addEventListener("click", () => startGame(20));
  els.marathonBtn.addEventListener("click", () => startGame(40));
  els.againBtn.addEventListener("click", () => startGame(20));
  els.reviewBtn.addEventListener("click", () => {
    els.missedList.hidden = !els.missedList.hidden;
    els.reviewBtn.textContent = els.missedList.hidden ? "Review Misses" : "Hide Review";
  });

  els.lifelines.claus.addEventListener("click", useClaus);
  els.lifelines.bernardo.addEventListener("click", useBernardo);
  els.lifelines.sonia.addEventListener("click", useSonia);
  els.lifelines.jure.addEventListener("click", useJure);

  window.addEventListener("keydown", (event) => {
    if (!screens.game.classList.contains("is-active")) return;
    const key = event.key.toLowerCase();
    if (["a", "b", "c", "d"].includes(key)) {
      const index = letters.findIndex((letter) => letter.toLowerCase() === key);
      const button = els.answers.children[index];
      if (button && !button.disabled) button.click();
    }
    if (key === "1" && !els.lifelines.claus.disabled) useClaus();
    if (key === "2" && !els.lifelines.bernardo.disabled) useBernardo();
    if (key === "3" && !els.lifelines.sonia.disabled) useSonia();
    if (key === "4" && !els.lifelines.jure.disabled) useJure();
  });
})();
