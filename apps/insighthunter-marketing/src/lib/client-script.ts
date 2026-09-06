// Progressively-enhancing client script for the marketing site. No
// analytics, no third-party requests — same-origin only, matching the
// strict `script-src 'self'` CSP.
export const CLIENT_SCRIPT = `(function () {
  "use strict";

  // Mobile nav toggle
  var navToggle = document.getElementById("nav-toggle");
  var navLinks = document.getElementById("nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navLinks.classList.toggle("open");
    });
  }

  // Add-on marketplace simulated checkout total
  var toggles = document.querySelectorAll(".addon-toggle");
  var total = document.getElementById("addon-total");
  if (toggles.length && total) {
    var recalc = function () {
      var sum = 0;
      toggles.forEach(function (input) {
        if (input.checked) sum += Number(input.getAttribute("data-price")) || 0;
      });
      total.textContent = "$" + sum + "/mo";
    };
    toggles.forEach(function (input) {
      input.addEventListener("change", recalc);
    });
  }
})();
`;
