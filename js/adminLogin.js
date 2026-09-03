// ========================================
// ADMIN LOGIN
// ========================================

const adminLoginForm = document.getElementById("adminLoginForm");

const adminMessage = document.getElementById("adminMessage");

// ========================================
// SUBMIT ADMIN LOGIN
// ========================================

adminLoginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  // --------------------------------
  // GET FORM VALUES
  // --------------------------------

  const email = document.getElementById("adminEmail").value.trim();

  const password = document.getElementById("adminPassword").value;

  // --------------------------------
  // DISPLAY LOADING MESSAGE
  // --------------------------------

  adminMessage.textContent = "Signing in...";

  adminMessage.style.color = "#2563eb";

  // --------------------------------
  // SUPABASE LOGIN
  // --------------------------------

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,

    password: password,
  });

  // --------------------------------
  // LOGIN ERROR
  // --------------------------------

  if (error) {
    console.error("Administrator login error:", error);

    adminMessage.textContent = error.message;

    adminMessage.style.color = "#dc2626";

    return;
  }

  // --------------------------------
  // GET AUTHENTICATED USER
  // --------------------------------

  const user = data.user;

  if (!user) {
    adminMessage.textContent = "Unable to verify administrator account.";

    adminMessage.style.color = "#dc2626";

    return;
  }

  console.log("Authenticated user:", user.email);

  // --------------------------------
  // CHECK ADMIN TABLE
  // --------------------------------

  const { data: admin, error: adminError } = await supabaseClient
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // --------------------------------
  // ADMIN LOOKUP ERROR
  // --------------------------------

  if (adminError) {
    console.error("Admin verification error:", adminError);

    adminMessage.textContent = "Unable to verify administrator access.";

    adminMessage.style.color = "#dc2626";

    return;
  }

  // --------------------------------
  // NOT AN ADMIN
  // --------------------------------

  if (!admin) {
    // Sign out because this user
    // is not authorized as an admin.

    await supabaseClient.auth.signOut();

    adminMessage.textContent =
      "This account is not authorized to access the administrator dashboard.";

    adminMessage.style.color = "#dc2626";

    return;
  }

  // --------------------------------
  // ADMIN VERIFIED
  // --------------------------------

  console.log("Administrator verified:", admin.full_name);

  adminMessage.textContent = "Login successful. Opening dashboard...";

  adminMessage.style.color = "#16a34a";

  // --------------------------------
  // REDIRECT
  // --------------------------------

  setTimeout(
    function () {
      window.location.href = "admin-dashboard.html";
    },

    800,
  );
});
