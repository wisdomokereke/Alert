// ============================================
// ADMIN DASHBOARD
// ============================================

console.log("adminDashboard.js loaded");

const adminName = document.getElementById("adminName");

const logoutBtn = document.getElementById("logoutBtn");

const refreshBtn = document.getElementById("refreshBtn");

const closeDetailsBtn = document.getElementById("closeDetailsBtn");

const totalSessions = document.getElementById("totalSessions");

const activeSessions = document.getElementById("activeSessions");

const completedSessions = document.getElementById("completedSessions");

const suspiciousSessions = document.getElementById("suspiciousSessions");

const sessionTableBody = document.getElementById("sessionTableBody");

const sessionDetails = document.getElementById("sessionDetails");

let attempts = [];

// ============================================
// FORMAT DATE
// ============================================

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

// ============================================
// CALCULATE DURATION
// ============================================

function calculateDuration(start, end) {
  if (!start) {
    return "—";
  }

  const startTime = new Date(start);

  const endTime = end ? new Date(end) : new Date();

  const difference = Math.max(0, endTime - startTime);

  const totalSeconds = Math.floor(difference / 1000);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// CHECK ADMIN
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

  const { data: admin, error: adminError } = await supabaseClient
    .from("admins")
    .select(
      `
            id,
            full_name,
            email,
            auth_user_id
        `,
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Administrator verification error:", adminError);

    alert("Unable to verify administrator account.");

    window.location.href = "adminLogin.html";

    return null;
  }

  if (!admin) {
    await supabaseClient.auth.signOut();

    window.location.href = "adminLogin.html";

    return null;
  }

  adminName.textContent = admin.full_name;

  return admin;
}

// ============================================
// LOAD EXAM SESSIONS
// ============================================

async function loadSessions() {
  sessionTableBody.innerHTML = `
        <tr>
            <td colspan="9" class="empty-state">
                Loading examination sessions...
            </td>
        </tr>
    `;

  const { data, error } = await supabaseClient
    .from("exam_attempts")
    .select(
      `
            id,
            student_id,
            course_id,
            exam_code,
            attempt_number,
            started_at,
            submitted_at,
            score,
            status,
            device_code,
            network_name,
            ip_address,
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
    console.error("Unable to load sessions:", error);

    sessionTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    Unable to load examination sessions.
                </td>
            </tr>
        `;

    return;
  }

  attempts = data || [];

  updateDashboardCounts();

  if (attempts.length === 0) {
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

  for (const attempt of attempts) {
    const student = await getStudent(attempt.student_id);

    const course = await getCourse(attempt.course_id);

    const studentName = student?.full_name || `Student #${attempt.student_id}`;

    const registration = student?.registration_number || "—";

    const courseName =
      course?.name || course?.title || `Course #${attempt.course_id}`;

    const started = formatDate(attempt.started_at);

    let status = attempt.status || "unknown";

    if (status === "in_progress") {
      status = "Active";
    }

    if (status === "completed") {
      status = "Completed";
    }

    const risk = attempt.suspicious
      ? attempt.suspicion_level || "Flagged"
      : "Normal";

    const riskClass = attempt.suspicious ? "risk-high" : "risk-normal";

    const row = document.createElement("tr");

    row.innerHTML = `

            <td>
                ${escapeHtml(studentName)}
            </td>

            <td>
                ${escapeHtml(registration)}
            </td>

            <td>
                ${escapeHtml(courseName)}
            </td>

            <td>
                ${escapeHtml(attempt.ip_address || "—")}
            </td>

            <td>
                ${escapeHtml(attempt.device_code || "—")}
            </td>

            <td>
                ${escapeHtml(started)}
            </td>

            <td>
                <span class="status-badge">
                    ${escapeHtml(status)}
                </span>
            </td>

            <td>
                <span class="risk-badge ${riskClass}">
                    ${escapeHtml(risk)}
                </span>
            </td>

            <td>

                <button
                    class="view-btn"
                    data-id="${attempt.id}"
                >
                    View
                </button>

            </td>
        `;

    sessionTableBody.appendChild(row);
  }

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const attemptId = Number(button.dataset.id);

      showSessionDetails(attemptId);
    });
  });
}

// ============================================
// GET STUDENT
// ============================================

