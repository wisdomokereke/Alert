// ============================================
// ONLINE EXAMINATION SYSTEM
// Ogbonnaya Onu Polytechnic
// ============================================

// ============================================
// PAGE ELEMENTS
// ============================================

const questionContainer = document.getElementById("questionContainer");
const studentName = document.getElementById("studentName");
const courseName = document.getElementById("courseName");
const submitButton = document.getElementById("submitExam");
const timerElement = document.getElementById("timer");

// ============================================
// EXAM VARIABLES
// ============================================

let timeLeft = 30 * 60;
let countdown = null;
let examSubmitted = false;
let examQuestions = [];
let currentStudent = null;
let currentCourse = null;
let currentAttemptId = null;

const deviceCodeKey = "exam_device_code";

// ============================================
// DEVICE CODE
// ============================================

function getDeviceCode() {
  let deviceCode = localStorage.getItem(deviceCodeKey);

  if (!deviceCode) {
    deviceCode =
      "PC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    localStorage.setItem(deviceCodeKey, deviceCode);
  }

  return deviceCode;
}

// ============================================
// RECORD SESSION EVENT
// ============================================

async function recordSessionEvent(eventType, description, metadata = {}) {
  if (!currentAttemptId) {
    return;
  }

  const { error } = await supabaseClient.from("session_events").insert({
    attempt_id: currentAttemptId,
    event_type: eventType,
    event_time: new Date().toISOString(),
    description: description,
    device_code: getDeviceCode(),
    metadata: metadata,
  });

  if (error) {
    console.error("Session event error:", error);
  }
}

// ============================================
// UPDATE ACTIVITY
// ============================================

async function updateActivity(connectionStatus = "connected") {
  if (!currentAttemptId) {
    return;
  }

  const { error } = await supabaseClient
    .from("exam_attempts")
    .update({
      last_activity_at: new Date().toISOString(),
      connection_status: connectionStatus,
    })
    .eq("id", currentAttemptId);

  if (error) {
    console.error("Activity update error:", error);
  }
}

// ============================================
// CHECK IF STUDENT ALREADY COMPLETED EXAM
// ============================================

async function checkPreviousAttempt() {
  console.log("Checking previous examination attempt...");

  const { data, error } = await supabaseClient
    .from("exam_attempts")
    .select(
      `
      id,
      status,
      submitted_at,
      course_id
    `,
    )
    .eq("student_id", currentStudent.id)
    .eq("course_id", currentCourse.id)
    .eq("status", "completed")
    .order("submitted_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Previous attempt check failed:", error);

    showError(
      "We could not verify your previous examination attempt. Please contact the administrator.",
    );

    return true;
  }

  if (data) {
    console.log("Student has already completed this examination.");

    localStorage.setItem("examSubmitted", "true");
    localStorage.setItem("examCourse", currentCourse.name);

    window.location.replace("submitted.html");

    return true;
  }

  console.log("No completed attempt found.");

  return false;
}

// ============================================
// CREATE EXAM ATTEMPT
// ============================================

async function createExamAttempt() {
  console.log("Creating examination attempt...");

  const attemptData = {
    student_id: currentStudent.id,
    course_id: currentCourse.id,
    exam_code: "ENG-EXAM-001",
    attempt_number: 1,
    device_code: getDeviceCode(),
    network_name: "School ICT Network",
    connection_status: "connected",
    suspicious: false,
    suspicion_level: "none",
    status: "in_progress",
    last_activity_at: new Date().toISOString(),
  };

  console.log("Attempt data:", attemptData);

  const { data, error } = await supabaseClient
    .from("exam_attempts")
    .insert(attemptData)
    .select("id")
    .single();

  if (error) {
    console.error("====================================");
    console.error("EXAM ATTEMPT CREATION FAILED");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    console.error("====================================");

    showError(
      "Unable to start your examination session. Please contact the administrator.",
    );

    return false;
  }

  if (!data || !data.id) {
    console.error("Exam attempt was created but no attempt ID was returned.");

    showError(
      "Your examination session could not be initialized. Please contact the administrator.",
    );

    return false;
  }

  currentAttemptId = data.id;

  console.log("Exam attempt created successfully.");
  console.log("Attempt ID:", currentAttemptId);

  // ========================================
  // RECORD SESSION START
  // ========================================

  await recordSessionEvent(
    "SESSION_STARTED",
    "Student examination session started.",
    {
      exam_code: "ENG-EXAM-001",
      course: currentCourse.name,
    },
  );

  return true;
}

// ============================================
// INITIALIZE EXAM
// ============================================

