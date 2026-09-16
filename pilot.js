/* Berlin pilot planning layer. No actual pilot results are populated. */
const pilotFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const pilotMoney = (n, digits = 0) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
function pilotEconomics({ price, mix, spend, samples, extraDtc, paid }) {
  const contribution = Object.entries(mix).reduce((sum, [channel, share]) => sum + share / 100 * PRICE_TESTS[price].channels[channel].contribution, 0) - mix.dtc / 100 * extraDtc;
  const total = spend + samples * ASSUMPTIONS.cogs;
  return { contribution, total, recovery: contribution > 0 ? Math.ceil(total / contribution) : null, volumeContribution: paid * contribution, net: paid * contribution - total };
}
function pilotInputs() {
  const ids = ['launchSpend','sampleCans','extraDtc','paidCans'];
  if (ids.some(id => !$(id).checkValidity() || $(id).value.trim() === '')) return null;
  return { spend: Number($('launchSpend').value), samples: Number($('sampleCans').value), extraDtc: Number($('extraDtc').value), paid: Number($('paidCans').value), price: state.price, mix: state.mix };
}
function renderPilotEconomics() {
  const isBerlin = state.price === 2.19 && state.mix.dtc === 45 && state.mix.retail === 40 && state.mix.gym === 15;
  $('activePilotScenario').textContent = isBerlin ? 'Active: Berlin pilot scenario' : 'Active: custom scenario';
  $('economicsScenario').textContent = `Shared scenario: ${euro(state.price)} / can · ${state.mix.dtc}% DTC / ${state.mix.retail}% retail / ${state.mix.gym}% Gym & Office`;
  const inputs = pilotInputs();
  if (!inputs) {
    ['recoverySpend','pilotContribution','recoveryCans','volumeResult','channelVolume'].forEach(id => $(id).textContent = '—');
    $('recoveryExplain').textContent = 'Enter valid, non-negative values in all four fields to calculate the recovery hurdle.';
    $('recoveryProgress').style.width = '0%'; return;
  }
  const r = pilotEconomics(inputs);
  $('recoverySpend').textContent = pilotMoney(r.total);
  $('pilotContribution').textContent = pilotMoney(r.contribution, 4);
  $('recoveryCans').textContent = r.recovery === null ? 'Not recoverable' : pilotFormat.format(r.recovery);
  $('recoveryProgress').style.width = `${r.recovery === null ? 0 : r.total === 0 ? 100 : Math.min(100, Math.max(0, r.volumeContribution / r.total * 100))}%`;
  $('recoveryExplain').textContent = r.recovery === null ? 'Unit contribution is non-positive. Increasing volume cannot recover launch spending; revise price, channel mix or costs.' : r.total === 0 ? 'No launch spending entered. Check that all pilot costs have been included.' : `${pilotFormat.format(inputs.paid)} assumed paid cans cover ${Math.max(0,r.volumeContribution / r.total * 100).toFixed(0)}% of the contribution-recovery hurdle. This is not a demand forecast.`;
  $('volumeResult').textContent = `At the entered volume: ${pilotMoney(r.volumeContribution)} contribution, leaving ${pilotMoney(r.net)} after the ${pilotMoney(r.total)} launch hurdle. Sample cost: ${pilotMoney(inputs.samples * ASSUMPTIONS.cogs)}.`;
  $('channelVolume').textContent = `Operating implication: ${pilotFormat.format(inputs.paid * state.mix.dtc / 100 / 12)} equivalent DTC 12-pack orders, ${(inputs.paid * state.mix.retail / 100 / 6 / 12).toFixed(1)} paid cans per retail outlet-week (6 outlets), and ${(inputs.paid * state.mix.gym / 100 / 2 / 12).toFixed(1)} per Gym & Office partner-week (2 partners). Assumes constant mix, 12 active weeks and no stockouts. Orders are not unique customers.`;
}
const pilotMonths = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const dateDisplay = d => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
const addDays = (d, days) => new Date(d.getTime() + days * 86400000);
function renderPilotDates() {
  const input = $('pilotStart');
  if (!input.value || !input.checkValidity()) { $('pilotDates').textContent = 'Choose a valid pilot start date.'; return; }
  const start = new Date(`${input.value}T00:00:00Z`), end = addDays(start,83), month = start.getUTCMonth();
  $('memoStart').textContent = dateDisplay(start);
  const stages = [
    { title: 'Preparation', range: [addDays(start,-42),addDays(start,-1)], name:'6 WEEKS BEFORE', action:'Confirm partners, cost quotes, stock, checkout and tracking. Approve the spending cap before release.', owner:'Commercial · Operations · Finance', gate:'Gate: launch readiness' },
    { title: 'Prove paid trial', range: [start,addDays(start,13)], name:'WEEKS 1–2', action:'Run controlled tastings. Track unique samplers, paid conversion, taste objections and source attribution.', owner:'Growth · Field team', gate:'Gate: is the trial engine working?' },
    { title: 'Focus the spend', range: [addDays(start,14),addDays(start,41)], name:'WEEKS 3–6', action:'Compare acquisition sources, first reorders and partner sell-through. Reallocate only within the agreed cap.', owner:'Growth · CRM · Commercial', gate:'Gate: which channels earn more budget?' },
    { title: 'Evaluate repeat', range: [addDays(start,42),end], name:'WEEKS 7–12', action:'Review mature 30/60-day cohorts, actual contribution, outlet reorders and cash. Expand, adjust or pause.', owner:'CEO · Finance · Analytics', gate:'Gate: has repeat demand been earned?' }
  ];
  $('pilotTimeline').innerHTML = stages.map(s => `<article><span class="pilot-kicker">${s.name}</span><h3>${s.title}</h3><span class="phase-date">${dateDisplay(s.range[0])}–${dateDisplay(s.range[1])}</span><p>${s.action}</p><p><b>${s.gate}</b></p><span class="phase-owner">${s.owner}</span></article>`).join('');
  $('pilotDates').textContent = `Prepare from ${dateDisplay(addDays(start,-42))}. Pilot: ${dateDisplay(start)}–${dateDisplay(end)}. Proposed review at the end of week 12.`;
  $('cohortCutoff').textContent = `At the ${dateDisplay(end)} review, the 60-day repeat metric includes only first buyers acquired on or before ${dateDisplay(addDays(end,-60))}; the 30-day metric includes buyers acquired by ${dateDisplay(addDays(end,-30))}. Buyers acquired on the last pilot day need follow-up through ${dateDisplay(addDays(end,60))}.`;
  $('seasonAdvice').textContent = month === 3 || month === 4 ? 'Selected start is within the proposed spring learning window. Launch only if operational readiness is confirmed.' : month >= 8 && month <= 10 ? 'Autumn selection: treat this as a smaller off-peak learning test. Do not extrapolate its volume to summer.' : 'This start is outside the proposed late-April/May window. Review seasonality, preparation lead time and cash before committing.';
  $('seasonBars').innerHTML = TIMING.map((d,i) => `<div class="season-bar${i===month?' selected':''}"><span>${d.d}</span><i style="height:${d.d / 138 * 115}px" aria-hidden="true"></i><span>${pilotMonths[i]}</span></div>`).join('');
  $('launchMonth').value = month+1; renderTiming();
}
const scoutingAreas = {
  overview: {bbox:'13.34,52.48,13.49,52.56',view:'13/52.52/13.415',title:'Two compact clusters',description:'Proposed starting capacity: 8 partners total, within a 6–10 partner range. Illustrative split: 6 retail + 2 Gym & Office. DTC serves reorders across the pilot.'},
  mitte: {bbox:'13.37,52.515,13.425,52.545',view:'14/52.53/13.3975',title:'Mitte · scouting option A',description:'Use this central-city view to identify potential retail and workplace partners. No local wellness-demand estimate or partner access has been validated. Define a compact route after addresses are confirmed.'},
  friedrichshain: {bbox:'13.425,52.495,13.475,52.53',view:'14/52.5125/13.45',title:'Friedrichshain · scouting option B',description:'Use this area view to compare retail and fitness tasting opportunities. It is an illustrative alternative, not a recommended outlet list. Confirm audience access and incremental replenishment cost.'}
};
document.querySelectorAll('[data-map]').forEach(button => button.addEventListener('click', () => {
  const area = scoutingAreas[button.dataset.map];
  $('berlinMap').src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(area.bbox)}&layer=mapnik`;
  $('mapExternal').href = `https://www.openstreetmap.org/#map=${area.view}`;
  $('mapTitle').textContent = area.title; $('mapDescription').textContent = area.description;
  document.querySelectorAll('[data-map]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
document.querySelectorAll('.readiness-checks input').forEach(input => input.addEventListener('change', () => {
  const count = document.querySelectorAll('.readiness-checks input:checked').length;
  $('readinessResult').textContent = `${count} of 5 readiness checks declared complete`;
  $('readinessAdvice').textContent = count === 5 ? 'Draft checklist complete. CEO and evidence owners must verify the underlying documents; expansion results are still pending.' : 'Hold launch funding until the evidence owners sign off.';
}));
$('pilotInputs').addEventListener('input',renderPilotEconomics);
$('pilotStart').addEventListener('input',renderPilotDates);
$('applyPilot').addEventListener('click', () => $('applyBerlinMix').click());
document.addEventListener('lumen:scenario',renderPilotEconomics);
fetch('pilot-data.json').then(r => { if (!r.ok) throw new Error('Unavailable'); return r.json(); }).then(rows => {
  $('cityRows').innerHTML = rows.map(r => `<tr${r.city==='Berlin'?' class="city-selected"':''}><td>${r.city}</td><td>${r.n}</td><td>${r.intent.toFixed(2)}</td><td>${r.sensitivity.toFixed(2)}</td><td>${r.dtc}/${r.n} (${Math.round(r.dtc/r.n*100)}%)</td></tr>`).join('');
}).catch(() => $('cityRows').innerHTML = '<tr><td colspan="5">City evidence could not load. Consult the source memo; no city ranking is available.</td></tr>');
$('applyBerlinMix').click();
renderPilotDates();
