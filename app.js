const PRICE_TESTS = {
  1.79: {
    acceptance: 61.7,
    channels: {
      dtc: { net: 1.39, contribution: 0.77, margin: 55.3 },
      retail: { net: 1.02, contribution: 0.40, margin: 39.2 },
      gym: { net: 1.43, contribution: 0.81, margin: 56.7 },
    },
    posture: 'Reach', detail: 'Fastest route to trial; thinnest margin', score: 69,
  },
  2.19: {
    acceptance: 51.7,
    channels: {
      dtc: { net: 1.78, contribution: 1.16, margin: 65.1 },
      retail: { net: 1.25, contribution: 0.63, margin: 50.3 },
      gym: { net: 1.75, contribution: 1.13, margin: 64.6 },
    },
    posture: 'Balanced', detail: 'Strongest blend of reach and economics', score: 78,
  },
  2.59: {
    acceptance: 26.7,
    channels: {
      dtc: { net: 2.16, contribution: 1.54, margin: 71.4 },
      retail: { net: 1.48, contribution: 0.86, margin: 58.0 },
      gym: { net: 2.07, contribution: 1.45, margin: 70.1 },
    },
    posture: 'Premium', detail: 'Best unit margin; acceptance nearly halves', score: 62,
  },
};

const CHANNELS = [
  { key: 'dtc', name: 'DTC Online', color: 'dot-lime', copy: 'High contribution' },
  { key: 'retail', name: 'Retail / Grocery', color: 'dot-sky', copy: 'Trial engine' },
  { key: 'gym', name: 'Gym & Office', color: 'dot-amber', copy: 'Premium proof' },
];

// Calibrated from data/price_test_results.csv, cost_breakdown.csv and averages from data/marketing_funnel_monthly.csv.
const MARKETING = {
  'Influencer / Content': { cac: 37.32, ltv: 100.82 },
  'Retail Sampling': { cac: 60.63, ltv: 174.17 },
  'Referral / Subscription': { cac: 28.11, ltv: 81.39 },
  'Paid Social': { cac: 45.55, ltv: 132.13 },
};

