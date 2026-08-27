const signupForm = document.getElementById("signupForm");

const signupMessage = document.getElementById("signupMessage");

const departmentSelect = document.getElementById("department");

const signupButton = document.getElementById("signupButton");

const signupButtonText = document.getElementById("signupButtonText");

const signupSpinner = document.getElementById("signupSpinner");

// ========================================
// MESSAGE HANDLER
// ========================================

function showSignupMessage(message, type = "error") {
  signupMessage.textContent = message;

  signupMessage.className = `message ${type}`;
}

// ========================================
// LOADING STATE
// ========================================

function setSignupLoading(isLoading) {
  signupButton.disabled = isLoading;

  if (isLoading) {
    signupButtonText.textContent = "Creating account...";

    signupSpinner.hidden = false;
  } else {
    signupButtonText.textContent = "Create Account";

    signupSpinner.hidden = true;
  }
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

    showSignupMessage("Unable to load departments. Please refresh the page.");

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
// SIGNUP
// ========================================

signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  showSignupMessage("");

  const fullName = document.getElementById("fullName").value.trim();

  const email = document.getElementById("email").value.trim().toLowerCase();

  const registrationNumber = document
    .getElementById("regNumber")
    .value.trim()
    .toUpperCase();

  const departmentId = departmentSelect.value;

  const password = document.getElementById("password").value;

  const confirmPassword = document.getElementById("confirmPassword").value;

  // ====================================
  // BASIC VALIDATION
  // ====================================

  if (
    !fullName ||
    !email ||
    !registrationNumber ||
    !departmentId ||
    !password ||
    !confirmPassword
  ) {
    showSignupMessage("Please complete all required fields.");

    return;
  }

  if (password.length < 6) {
    showSignupMessage("Password must contain at least 6 characters.");

    return;
  }

  if (password !== confirmPassword) {
    showSignupMessage("Passwords do not match.");

    return;
  }

  setSignupLoading(true);

  try {
    // ====================================
    // CHECK PRE-REGISTERED STUDENT
    // ====================================

    const { data: student, error: studentError } = await supabaseClient
      .from("students")
      .select(
        `
          id,
          full_name,
          email,
          registration_number,
          department_id,
          auth_user_id
        `,
      )
      .eq("registration_number", registrationNumber)
      .eq("department_id", departmentId)
      .maybeSingle();

    if (studentError) {
      console.error("Student lookup error:", studentError.message);

      showSignupMessage("Unable to verify your student information.");

      setSignupLoading(false);

      return;
    }

    // Student doesn't exist

    if (!student) {
      showSignupMessage(
        "Student record not found. Check your registration number and department.",
      );

      setSignupLoading(false);

      return;
    }

    // ====================================
    // CHECK WHETHER ACCOUNT ALREADY EXISTS
    // ====================================

    if (student.auth_user_id) {
      showSignupMessage(
        "An account has already been registered for this student. Please sign in instead.",
      );

      setSignupLoading(false);

      return;
    }

    // ====================================
    // CHECK EMAIL
    // ====================================

    if (student.email && student.email.toLowerCase() !== email) {
      showSignupMessage("The email address does not match the student record.");

      setSignupLoading(false);

      return;
    }

    // ====================================
    // CREATE SUPABASE AUTH ACCOUNT
    // ====================================

    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email: email,

        password: password,
      });

    if (authError) {
      console.error("Signup error:", authError.message);

      showSignupMessage(authError.message);

      setSignupLoading(false);

      return;
    }

    // ====================================
    // VERIFY AUTH USER
    // ====================================

    if (!authData.user) {
      showSignupMessage(
        "Account creation could not be completed. Please try again.",
      );

      setSignupLoading(false);

      return;
    }

    // ====================================
    // LINK AUTH USER TO STUDENT
    // ====================================

    const { error: updateError } = await supabaseClient
      .from("students")
      .update({
        full_name: fullName,
        email: email,
        auth_user_id: authData.user.id,
      })
      .eq("id", student.id);

    if (updateError) {
      console.error("Student account linking error:", updateError.message);

      showSignupMessage(
        "Account was created, but the student record could not be linked. Please contact the examination administrator.",
      );

      setSignupLoading(false);

      return;
    }

    // ====================================
    // SUCCESS
    // ====================================

    showSignupMessage(
      "Account created successfully. Redirecting to login...",
      "success",
    );

    setTimeout(function () {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Unexpected signup error:", error);

    showSignupMessage("Something went wrong. Please try again.");

    setSignupLoading(false);
  }
});

// ========================================
// INITIALIZE
// ========================================

loadDepartments();
