// Placeholder for future marketing interactions (animations, FAQ toggles, etc.)

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.classList.contains("contact-form")) {
    event.preventDefault();
    alert("Thanks for reaching out. We'll get back to you soon.");
  }
});