async function getStudent(studentId) {
  if (!studentId) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("students")
    .select(
      `
            id,
            full_name,
            registration_number,
            department_id
        `,
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Student lookup error:", error);

    return null;
  }

  return data;
}

// ============================================
// GET COURSE
// ============================================

async function getCourse(courseId) {
  if (!courseId) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    console.error("Course lookup error:", error);

    return null;
  }

  return data;
}

// ============================================
// DASHBOARD COUNTS
// ============================================

function updateDashboardCounts() {
  const total = attempts.length;

  const active = attempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;

  const completed = attempts.filter(
    (attempt) => attempt.status === "completed",
  ).length;

  const suspicious = attempts.filter(
    (attempt) => attempt.suspicious === true,
  ).length;

  totalSessions.textContent = total;

  activeSessions.textContent = active;

  completedSessions.textContent = completed;

  suspiciousSessions.textContent = suspicious;
}

// ============================================
// SHOW SESSION DETAILS
// ============================================

async function showSessionDetails(attemptId) {
  const attempt = attempts.find(
    (item) => Number(item.id) === Number(attemptId),
  );

  if (!attempt) {
    return;
  }

  sessionDetails.hidden = false;

  sessionDetails.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  const student = await getStudent(attempt.student_id);

  const course = await getCourse(attempt.course_id);

  document.getElementById("detailStudentName").textContent =
    student?.full_name || "—";

  document.getElementById("detailRegistration").textContent =
    student?.registration_number || "—";

  document.getElementById("detailDepartment").textContent =
    await getDepartmentName(student?.department_id);

  document.getElementById("detailCourse").textContent =
    course?.name || course?.title || "—";

  document.getElementById("detailExamCode").textContent =
    attempt.exam_code || "—";

  document.getElementById("detailAttempt").textContent =
    attempt.attempt_number || 1;

  document.getElementById("detailQuestions").textContent = "20";

  document.getElementById("detailStarted").textContent = formatDate(
    attempt.started_at,
  );

  document.getElementById("detailSubmitted").textContent = formatDate(
    attempt.submitted_at,
  );

  document.getElementById("detailDuration").textContent = calculateDuration(
    attempt.started_at,
    attempt.submitted_at,
  );

  document.getElementById("detailScore").textContent =
    attempt.score !== null ? attempt.score : "—";

  document.getElementById("detailIp").textContent =
    attempt.ip_address || "Not recorded";

  document.getElementById("detailDevice").textContent =
    attempt.device_code || "Not assigned";

  document.getElementById("detailNetwork").textContent =
    attempt.network_name || "School ICT Network";

  document.getElementById("detailConnection").textContent =
    attempt.connection_status || "Unknown";

  document.getElementById("detailSuspicious").textContent = attempt.suspicious
    ? "Flagged"
    : "Normal";

  document.getElementById("detailRisk").textContent =
    attempt.suspicion_level || "None";

  document.getElementById("detailReason").textContent =
    attempt.suspicion_reason || "No suspicious activity recorded.";

  await loadAnsweredCount(attempt.id);

  await loadSessionEvents(attempt.id);

  await loadWiresharkObservations(attempt.id);
}

// ============================================
// DEPARTMENT
// ============================================

async function getDepartmentName(departmentId) {
  if (!departmentId) {
    return "—";
  }

  const { data, error } = await supabaseClient
    .from("departments")
    .select("*")
    .eq("id", departmentId)
    .maybeSingle();

  if (error || !data) {
    return "—";
  }

  return data.name || data.department_name || "—";
}

// ============================================
// ANSWER COUNT
// ============================================

async function loadAnsweredCount(attemptId) {
  const { data, error } = await supabaseClient
    .from("answers")
    .select("id", {
      count: "exact",
    })
    .eq("attempt_id", attemptId)
    .not("selected_answer", "is", null);

  if (error) {
    console.error("Unable to count answers:", error);

    document.getElementById("detailAnswered").textContent = "—";

    return;
  }

  document.getElementById("detailAnswered").textContent = data?.length || 0;
}

// ============================================
// SESSION EVENTS
// ============================================

