import { isSupabaseConfigured } from "./lib/supabase.js";
import { signIn as authSignIn, signUp as authSignUp } from "./lib/auth.js";

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmit = document.getElementById("loginSubmit");
const loginHintText = document.getElementById("loginHintText");
const loginHintSuffix = document.getElementById("loginHintSuffix");
const loginError = document.getElementById("loginError");
const signupToggle = document.getElementById("signupToggle");
const signupName = document.getElementById("signupName");

let isSignUp = false;

function setHint(msg) {
  if (loginError) loginError.textContent = msg;
}
function setMode(signUpMode) {
  isSignUp = signUpMode;
  if (loginSubmit) loginSubmit.textContent = signUpMode ? "Sign up" : "Log in";
  if (loginHintText) loginHintText.textContent = signUpMode ? "Already have an account? " : "No account? ";
  if (signupToggle) signupToggle.textContent = signUpMode ? "Log in" : "Sign up";
  if (loginHintSuffix) loginHintSuffix.textContent = signUpMode ? "" : " with email and password.";
  const nameRow = document.getElementById("signupNameRow");
  if (nameRow) nameRow.style.display = signUpMode ? "flex" : "none";
  setHint("");
}

if (signupToggle) {
  signupToggle.addEventListener("click", (e) => {
    e.preventDefault();
    setMode(!isSignUp);
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) return;

  loginSubmit.disabled = true;
  loginSubmit.textContent = "…";
  setHint("");

  if (!isSupabaseConfigured()) {
    sessionStorage.setItem("beautyLoggedIn", "true");
    window.location.href = "/index.html";
    return;
  }

  const TIMEOUT_MS = 15000;
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Check .env (VITE_SUPABASE_URL) and Network tab.")), ms)
      ),
    ]);
  }

  try {
    if (isSignUp) {
      const fullName = signupName ? signupName.value.trim() : "";
      const { data, error } = await withTimeout(authSignUp(email, password, fullName), TIMEOUT_MS);
      if (error) {
        setHint(error.message);
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Sign up";
        return;
      }
      if (data?.user && !data.session) {
        setHint("Check your email to confirm your account.");
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Sign up";
        return;
      }
    } else {
      const { error } = await withTimeout(authSignIn(email, password), TIMEOUT_MS);
      if (error) {
        setHint(error.message);
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Log in";
        return;
      }
    }
    sessionStorage.setItem("beautyLoggedIn", "true");
    window.location.href = "/index.html";
  } catch (err) {
    setHint(err.message || "Something went wrong.");
    loginSubmit.disabled = false;
    loginSubmit.textContent = isSignUp ? "Sign up" : "Log in";
  }
});
