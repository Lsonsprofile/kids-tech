/**
 * Coding Examination System
 * =========================
 * One-page online exam for HTML, CSS & JavaScript.
 * Client-side protections are deterrents only — not a substitute
 * for proper server-side examination security.
 *
 * Future: replace loadQuestions() with authenticated API call.
 */

// ==============================
// CONFIGURATION
// ==============================
const QUESTIONS_PER_EXAM = 20;
const EXAM_DURATION = 30 * 60; // 30 minutes in seconds
const MAX_WARNINGS = 3;
const STORAGE_KEY_ACTIVE = "coding_exam_active";
const STORAGE_KEY_HISTORY = "coding_exam_history";

// ==============================
// STATE
// ==============================
let examState = {
  examId: "",
  studentName: "",
  questions: [],          // selected & shuffled questions for this attempt
  currentIndex: 0,        // 0-based index into questions array
  answers: {},            // { questionId: userAnswer }
  warnings: 0,
  violations: [],
  startedAt: null,
  endTime: null,          // absolute timestamp (ms)
  submitted: false,
  terminated: false
};

let allQuestions = [];    // full bank from JSON
let timerInterval = null;
let isExamActive = false;
let saveTimeout = null;

// ==============================
// DOM REFERENCES
// ==============================
const startScreen = document.getElementById("start-screen");
const examScreen = document.getElementById("exam-screen");
const resultsScreen = document.getElementById("results-screen");
const terminatedScreen = document.getElementById("terminated-screen");
const examHeader = document.getElementById("exam-header");

const studentNameInput = document.getElementById("student-name-input");
const startExamBtn = document.getElementById("start-exam-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const newAttemptBtn = document.getElementById("new-attempt-btn");
const terminatedNewBtn = document.getElementById("terminated-new-btn");

const questionText = document.getElementById("question-text");
const questionCategory = document.getElementById("question-category");
const questionTypeBadge = document.getElementById("question-type-badge");
const optionsContainer = document.getElementById("options-container");
const theoryContainer = document.getElementById("theory-container");
const theoryAnswer = document.getElementById("theory-answer");
const saveIndicator = document.getElementById("save-indicator");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const questionCounter = document.getElementById("question-counter");
const timerDisplay = document.getElementById("timer-display");
const warningCountEl = document.getElementById("warning-count");
const displayStudentName = document.getElementById("display-student-name");
const displayExamId = document.getElementById("display-exam-id");

const warningOverlay = document.getElementById("warning-overlay");
const warningTitle = document.getElementById("warning-title");
const warningMessage = document.getElementById("warning-message");
const modalWarningCount = document.getElementById("modal-warning-count");
const warningCloseBtn = document.getElementById("warning-close-btn");

const submitOverlay = document.getElementById("submit-overlay");
const submitMessage = document.getElementById("submit-message");
const unansweredNote = document.getElementById("unanswered-note");
const continueExamBtn = document.getElementById("continue-exam-btn");
const confirmSubmitBtn = document.getElementById("confirm-submit-btn");

const restoreToast = document.getElementById("restore-toast");
const restoreMessage = document.getElementById("restore-message");
const historyList = document.getElementById("history-list");

// ==============================
// UTILITY FUNCTIONS
// ==============================

/**
 * Fisher-Yates shuffle (returns new array)
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a unique exam ID
 */
function generateExamId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900) + 100;
  return `EXAM-${y}${m}${d}-${rand}`;
}

/**
 * Format seconds as MM:SS
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Normalize theory answers for comparison (trim, lower-case, collapse spaces)
 */
