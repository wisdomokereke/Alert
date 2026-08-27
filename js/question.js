// ========================================
// EXAM SYSTEM
// ========================================

const questionContainer = document.getElementById("questionContainer");

const studentName = document.getElementById("studentName");

const courseName = document.getElementById("courseName");

const submitButton = document.getElementById("submitExam");

const timerElement = document.getElementById("timer");

// ========================================
// VARIABLES
// ========================================

let timeLeft = 30 * 60;

let countdown = null;

let examSubmitted = false;

let examQuestions = [];

// ========================================
// INITIALIZE EXAM
// ========================================

async function initializeExam() {
  console.log("Initializing examination...");

  // ----------------------------------------
  // CHECK SUPABASE SESSION
  // ----------------------------------------

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Session error:", sessionError);

    redirectToLogin();

    return;
  }

  const session = sessionData.session;

  // ----------------------------------------
  // CHECK AUTHENTICATION
  // ----------------------------------------

  if (!session) {
    console.error("No authenticated session found.");

    redirectToLogin();

    return;
  }

  console.log("Authenticated user:", session.user.email);

  // ----------------------------------------
  // GET STUDENT
  // ----------------------------------------

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

  if (studentError) {
    console.error("Student lookup failed:", studentError);

    showError("Unable to load your student information.");

    return;
  }

  if (!student) {
    console.error("No student record found.");

    showError("Your student account could not be verified.");

    return;
  }

  console.log("Student loaded:", student);

  // ----------------------------------------
  // DISPLAY STUDENT
  // ----------------------------------------

  studentName.textContent =
    student.full_name || student.registration_number || "Student";

  // ----------------------------------------
  // LOAD ENGLISH QUESTIONS
  // ----------------------------------------

  await loadExamQuestions();

  // ----------------------------------------
  // START TIMER
  // ----------------------------------------

  if (examQuestions.length > 0) {
    startTimer();
  }
}

// ========================================
// LOAD EXAM QUESTIONS FROM SUPABASE
// ========================================

async function loadExamQuestions() {
  console.log("Loading questions from Supabase...");

  const { data, error } = await supabaseClient.from("questions").select(`
            id,
            course_id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        `);

  // ----------------------------------------
  // DATABASE ERROR
  // ----------------------------------------

  if (error) {
    console.error("Question loading failed:", error);

    showError("Unable to load examination questions.");

    return;
  }

  // ----------------------------------------
  // NO QUESTIONS
  // ----------------------------------------

  if (!data || data.length === 0) {
    console.error("Supabase returned no questions.");

    showError("No examination questions are available.");

    return;
  }

  console.log(`Supabase returned ${data.length} questions.`);

  // ----------------------------------------
  // SELECT 20 QUESTIONS
  // ----------------------------------------

  examQuestions = shuffleArray(data).slice(0, 20);

  console.log("Selected 20 examination questions:", examQuestions);

  // ----------------------------------------
  // DISPLAY COURSE
  // ----------------------------------------

  courseName.textContent = "English";

  // ----------------------------------------
  // DISPLAY QUESTIONS
  // ----------------------------------------

  displayQuestions();
}

// ========================================
// DISPLAY QUESTIONS
// ========================================

function displayQuestions() {
  questionContainer.innerHTML = "";

  examQuestions.forEach(function (question, index) {
    const questionCard = document.createElement("div");

    questionCard.className = "question-card";

    // --------------------------------
    // QUESTION NUMBER + TEXT
    // --------------------------------

    const questionTitle = document.createElement("p");

    questionTitle.className = "question-number";

    questionTitle.textContent = `${index + 1}. ${question.question_text}`;

    questionCard.appendChild(questionTitle);

    // --------------------------------
    // OPTIONS
    // --------------------------------

    const options = [
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
    ];

    options.forEach(function (option, optionIndex) {
      const label = document.createElement("label");

      label.className = "option";

      const input = document.createElement("input");

      input.type = "radio";

      input.name = `question-${question.id}`;

      input.value = String.fromCharCode(65 + optionIndex);

      const text = document.createElement("span");

      text.textContent = option;

      label.appendChild(input);

      label.appendChild(text);

      questionCard.appendChild(label);
    });

    questionContainer.appendChild(questionCard);
  });

  console.log("Questions displayed successfully.");
}

// ========================================
// SHUFFLE QUESTIONS
// ========================================

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// ========================================
// ERROR DISPLAY
// ========================================

function showError(message) {
  questionContainer.innerHTML = `

        <div class="question-card">

            <p>
                ${message}
            </p>

        </div>

    `;

  submitButton.disabled = true;
}

// ========================================
// TIMER
// ========================================

function startTimer() {
  updateTimer();

  countdown = setInterval(function () {
    timeLeft--;

    updateTimer();

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
  if (examSubmitted) {
    return;
  }

  examSubmitted = true;

  if (countdown) {
    clearInterval(countdown);
  }

  let score = 0;

  examQuestions.forEach(function (question) {
    const selected = document.querySelector(
      `input[name="question-${question.id}"]:checked`,
    );

    if (
      selected &&
      selected.value.toUpperCase() === question.correct_answer.toUpperCase()
    ) {
      score++;
    }
  });

  console.log(`Exam submitted. Score: ${score}/${examQuestions.length}`);

  // ----------------------------------------
  // TEMPORARY RESULT STORAGE
  // ----------------------------------------

  localStorage.setItem("examScore", score);

  localStorage.setItem("examTotal", examQuestions.length);

  window.location.href = "result.html";
}

// ========================================
// REDIRECT TO LOGIN
// ========================================

function redirectToLogin() {
  window.location.href = "index.html";
}

// ========================================
// START
// ========================================

initializeExam();
