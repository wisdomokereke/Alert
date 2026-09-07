// ========================================
// ADMIN DASHBOARD
// ========================================

console.log("adminDashboard.js loaded");

const adminName = document.getElementById("adminName");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const totalSessions = document.getElementById("totalSessions");
const activeSessions = document.getElementById("activeSessions");
const completedSessions = document.getElementById("completedSessions");
const suspiciousSessions = document.getElementById("suspiciousSessions");

const sessionTableBody = document.getElementById("sessionTableBody");

// ========================================
// CHECK ADMIN LOGIN
// ========================================

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

  console.log("Authenticated user:", user.email);
  console.log("Authenticated UID:", user.id);

  // Verify administrator record

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

  adminName.textContent = admin.full_name;

  return admin;
}

// ========================================
// LOAD EXAM SESSIONS
// ========================================

async function loadSessions() {
  sessionTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
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
                status
            `,
    )
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    console.error("Unable to load examination sessions:", error);

    sessionTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Unable to load examination sessions.
                </td>
            </tr>
        `;

    return;
  }

  console.log("Exam attempts:", attempts);

  // ========================================
  // UPDATE SUMMARY
  // ========================================

  const total = attempts.length;

  const active = attempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;

  const completed = attempts.filter(
    (attempt) => attempt.status === "completed",
  ).length;

  totalSessions.textContent = total;
  activeSessions.textContent = active;
  completedSessions.textContent = completed;

  // Suspicious monitoring will be connected later
  suspiciousSessions.textContent = "0";

  // ========================================
  // NO SESSIONS
  // ========================================

  if (attempts.length === 0) {
    sessionTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No examination sessions recorded yet.
                </td>
            </tr>
        `;

    return;
  }

  // ========================================
  // DISPLAY SESSIONS
  // ========================================

  sessionTableBody.innerHTML = "";

  attempts.forEach((attempt) => {
    const row = document.createElement("tr");

    const started = attempt.started_at
      ? new Date(attempt.started_at).toLocaleString()
      : "—";

    let statusText = attempt.status || "Unknown";

    if (statusText === "in_progress") {
      statusText = "Active";
    }

    if (statusText === "completed") {
      statusText = "Completed";
    }

    const score = attempt.score !== null ? attempt.score : "—";

    row.innerHTML = `
            <td>
                Student #${attempt.student_id}
            </td>

            <td>
                Course #${attempt.course_id}
            </td>

            <td>
                ${started}
            </td>

            <td>
                <span class="status-badge">
                    ${statusText}
                </span>
            </td>

            <td>
                ${score}
            </td>

            <td>
                <button
                    class="view-btn"
                    data-id="${attempt.id}">
                    View
                </button>
            </td>
        `;

    sessionTableBody.appendChild(row);
  });

  // ========================================
  // VIEW BUTTONS
  // ========================================

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const attemptId = button.dataset.id;

      alert("Examination attempt #" + attemptId + " selected.");
    });
  });
}

// ========================================
// LOGOUT
// ========================================

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

// ========================================
// REFRESH
// ========================================

refreshBtn.addEventListener("click", async () => {
  await loadSessions();
});

// ========================================
// START DASHBOARD
// ========================================

async function initializeDashboard() {
  const admin = await checkAdmin();

  if (!admin) {
    return;
  }

  await loadSessions();
}

initializeDashboard();