const ASSUMPTIONS = { cogs: 0.62, homeMargin: 30, unitsPerMonth: 10, baselineCustomers: 4900 };
const state = { price: 2.19, mix: { dtc: 30, retail: 45, gym: 25 }, marketing: 'Influencer / Content', focusChannel: 'retail' };
const $ = (id) => document.getElementById(id);
const euro = (value, digits = 2) => `€${value.toFixed(digits)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeMix(changedKey) {
  const keys = Object.keys(state.mix);
  const others = keys.filter((key) => key !== changedKey);
  const remainder = 100 - state.mix[changedKey];
  const otherTotal = others.reduce((sum, key) => sum + state.mix[key], 0);
  if (!otherTotal) { state.mix[others[0]] = remainder; state.mix[others[1]] = 0; return; }
  others.forEach((key) => { state.mix[key] = Math.round((state.mix[key] / otherTotal) * remainder); });
  const roundingFix = 100 - Object.values(state.mix).reduce((sum, value) => sum + value, 0);
  state.mix[others[0]] = clamp(state.mix[others[0]] + roundingFix, 0, 100);
}

function updateRangeStyle(input) { input.style.setProperty('--range-progress', `${input.value}%`); }

function renderControls() {
  $('priceValue').textContent = euro(state.price);
  document.querySelectorAll('#priceOptions button').forEach((button) => button.classList.toggle('selected', Number(button.dataset.price) === state.price));
  Object.entries(state.mix).forEach(([key, value]) => { $(`${key}Pct`).textContent = `${value}%`; $(`${key}Range`).value = value; updateRangeStyle($(`${key}Range`)); });
  $('mixTotal').textContent = `${Object.values(state.mix).reduce((sum, value) => sum + value, 0)}%`;
}

function renderPriceMatrix() {
  const prices = Object.keys(PRICE_TESTS).map(Number);
  const header = `<div class="matrix-header"><span>Price</span>${CHANNELS.map(({ name }) => `<span>${name}</span>`).join('')}</div>`;
  const rows = prices.map((price) => {
    const test = PRICE_TESTS[price];
    const priceLabel = price === 1.79 ? 'Reach' : price === 2.19 ? 'Balanced' : 'Margin';
    const cells = CHANNELS.map(({ key, name }) => {
      const value = test.channels[key];
      const selected = price === state.price && key === state.focusChannel;
      return `<button type="button" class="matrix-cell${selected ? ' selected' : ''}" data-price="${price}" data-channel="${key}" aria-pressed="${selected}" aria-label="${euro(price)} ${name}: ${euro(value.contribution)} contribution, ${value.margin.toFixed(1)} percent margin"><strong>${euro(value.contribution)}</strong><small>${value.margin.toFixed(1)}% margin</small></button>`;
    }).join('');
    return `<div class="matrix-row"><div class="matrix-price"><strong>${euro(price)}</strong><small>${priceLabel}</small></div>${cells}</div>`;
  }).join('');
  $('priceMatrix').innerHTML = header + rows;
}

function renderSelectedDetail(test) {
  const selected = test.channels[state.focusChannel];
  const channel = CHANNELS.find(({ key }) => key === state.focusChannel);
  const marketing = MARKETING[state.marketing];
  const payback = marketing.cac / Math.max(selected.contribution * ASSUMPTIONS.unitsPerMonth, 0.01);
  const cogsShare = (ASSUMPTIONS.cogs / selected.net) * 100;
  const contributionShare = (selected.contribution / selected.net) * 100;
  $('selectedScenario').textContent = `${euro(state.price)} · ${channel.name}`;
  $('selectedChannel').textContent = channel.name;
  $('selectedPrice').textContent = euro(state.price);
  $('selectedNet').textContent = euro(selected.net);
  $('selectedCogs').textContent = euro(ASSUMPTIONS.cogs);
  $('selectedContribution').textContent = euro(selected.contribution);
  $('selectedMargin').textContent = `${selected.margin.toFixed(1)}%`;
  $('selectedAcceptance').textContent = `${test.acceptance.toFixed(1)}%`;
  $('selectedPayback').textContent = `${payback.toFixed(1)} mo`;
  $('bridgeCogs').style.width = `${cogsShare}%`;
  $('bridgeContribution').style.width = `${contributionShare}%`;
  $('bridgeCaption').textContent = `${euro(selected.net)} net revenue / unit`;
}

function renderChannelRows(test) {
  const max = Math.max(...CHANNELS.map(({ key }) => test.channels[key].contribution));
  $('channelRows').innerHTML = CHANNELS.map(({ key, name, color, copy }) => {
    const value = test.channels[key];
    const selected = key === state.focusChannel;
    return `<button type="button" class="channel-row ${selected ? 'highlight selected' : ''}" data-channel="${key}" aria-pressed="${selected}" aria-label="Focus ${name}"><span class="channel-name"><span class="channel-dot ${color}"></span>${name}</span><span class="channel-copy">${copy}</span><span class="bar-track"><span class="bar-fill" style="width:${(value.contribution / max) * 100}%"></span></span><span class="channel-value">${euro(value.contribution)}</span></button>`;
  }).join('');
}

function renderChart(weightedContribution, monthlyCustomers) {
  const svg = $('scenarioChart');
  const width = 720, height = 300, left = 42, right = 15, top = 18, bottom = 35;
  const plotW = width - left - right, plotH = height - top - bottom;
  const months = [1, 2, 3, 4, 5, 6];
  const base = months.map((month) => monthlyCustomers * month * weightedContribution);
  const low = base.map((value, i) => value * (0.67 + i * 0.012));
  const high = base.map((value, i) => value * (1.16 + i * 0.02));
  const max = high[high.length - 1] * 1.08;
  const x = (i) => left + (i / (months.length - 1)) * plotW;
  const y = (value) => top + plotH - (value / max) * plotH;
  const points = (values) => values.map((value, i) => `${x(i)},${y(value)}`).join(' ');
  const area = `${points(high)} ${[...low].reverse().map((value, i) => `${x(months.length - i - 1)},${y(value)}`).join(' ')}`;
  const styles = getComputedStyle(document.documentElement);
  const ink = styles.getPropertyValue('--ink').trim() || '#17221d';
  const muted = styles.getPropertyValue('--muted').trim() || '#8b958d';
  const lime = styles.getPropertyValue('--lime').trim() || '#c9f36b';
  const line = styles.getPropertyValue('--line').trim() || '#dbe2dc';
  const paper = styles.getPropertyValue('--paper').trim() || '#f5f7f1';
  const grid = [0, .25, .5, .75, 1].map((fraction) => { const yy = top + plotH - fraction * plotH; return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="${line}" stroke-width="1"/><text x="0" y="${yy + 4}" fill="${muted}" font-size="10" font-family="DM Mono, monospace">${euro(max * fraction, 0)}</text>`; }).join('');
  const labels = months.map((month, i) => `<text x="${x(i)}" y="${height - 9}" text-anchor="middle" fill="${muted}" font-size="10" font-family="DM Mono, monospace">M${month}</text>`).join('');
  svg.innerHTML = `${grid}<polygon points="${area}" fill="${lime}" opacity=".28"/><polyline points="${points(base)}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${base.map((value, i) => `<circle cx="${x(i)}" cy="${y(value)}" r="4" fill="${ink}" stroke="${paper}" stroke-width="2"><title>Month ${months[i]}: ${euro(value, 0)}</title></circle>`).join('')}${labels}`;
  $('scenarioSummary').textContent = `${euro(base[5] / 1000, 0)}k base case`;
}

