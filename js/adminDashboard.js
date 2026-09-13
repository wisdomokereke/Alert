// ============================================
// ADMIN DASHBOARD
// Ogbonnaya Onu Polytechnic
// ============================================

console.log("adminDashboard.js loaded");

// ============================================
// PAGE ELEMENTS
// ============================================

const adminName = document.getElementById("adminName");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const totalSessions = document.getElementById("totalSessions");
const activeSessions = document.getElementById("activeSessions");
const completedSessions = document.getElementById("completedSessions");
const suspiciousSessions = document.getElementById("suspiciousSessions");

const sessionTableBody = document.getElementById("sessionTableBody");

// Session details
const sessionDetails = document.getElementById("sessionDetails");
const closeDetailsBtn = document.getElementById("closeDetailsBtn");

const detailStudentName = document.getElementById("detailStudentName");
const detailRegistration = document.getElementById("detailRegistration");
const detailDepartment = document.getElementById("detailDepartment");
const detailCourse = document.getElementById("detailCourse");
const detailExamCode = document.getElementById("detailExamCode");
const detailAttempt = document.getElementById("detailAttempt");
const detailQuestions = document.getElementById("detailQuestions");
const detailAnswered = document.getElementById("detailAnswered");
const detailScore = document.getElementById("detailScore");
const detailStarted = document.getElementById("detailStarted");
const detailSubmitted = document.getElementById("detailSubmitted");
const detailDuration = document.getElementById("detailDuration");
const detailIp = document.getElementById("detailIp");
const detailDevice = document.getElementById("detailDevice");
const detailNetwork = document.getElementById("detailNetwork");
const detailConnection = document.getElementById("detailConnection");

const eventTimeline = document.getElementById("eventTimeline");

const detailSuspicious = document.getElementById("detailSuspicious");
const detailRisk = document.getElementById("detailRisk");
const detailReason = document.getElementById("detailReason");

const wiresharkArea = document.getElementById("wiresharkArea");

// ============================================
// HELPER FUNCTIONS
// ============================================

function displayValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function calculateDuration(startedAt, submittedAt, status) {
  if (!startedAt) {
    return "—";
  }

  const start = new Date(startedAt);
  const end = submittedAt ? new Date(submittedAt) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  const difference = Math.max(0, end.getTime() - start.getTime());

  const totalSeconds = Math.floor(difference / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (status === "in_progress") {
    return `${hours}h ${minutes}m ${seconds}s and counting`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatStatus(status) {
  if (status === "in_progress") {
    return "Active";
  }

  if (status === "completed") {
    return "Completed";
  }

  return displayValue(status, "Unknown");
}

function formatRiskLevel(level) {
  if (!level || level === "none") {
    return "Normal";
  }

  return String(level).replace(/_/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(element, value, fallback = "—") {
  if (element) {
    element.textContent = displayValue(value, fallback);
  }
}

function hideSessionDetails() {
  if (sessionDetails) {
    sessionDetails.hidden = true;
    sessionDetails.style.display = "none";
  }
}

function showSessionDetails() {
  if (sessionDetails) {
    sessionDetails.hidden = false;
    sessionDetails.style.display = "block";
  }
}

// ============================================
// CHECK ADMIN LOGIN
// ============================================

async function checkAdmin() {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.error("No authenticated administrator.", error);

    window.location.href = "adminLogin.html";
    return null;
  }

  console.log("Authenticated administrator:", user.email);
  console.log("Authenticated UID:", user.id);

  const { data: admin, error: adminError } = await supabaseClient
    .from("admins")
    .select("id, full_name, email, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Administrator verification error:", adminError);

    alert("Unable to verify administrator account.");

    window.location.href = "adminLogin.html";
    return null;
  }

  if (!admin) {
    console.error("User is not an administrator.");

    await supabaseClient.auth.signOut();

    window.location.href = "adminLogin.html";
    return null;
  }

  setText(adminName, admin.full_name, "Administrator");

  return admin;
}

// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents(studentIds) {
  if (!studentIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseClient
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
    .in("id", studentIds);

  if (error) {
    console.error("Unable to load students:", error);
    return new Map();
  }

  return new Map((data || []).map((student) => [student.id, student]));
}

// ============================================
// LOAD COURSES
// ============================================

async function loadCourses(courseIds) {
  if (!courseIds.length) {
    return new Map();
  }

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, name, code")
    .in("id", courseIds);

  if (error) {
    console.error("Unable to load courses:", error);
    return new Map();
  }

  return new Map((data || []).map((course) => [course.id, course]));
}

// ============================================
// LOAD EXAM SESSIONS
// ============================================

async function loadSessions() {
  if (!sessionTableBody) {
    console.error("sessionTableBody was not found.");
    return;
  }

  sessionTableBody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-state">
        Loading examination sessions...
      </td>
    </tr>
  `;

  const { data: attempts, error } = await supabaseClient
    .from("exam_attempts")
    .select(
      `
        id,
        student_id,
        course_id,
        exam_code,
        started_at,
        submitted_at,
        score,
        status,
        session_id,
        device_name,
        device_code,
        network_name,
        ip_address,
        answered_count,
        attempt_number,
        connection_status,
        suspicious,
        suspicion_level,
        suspicion_reason,
        last_activity_at
      `,
    )
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    console.error("Unable to load examination sessions:", error);

    sessionTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          Unable to load examination sessions.
        </td>
      </tr>
    `;

    return;
  }

  const safeAttempts = attempts || [];

  console.log("Exam attempts:", safeAttempts);

  const studentIds = [
    ...new Set(
      safeAttempts
        .map((attempt) => attempt.student_id)
        .filter((id) => id !== null && id !== undefined),
    ),
  ];

  const courseIds = [
    ...new Set(
      safeAttempts
        .map((attempt) => attempt.course_id)
        .filter((id) => id !== null && id !== undefined),
    ),
  ];

  const [studentsMap, coursesMap] = await Promise.all([
    loadStudents(studentIds),
    loadCourses(courseIds),
  ]);

  const total = safeAttempts.length;

  const active = safeAttempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;

  const completed = safeAttempts.filter(
    (attempt) => attempt.status === "completed",
  ).length;

  const suspicious = safeAttempts.filter(
    (attempt) =>
      attempt.suspicious === true ||
      (attempt.suspicion_level &&
        attempt.suspicion_level.toLowerCase() !== "none"),
  ).length;

  setText(totalSessions, total, "0");
  setText(activeSessions, active, "0");
  setText(completedSessions, completed, "0");
  setText(suspiciousSessions, suspicious, "0");

  if (safeAttempts.length === 0) {
    sessionTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          No examination sessions recorded yet.
        </td>
      </tr>
    `;

    return;
  }

  sessionTableBody.innerHTML = "";

  safeAttempts.forEach((attempt) => {
    const student = studentsMap.get(attempt.student_id);
    const course = coursesMap.get(attempt.course_id);

    const studentNameValue =
      student?.full_name ||
      student?.registration_number ||
      `Student #${attempt.student_id}`;

    const registrationNumber = student?.registration_number || "Not available";

    const courseNameValue =
      course?.name || course?.code || `Course #${attempt.course_id}`;

    const statusText = formatStatus(attempt.status);
    const riskText = formatRiskLevel(attempt.suspicion_level);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        ${escapeHtml(studentNameValue)}
      </td>

      <td>
        ${escapeHtml(registrationNumber)}
      </td>

      <td>
        ${escapeHtml(courseNameValue)}
      </td>

      <td>
        <strong>${escapeHtml(displayValue(attempt.ip_address))}</strong>
      </td>

      <td>
        ${escapeHtml(
          attempt.device_name || attempt.device_code || "Not available",
        )}
      </td>

      <td>
        ${escapeHtml(formatDate(attempt.started_at))}
      </td>

      <td>
        <span class="status-badge">
          ${escapeHtml(statusText)}
        </span>
      </td>

      <td>
        <span class="status-badge">
          ${escapeHtml(riskText)}
        </span>
      </td>

      <td>
        <button
          type="button"
          class="view-btn"
          data-id="${escapeHtml(attempt.id)}">
          View
        </button>
      </td>
    `;

    sessionTableBody.appendChild(row);
  });

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const attemptId = button.dataset.id;

      if (!attemptId) {
        return;
      }

      await showAttemptDetails(Number(attemptId), studentsMap, coursesMap);
    });
  });
}

// ============================================
// LOAD SESSION EVENTS
// ============================================

async function loadSessionEvents(attemptId) {
  const { data, error } = await supabaseClient
    .from("session_events")
    .select(
      `
        id,
        event_type,
        event_time,
        description,
        device_code,
        metadata
      `,
    )
    .eq("attempt_id", attemptId)
    .order("event_time", {
      ascending: true,
    });

  if (error) {
    console.error("Unable to load session events:", error);
    return [];
  }

  return data || [];
}

// ============================================
// DISPLAY SESSION EVENTS
// ============================================

function renderSessionEvents(events) {
  if (!eventTimeline) {
    return;
  }

  if (!events.length) {
    eventTimeline.innerHTML = `
      <p class="empty-state">
        No session events recorded.
      </p>
    `;

    return;
  }

  eventTimeline.innerHTML = "";

  events.forEach((event) => {
    const eventItem = document.createElement("div");

    eventItem.className = "event-item";

    const eventTitle = document.createElement("strong");
    eventTitle.textContent = displayValue(event.event_type, "Session event");

    const eventTime = document.createElement("small");
    eventTime.textContent = formatDate(event.event_time);

    const eventDescription = document.createElement("p");
    eventDescription.textContent = displayValue(
      event.description,
      "No description available.",
    );

    eventItem.appendChild(eventTitle);
    eventItem.appendChild(eventTime);
    eventItem.appendChild(eventDescription);

    if (event.device_code) {
      const deviceText = document.createElement("small");
      deviceText.textContent = `Device: ${event.device_code}`;
      eventItem.appendChild(deviceText);
    }

    eventTimeline.appendChild(eventItem);
  });
}

// ============================================
// SHOW ATTEMPT DETAILS
// ============================================

async function showAttemptDetails(
  attemptId,
  studentsMap = new Map(),
  coursesMap = new Map(),
) {
  if (!attemptId) {
    return;
  }

  showSessionDetails();

  if (eventTimeline) {
    eventTimeline.innerHTML = `
      <p class="empty-state">
        Loading session events...
      </p>
    `;
  }

  const { data: attempt, error } = await supabaseClient
    .from("exam_attempts")
    .select(
      `
        id,
        student_id,
        course_id,
        exam_code,
        started_at,
        submitted_at,
        score,
        status,
        session_id,
        device_name,
        device_code,
        network_name,
        ip_address,
        answered_count,
        attempt_number,
        connection_status,
        suspicious,
        suspicion_level,
        suspicion_reason,
        last_activity_at
      `,
    )
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    console.error("Unable to load attempt details:", error);

    alert("Unable to load examination session details.");

    hideSessionDetails();

    return;
  }

  let student = studentsMap.get(attempt.student_id);
  let course = coursesMap.get(attempt.course_id);

  if (!student) {
    const studentMap = await loadStudents([attempt.student_id]);
    student = studentMap.get(attempt.student_id);
  }

  if (!course) {
    const courseMap = await loadCourses([attempt.course_id]);
    course = courseMap.get(attempt.course_id);
  }

  const events = await loadSessionEvents(attempt.id);

  const studentNameValue =
    student?.full_name ||
    student?.registration_number ||
    `Student #${attempt.student_id}`;

  const courseNameValue =
    course?.name || course?.code || `Course #${attempt.course_id}`;

  setText(detailStudentName, studentNameValue);
  setText(detailRegistration, student?.registration_number, "Not available");
  setText(detailDepartment, student?.department_id, "Not available");
  setText(detailCourse, courseNameValue);
  setText(detailExamCode, attempt.exam_code);
  setText(detailAttempt, attempt.attempt_number, "1");

  // The current exam contains 20 questions.
  setText(detailQuestions, "20");
  setText(detailAnswered, attempt.answered_count, "0");
  setText(detailScore, attempt.score);

  setText(detailStarted, formatDate(attempt.started_at));
  setText(detailSubmitted, formatDate(attempt.submitted_at));

  setText(
    detailDuration,
    calculateDuration(attempt.started_at, attempt.submitted_at, attempt.status),
  );

  // Most important field: student's public IP address.
  setText(detailIp, attempt.ip_address, "Not captured");

  setText(
    detailDevice,
    attempt.device_name || attempt.device_code,
    "Not available",
  );

  setText(detailNetwork, attempt.network_name);
  setText(detailConnection, attempt.connection_status);

  setText(detailSuspicious, attempt.suspicious === true ? "Yes" : "No");

  setText(detailRisk, formatRiskLevel(attempt.suspicion_level));

  setText(
    detailReason,
    attempt.suspicion_reason,
    "No suspicion reason recorded.",
  );

  if (wiresharkArea) {
    wiresharkArea.innerHTML = `
      <p>
        Wireshark observations will appear here when they are recorded
        for this examination attempt.
      </p>
    `;

    const { data: observations, error: wiresharkError } = await supabaseClient
      .from("wireshark_observations")
      .select("*")
      .eq("attempt_id", attempt.id)
      .order("created_at", {
        ascending: true,
      });

    if (!wiresharkError && observations && observations.length) {
      wiresharkArea.innerHTML = "";

      observations.forEach((observation) => {
        const item = document.createElement("pre");
        item.textContent = JSON.stringify(observation, null, 2);
        wiresharkArea.appendChild(item);
      });
    }
  }

  renderSessionEvents(events);

  sessionDetails.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ============================================
// LOGOUT
// ============================================

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);

      alert("Unable to log out.");

      return;
    }

    localStorage.removeItem("admin");

    window.location.href = "adminLogin.html";
  });
}

// ============================================
// REFRESH
// ============================================

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Refreshing...";

    try {
      await loadSessions();
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Refresh";
    }
  });
}

// ============================================
// CLOSE DETAILS
// ============================================

if (closeDetailsBtn) {
  closeDetailsBtn.addEventListener("click", () => {
    hideSessionDetails();
  });
}

// ============================================
// START DASHBOARD
// ============================================

async function initializeDashboard() {
  hideSessionDetails();

  const admin = await checkAdmin();

  if (!admin) {
    return;
  }

  await loadSessions();
}

initializeDashboard();
