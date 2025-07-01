let questionBank = {}, userAnswers = {}, currentTest = "", currentIndex = 0;
let timerInterval = null, reviewQuestions = [];

// Load questions
window.onload = function () {
  const modalElement = document.getElementById('namemodal');
  const modal = new bootstrap.Modal(modalElement);
  modal.show();

  // Modal name submit
  document.getElementById("submitBtn").addEventListener("click", function () {
    const name = document.getElementById("nameInput").value.trim();
    if (name !== "") {
      document.getElementById("cname").textContent = name;
      modal.hide();
    } else {
      alert("Please enter your name.");
    }
  });

}



fetch("questions.json").then(res => res.json()).then(data => questionBank = data);



function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }

function startTest(testId) {
  currentTest = testId;
  currentIndex = 0;
  reviewQuestions = [];
  userAnswers[testId] = [];

  questionBank[testId] = shuffleArray(questionBank[testId]);
  questionBank[testId].forEach(q => {
    const correctText = q.options[q.correct];
    q.options = shuffleArray(q.options);
    q.correct = q.options.indexOf(correctText);
  });

  renderQuestion(testId, 0);
  startTimer(300);
  updateLiveScore();
  updateSidebarStats();
  updateQuestionPalette();
}

function totalQuestions() {
  return questionBank[currentTest].length + reviewQuestions.length;
}

function renderQuestion(testId, index) {
  const isReview = index >= questionBank[currentTest].length;
  const actualIndex = isReview ? reviewQuestions[index - questionBank[currentTest].length] : index;
  const q = questionBank[testId][actualIndex];

  document.getElementById("quiz").innerHTML = `
    <div class="card m-2"><div class="card-body">
      <h5 class="card-title">Q${index + 1}: ${q.question}</h5>
      <div>${q.options.map((opt, i) => {
    const sel = userAnswers[testId][actualIndex] === i;
    return `<label class="d-block p-2 border rounded mb-2 ${sel ? 'bg-success text-white' : ''}">
          <input type="radio" name="q${index}"
                 onclick="selectOption(${actualIndex},${i})" ${sel ? 'checked' : ''}>
          ${opt}
        </label>`;
  }).join('')}</div>
    </div></div>`;

  document.getElementById("prevBtn").style.opacity = index === 0 ? "0.5" : "1";
  document.getElementById("nextBtn").style.opacity = index === totalQuestions() - 1 ? "0.5" : "1";

  updateLiveScore();
  updateSidebarStats();
  updateQuestionPalette();
}

function selectOption(qIdx, optIdx) {
  userAnswers[currentTest][qIdx] = optIdx;
  renderQuestion(currentTest, currentIndex);
}

function nextQuestion() {
  if (currentIndex < totalQuestions() - 1) currentIndex++;
  renderQuestion(currentTest, currentIndex);
}

function prevQuestion() {
  if (currentIndex > 0) currentIndex--;
  renderQuestion(currentTest, currentIndex);
}

function markForReview() {
  if (!reviewQuestions.includes(currentIndex)) reviewQuestions.push(currentIndex);
  alert(`Question ${currentIndex + 1} marked for review.`);
  nextQuestion();
}

function clearAnswer() {
  const isReview = currentIndex >= questionBank[currentTest].length;
  const actualIndex = isReview
    ? reviewQuestions[currentIndex - questionBank[currentTest].length]
    : currentIndex;
  userAnswers[currentTest][actualIndex] = null;
  renderQuestion(currentTest, currentIndex);
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  let t = seconds;
  timerInterval = setInterval(() => {
    const m = Math.floor(t / 60), s = t % 60;
    document.getElementById("timer").textContent = `Time left: ${m}:${s < 10 ? '0' : ''}${s}`;
    if (t-- < 0) {
      clearInterval(timerInterval);
      submitTest(currentTest);
    }
  }, 1000);
}

function calculateScore(testId) {
  return questionBank[testId].reduce((acc, q, idx) =>
    acc + (userAnswers[testId][idx] === q.correct ? 1 : 0), 0);
}

