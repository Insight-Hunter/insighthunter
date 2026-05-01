<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.marketing;
  const channels = ['SEO / Content','Social Media','Paid Ads (Google)','Paid Ads (Meta)','Email Marketing','Influencer','Referral / Word of mouth','PR & Press','Partnerships','Events / Trade shows'];
</script>
<div class="space">
  <GlassField id="strat" label="Marketing Strategy" hint="Your go-to-market approach.">
    <textarea id="strat" rows="3" value={d.strategy} on:input={e=>updateSection('marketing',{strategy:e.currentTarget.value})} placeholder="e.g. Content-led growth targeting organic search + LinkedIn outreach for B2B leads…" />
  </GlassField>
  <div>
    <p class="sl">MARKETING CHANNELS</p>
    <div class="grid">
      {#each channels as ch}
        {@const sel = d.channels.includes(ch)}
        <button class="chip" class:sel on:click={()=>{ const arr=d.channels.split(',').map(x=>x.trim()).filter(Boolean); const next=sel?arr.filter(x=>x!==ch):[...arr,ch]; updateSection('marketing',{channels:next.join(', ')}); }}>{ch}</button>
      {/each}
    </div>
  </div>
  <GlassField id="budget" label="Monthly Marketing Budget">
    <input id="budget" type="text" value={d.budget} on:input={e=>updateSection('marketing',{budget:e.currentTarget.value})} placeholder="e.g. $500/month" />
  </GlassField>
</div>
<style>
  .space{display:flex;flex-direction:column;gap:20px}
  .sl{font-size:11px;font-weight:600;letter-spacing:.8px;color:rgba(255,255,255,.35);margin:0 0 8px}
  .grid{display:flex;flex-wrap:wrap;gap:8px}
  .chip{padding:8px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.60);font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s}
  .chip.sel{border-color:rgba(255,55,95,.45);background:rgba(255,55,95,.10);color:#ff375f}
  .chip:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.85)}
</style>
