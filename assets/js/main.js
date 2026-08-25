/* buywithXP — site behavior: nav, reveal, lead capture.
   ─────────────────────────────────────────────────────
   WIRE-UP: set the two values below before launch.
   GHL_WEBHOOK_URL — GoHighLevel inbound webhook (workflow trigger URL).
   BOOKING_URL     — GHL calendar / booking page link.
   Until they are set, forms fall back to a pre-filled email to Adam,
   and the booking button scrolls to the contact form. */

var XP_CONFIG = {
  GHL_WEBHOOK_URL: 'https://services.leadconnectorhq.com/hooks/UXYDkj4yhXizhVBLVOzq/webhook-trigger/92288a3f-3eca-4cf2-b766-b647484b740e',
  BOOKING_URL: 'https://link.xpbrokerage.com/widget/booking/pgVJoAKfgSOK0nm5IGpU'
};

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    // ---- Mobile nav ----
    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') links.classList.remove('open');
      });
    }

    // ---- Reveal on scroll ----
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    // ---- Booking button ----
    var bookBtn = document.getElementById('bookBtn');
    if (bookBtn && XP_CONFIG.BOOKING_URL) {
      bookBtn.href = XP_CONFIG.BOOKING_URL;
      bookBtn.target = '_blank';
      bookBtn.rel = 'noopener';
    }

    // ---- Lead submission helper ----
    function submitLead(payload, statusEl, form, okMsg) {
      if (XP_CONFIG.GHL_WEBHOOK_URL) {
        statusEl.className = 'form-status';
        fetch(XP_CONFIG.GHL_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          statusEl.textContent = okMsg;
          statusEl.className = 'form-status ok';
          form.reset();
        }).catch(function () {
          statusEl.textContent = 'Something went wrong sending that. Email adam@xpbrokerage.com and we’ll take it from there.';
          statusEl.className = 'form-status err';
        });
      } else {
        // Fallback until the webhook is wired: pre-filled email
        var lines = Object.keys(payload).map(function (k) { return k + ': ' + payload[k]; });
        var href = 'mailto:adam@xpbrokerage.com'
          + '?subject=' + encodeURIComponent('buywithXP — strategy call request')
          + '&body=' + encodeURIComponent(lines.join('\n'));
        window.location.href = href;
        statusEl.textContent = 'Opening your email app… or write directly to adam@xpbrokerage.com.';
        statusEl.className = 'form-status ok';
      }
    }

    function val(id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }

    // ---- Contact form ----
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = document.getElementById('contactStatus');
        var name = val('cfName'), email = val('cfEmail');
        if (!name || !email || email.indexOf('@') < 1) {
          status.textContent = 'Add your name and a working email so Adam can reach you.';
          status.className = 'form-status err';
          return;
        }
        submitLead({
          form: 'strategy_call_request',
          source: 'buywithxp.com',
          name: name,
          email: email,
          phone: val('cfPhone'),
          company: val('cfCompany'),
          revenue_range: val('cfRevenue'),
          message: val('cfGoal'),
          page: window.location.href
        }, status, contactForm, 'Got it — Adam will reach out within one business day.');
      });
    }

    // ---- "Send my plan" form (modeler) ----
    var planForm = document.getElementById('planForm');
    if (planForm) {
      planForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = document.getElementById('planStatus');
        var email = val('planEmail');
        if (!email || email.indexOf('@') < 1) {
          status.textContent = 'Enter a working email and the plan is on its way.';
          status.className = 'form-status err';
          return;
        }
        var snap = (window.XPModeler && window.XPModeler.snapshot) ? window.XPModeler.snapshot() : null;
        var payload = {
          form: 'acquisition_plan_request',
          source: 'buywithxp.com',
          email: email,
          page: window.location.href
        };
        if (snap) {
          var p = snap.params, r = snap.result;
          payload.model_revenue = p.revenue;
          payload.model_ebitda_margin = p.margin;
          payload.model_organic_growth = p.organic;
          payload.model_deals = p.deals;
          payload.model_target_ebitda = p.targetEbitda;
          payload.model_purchase_multiple = p.multiple;
          payload.model_down_payment = p.down;
          payload.model_synergy = p.synergy;
          payload.model_ev_today = Math.round(r.ev0);
          payload.model_ev_year5 = Math.round(r.ev5);
          payload.model_growth_multiple = r.growth.toFixed(2);
          payload.model_equity_year5 = Math.round(r.equityY5);
        }
        submitLead(payload, status, planForm, 'On its way — check your inbox for the acquisition brief.');
      });
    }
  });
})();
