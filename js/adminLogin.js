// ============================================
// ADMIN LOGIN
// ============================================

console.log("adminLogin.js loaded");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminMessage = document.getElementById("adminMessage");

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  adminMessage.textContent = "Signing in...";
  adminMessage.className = "message";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Admin login error:", error);

      adminMessage.textContent = error.message;
      adminMessage.className = "message error";

      return;
    }

    console.log("Authenticated user:", data.user);

    // Verify that this user actually exists in the admins table
    const { data: admin, error: adminError } = await supabaseClient
      .from("admins")
      .select("id, full_name, email, auth_user_id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Administrator verification error:", adminError);

      await supabaseClient.auth.signOut();

      adminMessage.textContent = "Unable to verify administrator account.";
      adminMessage.className = "message error";

      return;
    }

    if (!admin) {
      console.error("User is not an administrator.");

      await supabaseClient.auth.signOut();

      adminMessage.textContent =
        "This account is not authorized as an administrator.";
      adminMessage.className = "message error";

      return;
    }

    // Save admin information if you need it elsewhere
    localStorage.setItem("admin", JSON.stringify(admin));

    adminMessage.textContent = "Login successful. Redirecting...";
    adminMessage.className = "message success";

    // IMPORTANT:
    // Change this filename if your dashboard HTML has another name.
    window.location.href = "adminDashboard.html";
  } catch (error) {
    console.error("Unexpected login error:", error);

    adminMessage.textContent =
      "An unexpected error occurred. Please try again.";

    adminMessage.className = "message error";
  }
});
