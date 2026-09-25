"use strict";

/* ==========================================================================
   CONFIGURATION
   Change this single value when you deploy your FastAPI backend elsewhere.
   ========================================================================== */
const API_URL = "";

/* ==========================================================================
   ELEMENT REFERENCES
   ========================================================================== */
const form = document.getElementById("predictForm");
const predictBtn = document.getElementById("predictBtn");
const loadingCard = document.getElementById("loadingCard");
const resultCard = document.getElementById("resultCard");
const scoreNumberEl = document.getElementById("scoreNumber");
const ringProgress = document.getElementById("ringProgress");
const scoreInterpretationEl = document.getElementById("scoreInterpretation");
const profileSummaryEl = document.getElementById("profileSummary");
const predictAgainBtn = document.getElementById("predictAgainBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const toastEl = document.getElementById("toast");
const stressGrid = document.getElementById("stressGrid");
const stressHiddenInput = document.getElementById("stress_level");
const themeToggle = document.getElementById("themeToggle");
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

const RING_CIRCUMFERENCE = 2 * Math.PI * 94; // matches r=94 on the SVG ring

/* ==========================================================================
   INIT ICONS
   ========================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initTheme();
  initSliders();
  initStressCards();
  initNav();
});

/* ==========================================================================
   THEME TOGGLE
   ========================================================================== */
function initTheme() {
  const stored = safeGet("mindscore-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = stored || (prefersLight ? "light" : "dark");
  applyTheme(initial);

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    safeSet("mindscore-theme", next);
  });
}

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    themeToggle.setAttribute("aria-pressed", "true");
    themeToggle.setAttribute("aria-label", "Switch to dark mode");
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggle.setAttribute("aria-pressed", "false");
    themeToggle.setAttribute("aria-label", "Switch to light mode");
  }
}

// In-memory fallback since this page may run without persistent storage.
const memoryStore = {};
function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    memoryStore[key] = value;
  }
}
function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return memoryStore[key] || null;
  }
}

/* ==========================================================================
   MOBILE NAV
   ========================================================================== */
function initNav() {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ==========================================================================
   SLIDERS — live value display
   ========================================================================== */
function initSliders() {
  const sliders = [
    { id: "study_hours", suffix: " hrs" },
    { id: "physical_activity_hours", suffix: " hrs" },
    { id: "sleep_hours_per_night", suffix: " hrs" },
  ];

  sliders.forEach(({ id, suffix }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`val-${id}`);
    const update = () => {
      const num = parseFloat(input.value);
      output.textContent = `${num.toFixed(1)}${suffix}`;
    };
    input.addEventListener("input", update);
    update();
  });
}

/* ==========================================================================
   STRESS CARDS
   ========================================================================== */
function initStressCards() {
  const cards = stressGrid.querySelectorAll(".stress-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((c) => {
        c.classList.remove("is-selected");
        c.setAttribute("aria-checked", "false");
      });
      card.classList.add("is-selected");
      card.setAttribute("aria-checked", "true");
      stressHiddenInput.value = card.dataset.value;
    });
  });
}

/* ==========================================================================
   VALIDATION
   ========================================================================== */
const VALIDATORS = {
  age: (v) => {
    const n = Number(v);
    if (v === "" || Number.isNaN(n)) return "Age is required.";
    if (n < 10 || n > 100) return "Age must be between 10 and 100.";
    return "";
  },
  gender: (v) => (v ? "" : "Please select a gender."),
  country: (v) => (v.trim() ? "" : "Country is required."),
  academic_level: (v) => (v ? "" : "Please select an academic level."),
  most_used_platform: (v) => (v ? "" : "Please select a platform."),
  purpose_of_use: (v) => (v ? "" : "Please select a purpose."),
  avg_daily_usage_hours: (v) => {
    const n = Number(v);
    if (v === "" || Number.isNaN(n)) return "This field is required.";
    if (n < 0 || n > 24) return "Usage hours must be between 0 and 24.";
    return "";
  },
  daily_unlocks: (v) => {
    const n = Number(v);
    if (v === "" || Number.isNaN(n)) return "This field is required.";
    if (n < 0) return "Daily unlocks cannot be negative.";
    return "";
  },
  study_hours: (v) => {
    const n = Number(v);
    if (n < 0 || n > 24) return "Study hours must be between 0 and 24.";
    return "";
  },
  physical_activity_hours: (v) => {
    const n = Number(v);
    if (n < 0 || n > 24) return "Physical activity must be between 0 and 24.";
    return "";
  },
  sleep_hours_per_night: (v) => {
    const n = Number(v);
    if (n < 0 || n > 24) return "Sleep hours must be between 0 and 24.";
    return "";
  },
};

function validateForm(data) {
  const errors = {};
  Object.keys(VALIDATORS).forEach((field) => {
    const message = VALIDATORS[field](String(data[field] ?? ""));
    if (message) errors[field] = message;
  });
  return errors;
}

function showFieldErrors(errors) {
  // Clear all first
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".field").forEach((el) => el.classList.remove("has-error"));

  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(`err-${field}`);
    if (errorEl) {
      errorEl.textContent = message;
      const fieldWrap = errorEl.closest(".field");
      if (fieldWrap) fieldWrap.classList.add("has-error");
    }
  });
}

/* ==========================================================================
   FORM SUBMISSION
   ========================================================================== */
