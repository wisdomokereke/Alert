// ============================================
// EXAMINATION SUBMISSION PAGE
// Ogbonnaya Onu Polytechnic
// ============================================

console.log("submitted.js loaded");

const logoutButton = document.getElementById("logoutButton");
const logoutMessage = document.getElementById("logoutMessage");

// ============================================
// LOGOUT
// ============================================

async function logoutStudent() {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  logoutMessage.textContent = "";

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout error:", error);

      logoutMessage.textContent = "Unable to log out. Please try again.";

      logoutButton.disabled = false;
      logoutButton.textContent = "Logout";

      return;
    }

    // Remove examination-related temporary data
    localStorage.removeItem("examSubmitted");
    localStorage.removeItem("examCourse");
    localStorage.removeItem("examAnswers");

    // Return to student login
    window.location.replace("index.html");
  } catch (error) {
    console.error("Unexpected logout error:", error);

    logoutMessage.textContent = "Something went wrong while logging out.";

    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
  }
}

// ============================================
// LOGOUT BUTTON
// ============================================

logoutButton.addEventListener("click", logoutStudent);

// ============================================
// PREVENT BACK TO EXAM
// ============================================

// Replace this page in browser history.
window.history.replaceState(null, "", window.location.href);

window.addEventListener("popstate", function () {
  window.history.replaceState(null, "", window.location.href);
});
