
// --- Plan Selection Logic ---
const planButtons = document.querySelectorAll("[data-plan]");
const planInput = document.getElementById("selected-plan");
const signupCard = document.querySelector(".ih-signup-card");

planButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const plan = btn.getAttribute("data-plan");
    if (planInput) {
      planInput.value = plan;
    }
    signupCard.scrollIntoView({ behavior: "smooth" });
  });
});

// --- Turnstile and Form Submission Logic ---
const submitButton = document.getElementById('submit-btn');
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

// This function is called by the Turnstile widget when it is successful
window.turnstileCallback = function (token) {
  if (submitButton) {
    submitButton.disabled = false;
    const currentPlan = planInput ? planInput.value : 'free';
    const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
    submitButton.textContent = `Create ${planName} account →`;
  }
};

// The authentication service runs on a separate subdomain
const authApiUrl = 'https://auth.insighthunter.app';

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  errorMessage.textContent = '';
  errorMessage.style.display = 'none';

  if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating account...';
  }

  const formData = new FormData(event.target);
  
  const turnstileResponse = formData.get('cf-turnstile-response');
  if (!turnstileResponse) {
    errorMessage.textContent = 'Please complete the security check.';
    errorMessage.style.display = 'block';
    if (submitButton) {
        submitButton.disabled = false;
        const currentPlan = planInput ? planInput.value : 'free';
        const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
        submitButton.textContent = `Create ${planName} account →`;
    }
    return;
  }

  try {
    const response = await fetch(`${authApiUrl}/api/signup`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (response.url.includes('shopping.html')) {
      window.location.href = response.url;
    } else {
      const errorText = await response.text();
      errorMessage.textContent = errorText || 'An unknown error occurred.';
      errorMessage.style.display = 'block';
      if (submitButton) {
        submitButton.disabled = false;
        const currentPlan = planInput ? planInput.value : 'free';
        const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
        submitButton.textContent = `Create ${planName} account →`;
      }
      if (window.turnstile) {
        window.turnstile.reset();
      }
    }
  } catch (error) {
    console.error('Signup request failed:', error);
    errorMessage.textContent = 'Could not connect to the signup service. Please try again later.';
    errorMessage.style.display = 'block';
    if (submitButton) {
        submitButton.disabled = false;
        const currentPlan = planInput ? planInput.value : 'free';
        const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
        submitButton.textContent = `Create ${planName} account →`;
    }
  }
});
