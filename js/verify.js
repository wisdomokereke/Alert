const verifyForm = document.getElementById("verifyForm");

const departmentSelect = document.getElementById("department");

const verifyMessage = document.getElementById("verifyMessage");

const verifyButton = document.getElementById("verifyButton");

const verifyButtonText = document.getElementById("verifyButtonText");

const verifySpinner = document.getElementById("verifySpinner");

// ========================================
// MESSAGE
// ========================================

function showVerifyMessage(message, type = "error") {
  verifyMessage.textContent = message;

  verifyMessage.className = `message ${type}`;
}

// ========================================
// LOADING
// ========================================

function setVerifyLoading(isLoading) {
  verifyButton.disabled = isLoading;

  if (isLoading) {
    verifyButtonText.textContent = "Verifying...";

    verifySpinner.hidden = false;
  } else {
    verifyButtonText.textContent = "Continue";

    verifySpinner.hidden = true;
  }
}

// ========================================
// CHECK AUTH SESSION
// ========================================

async function checkAuthentication() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error.message);

    window.location.href = "index.html";

    return null;
  }

  const session = data.session;

  if (!session) {
    window.location.href = "index.html";

    return null;
  }

  return session;
}

// ========================================
// LOAD DEPARTMENTS
// ========================================

async function loadDepartments() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Department loading error:", error.message);

    showVerifyMessage("Unable to load departments. Please refresh the page.");

    return;
  }

  data.forEach(function (department) {
    const option = document.createElement("option");

    option.value = department.id;

    option.textContent = department.name;

    departmentSelect.appendChild(option);
  });
}

// ========================================
// VERIFY STUDENT
// ========================================

verifyForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  showVerifyMessage("");

  const session = await checkAuthentication();

  if (!session) {
    return;
  }

  const registrationNumber = document.getElementById("regNumber").value.trim();

  const departmentId = departmentSelect.value;

  const examCode = document
    .getElementById("examCode")
    .value.trim()
    .toUpperCase();

  if (!registrationNumber || !departmentId || !examCode) {
    showVerifyMessage("Please complete all examination details.");

    return;
  }

  setVerifyLoading(true);

  try {
    // ====================================
    // GET AUTHENTICATED USER
    // ====================================

    const user = session.user;

    // ====================================
    // FIND STUDENT
    // ====================================

    const { data: student, error: studentError } = await supabaseClient
      .from("students")
      .select(
        `
          id,
          email,
          registration_number,
          department_id,
          auth_user_id
        `,
      )
      .eq("auth_user_id", user.id)
      .eq("registration_number", registrationNumber)
      .eq("department_id", departmentId)
      .maybeSingle();

    if (studentError) {
      console.error("Student verification error:", studentError.message);

      showVerifyMessage("Unable to verify your student information.");

      setVerifyLoading(false);

      return;
    }

    if (!student) {
      showVerifyMessage(
        "The registration number or department does not match your account.",
      );

      setVerifyLoading(false);

      return;
    }

    // ====================================
    // VERIFY EXAM CODE
    // ====================================

    const VALID_EXAM_CODE = "OOP2026";

    if (examCode !== VALID_EXAM_CODE) {
      showVerifyMessage("Invalid examination code.");

      setVerifyLoading(false);

      return;
    }

    // ====================================
    // SAVE VERIFIED STUDENT SESSION
    // ====================================

    const verifiedStudent = {
      studentId: student.id,

      email: student.email,

      registrationNumber: student.registration_number,

      departmentId: student.department_id,

      authUserId: student.auth_user_id,

      examCode: examCode,
    };

    sessionStorage.setItem("verifiedStudent", JSON.stringify(verifiedStudent));

    // ====================================
    // SUCCESS
    // ====================================

    showVerifyMessage(
      "Verification successful. Preparing your examination...",
      "success",
    );

    setTimeout(function () {
      window.location.href = "exam.html";
    }, 700);
  } catch (error) {
    console.error("Unexpected verification error:", error);

    showVerifyMessage("An unexpected error occurred. Please try again.");

    setVerifyLoading(false);
  }
});

// ========================================
// INITIALIZE
// ========================================

(async function initialize() {
  const session = await checkAuthentication();

  if (!session) {
    return;
  }

  await loadDepartments();
})();
