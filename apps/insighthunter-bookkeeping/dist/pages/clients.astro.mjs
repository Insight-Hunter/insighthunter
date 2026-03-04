import { c as createComponent, r as renderComponent, a as renderScript, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const $$Clients = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Clients", "data-astro-cid-cvyvfw4n": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="clients-page" data-astro-cid-cvyvfw4n> <div class="header" data-astro-cid-cvyvfw4n> <h1 data-astro-cid-cvyvfw4n>Clients</h1> <button id="addClientBtn" class="btn-primary" data-astro-cid-cvyvfw4n>+ Add Client</button> </div> <div id="clientsList" class="clients-grid" data-astro-cid-cvyvfw4n></div> <dialog id="clientDialog" data-astro-cid-cvyvfw4n> <form id="clientForm" data-astro-cid-cvyvfw4n> <h2 data-astro-cid-cvyvfw4n>Add New Client</h2> <input type="text" name="name" placeholder="Client Name" required data-astro-cid-cvyvfw4n> <input type="email" name="email" placeholder="Email" required data-astro-cid-cvyvfw4n> <input type="tel" name="phone" placeholder="Phone" data-astro-cid-cvyvfw4n> <textarea name="address" placeholder="Address" rows="3" data-astro-cid-cvyvfw4n></textarea> <input type="text" name="taxId" placeholder="Tax ID / EIN" data-astro-cid-cvyvfw4n> <div class="dialog-actions" data-astro-cid-cvyvfw4n> <button type="button" id="cancelBtn" class="btn-secondary" data-astro-cid-cvyvfw4n>Cancel</button> <button type="submit" class="btn-primary" data-astro-cid-cvyvfw4n>Save Client</button> </div> </form> </dialog> </div> ` })}  ${renderScript($$result, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro";
const $$url = "/clients";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Clients,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
