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

  // Pricing billing-period switch. Lite remains free regardless of period.
  var billingButtons = document.querySelectorAll("[data-billing]");
  if (billingButtons.length) {
    billingButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var annual = button.getAttribute("data-billing") === "annual";
        billingButtons.forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        document.querySelectorAll("[data-price]").forEach(function (price) {
          var monthlyValue = Number(price.getAttribute("data-monthly")) || 0;
          var value = annual ? Number(price.getAttribute("data-annual")) || 0 : monthlyValue;
          var amount = value === 0 ? "Free" : "$" + (annual ? value.toFixed(2) : value);
          var period = value === 0 ? "forever" : "/mo";
          price.firstChild.textContent = amount;
          var periodNode = price.querySelector("span");
          if (periodNode) periodNode.textContent = period;
        });
        document.querySelectorAll("[data-price-note]").forEach(function (note) {
          var price = note.previousElementSibling;
          var total = Number(price && price.getAttribute("data-annual-total")) || 0;
          note.textContent = total ? "Billed $" + total.toFixed(2) + " yearly" : "No card required";
        });
      });
    });
  }

  // Add-on marketplace simulated plan and checkout totals; this never bills.
  var toggles = document.querySelectorAll(".addon-toggle");
  var monthlyTotal = document.getElementById("addon-monthly-total");
  var onceTotal = document.getElementById("addon-once-total");
  var basePlans = document.querySelectorAll("[data-base-plan]");
  if (toggles.length && monthlyTotal && onceTotal) {
    var basePrice = 0;
    var recalc = function () {
      var monthly = basePrice;
      var once = 0;
      toggles.forEach(function (input) {
        if (!input.checked) return;
        var amount = Number(input.getAttribute("data-price")) || 0;
        if (input.getAttribute("data-interval") === "once") once += amount;
        else monthly += amount;
      });
      monthlyTotal.textContent = "$" + monthly + "/mo";
      onceTotal.textContent = "$" + once;
    };
    toggles.forEach(function (input) {
      input.addEventListener("change", recalc);
    });
    basePlans.forEach(function (button) {
      button.addEventListener("click", function () {
        basePrice = Number(button.getAttribute("data-price")) || 0;
        basePlans.forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        recalc();
      });
    });
  }

  // Scenario carousel uses illustrative workflows rather than invented reviews.
  var proofItems = document.querySelectorAll("[data-proof-item]");
  var proofCount = document.querySelector("[data-proof-count]");
  if (proofItems.length && proofCount) {
    var activeProof = 0;
    var showProof = function (index) {
      activeProof = (index + proofItems.length) % proofItems.length;
      proofItems.forEach(function (item, itemIndex) {
        item.hidden = itemIndex !== activeProof;
        item.classList.toggle("is-active", itemIndex === activeProof);
      });
      proofCount.textContent = String(activeProof + 1).padStart(2, "0") + " / " + String(proofItems.length).padStart(2, "0");
    };
    var next = document.querySelector("[data-proof-next]");
    var previous = document.querySelector("[data-proof-prev]");
    if (next) next.addEventListener("click", function () { showProof(activeProof + 1); });
    if (previous) previous.addEventListener("click", function () { showProof(activeProof - 1); });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setInterval(function () { showProof(activeProof + 1); }, 7000);
    }
  }
})();
`;
