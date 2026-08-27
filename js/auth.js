const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");

const loginButton = document.getElementById("loginButton");
const loginButtonText = document.getElementById("loginButtonText");
const loginSpinner = document.getElementById("loginSpinner");

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

// ========================================
// MESSAGE HANDLER
// ========================================

function showMessage(message, type = "error") {
  authMessage.textContent = message;

  authMessage.className = `message ${type}`;
}

// ========================================
// LOADING STATE
// ========================================

function setLoading(isLoading) {
  loginButton.disabled = isLoading;

  if (isLoading) {
    loginButtonText.textContent = "Signing in...";
    loginSpinner.hidden = false;
  } else {
    loginButtonText.textContent = "Sign In";
    loginSpinner.hidden = true;
  }
}

// ========================================
// PASSWORD VISIBILITY
// ========================================

togglePassword.addEventListener("click", function () {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";

    togglePassword.textContent = "Hide";
  } else {
    passwordInput.type = "password";

    togglePassword.textContent = "Show";
  }
});

// ========================================
// LOGIN
// ========================================

authForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  showMessage("");

  const email = document.getElementById("email").value.trim().toLowerCase();

  const password = passwordInput.value;

  // Basic validation

  if (!email || !password) {
    showMessage("Please enter your email address and password.");

    return;
  }

  setLoading(true);

  try {
    // ====================================
    // SUPABASE AUTHENTICATION
    // ====================================

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,

      password: password,
    });

    // ====================================
    // AUTHENTICATION ERROR
    // ====================================

    if (error) {
      console.error("Authentication error:", error.message);

      showMessage("Invalid email or password. Please check your credentials.");

      setLoading(false);

      return;
    }

    // ====================================
    // VERIFY USER
    // ====================================

    if (!data || !data.user) {
      showMessage(
        "Unable to establish your account session. Please try again.",
      );

      setLoading(false);

      return;
    }

    console.log("Authentication successful:", data.user.email);

    // ====================================
    // SUCCESS
    // ====================================

    showMessage("Sign in successful. Preparing your examination...", "success");

    // Give the message a moment to display

    setTimeout(function () {
      window.location.href = "verify.html";
    }, 700);
  } catch (error) {
    console.error("Unexpected authentication error:", error);

    showMessage("Something went wrong. Please try again.");

    setLoading(false);
  }
});