function calculate() {
  const test = PRICE_TESTS[state.price];
  const weightedContribution = Object.entries(state.mix).reduce((sum, [key, share]) => sum + (share / 100) * test.channels[key].contribution, 0);
  const weightedMargin = Object.entries(state.mix).reduce((sum, [key, share]) => sum + (share / 100) * test.channels[key].margin, 0);
  const marketing = MARKETING[state.marketing];
  const ltvCac = marketing.ltv / marketing.cac;
  const payback = marketing.cac / Math.max(weightedContribution * ASSUMPTIONS.unitsPerMonth, .01);
  const score = clamp(Math.round(test.score + (state.mix.dtc * 0.04) + (state.mix.retail * 0.03) - (state.mix.gym * 0.015) + (ltvCac - 3) * 4), 45, 92);
  const monthlyCustomers = ASSUMPTIONS.baselineCustomers * (test.acceptance / 51.7) * (0.78 + state.mix.retail / 300);
  $('posture').textContent = test.posture;
  $('postureDetail').textContent = test.detail;
  $('blendedContribution').textContent = euro(weightedContribution);
  $('marginText').textContent = `${weightedMargin.toFixed(1)}% margin`;
  $('marginDelta').textContent = `${weightedMargin >= ASSUMPTIONS.homeMargin ? '+' : ''}${(weightedMargin - ASSUMPTIONS.homeMargin).toFixed(1)} pts vs home`;
  $('acceptance').textContent = `${test.acceptance.toFixed(1)}%`;
  $('acceptanceText').textContent = `${Math.round(test.acceptance / 10)} in 10 prospects`;
  $('payback').textContent = `${payback.toFixed(1)} mo`;
  $('ltvCac').textContent = `LTV:CAC ${ltvCac.toFixed(1)}×`;
  $('scoreValue').textContent = score;
  $('scoreBar').style.width = `${score}%`;
  document.querySelector('.score-ring').style.setProperty('--score', `${score}%`);
  $('heroRead').textContent = `${test.posture} launch, built for learning.`;
  $('heroSubread').textContent = state.price === 2.59 ? 'Protects margin, but asks the market to believe before it has tried.' : state.price === 1.79 ? 'Maximises trial, but makes the CFO pay for the learning curve.' : 'A premium enough price with a channel mix that earns the right to scale.';
  const primary = state.mix.retail >= state.mix.dtc && state.mix.retail >= state.mix.gym ? 'retail-led' : state.mix.dtc >= state.mix.gym ? 'digital-led' : 'gym-led';
  $('recommendationTitle').textContent = `Enter at ${euro(state.price)} with a ${primary}, ${state.marketing.toLowerCase()} test.`;
  $('recommendationBody').textContent = state.price === 2.59 ? 'Use Gym & Office and DTC to carry the premium story, but keep the first wave intentionally narrow: the model shows a high-contribution path with a sharp acceptance penalty.' : state.price === 1.79 ? 'Use Retail / Grocery to create fast trial and let the team learn before moving price upward. The plan buys reach, but it deliberately gives away contribution to accelerate proof.' : 'Use Retail / Grocery to create trial and social proof, keep DTC close behind for higher contribution, and make the selected activation engine the first learning loop. This preserves premium cues while giving the CFO a credible payback path.';
  $('channelInsight').textContent = state.mix.gym > 30 ? 'Gym & Office protects contribution; Retail builds the funnel.' : state.mix.dtc > 40 ? 'DTC lifts contribution; keep Retail present for trial.' : 'Retail builds trial; DTC keeps the economics healthy.';
  $('berlinScenarioSummary').textContent = `Selected plan: ${euro(state.price)} per can · ${state.mix.dtc}% DTC / ${state.mix.retail}% retail / ${state.mix.gym}% Gym & Office · ${euro(weightedContribution)} contribution per can (case estimate).`;
  renderPriceMatrix();
  renderSelectedDetail(test);
  renderChannelRows(test);
  renderChart(weightedContribution, monthlyCustomers);
}

