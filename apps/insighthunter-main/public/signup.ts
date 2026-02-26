interface Window {
    turnstile: any;
    turnstileCallback: (token: string) => void;
}

// --- Plan Selection Logic ---
const planButtons = document.querySelectorAll<HTMLElement>("[data-plan]");
const planInput = document.getElementById("selected-plan") as HTMLInputElement | null;
const signupCard = document.querySelector(".ih-signup-card") as HTMLElement | null;

planButtons.forEach((btn) => {
  btn.addEventListener("click", (e: Event) => {
    e.preventDefault();
    const plan = btn.getAttribute("data-plan");
    if (planInput && plan) {
      planInput.value = plan;
    }
    signupCard?.scrollIntoView({ behavior: "smooth" });
  });
});

// --- Turnstile and Form Submission Logic ---
const submitButton = document.getElementById('submit-btn') as HTMLButtonElement | null;
const signupForm = document.getElementById('signup-form') as HTMLFormElement | null;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement | null;

// This function is called by the Turnstile widget when it is successful
window.turnstileCallback = function (token: string) {
  if (submitButton) {
    submitButton.disabled = false;
    const currentPlan = planInput ? planInput.value : 'free';
    const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
    submitButton.textContent = `Create ${planName} account →`;
  }
};

// The authentication service runs on a separate subdomain
const authApiUrl = 'https://auth.insighthunter.app';

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (errorMessage) {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }

  if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating account...';
  }

  const formData = new FormData(event.target as HTMLFormElement);
  
  const turnstileResponse = formData.get('cf-turnstile-response');
  if (!turnstileResponse) {
    if (errorMessage) {
        errorMessage.textContent = 'Please complete the security check.';
        errorMessage.style.display = 'block';
    }
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

    if (response.ok && response.redirected) {
      window.location.href = response.url;
    } else {
      const errorText = await response.text();
      if(errorMessage) {
        errorMessage.textContent = errorText || 'An unknown error occurred.';
        errorMessage.style.display = 'block';
      }
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
    if(errorMessage) {
        errorMessage.textContent = 'Could not connect to the signup service. Please try again later.';
        errorMessage.style.display = 'block';
    }
    if (submitButton) {
        submitButton.disabled = false;
        const currentPlan = planInput ? planInput.value : 'free';
        const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
        submitButton.textContent = `Create ${planName} account →`;
    }
  }
});
