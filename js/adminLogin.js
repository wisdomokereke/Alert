// javascript
// ========================================
// ADMIN LOGIN
// ========================================

console.log("adminLogin.js loaded");

// Get page elements
const adminLoginForm = document.getElementById("adminLoginForm");
const adminMessage = document.getElementById("adminMessage");

// ========================================
// CHECK SUPABASE
// ========================================

if (typeof supabaseClient === "undefined") {
  console.error("supabaseClient is not available.");

  if (adminMessage) {
    adminMessage.textContent = "System error: Supabase is not connected.";
    adminMessage.style.color = "red";
  }
}

// ========================================
// CHECK FORM
// ========================================

if (!adminLoginForm) {
  console.error("Admin login form was not found.");
} else {
  adminLoginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    console.log("Admin login submitted.");

    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      adminMessage.textContent = "Please enter your email and password.";
      adminMessage.style.color = "red";
      return;
    }

    adminMessage.textContent = "Signing in...";
    adminMessage.style.color = "#667085";

    try {
      // ========================================
      // CHECK SUPABASE CLIENT
      // ========================================

      if (typeof supabaseClient === "undefined") {
        throw new Error("Supabase client is not available.");
      }

      // ========================================
      // SUPABASE AUTHENTICATION
      // ========================================

      console.log("Attempting Supabase login...");

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error("Supabase authentication error:", error);

        adminMessage.textContent = error.message;
        adminMessage.style.color = "red";

        return;
      }

      console.log("Supabase authentication successful.");

      const user = data.user;

      if (!user) {
        adminMessage.textContent =
          "Authentication succeeded, but no user was returned.";
        adminMessage.style.color = "red";

        return;
      }

      console.log("Authenticated user:", user.email);
      console.log("Authenticated UID:", user.id);

      // ========================================
      // CHECK ADMINS TABLE
      // ========================================

      console.log("Checking administrator record...");

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
        console.error("Admins table error:", adminError);

        adminMessage.textContent =
          "Login succeeded, but administrator verification failed.";

        adminMessage.style.color = "red";

        return;
      }

      if (!admin) {
        console.error("No matching administrator record found.");

        adminMessage.textContent =
          "This account is not authorized as an administrator.";

        adminMessage.style.color = "red";

        await supabaseClient.auth.signOut();

        return;
      }

      // ========================================
      // ADMIN VERIFIED
      // ========================================

      console.log("Administrator verified:", admin);

      // Store non-sensitive admin information
      localStorage.setItem(
        "admin",
        JSON.stringify({
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
        }),
      );

      // ========================================
      // OPEN DASHBOARD
      // ========================================

      console.log("Redirecting to admin dashboard...");

      window.location.href = "adminDashboard.html";
    } catch (error) {
      console.error("Unexpected admin login error:", error);

      adminMessage.textContent =
        error.message ||
        "An unexpected error occurred. Check the browser console.";

      adminMessage.style.color = "red";
    }
  });
}