document.querySelectorAll('#priceOptions button').forEach((button) => button.addEventListener('click', () => { state.price = Number(button.dataset.price); renderControls(); calculate(); }));
['dtc', 'retail', 'gym'].forEach((key) => $(`${key}Range`).addEventListener('input', (event) => { state.mix[key] = Number(event.target.value); normalizeMix(key); renderControls(); calculate(); }));
document.querySelectorAll('#activationPills button').forEach((button) => button.addEventListener('click', () => { state.marketing = button.dataset.channel; document.querySelectorAll('#activationPills button').forEach((pill) => pill.classList.toggle('active', pill === button)); calculate(); }));

$('priceMatrix').addEventListener('click', (event) => { const cell = event.target.closest('.matrix-cell'); if (!cell) return; state.price = Number(cell.dataset.price); state.focusChannel = cell.dataset.channel; renderControls(); calculate(); });
$('channelRows').addEventListener('click', (event) => { const row = event.target.closest('.channel-row'); if (!row) return; state.focusChannel = row.dataset.channel; calculate(); });

const productStage = $('productStage');
const heroCan = $('heroCan');
const stageProgressBar = $('stageProgressBar');
function updateProductStage() {
  if (!productStage || !heroCan) return;
  const rect = productStage.getBoundingClientRect();
  const travel = Math.max(productStage.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel, 0, 1);
  heroCan.style.setProperty('--can-rotation', `${-18 + progress * 390}deg`);
  heroCan.style.setProperty('--can-y', `${Math.sin(progress * Math.PI) * -20}px`);
  heroCan.style.setProperty('--can-z', `${-1 + Math.sin(progress * Math.PI * 2) * 2}deg`);
  stageProgressBar.style.width = `${progress * 100}%`;
}

window.addEventListener('scroll', updateProductStage, { passive: true });
window.addEventListener('resize', updateProductStage);
renderControls();
calculate();
updateProductStage();

$('applyBerlinMix').addEventListener('click', () => { state.mix = { dtc: 45, retail: 40, gym: 15 }; renderControls(); calculate(); });
