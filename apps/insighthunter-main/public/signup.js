
// public/signup.js

/**
 * This function is the callback that runs after the Cloudflare Turnstile
 * (the CAPTCHA alternative) has successfully verified the user.
 */
function onTurnstileSuccess() {
  // Find the submit button on the page
  const submitButton = document.getElementById('submit-button');
  
  // If the button exists, remove the 'disabled' attribute and change the text
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = 'Create My Free Account';
  }
}

/**
 * This function initializes the Turnstile widget when the page loads.
 */
function renderTurnstile() {
  // Find the container where the widget should be placed
  const container = document.getElementById('turnstile-container');
  
  // If the container doesn't exist, don't do anything
  if (!container) {
    return;
  }

  // Use the Turnstile API to render the widget
  turnstile.render(container, {
    // Replace this with your actual sitekey in a production environment
    sitekey: '0x4AAAAAAAXwPZ4IIyTfwUn3',
    // The function to call when the widget is successfully verified
    callback: onTurnstileSuccess,
    // We can add a theme, size, etc. as needed
    theme: 'light',
  });
}

// --- Main Execution ---

// Wait for the full page to load before trying to render the widget
document.addEventListener('DOMContentLoaded', function() {
  // Before rendering, let's make sure the Turnstile API is available
  // It's loaded from an async script, so we need to be sure it's ready.
  if (typeof turnstile !== 'undefined') {
    renderTurnstile();
  } else {
    // If it's not ready, we can wait for it with an event listener
    window.addEventListener('turnstile-ready', renderTurnstile, { once: true });
  }
});