async function initializeExam() {
  console.log("Initializing examination...");

  // ========================================
  // CHECK LOGIN
  // ========================================

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    console.error("No valid student session.");

    redirectToLogin();

    return;
  }

  const session = sessionData.session;

  console.log("Student session found.");

  // ========================================
  // LOAD STUDENT
  // ========================================

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

  if (studentError || !student) {
    console.error("Student lookup failed:", studentError);

    showError("Your student account could not be verified.");

    return;
  }

  currentStudent = student;

  console.log("Student verified:", student.full_name);

  studentName.textContent =
    student.full_name || student.registration_number || "Student";

  // ========================================
  // LOAD ENGLISH COURSE
  // ========================================

  const { data: course, error: courseError } = await supabaseClient
    .from("courses")
    .select(
      `
      id,
      name,
      code
    `,
    )
    .eq("code", "ENG")
    .maybeSingle();

  if (courseError || !course) {
    console.error("Course lookup failed:", courseError);

    showError("English examination could not be found.");

    return;
  }

  currentCourse = course;

  console.log("Course loaded:", course.name);

  courseName.textContent = course.name;

  // ========================================
  // PREVENT RETAKING COMPLETED EXAM
  // ========================================

  const alreadyCompleted = await checkPreviousAttempt();

  if (alreadyCompleted) {
    return;
  }

  // ========================================
  // LOAD QUESTIONS
  // ========================================

  await loadExamQuestions();

  if (examQuestions.length !== 20) {
    return;
  }

  // ========================================
  // CREATE EXAM SESSION
  // ========================================

  const attemptCreated = await createExamAttempt();

  if (!attemptCreated) {
    return;
  }

  // ========================================
  // START TIMER
  // ========================================

  startTimer();

  console.log("====================================");
  console.log("EXAMINATION STARTED SUCCESSFULLY");
  console.log("====================================");
}

// ============================================
// LOAD QUESTIONS
// ============================================

async function loadExamQuestions() {
  console.log("Loading questions from Supabase...");

  const { data, error } = await supabaseClient
    .from("questions")
    .select(
      `
      id,
      course_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d
    `,
    )
    .eq("course_id", currentCourse.id);

  if (error) {
    console.error("Question loading failed:", error);

    showError("Unable to load examination questions.");

    return;
  }

  if (!data || data.length === 0) {
    showError("No examination questions are available.");

    return;
  }

  if (data.length < 20) {
    showError("There are not enough examination questions available.");

    return;
  }

  examQuestions = shuffleArray(data).slice(0, 20);

  displayQuestions();
}

// ============================================
// DISPLAY QUESTIONS
// ============================================

function displayQuestions() {
  questionContainer.innerHTML = "";

  examQuestions.forEach(function (question, index) {
    const questionCard = document.createElement("div");

    questionCard.className = "question-card";

    const questionTitle = document.createElement("p");

    questionTitle.className = "question-number";

    questionTitle.textContent = `${index + 1}. ${question.question_text}`;

    questionCard.appendChild(questionTitle);

    const options = [
      {
        letter: "A",
        text: question.option_a,
      },
      {
        letter: "B",
        text: question.option_b,
      },
      {
        letter: "C",
        text: question.option_c,
      },
      {
        letter: "D",
        text: question.option_d,
      },
    ];

    options.forEach(function (option) {
      const label = document.createElement("label");

      label.className = "option";

      const input = document.createElement("input");

      input.type = "radio";
      input.name = `question-${question.id}`;
      input.value = option.letter;

      const text = document.createElement("span");

      text.textContent = option.text;

      label.appendChild(input);
      label.appendChild(text);

      questionCard.appendChild(label);

      // ==================================
      // RECORD ANSWER ACTIVITY
      // ==================================

      input.addEventListener("change", async function () {
        await updateActivity("connected");

        await recordSessionEvent(
          "ANSWER_SUBMITTED",
          `Answer selected for question ${index + 1}.`,
          {
            question_id: question.id,
            question_number: index + 1,
            selected_answer: option.letter,
          },
        );
      });
    });

    questionContainer.appendChild(questionCard);
  });

  console.log("20 questions displayed successfully.");
}

// ============================================
// SHUFFLE
// ============================================

function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// ============================================
// TIMER
// ============================================

function startTimer() {
  updateTimer();

  countdown = setInterval(function () {
    timeLeft--;

    updateTimer();

    if (timeLeft <= 0) {
      clearInterval(countdown);

      submitExam(true);
    }
  }, 1000);
}

// ============================================
// UPDATE TIMER
// ============================================

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);

  const seconds = timeLeft % 60;

  timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ============================================
// COLLECT ANSWERS
// ============================================

function collectAnswers() {
  const answers = [];

  examQuestions.forEach(function (question) {
    const selected = document.querySelector(
      `input[name="question-${question.id}"]:checked`,
    );

    answers.push({
      question_id: question.id,
      selected_answer: selected ? selected.value : null,
    });
  });

  return answers;
}

// ============================================
// SAVE ANSWERS
// ============================================

async function saveAnswers(answers) {
  if (!currentAttemptId) {
    console.error("Cannot save answers: no attempt ID.");

    return false;
  }

  const answerRows = answers.map(function (answer) {
    return {
      attempt_id: currentAttemptId,
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
    };
  });

  const { error } = await supabaseClient.from("answers").insert(answerRows);

  if (error) {
    console.error("Unable to save answers:", error);

    return false;
  }

  console.log("Answers saved successfully.");

  return true;
}

