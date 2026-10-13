// LUMETZA - Calculadora Solar PWA Logic

const defaultRows = [
  { name: 'Televisor LED', qty: 1, v: 127, i: 0.79, p: 100, h: 4 },
  { name: 'Laptop', qty: 1, v: 127, i: 0.51, p: 65, h: 0.5 },
  { name: 'Microondas', qty: 1, v: 127, i: 12, p: 1524, h: 0.25 },
  { name: 'Refrigerador', qty: 1, v: 127, i: 2.2, p: 279.4, h: 2 },
  { name: 'Ventilador', qty: 1, v: 127, i: 0.39, p: 50, h: 1 },
  { name: 'Focos LED (3)', qty: 3, v: 127, i: 0.09, p: 11, h: 1.5 },
  { name: 'Licuadora', qty: 1, v: 127, i: 0.79, p: 100, h: 6 },
  { name: 'Bomba de agua 1/2 HP', qty: 1, v: 127, i: 3, p: 381, h: 1 }
];

function formatNum(n, decimals = 1) {
  if (isNaN(n) || !isFinite(n)) return '0';
  return Number(n).toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function parseVal(v, fallback = 0) {
  const parsed = parseFloat(v);
  return isNaN(parsed) ? fallback : parsed;
}

function getSystemParams() {
  return {
    sun: Math.max(0.1, parseVal(document.getElementById('sun').value, 6)),
    panelW: Math.max(1, parseVal(document.getElementById('panelW').value, 100)),
    panelEff: Math.max(1, Math.min(100, parseVal(document.getElementById('panelEff').value, 60))),
    storage: Math.max(1, parseVal(document.getElementById('storage').value, 5)),
    bankV: Math.max(1, parseVal(document.getElementById('bankV').value, 24)),
    batteryAh: Math.max(1, parseVal(document.getElementById('battery').value, 127)),
    dod: Math.max(1, Math.min(100, parseVal(document.getElementById('dod').value, 80))),
    batEff: Math.max(1, Math.min(100, parseVal(document.getElementById('batEff').value, 90))),
    invEff: Math.max(1, Math.min(100, parseVal(document.getElementById('invEff').value, 85))),
    controllerEff: Math.max(1, parseVal(document.getElementById('controllerEff').value, 1.25))
  };
}

function calculate() {
  const tbody = document.getElementById('rows');
  const rows = tbody.querySelectorAll('tr');
  let totalDailyEnergy = 0;
  let totalPeakPower = 0;

  rows.forEach((tr) => {
    const qtyInput = tr.querySelector('[data-key="qty"]');
    const vInput = tr.querySelector('[data-key="v"]');
    const iInput = tr.querySelector('[data-key="i"]');
    const pInput = tr.querySelector('[data-key="p"]');
    const hInput = tr.querySelector('[data-key="h"]');
    const ptCell = tr.querySelector('[data-key="pt"]');
    const eCell = tr.querySelector('[data-key="e"]');

    const qty = parseVal(qtyInput.value, 0);
    const v = parseVal(vInput.value, 0);
    const i = parseVal(iInput.value, 0);
    let p = parseVal(pInput.value, 0);

    // If P is 0 but V and I are provided, calculate P
    if (p === 0 && v > 0 && i > 0) {
      p = v * i;
      pInput.value = formatNum(p, 1).replace(',', '');
    }

    const pt = qty * p;
    const h = parseVal(hInput.value, 0);
    const e = pt * h;

    if (ptCell) ptCell.textContent = formatNum(pt, pt % 1 === 0 ? 0 : 1);
    if (eCell) eCell.textContent = formatNum(e, e % 1 === 0 ? 0 : 1);

    totalPeakPower += pt;
    totalDailyEnergy += e;
  });

  const params = getSystemParams();

  // Metrics: Consumo
  const dailyEl = document.getElementById('daily');
  const loadEl = document.getElementById('load');
  const solarNeedEl = document.getElementById('solarNeed');
  const panelCountEl = document.getElementById('panelCount');
  const panelDescEl = document.getElementById('panelDesc');

  if (dailyEl) dailyEl.textContent = formatNum(totalDailyEnergy, 1);
  if (loadEl) loadEl.textContent = formatNum(totalPeakPower, 1);

  // Solar requirement
  const effFactor = (params.panelEff / 100);
  const solarNeed = totalDailyEnergy > 0 ? (totalDailyEnergy / (params.sun * effFactor)) : 0;
  if (solarNeedEl) solarNeedEl.textContent = `${formatNum(solarNeed, 1)} W`;

  const panelCount = solarNeed > 0 ? Math.ceil(solarNeed / params.panelW) : 0;
  const installedSolarW = panelCount * params.panelW;
  if (panelCountEl) panelCountEl.textContent = panelCount;
  if (panelDescEl) panelDescEl.textContent = `${panelCount} × ${params.panelW} W = ${formatNum(installedSolarW, 0)} W instalados`;

  // Metrics: Componentes
  const compInvEl = document.getElementById('comp-inv');
  const compInvVEl = document.getElementById('comp-inv-v');
  const compCtrlEl = document.getElementById('comp-ctrl');
  const compCtrlAEl = document.getElementById('comp-ctrl-a');
  const compPvEl = document.getElementById('comp-pv');
  const compPvDescEl = document.getElementById('comp-pv-desc');

  if (compInvEl) {
    const rawInv = totalPeakPower > 0 ? (totalPeakPower / (params.invEff / 100)) : 0;
    // Suggest standard commercial size inverter with safety margin
    const suggestedInv = rawInv > 0 ? Math.ceil((rawInv * 1.15) / 500) * 500 : 0;
    compInvEl.textContent = `${formatNum(Math.max(500, suggestedInv), 0)} W`;
  }
  if (compInvVEl) compInvVEl.textContent = `${params.bankV} V`;

  const controllerA = installedSolarW > 0 ? ((installedSolarW / params.bankV) * params.controllerEff) : 0;
  if (compCtrlEl) {
    // Standard controller sizes: 20, 30, 40, 60, 80, 100
    const ctrlSizes = [10, 20, 30, 40, 50, 60, 80, 100];
    const recSize = ctrlSizes.find(s => s >= controllerA) || Math.ceil(controllerA / 10) * 10;
    compCtrlEl.textContent = `${recSize} A`;
  }
  if (compCtrlAEl) compCtrlAEl.textContent = `${formatNum(controllerA, 1)} A`;

  if (compPvEl) compPvEl.textContent = `${formatNum(installedSolarW, 0)} W`;
  if (compPvDescEl) compPvDescEl.textContent = `${panelCount} paneles de ${params.panelW} W`;

  // Metrics: Almacenamiento
  const batCapEl = document.getElementById('bat-cap');
  const batBankVEl = document.getElementById('bat-bank-v');
  const batWhEl = document.getElementById('bat-wh');
  const batQtyEl = document.getElementById('bat-qty');
  const batModelEl = document.getElementById('bat-model');
  const batConfigEl = document.getElementById('bat-config');
  const batDaysEl = document.getElementById('bat-days');
  const batDodValEl = document.getElementById('bat-dod-val');
  const batEffValEl = document.getElementById('bat-eff-val');

  const usefulWh = totalDailyEnergy * params.storage;
  const usefulAhAtBankV = usefulWh > 0 ? (usefulWh / (params.bankV * (params.dod / 100) * (params.batEff / 100))) : 0;

  if (batCapEl) batCapEl.textContent = `${formatNum(usefulAhAtBankV, 1)} Ah`;
  if (batBankVEl) batBankVEl.textContent = `${params.bankV} V`;
  if (batWhEl) batWhEl.textContent = `${formatNum(usefulWh, 0)} Wh útiles`;

  const batsInSeries = Math.max(1, Math.round(params.bankV / 12));
  const parallelBranches = usefulAhAtBankV > 0 ? Math.ceil(usefulAhAtBankV / params.batteryAh) : 0;
  const totalBatteries = parallelBranches * batsInSeries;

  if (batQtyEl) batQtyEl.textContent = `${totalBatteries} baterías`;
  if (batModelEl) batModelEl.textContent = `12 V · ${params.batteryAh} Ah`;
  if (batConfigEl) batConfigEl.textContent = `${batsInSeries} en serie × ${parallelBranches} ramas en paralelo`;
  if (batDaysEl) batDaysEl.textContent = `${params.storage} días`;
  if (batDodValEl) batDodValEl.textContent = `${params.dod}%`;
  if (batEffValEl) batEffValEl.textContent = `${params.batEff}%`;
}

function createRow(data = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input data-key="name" type="text" aria-label="name" value="${data.name || ''}" placeholder="Ej. Equipo"></td>
    <td><input data-key="qty" type="number" step="any" min="0" aria-label="qty" value="${data.qty ?? 1}"></td>
    <td><input data-key="v" type="number" step="any" min="0" aria-label="v" value="${data.v ?? 127}"></td>
    <td><input data-key="i" type="number" step="any" min="0" aria-label="i" value="${data.i ?? ''}"></td>
    <td><input data-key="p" type="number" step="any" min="0" aria-label="p" value="${data.p ?? ''}"></td>
    <td class="calc" data-key="pt">0</td>
    <td><input data-key="h" type="number" step="any" min="0" aria-label="h" value="${data.h ?? 1}"></td>
    <td class="calc" data-key="e">0</td>
    <td><button class="remove" title="Quitar equipo">Quitar</button></td>
  `;

  tr.querySelector('.remove').addEventListener('click', () => {
    tr.remove();
    calculate();
  });

  tr.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      calculate();
    });
  });

  return tr;
}

function populateDefaults() {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  defaultRows.forEach(item => {
    tbody.appendChild(createRow(item));
  });
  calculate();
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanelId = btn.getAttribute('data-panel');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      panels.forEach(p => {
        if (p.id === targetPanelId) {
          p.classList.add('active');
          p.removeAttribute('hidden');
        } else {
          p.classList.remove('active');
          p.setAttribute('hidden', '');
        }
      });
    });
  });
}

function initEventListeners() {
  // Add equipment
  const addBtn = document.getElementById('add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const tbody = document.getElementById('rows');
      tbody.appendChild(createRow({ name: '', qty: 1, v: 127, i: '', p: '', h: 1 }));
      calculate();
    });
  }

  // Reset defaults
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      populateDefaults();
    });
  }

  // System parameters inputs
  const controlInputs = document.querySelectorAll('.controls input, .controls select');
  controlInputs.forEach(input => {
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);
  });
}

// Service Worker Registration for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('[PWA] Service Worker registrado exitosamente:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] Error al registrar Service Worker:', err);
        });
    });
  }
}

// PWA Install prompt banner / handler
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] Evento beforeinstallprompt capturado. Listo para instalación.');
});

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initEventListeners();
  populateDefaults();
  registerServiceWorker();
});
