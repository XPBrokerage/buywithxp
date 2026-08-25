/* buywithXP — Acquisition Growth Modeler
   Pure math is kept in computeModel() so it can be unit-tested in node.
   Multiples are illustrative size-tier anchors (piecewise-linear on EBITDA),
   reflecting the size premium observed across completed SMB transactions. */

(function () {
  'use strict';

  // ---- Valuation multiple by combined EBITDA (piecewise-linear anchors) ----
  var MULT_ANCHORS = [
    [250000, 2.75],
    [500000, 3.10],
    [1000000, 3.60],
    [2000000, 4.40],
    [5000000, 5.50],
    [10000000, 6.50],
    [20000000, 7.50]
  ];

  function multipleFor(ebitda) {
    var a = MULT_ANCHORS;
    if (ebitda <= a[0][0]) return a[0][1];
    if (ebitda >= a[a.length - 1][0]) return a[a.length - 1][1];
    for (var i = 0; i < a.length - 1; i++) {
      var lo = a[i], hi = a[i + 1];
      if (ebitda >= lo[0] && ebitda <= hi[0]) {
        var t = (ebitda - lo[0]) / (hi[0] - lo[0]);
        return lo[1] + t * (hi[1] - lo[1]);
      }
    }
    return a[a.length - 1][1];
  }

  /**
   * @param {object} p
   *   revenue        current annual revenue ($)
   *   margin         EBITDA margin (0–1)
   *   organic        organic growth rate per year (0–1)
   *   deals          number of acquisitions over 5 years (1–5)
   *   targetEbitda   average target EBITDA ($)
   *   multiple       purchase multiple paid on target EBITDA (x)
   *   down           equity down payment share (0–1)
   *   synergy        synergy uplift on acquired EBITDA (0–1)
   */
  function computeModel(p) {
    var YEARS = 5;
    var AMORT_YEARS = 10;
    var e0 = p.revenue * p.margin;

    // Deal i closes during year i (i = 1..deals, capped at 5)
    var deals = Math.min(p.deals, YEARS);
    var effTarget = p.targetEbitda * (1 + p.synergy);
    var pricePerDeal = p.targetEbitda * p.multiple;
    var equityPerDeal = pricePerDeal * p.down;
    var debtPerDeal = pricePerDeal - equityPerDeal;

    var evByYear = [];
    var ebitdaByYear = [];
    for (var y = 0; y <= YEARS; y++) {
      var e = e0 * Math.pow(1 + p.organic, y);
      for (var d = 1; d <= deals; d++) {
        if (y >= d) e += effTarget * Math.pow(1 + p.organic, y - d);
      }
      ebitdaByYear.push(e);
      evByYear.push(e * multipleFor(e));
    }

    // Bridge components at year 5
    var e5 = ebitdaByYear[YEARS];
    var organicGain = e0 * Math.pow(1 + p.organic, YEARS) - e0;
    var acquiredBase = 0, synergyGain = 0;
    for (var d2 = 1; d2 <= deals; d2++) {
      var growthF = Math.pow(1 + p.organic, YEARS - d2);
      acquiredBase += p.targetEbitda * growthF;
      synergyGain += (effTarget - p.targetEbitda) * growthF;
    }

    // Straight-line amortization of acquisition debt
    var remainingDebt = 0;
    for (var d3 = 1; d3 <= deals; d3++) {
      var yearsPaid = YEARS - d3;
      remainingDebt += debtPerDeal * Math.max(0, 1 - yearsPaid / AMORT_YEARS);
    }

    var ev0 = evByYear[0];
    var ev5 = evByYear[YEARS];

    return {
      e0: e0,
      e5: e5,
      organicGain: organicGain,
      acquiredBase: acquiredBase,
      synergyGain: synergyGain,
      multNow: multipleFor(e0),
      multY5: multipleFor(e5),
      ev0: ev0,
      ev5: ev5,
      growth: ev0 > 0 ? ev5 / ev0 : 0,
      remainingDebt: remainingDebt,
      equityY5: ev5 - remainingDebt,
      equityInvested: equityPerDeal * deals,
      totalPurchasePrice: pricePerDeal * deals,
      evByYear: evByYear,
      ebitdaByYear: ebitdaByYear
    };
  }

  // ---- Formatting ----
  function fmtMoney(v) {
    var neg = v < 0 ? '−' : '';
    v = Math.abs(v);
    if (v >= 1e6) {
      var m = v / 1e6;
      return neg + '$' + (m >= 100 ? Math.round(m) : m.toFixed(m >= 10 ? 1 : 2)) + 'M';
    }
    if (v >= 1000) return neg + '$' + Math.round(v / 1000) + 'K';
    return neg + '$' + Math.round(v);
  }
  function fmtMult(x) { return x.toFixed(1) + 'x'; }
  function fmtPct(x) { return Math.round(x) + '%'; }

  // Expose for node tests
  var api = { computeModel: computeModel, multipleFor: multipleFor, fmtMoney: fmtMoney };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  window.XPModeler = api;

  // ---- DOM wiring ----
  document.addEventListener('DOMContentLoaded', function () {
    var $ = function (id) { return document.getElementById(id); };
    var inputs = {
      revenue: $('inRevenue'), margin: $('inMargin'), organic: $('inOrganic'),
      deals: $('inDeals'), target: $('inTarget'), multiple: $('inMultiple'),
      down: $('inDown'), synergy: $('inSynergy')
    };
    if (!inputs.revenue) return;

    function params() {
      return {
        revenue: +inputs.revenue.value,
        margin: +inputs.margin.value / 100,
        organic: +inputs.organic.value / 100,
        deals: +inputs.deals.value,
        targetEbitda: +inputs.target.value,
        multiple: +inputs.multiple.value / 10,
        down: +inputs.down.value / 100,
        synergy: +inputs.synergy.value / 100
      };
    }

    function renderOutputs(p) {
      $('outRevenue').textContent = fmtMoney(p.revenue);
      $('outMargin').textContent = fmtPct(p.margin * 100);
      $('outOrganic').textContent = fmtPct(p.organic * 100) + ' / yr';
      $('outDeals').textContent = p.deals + (p.deals === 1 ? ' deal' : ' deals');
      $('outTarget').textContent = fmtMoney(p.targetEbitda) + ' EBITDA';
      $('outMultiple').textContent = p.multiple.toFixed(1) + 'x EBITDA';
      $('outDown').textContent = fmtPct(p.down * 100) + ' equity';
      $('outSynergy').textContent = '+' + fmtPct(p.synergy * 100);
    }

    function renderChart(r) {
      var svg = $('modelChart');
      var W = 640, H = 300, padL = 70, padR = 16, padT = 26, padB = 34;
      var plotW = W - padL - padR, plotH = H - padT - padB;
      var max = Math.max.apply(null, r.evByYear) * 1.08;
      var n = r.evByYear.length;
      var band = plotW / n;
      var barW = Math.min(band * 0.62, 72);

      var el = [];
      // Gridlines (4)
      for (var g = 1; g <= 4; g++) {
        var gy = padT + plotH - (plotH * g / 4);
        var gv = max * g / 4;
        el.push('<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#D9DBE0" stroke-width="1"/>');
        el.push('<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="11" fill="#4A4A4A" font-family="Roboto, Arial, sans-serif">' + fmtMoney(gv) + '</text>');
      }
      // Baseline
      el.push('<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="#4A4A4A" stroke-width="1"/>');

      for (var i = 0; i < n; i++) {
        var v = r.evByYear[i];
        var h = Math.max(2, plotH * v / max);
        var x = padL + band * i + (band - barW) / 2;
        var y = padT + plotH - h;
        var last = i === n - 1;
        var fill = last ? '#C9A84C' : '#1B2A4A';
        el.push('<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="3" fill="' + fill + '"/>');
        el.push('<text x="' + (x + barW / 2) + '" y="' + (y - 7) + '" text-anchor="middle" font-size="12" font-weight="' + (last ? '700' : '400') + '" fill="' + (last ? '#926D10' : '#4A4A4A') + '" font-family="Montserrat, Arial, sans-serif">' + fmtMoney(v) + '</text>');
        el.push('<text x="' + (x + barW / 2) + '" y="' + (padT + plotH + 18) + '" text-anchor="middle" font-size="11" fill="#4A4A4A" font-family="Roboto, Arial, sans-serif">' + (i === 0 ? 'Today' : 'Yr ' + i) + '</text>');
      }
      svg.innerHTML = el.join('');
    }

    var lastResult = null;
    function render() {
      var p = params();
      renderOutputs(p);
      var r = computeModel(p);
      lastResult = { params: p, result: r };

      $('stEvNow').textContent = fmtMoney(r.ev0);
      $('stEvY5').textContent = fmtMoney(r.ev5);
      $('stGrowth').textContent = r.growth.toFixed(1) + 'x';

      $('brE0').textContent = fmtMoney(r.e0);
      $('brOrganic').textContent = '+' + fmtMoney(r.organicGain);
      $('brAcquired').textContent = '+' + fmtMoney(r.acquiredBase);
      $('brSynergy').textContent = '+' + fmtMoney(r.synergyGain);
      $('brE5').textContent = fmtMoney(r.e5);
      $('brMultNow').textContent = fmtMult(r.multNow);
      $('brMultY5').textContent = fmtMult(r.multY5);
      $('brEv5').textContent = fmtMoney(r.ev5);
      $('brDebt').textContent = '−' + fmtMoney(r.remainingDebt);
      $('brEquity').textContent = fmtMoney(r.equityY5);
      $('brInvested').textContent = fmtMoney(r.equityInvested);

      renderChart(r);
    }

    Object.keys(inputs).forEach(function (k) {
      inputs[k].addEventListener('input', render);
    });
    render();

    // Expose the latest scenario for the "send my plan" form (main.js)
    window.XPModeler.snapshot = function () { return lastResult; };
  });
})();
