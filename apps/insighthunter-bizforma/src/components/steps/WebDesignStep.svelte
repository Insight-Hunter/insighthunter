<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.webDesign;
  const hostingOptions = ['Cloudflare Pages','Vercel','Netlify','AWS Amplify','Squarespace','Webflow','WordPress / WP Engine','Shopify','Other'];
</script>
<div class="space">
  <GlassField id="domain" label="Domain Name" hint="Your primary .com (or .io, .co, etc.)">
    <input id="domain" type="text" value={d.domainName} on:input={e=>updateSection('webDesign',{domainName:e.currentTarget.value})} placeholder="yourbusiness.com" />
  </GlassField>
  <div>
    <p class="sl">HOSTING PLATFORM</p>
    <div class="grid">
      {#each hostingOptions as h}
        <button class="chip" class:sel={d.hosting===h} on:click={()=>updateSection('webDesign',{hosting:h})}>{h}</button>
      {/each}
    </div>
  </div>
  <GlassField id="dns" label="DNS Provider" hint="Usually where you register your domain.">
    <input id="dns" type="text" value={d.dnsProvider} on:input={e=>updateSection('webDesign',{dnsProvider:e.currentTarget.value})} placeholder="e.g. Cloudflare, Namecheap, GoDaddy…" />
  </GlassField>
  <GlassField id="email" label="Business Email Setup">
    <input id="email" type="text" value={d.emailSetup} on:input={e=>updateSection('webDesign',{emailSetup:e.currentTarget.value})} placeholder="e.g. Google Workspace, Zoho Mail, Microsoft 365…" />
  </GlassField>
  <div class="note">💡 Cloudflare offers free DNS, DDoS protection, and CDN. Highly recommended even if hosting elsewhere.</div>
</div>
<style>
  .space{display:flex;flex-direction:column;gap:20px}
  .sl{font-size:11px;font-weight:600;letter-spacing:.8px;color:rgba(255,255,255,.35);margin:0 0 8px}
  .grid{display:flex;flex-wrap:wrap;gap:8px}
  .chip{padding:8px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.60);font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s}
  .chip.sel{border-color:rgba(90,200,250,.45);background:rgba(90,200,250,.10);color:#5ac8fa}
  .chip:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.85)}
  .note{font-size:13px;color:rgba(255,255,255,.50);background:rgba(94,92,230,.07);border:1px solid rgba(94,92,230,.18);border-radius:12px;padding:13px 15px;line-height:1.5}
</style>