let isSubmitting = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const formData = new FormData(form);
  const rawData = Object.fromEntries(formData.entries());

  const errors = validateForm(rawData);
  showFieldErrors(errors);
  if (Object.keys(errors).length > 0) {
    const firstErrorField = Object.keys(errors)[0];
    const el = document.getElementById(firstErrorField);
    if (el) el.focus();
    return;
  }

  const payload = buildPayload(rawData);

  isSubmitting = true;
  setSubmittingState(true);

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 422) {
        throw new Error("VALIDATION");
      }
      throw new Error("SERVER");
    }

    const result = await response.json();
    const score = Number(result.predicted_mental_health_score);

    if (Number.isNaN(score)) {
      throw new Error("SERVER");
    }

    displayResult(score, payload);
    showToast("Prediction generated successfully.", "success");
  } catch (err) {
    handleRequestError(err);
  } finally {
    isSubmitting = false;
    setSubmittingState(false);
  }
});

function buildPayload(rawData) {
  return {
    age: Number(rawData.age),
    gender: rawData.gender,
    country: rawData.country.trim(),
    academic_level: rawData.academic_level,
    most_used_platform: rawData.most_used_platform,
    purpose_of_use: rawData.purpose_of_use,
    avg_daily_usage_hours: Number(rawData.avg_daily_usage_hours),
    daily_unlocks: Number(rawData.daily_unlocks),
    study_hours: Number(rawData.study_hours),
    physical_activity_hours: Number(rawData.physical_activity_hours),
    sleep_hours_per_night: Number(rawData.sleep_hours_per_night),
    stress_level: rawData.stress_level,
  };
}

function setSubmittingState(submitting) {
  predictBtn.disabled = submitting;
  loadingCard.hidden = !submitting;
  if (submitting) {
    resultCard.hidden = true;
    loadingCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function handleRequestError(err) {
  let title = "Something went wrong while generating the prediction.";
  let detail = "";

  if (err && err.message === "VALIDATION") {
    title = "Please check the entered information.";
  } else if (err && err.message === "SERVER") {
    title = "Something went wrong while generating the prediction.";
  } else {
    // Network failure — most likely the backend isn't running.
    title = "Prediction server unavailable";
    detail = "Please make sure the FastAPI backend is running and try again.";
  }

  showToast(detail ? `${title} ${detail}` : title, "error");
}

/* ==========================================================================
   RESULT DISPLAY
   ========================================================================== */
function displayResult(score, payload) {
  const clamped = Math.max(0, Math.min(100, score));

  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });

  animateScore(clamped);
  scoreInterpretationEl.textContent = interpretScore(clamped);
  renderProfileSummary(payload);
}

function animateScore(score) {
  // Number count-up
  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    scoreNumberEl.textContent = Math.round(eased * score);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Ring animation
  const offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;
  ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  // Force reflow so the transition reliably plays from the reset state
  ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;
  ringProgress.getBoundingClientRect();
  requestAnimationFrame(() => {
    ringProgress.style.strokeDashoffset = `${offset}`;
  });

  ringProgress.style.stroke = ringColor(score);
}

function ringColor(score) {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#8b7cf6";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

function interpretScore(score) {
  if (score >= 80) return "Higher predicted score";
  if (score >= 60) return "Moderate predicted score";
  if (score >= 40) return "Lower predicted score";
  return "Very low predicted score";
}

function renderProfileSummary(payload) {
  const items = [
    { label: "Age", value: payload.age, icon: iconUser() },
    { label: "Gender", value: payload.gender, icon: iconUser() },
    { label: "Academic Level", value: payload.academic_level, icon: iconBook() },
    { label: "Social Media", value: payload.most_used_platform, icon: iconPhone() },
    { label: "Daily Usage", value: `${payload.avg_daily_usage_hours.toFixed(1)} hrs`, icon: iconClock() },
    { label: "Study", value: `${payload.study_hours.toFixed(1)} hrs`, icon: iconBook() },
    { label: "Physical Activity", value: `${payload.physical_activity_hours.toFixed(1)} hrs`, icon: iconActivity() },
    { label: "Sleep", value: `${payload.sleep_hours_per_night.toFixed(1)} hrs`, icon: iconMoon() },
    { label: "Stress", value: payload.stress_level, icon: iconPulse() },
  ];

  profileSummaryEl.innerHTML = items
    .map(
      (item) => `
      <div class="profile-chip">
        ${item.icon}
        <span>
          <span class="profile-chip-label">${escapeHtml(item.label)}</span>
          <span class="profile-chip-value">${escapeHtml(String(item.value))}</span>
        </span>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Small inline icon helpers (kept local to avoid extra network requests) */
function iconUser() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>`;
}
function iconBook() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M18 4v16"/></svg>`;
}
function iconPhone() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>`;
}
function iconClock() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
}
function iconActivity() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
}
function iconMoon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>`;
}
function iconPulse() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 6 4-16 2 10h6"/></svg>`;
}

/* ==========================================================================
   RESULT ACTIONS
   ========================================================================== */
predictAgainBtn.addEventListener("click", () => {
  document.getElementById("predict").scrollIntoView({ behavior: "smooth", block: "start" });
});

resetFormBtn.addEventListener("click", () => {
  form.reset();
  showFieldErrors({});
  resultCard.hidden = true;

  // Reset sliders' displayed values
  ["study_hours", "physical_activity_hours", "sleep_hours_per_night"].forEach((id) => {
    document.getElementById(id).dispatchEvent(new Event("input"));
  });

  // Reset stress cards to default (Medium)
  const cards = stressGrid.querySelectorAll(".stress-card");
  cards.forEach((c) => {
    const isMedium = c.dataset.value === "Medium";
    c.classList.toggle("is-selected", isMedium);
    c.setAttribute("aria-checked", String(isMedium));
  });
  stressHiddenInput.value = "Medium";

  document.getElementById("predict").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ==========================================================================
   TOAST
   ========================================================================== */
let toastTimeout;
function showToast(message, type = "success") {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.className = `toast is-visible toast-${type}`;
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 4000);
}
