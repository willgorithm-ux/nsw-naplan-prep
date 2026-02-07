import { navigate } from "../main.js";
import { getQuestionBank } from "../curriculum.js";
import { getStorage } from "../storage.js";

export async function renderQuiz(root, params) {
  const storage = getStorage();
  const progress = await storage.getProgress();

  let selectedAnswer = null;
  let attempt = 0;
  let autoAdvanceTimer = null; // Track the auto-advance timer

  // Load session once if resuming
  let session = null;
  if (params.resume) {
    session = await storage.getSession();
    if (!session) return navigate("module-select");
  }

  const module = session?.module ?? params.module;
  const missionSize = session?.missionSize ?? params.missionSize ?? 10;
  const level = session?.level ?? (progress.levels?.[module] ?? 1);

  if (!module) return navigate("module-select");

  const bank = getQuestionBank();

  // Build pool for module & difficulty (MCQ only)
  const byExactLevel = bank.filter(
    (q) => q.domain === module && q.type === "mcq" && q.difficulty === level
  );
  const fallbackPool = bank.filter((q) => q.domain === module && q.type === "mcq");

  const pool = byExactLevel.length >= missionSize ? byExactLevel : fallbackPool;

  // Stable lookup by ID
  const byId = new Map(pool.map((q) => [q.id, q]));

  // Choose mission question IDs
  const questionIds = session?.questionIds ?? Array.from(byId.keys()).slice(0, missionSize);

  // Resolve IDs using the map
  const questions = questionIds.map((id) => byId.get(id)).filter(Boolean);

  // Mission state
  let qIndex = session?.qIndex ?? 0;
  let correctCount = session?.correctCount ?? 0;
  let gemCount = session?.gemCount ?? 0;

  async function persistSession() {
    await storage.setSession({
      module,
      missionSize,
      questionIds,
      qIndex,
      correctCount,
      gemCount,
      level,
    });
  }

  function clearAutoAdvanceTimer() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  function renderQuestion() {
    // Clear any existing timer when rendering a new question
    clearAutoAdvanceTimer();

    if (qIndex >= questions.length) {
      return navigate("results", {
        module,
        correctCount,
        total: questions.length,
        gemCount,
        level,
      });
    }

    const q = questions[qIndex];
    selectedAnswer = null;
    attempt = 0;

    root.innerHTML = `
      <div class="view view-quiz">
        <div class="quiz-top">
          <div class="stats">
            <div><strong>Module:</strong> ${escapeHtml(module)}</div>
            <div><strong>Level:</strong> ${level}</div>
            <div><strong>Question:</strong> ${qIndex + 1} / ${questions.length}</div>
            <div><strong>Gems:</strong> ${gemCount}</div>
          </div>
          <button class="btn-secondary" id="quitBtn">Quit to Menu</button>
        </div>

        <h2>${escapeHtml(q.prompt)}</h2>

        <div class="options" role="group" aria-label="Answer choices">
          ${q.choices.map((c) => `<button class="option-btn" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
        </div>

        <div class="actions">
          <button class="btn-secondary" id="hintBtn">Hint</button>
          <button class="btn-primary" id="submitBtn" disabled>Submit</button>
        </div>

        <div id="hintArea" class="hint-area" style="display:none;"></div>
        <div id="feedbackArea" class="feedback-area" style="display:none;"></div>
      </div>
    `;

    root.querySelector("#quitBtn").addEventListener("click", async () => {
      clearAutoAdvanceTimer();
      await persistSession();
      navigate("module-select");
    });

    root.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAnswer = btn.getAttribute("data-choice");
        root.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        root.querySelector("#submitBtn").disabled = false;
      });
    });

    root.querySelector("#hintBtn").addEventListener("click", () => showHint(q));

    root.querySelector("#submitBtn").addEventListener("click", async () => {
      if (!selectedAnswer) return;

      const isCorrect = selectedAnswer === q.correctAnswer;

      if (isCorrect) {
        correctCount += 1;
        gemCount += 25;
        await persistSession();
        showFinalFeedback(q, true);
        return;
      }

      if (attempt === 0) {
        attempt = 1;
        showHint(q);
        showRetryFeedback();
        prepareRetryUI();
        return;
      }

      gemCount += 5;
      await persistSession();
      showFinalFeedback(q, false);
    });
  }

  function showHint(q) {
    const hintArea = root.querySelector("#hintArea");
    hintArea.style.display = "block";
    hintArea.innerHTML = `<strong>Hint:</strong> ${escapeHtml(q.hint || "Try again!")}`;
    
    // Smooth scroll to hint
    setTimeout(() => {
      hintArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function showRetryFeedback() {
    const feedbackArea = root.querySelector("#feedbackArea");
    feedbackArea.style.display = "block";
    feedbackArea.innerHTML = `
      <div class="feedback-card incorrect">
        <h3>Nice try — have one more go 😊</h3>
        <p>Check the hint, then pick an answer and press <strong>Submit</strong> again.</p>
      </div>
    `;
    
    // Smooth scroll to feedback
    setTimeout(() => {
      feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  function prepareRetryUI() {
    selectedAnswer = null;
    root.querySelectorAll(".option-btn").forEach((b) => {
      b.disabled = false;
      b.classList.remove("selected");
    });
    root.querySelector("#submitBtn").disabled = true;
  }

  function showFinalFeedback(q, isCorrect) {
    const feedbackArea = root.querySelector("#feedbackArea");
    feedbackArea.style.display = "block";

    root.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
    root.querySelector("#submitBtn").disabled = true;

    const nextLabel = isCorrect ? "Next →" : `Next → (Answer: ${escapeHtml(q.correctAnswer)})`;

    feedbackArea.innerHTML = `
      <div class="feedback-card ${isCorrect ? "correct" : "incorrect"}">
        <h3>${isCorrect ? "Correct! 🌟" : "Good effort — let's learn it 😊"}</h3>
        <p><strong>Explanation:</strong> ${escapeHtml(q.explanation || "Let's review and try another.")}</p>
        <button class="btn-primary" id="nextBtn">${nextLabel}</button>
        ${isCorrect ? '<p id="autoAdvanceText" style="margin-top:12px; font-size:14px; color:#64748b;">Auto-next in <span id="countdown">5</span>s</p>' : ''}
      </div>
    `;

    const advanceToNext = async () => {
      clearAutoAdvanceTimer();
      qIndex += 1;
      await persistSession();
      renderQuestion();
    };

    root.querySelector("#nextBtn").addEventListener("click", advanceToNext);

    // Auto-advance countdown ONLY on correct answers
    if (isCorrect) {
      let secondsLeft = 5;
      const countdownEl = root.querySelector("#countdown");

      autoAdvanceTimer = setInterval(() => {
        secondsLeft -= 1;
        if (countdownEl) countdownEl.textContent = secondsLeft;

        if (secondsLeft <= 0) {
          advanceToNext();
        }
      }, 1000);
    }

    // Smooth scroll to Next button
    setTimeout(() => {
      const nextBtn = root.querySelector("#nextBtn");
      if (nextBtn) {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  await persistSession();
  renderQuestion();
}