async function loadSessionEvents(attemptId) {
  const eventTimeline = document.getElementById("eventTimeline");

  eventTimeline.innerHTML = "Loading events...";

  const { data, error } = await supabaseClient
    .from("session_events")
    .select(
      `
            id,
            event_type,
            event_time,
            description,
            ip_address,
            device_code
        `,
    )
    .eq("attempt_id", attemptId)
    .order("event_time", {
      ascending: true,
    });

  if (error) {
    console.error("Unable to load session events:", error);

    eventTimeline.innerHTML = "Unable to load session events.";

    return;
  }

  if (!data || data.length === 0) {
    eventTimeline.innerHTML = "No monitoring events recorded.";

    return;
  }

  eventTimeline.innerHTML = "";

  data.forEach((event) => {
    const item = document.createElement("div");

    item.className = "event-item";

    item.innerHTML = `

            <div class="event-time">
                ${escapeHtml(formatDate(event.event_time))}
            </div>

            <div class="event-content">

                <strong>
                    ${escapeHtml(event.event_type)}
                </strong>

                <p>
                    ${escapeHtml(event.description || "")}
                </p>

            </div>
        `;

    eventTimeline.appendChild(item);
  });
}

// ============================================
// WIRESHARK OBSERVATIONS
// ============================================

async function loadWiresharkObservations(attemptId) {
  const area = document.getElementById("wiresharkArea");

  area.innerHTML = "Loading network observations...";

  const { data, error } = await supabaseClient
    .from("wireshark_observations")
    .select(
      `
            id,
            observed_ip,
            observed_device,
            network_name,
            capture_start,
            capture_end,
            protocol,
            destination,
            traffic_status,
            finding,
            investigation_notes,
            reviewed,
            reviewed_by,
            reviewed_at
        `,
    )
    .eq("attempt_id", attemptId)
    .order("capture_start", {
      ascending: false,
    });

  if (error) {
    console.error("Unable to load Wireshark observations:", error);

    area.innerHTML = "Unable to load network observations.";

    return;
  }

  if (!data || data.length === 0) {
    area.innerHTML = `
            <p>
                No Wireshark observation has been
                recorded for this session.
            </p>
        `;

    return;
  }

  area.innerHTML = "";

  data.forEach((item) => {
    const observation = document.createElement("div");

    observation.className = "wireshark-record";

    observation.innerHTML = `

            <div>
                <span>Observed IP</span>
                <strong>
                    ${escapeHtml(item.observed_ip || "—")}
                </strong>
            </div>

            <div>
                <span>Device</span>
                <strong>
                    ${escapeHtml(item.observed_device || "—")}
                </strong>
            </div>

            <div>
                <span>Network</span>
                <strong>
                    ${escapeHtml(item.network_name || "—")}
                </strong>
            </div>

            <div>
                <span>Protocol</span>
                <strong>
                    ${escapeHtml(item.protocol || "—")}
                </strong>
            </div>

            <div>
                <span>Destination</span>
                <strong>
                    ${escapeHtml(item.destination || "—")}
                </strong>
            </div>

            <div>
                <span>Traffic Status</span>
                <strong>
                    ${escapeHtml(item.traffic_status || "—")}
                </strong>
            </div>

            <div class="full-width">
                <span>Finding</span>
                <strong>
                    ${escapeHtml(item.finding || "—")}
                </strong>
            </div>

            <div class="full-width">
                <span>Investigation Notes</span>
                <strong>
                    ${escapeHtml(item.investigation_notes || "—")}
                </strong>
            </div>

            <div>
                <span>Reviewed</span>
                <strong>
                    ${item.reviewed ? "Yes" : "No"}
                </strong>
            </div>

        `;

    area.appendChild(observation);
  });
}

// ============================================
// CLOSE DETAILS
// ============================================

closeDetailsBtn.addEventListener("click", () => {
  sessionDetails.hidden = true;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// ============================================
// REFRESH
// ============================================

refreshBtn.addEventListener("click", async () => {
  refreshBtn.disabled = true;

  refreshBtn.textContent = "Refreshing...";

  await loadSessions();

  refreshBtn.disabled = false;

  refreshBtn.textContent = "Refresh Data";
});

// ============================================
// LOGOUT
// ============================================

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

// ============================================
// INITIALIZE
// ============================================

async function initializeDashboard() {
  const admin = await checkAdmin();

  if (!admin) {
    return;
  }

  await loadSessions();
}

initializeDashboard();