function normalizeAnswer(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['"`]/g, '"')
    .replace(/;\s*$/, ""); // trailing semicolon optional
}

/**
 * Check if a theory answer is correct (flexible matching)
 */
function isTheoryCorrect(userAnswer, correctAnswer) {
  const u = normalizeAnswer(userAnswer);
  const c = normalizeAnswer(correctAnswer);
  if (u === c) return true;

  // Allow common variations for tags
  if (c.startsWith("<") && c.endsWith(">")) {
    const tag = c.slice(1, -1);
    if (u === tag || u === `<${tag}>` || u === `<${tag}/>` || u === `<${tag} />`) return true;
  }

  // For the longer JS code questions, check key parts
  if (c.includes("getElementById") && c.includes("addEventListener")) {
    const hasGetId = /getElementById\s*\(\s*["']menu-button["']\s*\)/.test(u);
    const hasToggle = /classList\.toggle\s*\(\s*["']show-menu["']\s*\)/.test(u);
    const hasListener = /addEventListener\s*\(\s*["']click["']/.test(u);
    if (hasGetId && hasToggle && hasListener) return true;
  }

  if (c.includes("getElementById") && c.includes("site-nav")) {
    if (/getElementById\s*\(\s*["']site-nav["']\s*\)/.test(u) && /const\s+siteNav/.test(u)) {
      return true;
    }
  }

  return false;
}

// ==============================
// LOAD QUESTIONS
// ==============================
async function loadQuestions() {
  // Current implementation loads questions.json.
  // Later this can be replaced with an authenticated API request.
  try {
    const response = await fetch("./data/questions.json");
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Invalid questions format");
    }
    allQuestions = data.questions;
    return true;
  } catch (err) {
    console.error("Failed to load questions:", err);
    startScreen.innerHTML = `
      <div class="card">
        <h2 style="color:var(--danger-color)">Unable to load examination questions</h2>
        <p>Please refresh the page or contact the examination administrator.</p>
      </div>`;
    return false;
  }
}

// ==============================
// EXAM INITIALIZATION
// ==============================
function createExamAttempt(studentName) {
  // Select and shuffle questions
  const selected = shuffleArray(allQuestions).slice(0, QUESTIONS_PER_EXAM);

  // Deep-copy and shuffle options for objective questions
  const prepared = selected.map((q) => {
    const copy = { ...q };
    if (copy.type === "objective" && Array.isArray(copy.options)) {
      copy.options = shuffleArray(copy.options);
    }
    return copy;
  });

  const now = Date.now();
  examState = {
    examId: generateExamId(),
    studentName: studentName.trim(),
    questions: prepared,
    currentIndex: 0,
    answers: {},
    warnings: 0,
    violations: [],
    startedAt: new Date().toISOString(),
    endTime: now + EXAM_DURATION * 1000,
    submitted: false,
    terminated: false
  };

  saveExamState();
}

function initializeExam() {
  isExamActive = true;
  document.body.classList.add("exam-active");

  // Show header & exam screen
  examHeader.hidden = false;
  startScreen.classList.remove("active");
  startScreen.hidden = true;
  examScreen.hidden = false;
  examScreen.classList.add("active");
  resultsScreen.hidden = true;
  resultsScreen.classList.remove("active");
  terminatedScreen.hidden = true;

  // Update header
  displayStudentName.textContent = examState.studentName;
  displayExamId.textContent = examState.examId;
  warningCountEl.textContent = examState.warnings;

  renderQuestion();
  startTimer();
  attachExamProtections();
}

// ==============================
// RENDER QUESTION
// ==============================
function renderQuestion() {
  const q = examState.questions[examState.currentIndex];
  if (!q) return;

  questionCategory.textContent = q.category || "General";
  questionTypeBadge.textContent = q.type === "theory" ? "Theory" : "Objective";
  questionTypeBadge.classList.toggle("theory", q.type === "theory");

  questionText.textContent = q.question;

  // Clear previous
  optionsContainer.innerHTML = "";
  theoryAnswer.value = "";

  if (q.type === "objective") {
    optionsContainer.hidden = false;
    theoryContainer.hidden = true;

    const letters = ["A", "B", "C", "D", "E"];
    q.options.forEach((opt, idx) => {
      const label = document.createElement("label");
      label.className = "option-label";
      label.setAttribute("for", `opt-${q.id}-${idx}`);

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `question-${q.id}`;
      input.id = `opt-${q.id}-${idx}`;
      input.value = opt;

      // Restore previous answer
      if (examState.answers[q.id] === opt) {
        input.checked = true;
        label.classList.add("selected");
      }

      input.addEventListener("change", () => {
        // Visual
        optionsContainer.querySelectorAll(".option-label").forEach((l) => l.classList.remove("selected"));
        label.classList.add("selected");
        selectAnswer(q.id, opt);
      });

      const span = document.createElement("span");
      span.className = "option-text";
      span.textContent = `${letters[idx]}. ${opt}`;

      label.appendChild(input);
      label.appendChild(span);
      optionsContainer.appendChild(label);
    });
  } else {
    // Theory
    optionsContainer.hidden = true;
    theoryContainer.hidden = false;
    theoryAnswer.value = examState.answers[q.id] || "";
    theoryAnswer.focus();
  }

  // Update progress & navigation
  updateProgress();
  updateNavButtons();
  clearSaveIndicator();
}

function updateProgress() {
  const total = examState.questions.length;
  const current = examState.currentIndex + 1;
  const pct = Math.round((current / total) * 100);

  progressBar.style.width = `${pct}%`;
  progressText.textContent = `Question ${current} of ${total} — ${pct}%`;
  questionCounter.textContent = `${current} / ${total}`;
}

function updateNavButtons() {
  prevBtn.disabled = examState.currentIndex === 0;

  if (examState.currentIndex === examState.questions.length - 1) {
    nextBtn.textContent = "Submit Examination";
    nextBtn.classList.add("btn-danger");
    nextBtn.classList.remove("btn-primary");
  } else {
    nextBtn.textContent = "Next";
    nextBtn.classList.remove("btn-danger");
    nextBtn.classList.add("btn-primary");
  }
}

// ==============================
// ANSWER HANDLING
// ==============================
function selectAnswer(questionId, value) {
  examState.answers[questionId] = value;
  showSaveIndicator("Saving…", true);
  saveExamState();
  setTimeout(() => showSaveIndicator("✓ Answer saved", false), 300);
}

function handleTheoryInput() {
  const q = examState.questions[examState.currentIndex];
  if (!q || q.type !== "theory") return;

  // Debounce save
  clearTimeout(saveTimeout);
  showSaveIndicator("Saving…", true);
  saveTimeout = setTimeout(() => {
    examState.answers[q.id] = theoryAnswer.value;
    saveExamState();
    showSaveIndicator("✓ Answer saved", false);
  }, 400);
}

function showSaveIndicator(text, isSaving) {
  saveIndicator.textContent = text;
  saveIndicator.classList.add("visible");
  saveIndicator.classList.toggle("saving", isSaving);
}

function clearSaveIndicator() {
  saveIndicator.classList.remove("visible");
  saveIndicator.textContent = "";
}

// ==============================
// NAVIGATION
// ==============================
function nextQuestion() {
  // Save theory answer if present
  const q = examState.questions[examState.currentIndex];
  if (q && q.type === "theory") {
    examState.answers[q.id] = theoryAnswer.value.trim();
    saveExamState();
  }

  if (examState.currentIndex === examState.questions.length - 1) {
    // Submit flow
    showSubmitConfirmation();
  } else {
    examState.currentIndex++;
    saveExamState();
    renderQuestion();
  }
}

function previousQuestion() {
  // Save theory
  const q = examState.questions[examState.currentIndex];
  if (q && q.type === "theory") {
    examState.answers[q.id] = theoryAnswer.value.trim();
    saveExamState();
  }

  if (examState.currentIndex > 0) {
    examState.currentIndex--;
    saveExamState();
    renderQuestion();
  }
}

// ==============================
// TIMER
// ==============================
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  function tick() {
    const remaining = Math.max(0, Math.floor((examState.endTime - Date.now()) / 1000));
    timerDisplay.textContent = formatTime(remaining);

    if (remaining <= 60) {
      timerDisplay.classList.add("warning");
    } else {
      timerDisplay.classList.remove("warning");
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      // Auto-submit
      finalizeExam(false);
    }
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

// ==============================
// STATE PERSISTENCE
// ==============================
function saveExamState() {
  try {
    const toSave = {
      ...examState,
      // Store questions with their current option order
      questions: examState.questions
    };
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(toSave));
  } catch (e) {
    console.warn("Could not save exam state", e);
  }
}

function restoreExamState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    if (!saved || saved.submitted || saved.terminated) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      return false;
    }

    // Check if time already expired
    if (saved.endTime && Date.now() >= saved.endTime) {
      examState = saved;
      finalizeExam(false);
      return true;
    }

    examState = saved;
    return true;
  } catch (e) {
    console.warn("Could not restore state", e);
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    return false;
  }
}

function clearActiveExam() {
  localStorage.removeItem(STORAGE_KEY_ACTIVE);
}

function saveToHistory(result) {
  try {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
    history.unshift(result); // newest first
    // Keep last 20
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn("Could not save history", e);
  }
}

function renderHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
  } catch (_) {}

  if (!history.length) {
    historyList.innerHTML = `<p class="empty-history">No previous attempts yet.</p>`;
    return;
  }

  historyList.innerHTML = history
    .map(
      (h) => `
      <div class="history-item">
        <div>
          <strong>${escapeHtml(h.studentName)}</strong>
          <div class="date">${h.examId} · ${formatDate(h.submittedAt)}</div>
        </div>
        <div class="score">${h.score} / ${h.total} (${h.percentage}%)</div>
        <div>${h.warnings} warn</div>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

// ==============================
// WARNING SYSTEM
// ==============================
function showWarning(title, message) {
  warningTitle.textContent = title;
  warningMessage.textContent = message;
  modalWarningCount.textContent = examState.warnings;
  warningOverlay.hidden = false;
  // Force reflow then show
  requestAnimationFrame(() => {
    warningOverlay.classList.add("visible");
  });
}

function hideWarning() {
  warningOverlay.classList.remove("visible");
  setTimeout(() => {
    warningOverlay.hidden = true;
  }, 250);
}

function recordViolation(type) {
  if (!isExamActive || examState.submitted || examState.terminated) return;

  examState.warnings += 1;
  examState.violations.push({
    type,
    timestamp: new Date().toISOString()
  });
  warningCountEl.textContent = examState.warnings;
  saveExamState();

  const messages = {
    copy: "Copying examination content is not permitted.",
    cut: "Cutting examination content is not permitted.",
    select: "Selecting examination content is restricted.",
    right_click: "Right-click is disabled during this examination.",
    tab_switch: "You left the examination window. This activity has been recorded.",
    fullscreen_exit: "You exited fullscreen mode. Please return to fullscreen mode.",
    drag: "Dragging examination content is not permitted.",
    shortcut: "This keyboard shortcut is disabled during the examination."
  };

  showWarning("Examination Warning", messages[type] || "This action has been recorded.");

  if (examState.warnings >= MAX_WARNINGS) {
    // Terminate after a short delay so user sees the last warning
    setTimeout(() => {
      finalizeExam(true);
    }, 1800);
  }
}

// ==============================
// PROTECTION HANDLERS
// ==============================
function attachExamProtections() {
  // Fullscreen change
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  // Visibility (tab switch)
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Context menu
  document.addEventListener("contextmenu", handleContextMenu);

  // Copy / cut / select / drag
  document.addEventListener("copy", handleCopy);
  document.addEventListener("cut", handleCut);
  document.addEventListener("selectstart", handleSelectStart);
  document.addEventListener("dragstart", handleDragStart);

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyDown);
}

function detachExamProtections() {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  document.removeEventListener("contextmenu", handleContextMenu);
  document.removeEventListener("copy", handleCopy);
  document.removeEventListener("cut", handleCut);
  document.removeEventListener("selectstart", handleSelectStart);
  document.removeEventListener("dragstart", handleDragStart);
  document.removeEventListener("keydown", handleKeyDown);
}

function handleFullscreenChange() {
  if (!isExamActive) return;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    recordViolation("fullscreen_exit");
  }
}

function handleVisibilityChange() {
  if (!isExamActive) return;
  if (document.hidden) {
    recordViolation("tab_switch");
  }
}

function handleContextMenu(e) {
  if (!isExamActive) return;
  e.preventDefault();
  recordViolation("right_click");
}

function handleCopy(e) {
  if (!isExamActive) return;
  e.preventDefault();
  recordViolation("copy");
}

function handleCut(e) {
  if (!isExamActive) return;
  e.preventDefault();
  recordViolation("cut");
}

function handleSelectStart(e) {
  if (!isExamActive) return;
  // Allow selection inside theory textarea
  if (e.target === theoryAnswer || theoryAnswer.contains(e.target)) return;
  e.preventDefault();
}

function handleDragStart(e) {
  if (!isExamActive) return;
  e.preventDefault();
  recordViolation("drag");
}

function handleKeyDown(e) {
  if (!isExamActive) return;

  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;

  // Block common shortcuts
  if (ctrl && ["c", "x", "a", "u", "s", "p"].includes(key)) {
    e.preventDefault();
    recordViolation("shortcut");
    return;
  }

  // Block F12, Ctrl+Shift+I/J/C
  if (
    e.key === "F12" ||
    (ctrl && e.shiftKey && ["i", "j", "c"].includes(key))
  ) {
    e.preventDefault();
    recordViolation("shortcut");
  }
}

// ==============================
// FULLSCREEN
// ==============================
async function requestFullscreen() {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
  } catch (err) {
    console.warn("Fullscreen request rejected or unavailable:", err);
    // Continue without fullscreen — do not block the exam
  }
}

// ==============================
// SUBMIT FLOW
// ==============================
function showSubmitConfirmation() {
  // Count answered
  const total = examState.questions.length;
  let answered = 0;
  examState.questions.forEach((q) => {
    const ans = examState.answers[q.id];
    if (ans !== undefined && ans !== null && String(ans).trim() !== "") {
      answered++;
    }
  });

  const unanswered = total - answered;
  submitMessage.textContent = `You have answered ${answered} of ${total} questions.`;

  if (unanswered > 0) {
    unansweredNote.textContent = `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}.`;
    unansweredNote.hidden = false;
  } else {
    unansweredNote.hidden = true;
  }

  submitOverlay.hidden = false;
  requestAnimationFrame(() => submitOverlay.classList.add("visible"));
}

function hideSubmitConfirmation() {
  submitOverlay.classList.remove("visible");
  setTimeout(() => {
    submitOverlay.hidden = true;
  }, 250);
}

function finalizeExam(wasTerminated) {
  if (examState.submitted) return;

  // Ensure theory answer of current question is saved
  const q = examState.questions[examState.currentIndex];
  if (q && q.type === "theory") {
    examState.answers[q.id] = theoryAnswer.value.trim();
  }

  isExamActive = false;
  document.body.classList.remove("exam-active");
  detachExamProtections();

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Exit fullscreen if possible
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
  }

  examState.submitted = true;
  examState.terminated = !!wasTerminated;

  const results = calculateResults();
  saveToHistory({
    examId: examState.examId,
    studentName: examState.studentName,
    score: results.correct,
    total: results.total,
    percentage: results.percentage,
    warnings: examState.warnings,
    submittedAt: new Date().toISOString(),
    terminated: wasTerminated
  });

  clearActiveExam();
  renderHistory();

  // Hide exam UI
  examScreen.hidden = true;
  examScreen.classList.remove("active");
  examHeader.hidden = true;

  if (wasTerminated) {
    terminatedScreen.hidden = false;
    terminatedScreen.classList.add("active");
  } else {
    showResults(results);
  }
}

function calculateResults() {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const total = examState.questions.length;

  examState.questions.forEach((q) => {
    const userAns = examState.answers[q.id];
    if (userAns === undefined || userAns === null || String(userAns).trim() === "") {
      unanswered++;
      return;
    }

    let isCorrect = false;
    if (q.type === "objective") {
      isCorrect = userAns === q.answer;
    } else {
      isCorrect = isTheoryCorrect(userAns, q.answer);
    }

    if (isCorrect) correct++;
    else wrong++;
  });

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Time used
  const started = new Date(examState.startedAt).getTime();
  const ended = Date.now();
  const usedSeconds = Math.min(EXAM_DURATION, Math.floor((ended - started) / 1000));

  return {
    correct,
    wrong,
    unanswered,
    total,
    percentage,
    timeUsed: formatTime(usedSeconds)
  };
}

function showResults(results) {
  document.getElementById("result-student").textContent = examState.studentName;
  document.getElementById("result-exam-id").textContent = examState.examId;
  document.getElementById("result-score").textContent = `${results.correct} / ${results.total}`;
  document.getElementById("result-percentage").textContent = `${results.percentage}%`;
  document.getElementById("result-correct").textContent = results.correct;
  document.getElementById("result-wrong").textContent = results.wrong;
  document.getElementById("result-unanswered").textContent = results.unanswered;
  document.getElementById("result-warnings").textContent = examState.warnings;
  document.getElementById("result-time-used").textContent = results.timeUsed;

  const title = document.getElementById("results-title");
  title.textContent = examState.terminated ? "Examination Terminated" : "Examination Complete";

  resultsScreen.hidden = false;
  resultsScreen.classList.add("active");
}

// ==============================
// START / NEW ATTEMPT
// ==============================
async function startExamination() {
  const name = studentNameInput.value.trim();
  if (!name) {
    studentNameInput.focus();
    studentNameInput.style.borderColor = "var(--danger-color)";
    return;
  }
  studentNameInput.style.borderColor = "";

  // Request fullscreen (non-blocking)
  await requestFullscreen();

  createExamAttempt(name);
  initializeExam();
}

function startNewAttempt() {
  // Reset UI
  resultsScreen.hidden = true;
  resultsScreen.classList.remove("active");
  terminatedScreen.hidden = true;
  terminatedScreen.classList.remove("active");
  examHeader.hidden = true;

  startScreen.hidden = false;
  startScreen.classList.add("active");
  studentNameInput.value = "";
  studentNameInput.focus();

  // Clear any leftover state
  examState = {
    examId: "",
    studentName: "",
    questions: [],
    currentIndex: 0,
    answers: {},
    warnings: 0,
    violations: [],
    startedAt: null,
    endTime: null,
    submitted: false,
    terminated: false
  };
  isExamActive = false;
  document.body.classList.remove("exam-active");
}

// ==============================
// EVENT LISTENERS
// ==============================
startExamBtn.addEventListener("click", startExamination);

studentNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startExamination();
});

prevBtn.addEventListener("click", previousQuestion);
nextBtn.addEventListener("click", nextQuestion);

theoryAnswer.addEventListener("input", handleTheoryInput);

warningCloseBtn.addEventListener("click", hideWarning);

continueExamBtn.addEventListener("click", () => {
  hideSubmitConfirmation();
});

confirmSubmitBtn.addEventListener("click", () => {
  hideSubmitConfirmation();
  finalizeExam(false);
});

newAttemptBtn.addEventListener("click", startNewAttempt);
terminatedNewBtn.addEventListener("click", startNewAttempt);

// ==============================
// BOOTSTRAP
// ==============================
(async function init() {
  const loaded = await loadQuestions();
  if (!loaded) return;

  renderHistory();

  // Try restore unfinished exam
  if (restoreExamState()) {
    // Show toast
    restoreMessage.textContent = `Your previous examination session has been restored. You are continuing from Question ${examState.currentIndex + 1}.`;
    restoreToast.hidden = false;
    requestAnimationFrame(() => restoreToast.classList.add("visible"));
    setTimeout(() => {
      restoreToast.classList.remove("visible");
      setTimeout(() => (restoreToast.hidden = true), 300);
    }, 4500);

    initializeExam();
  } else {
    // Normal start screen
    startScreen.classList.add("active");
    studentNameInput.focus();
  }
})();
