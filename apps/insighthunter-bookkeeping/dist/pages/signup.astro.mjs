import { c as createComponent, d as renderHead, r as renderComponent, b as renderTemplate } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
/* empty css                                  */
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { k as FiUser, l as FiMail, m as FiBriefcase, n as FiLock } from '../chunks/index_IorU0Hm2.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

function SignupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    companyName: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account");
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [
    error && /* @__PURE__ */ jsx("div", { className: "error-message", children: error }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx(FiUser, {}),
        " Full Name"
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: formData.name,
          onChange: (e) => setFormData({ ...formData, name: e.target.value }),
          placeholder: "John Doe",
          required: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx(FiMail, {}),
        " Email Address"
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "email",
          value: formData.email,
          onChange: (e) => setFormData({ ...formData, email: e.target.value }),
          placeholder: "john@company.com",
          required: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx(FiBriefcase, {}),
        " Company Name"
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: formData.companyName,
          onChange: (e) => setFormData({ ...formData, companyName: e.target.value }),
          placeholder: "Your Company Inc.",
          required: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx(FiLock, {}),
        " Password"
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "password",
          value: formData.password,
          onChange: (e) => setFormData({ ...formData, password: e.target.value }),
          placeholder: "Min. 8 characters",
          required: true
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxs("label", { children: [
        /* @__PURE__ */ jsx(FiLock, {}),
        " Confirm Password"
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "password",
          value: formData.confirmPassword,
          onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }),
          placeholder: "Confirm your password",
          required: true
        }
      )
    ] }),
    /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "submit-btn", children: loading ? "Creating account..." : "Create Account" }),
    /* @__PURE__ */ jsxs("p", { className: "terms-text", children: [
      "By creating an account, you agree to our",
      " ",
      /* @__PURE__ */ jsx("a", { href: "/terms", children: "Terms of Service" }),
      " and",
      " ",
      /* @__PURE__ */ jsx("a", { href: "/privacy", children: "Privacy Policy" })
    ] })
  ] });
}

const $$Signup = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en" data-astro-cid-sgjovbj7> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sign Up - InsightHunter Bookkeeping</title>${renderHead()}</head> <body data-astro-cid-sgjovbj7> <div class="auth-container" data-astro-cid-sgjovbj7> <div class="auth-card" data-astro-cid-sgjovbj7> <div class="auth-header" data-astro-cid-sgjovbj7> <h1 data-astro-cid-sgjovbj7>InsightHunter</h1> <h2 data-astro-cid-sgjovbj7>Create your account</h2> <p data-astro-cid-sgjovbj7>Start your 14-day free trial</p> </div> ${renderComponent($$result, "SignupForm", SignupForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/auth/SignupForm", "client:component-export": "default", "data-astro-cid-sgjovbj7": true })} <div class="auth-footer" data-astro-cid-sgjovbj7> <p data-astro-cid-sgjovbj7>Already have an account? <a href="/login" data-astro-cid-sgjovbj7>Log in</a></p> </div> </div> </div> </body></html>`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/signup.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/signup.astro";
const $$url = "/signup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Signup,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