// ============================================
// COMPLETE EXAM ATTEMPT
// ============================================

async function completeExamAttempt(automaticSubmission = false) {
  if (!currentAttemptId) {
    console.error("Cannot complete exam: no attempt ID.");

    return false;
  }

  const now = new Date().toISOString();

  const { error } = await supabaseClient
    .from("exam_attempts")
    .update({
      submitted_at: now,
      status: "completed",
      connection_status: "completed",
      last_activity_at: now,
    })
    .eq("id", currentAttemptId);

  if (error) {
    console.error("Unable to complete examination attempt:", error);

    return false;
  }

  await recordSessionEvent(
    "EXAM_SUBMITTED",
    "Student examination was submitted.",
    {
      automatic_submission: automaticSubmission,
    },
  );

  console.log("Exam attempt marked as completed.");

  return true;
}

// ============================================
// SUBMIT EXAM
// ============================================

async function submitExam(automaticSubmission = false) {
  if (examSubmitted) {
    return;
  }

  examSubmitted = true;

  if (countdown) {
    clearInterval(countdown);
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  console.log(
    automaticSubmission
      ? "Time expired. Submitting examination..."
      : "Submitting examination...",
  );

  try {
    // ========================================
    // COLLECT ANSWERS
    // ========================================

    const answers = collectAnswers();

    // ========================================
    // SAVE ANSWERS
    // ========================================

    const answersSaved = await saveAnswers(answers);

    if (!answersSaved) {
      throw new Error("Your answers could not be saved.");
    }

    // ========================================
    // COMPLETE ATTEMPT
    // ========================================

    const attemptCompleted = await completeExamAttempt(automaticSubmission);

    if (!attemptCompleted) {
      throw new Error("Your examination could not be completed.");
    }

    // ========================================
    // SAVE BASIC SUBMISSION STATE
    // ========================================

    localStorage.setItem("examCourse", currentCourse.name);

    localStorage.setItem("examSubmitted", "true");

    // Remove temporary answers
    localStorage.removeItem("examAnswers");

    // ========================================
    // GO TO SUBMISSION PAGE
    // ========================================

    window.location.replace("submitted.html");
  } catch (error) {
    console.error("Exam submission failed:", error);

    examSubmitted = false;

    submitButton.disabled = false;

    submitButton.textContent = "Submit Examination";

    alert("Your examination could not be submitted. Please try again.");
  }
}

// ============================================
// SUBMIT BUTTON
// ============================================

submitButton.addEventListener("click", function () {
  const confirmed = window.confirm(
    "Are you sure you want to submit your examination? You will not be able to return to the examination after submission.",
  );

  if (!confirmed) {
    return;
  }

  submitExam(false);
});

// ============================================
// TAB / WINDOW MONITORING
// ============================================

document.addEventListener("visibilitychange", async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  if (document.hidden) {
    await recordSessionEvent(
      "WINDOW_HIDDEN",
      "Student left or changed the examination tab.",
      {
        visibility_state: document.visibilityState,
      },
    );
  } else {
    await recordSessionEvent(
      "WINDOW_VISIBLE",
      "Student returned to the examination tab.",
      {
        visibility_state: document.visibilityState,
      },
    );
  }

  await updateActivity("connected");
});

// ============================================
// WINDOW FOCUS MONITORING
// ============================================

window.addEventListener("blur", async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  await recordSessionEvent(
    "WINDOW_FOCUS_LOST",
    "Examination window lost focus.",
  );

  await updateActivity("connected");
});

window.addEventListener("focus", async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  await recordSessionEvent(
    "WINDOW_FOCUS_RESTORED",
    "Examination window regained focus.",
  );

  await updateActivity("connected");
});

// ============================================
// INTERNET CONNECTION MONITORING
// ============================================

window.addEventListener("offline", async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  await updateActivity("disconnected");

  await recordSessionEvent(
    "CONNECTION_LOST",
    "Student device lost internet connection.",
  );
});

window.addEventListener("online", async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  await updateActivity("connected");

  await recordSessionEvent(
    "CONNECTION_RESTORED",
    "Student device restored internet connection.",
  );
});

// ============================================
// PERIODIC ACTIVITY UPDATE
// ============================================

setInterval(async function () {
  if (!currentAttemptId || examSubmitted) {
    return;
  }

  await updateActivity(navigator.onLine ? "connected" : "disconnected");
}, 30000);

// ============================================
// ERROR DISPLAY
// ============================================

function showError(message) {
  questionContainer.innerHTML = `
    <div class="question-card">
      <p>${message}</p>
    </div>
  `;

  submitButton.disabled = true;
}

// ============================================
// REDIRECT TO LOGIN
// ============================================

function redirectToLogin() {
  window.location.replace("index.html");
}

// ============================================
// START EXAM
// ============================================

initializeExam();