function submitTest(testId) {
  const score = calculateScore(testId);
  localStorage.setItem(`score_${testId}`, score);

  document.getElementById("final-score").innerHTML = `
    <div class="alert alert-success">
      ✅ Test Submitted!<br>
      You scored <strong>${score}</strong> out of <strong>${questionBank[testId].length}</strong>.
    </div>`;

  let resultHTML = '';
  questionBank[testId].forEach((q, i) => {
    const userAnswerIndex = userAnswers[testId][i];
    const correctAnswerIndex = q.correct;
    const userAnswer = userAnswerIndex !== null && userAnswerIndex !== undefined ? q.options[userAnswerIndex] : 'Not Answered';
    const correctAnswer = q.options[correctAnswerIndex];
    const isCorrect = userAnswerIndex === correctAnswerIndex;

    resultHTML += `
      <div class="card m-2">
        <div class="card-body">
          <h5 class="card-title">Q${i + 1}: ${q.question}</h5>
          <p><strong>Your Answer:</strong> 
            <span class="badge bg-${isCorrect ? 'success' : 'danger'}">
              ${userAnswer}
            </span>
          </p>
          ${!isCorrect ? `<p><strong>Correct Answer:</strong> <span class="badge bg-success">${correctAnswer}</span></p>` : ''}
        </div>
      </div>`;
  });

  document.getElementById("quiz").innerHTML = resultHTML;
  document.getElementById("next_options").style.display = "none";
  clearInterval(timerInterval);
}

// ✅ Update live score during test
function updateLiveScore() {
  if (!currentTest) return;
  const questions = questionBank[currentTest];
  const correct = questions.reduce((a, q, i) =>
    a + (userAnswers[currentTest][i] === q.correct ? 1 : 0), 0);
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);

  const el = document.getElementById("live-score");
  el.innerHTML = `Correct so far: ${correct} / ${total} 
    <div class="progress mt-2">
      <div class="progress-bar" role="progressbar" 
           style="width:${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">${pct}%</div>
    </div>`;
}

// ✅ Sidebar stats update
function updateSidebarStats() {
  const answers = userAnswers[currentTest] || [];
  let answered = 0, notAnswered = 0, notVisited = 0, marked = 0, amr = 0;

  const total = questionBank[currentTest].length;

  for (let i = 0; i < total; i++) {
    const visited = typeof answers[i] !== "undefined";
    const markedForReview = reviewQuestions.includes(i);
    const answeredNow = visited && answers[i] !== null;

    if (!visited) notVisited++;
    else if (markedForReview && answeredNow) amr++;
    else if (markedForReview) marked++;
    else if (answeredNow) answered++;
    else notAnswered++;
  }

  const set = (selector, val) => document.querySelector(selector).innerText = val;
  set(".just_4:nth-child(1) .just_5", answered);
  set(".just_4:nth-child(2) .just_5", notAnswered);
  set(".just_4:nth-child(3) .just_5", notVisited);
  set(".just_4:nth-child(4) .just_5", marked);
  set("#long .just_5", amr);
}

// ✅ Question palette status update
function updateQuestionPalette() {
  const questions = questionBank[currentTest];
  const answers = userAnswers[currentTest] || [];
  const palette = document.getElementById("palette-list");
  palette.innerHTML = "";

  for (let i = 0; i < questions.length; i++) {
    const visited = typeof answers[i] !== "undefined";
    const marked = reviewQuestions.includes(i);
    const answered = visited && answers[i] !== null;

    let className = "nv"; // Not Visited
    if (marked && answered) className = "amr";
    else if (marked) className = "mr";
    else if (answered) className = "a";
    else if (visited) className = "na";

    const btn = document.createElement("div");
    btn.className = `${className} item`;
    btn.textContent = i + 1;
    btn.onclick = () => {
      currentIndex = i;
      renderQuestion(currentTest, currentIndex);
    };
    palette.appendChild(btn);
  }
}
 