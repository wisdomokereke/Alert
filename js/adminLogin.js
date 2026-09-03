// ========================================
// ADMIN LOGIN
// ========================================

const adminLoginForm = document.getElementById("adminLoginForm");

const adminMessage = document.getElementById("adminMessage");

// ========================================
// CHECK THAT FORM EXISTS
// ========================================

if (!adminLoginForm) {
  console.error("Admin login form was not found.");
}

// ========================================
// ADMIN LOGIN
// ========================================

adminLoginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  console.log("Admin login submitted.");

  const email = document.getElementById("adminEmail").value.trim();

  const password = document.getElementById("adminPassword").value;

  adminMessage.textContent = "Signing in...";
  adminMessage.style.color = "#667085";

  // ========================================
  // SUPABASE AUTHENTICATION
  // ========================================

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,

    password: password,
  });

  // ========================================
  // AUTHENTICATION ERROR
  // ========================================

  if (error) {
    console.error("Admin authentication failed:", error);

    adminMessage.textContent = "Invalid administrator email or password.";

    adminMessage.style.color = "red";

    return;
  }

  const user = data.user;

  if (!user) {
    adminMessage.textContent = "Unable to authenticate administrator.";

    adminMessage.style.color = "red";

    return;
  }

  console.log("Authenticated user:", user.email);

  console.log("Authenticated UID:", user.id);

  // ========================================
  // CHECK ADMINS TABLE
  // ========================================

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

  // ========================================
  // ADMIN RECORD ERROR
  // ========================================

  if (adminError) {
    console.error("Administrator record lookup failed:", adminError);

    adminMessage.textContent = "Unable to verify administrator account.";

    adminMessage.style.color = "red";

    return;
  }

  // ========================================
  // ADMIN NOT FOUND
  // ========================================

  if (!admin) {
    console.error("Authenticated user is not registered as an administrator.");

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

  // Store only non-sensitive information locally.

  localStorage.setItem(
    "admin",
    JSON.stringify({
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
    }),
  );

  // ========================================
  // GO TO ADMIN DASHBOARD
  // ========================================

  window.location.href = "admin-dashboard.html";
});
