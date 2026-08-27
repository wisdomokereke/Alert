// ========================================
// EXAM SYSTEM
// ========================================

// ----------------------------------------
// ELEMENTS
// ----------------------------------------

const questionContainer = document.getElementById("questionContainer");

const studentName = document.getElementById("studentName");

const courseName = document.getElementById("courseName");

const submitButton = document.getElementById("submitExam");

const timerElement = document.getElementById("timer");

// ----------------------------------------
// VARIABLES
// ----------------------------------------

let timeLeft = 30 * 60;

let countdown = null;

let examSubmitted = false;

// ========================================
// INITIALIZE EXAM
// ========================================

async function initializeExam() {
  console.log("Initializing examination...");

  // ------------------------------------
  // CHECK SUPABASE SESSION
  // ------------------------------------

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Session error:", sessionError);

    redirectToLogin();

    return;
  }

  const session = sessionData.session;

  // ------------------------------------
  // NO SESSION
  // ------------------------------------

  if (!session) {
    console.error("No authenticated Supabase session found.");

    redirectToLogin();

    return;
  }

  console.log("Authenticated user:", session.user.email);

  // ------------------------------------
  // GET STUDENT
  // ------------------------------------

  const { data: student, error: studentError } = await supabaseClient
    .from("students")
    .select(
      `
            id,
            full_name,
            email,
            registration_number,
            department_id
        `,
    )
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  // ------------------------------------
  // STUDENT ERROR
  // ------------------------------------

  if (studentError) {
    console.error("Student lookup failed:", studentError);

    questionContainer.innerHTML = `
            <div class="question-card">

                <p>
                    Unable to load your student
                    information.
                </p>

            </div>
        `;

    return;
  }

  // ------------------------------------
  // STUDENT NOT FOUND
  // ------------------------------------

  if (!student) {
    console.error("No student record is linked to this account.");

    questionContainer.innerHTML = `
            <div class="question-card">

                <p>
                    Your student account could not
                    be verified.
                </p>

            </div>
        `;

    return;
  }

  console.log("Student loaded:", student);

  // ------------------------------------
  // DISPLAY STUDENT
  // ------------------------------------

  studentName.textContent =
    student.full_name || student.registration_number || "Student";

  // ------------------------------------
  // DISPLAY COURSE
  // ------------------------------------

  courseName.textContent = "English";

  // ------------------------------------
  // LOAD QUESTIONS
  // ------------------------------------

  loadQuestions();

  // ------------------------------------
  // START TIMER
  // ------------------------------------

  startTimer();
}

// ========================================
// LOAD QUESTIONS
// ========================================

function loadQuestions() {
  // ------------------------------------
  // CHECK QUESTIONS VARIABLE
  // ------------------------------------

  if (typeof questions === "undefined") {
    console.error("questions.js was not loaded.");

    questionContainer.innerHTML = `
            <div class="question-card">

                <p>
                    Examination questions could
                    not be loaded.
                </p>

            </div>
        `;

    submitButton.disabled = true;

    return;
  }

  // ------------------------------------
  // CHECK ARRAY
  // ------------------------------------

  if (!Array.isArray(questions) || questions.length === 0) {
    console.error("No examination questions found.");

    questionContainer.innerHTML = `
            <div class="question-card">

                <p>
                    No examination questions
                    are available.
                </p>

            </div>
        `;

    submitButton.disabled = true;

    return;
  }

  // ------------------------------------
  // CLEAR LOADING MESSAGE
  // ------------------------------------

  questionContainer.innerHTML = "";

  // ------------------------------------
  // CREATE QUESTIONS
  // ------------------------------------

  questions.forEach(function (question, index) {
    const questionCard = document.createElement("div");

    questionCard.className = "question-card";

    // ----------------------------
    // QUESTION
    // ----------------------------

    const questionTitle = document.createElement("p");

    questionTitle.className = "question-number";

    questionTitle.textContent = `${index + 1}. ${question.question}`;

    questionCard.appendChild(questionTitle);

    // ----------------------------
    // OPTIONS
    // ----------------------------

    question.options.forEach(function (option, optionIndex) {
      const label = document.createElement("label");

      label.className = "option";

      const input = document.createElement("input");

      input.type = "radio";

      input.name = `question-${index}`;

      input.value = optionIndex;

      const text = document.createElement("span");

      text.textContent = option;

      label.appendChild(input);

      label.appendChild(text);

      questionCard.appendChild(label);
    });

    questionContainer.appendChild(questionCard);
  });

  console.log(`${questions.length} questions loaded.`);
}

// ========================================
// TIMER
// ========================================

function startTimer() {
  updateTimer();

  countdown = setInterval(function () {
    timeLeft--;

    updateTimer();

    // ------------------------
    // TIME EXPIRED
    // ------------------------

    if (timeLeft <= 0) {
      clearInterval(countdown);

      submitExam();
    }
  }, 1000);
}

// ========================================
// UPDATE TIMER
// ========================================

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);

  const seconds = timeLeft % 60;

  timerElement.textContent = `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

// ========================================
// SUBMIT BUTTON
// ========================================

submitButton.addEventListener("click", submitExam);

// ========================================
// SUBMIT EXAM
// ========================================

function submitExam() {
  // Prevent double submission

  if (examSubmitted) {
    return;
  }

  examSubmitted = true;

  // Stop timer

  if (countdown) {
    clearInterval(countdown);
  }

  // ------------------------------------
  // CALCULATE SCORE
  // ------------------------------------

  let score = 0;

  questions.forEach(function (question, index) {
    const selected = document.querySelector(
      `input[name="question-${index}"]:checked`,
    );

    if (selected && Number(selected.value) === question.answer) {
      score++;
    }
  });

  // ------------------------------------
  // STORE SCORE
  // ------------------------------------

  localStorage.setItem("examScore", score);

  // ------------------------------------
  // GO TO RESULT
  // ------------------------------------

  window.location.href = "result.html";
}

// ========================================
// REDIRECT TO LOGIN
// ========================================

function redirectToLogin() {
  window.location.href = "index.html";
}

// ========================================
// START APPLICATION
// ========================================

initializeExam();
