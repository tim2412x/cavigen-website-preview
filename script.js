'use strict';
// Small, browser-native interactions; the content and email links also work without JavaScript.
function makeInquiry(product, context) {
  const allowed = ['CaviSphere', 'MicroSphere', 'PoroSphere', 'SensoSphere', 'Custom integration'];
  if (!allowed.includes(product)) product = 'CaviSphere';
  const detail = context.trim().slice(0, 2000);
  const body = `Hello CAVIGEN team,\n\nI would like to discuss ${product} for my research and learn about trial options, the right configuration and pricing.${detail ? '\n\nMy model or research question:\n' + detail : ''}\n\nBest regards`;
  return 'mailto:info@cavigen.eu?subject=' + encodeURIComponent(product + ' enquiry') + '&body=' + encodeURIComponent(body);
}
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }
menuToggle.addEventListener('click', () => { const open = menuToggle.getAttribute('aria-expanded') !== 'true'; navigation.classList.toggle('open', open); menuToggle.setAttribute('aria-expanded', String(open)); });
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menuToggle.focus(); } });
const mobileQuery = window.matchMedia('(max-width: 700px)');
mobileQuery.addEventListener('change', () => { if (!mobileQuery.matches) closeMenu(); });
const currentFile = location.pathname.split('/').pop() || 'index.html';
navigation.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === currentFile) link.setAttribute('aria-current', 'page'); });
function updateHeader() { header.classList.toggle('scrolled', window.scrollY > 15); }
window.addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.querySelector('#motion-toggle');
let paused = reducedMotion.matches;
try { paused = paused || localStorage.getItem('cavigen-motion') === 'paused'; } catch (_) { /* Storage can be unavailable for local file previews. */ }
function setMotion() { document.documentElement.classList.toggle('motion-paused', paused); motionToggle.textContent = reducedMotion.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion'; motionToggle.setAttribute('aria-pressed', String(paused)); motionToggle.disabled = reducedMotion.matches; document.dispatchEvent(new CustomEvent('cavigen:motion', { detail: { paused } })); }
motionToggle.addEventListener('click', () => { paused = !paused; setMotion(); try { localStorage.setItem('cavigen-motion', paused ? 'paused' : 'running'); } catch (_) {} });
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; setMotion(); }); setMotion();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); } }); }, { threshold: .08 });
  document.documentElement.classList.add('motion-ready');
  document.querySelectorAll('.reveal').forEach(element => { element.classList.add('pending'); observer.observe(element); });
}
const dialog = document.querySelector('#inquiry-dialog');
const form = document.querySelector('#inquiry-form');
let returnFocus = null;
if (typeof dialog.showModal === 'function') {
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-inquiry]');
    if (!link) return;
    event.preventDefault(); returnFocus = link; form.reset();
    const product = document.querySelector('#inquiry-product');
    product.value = link.dataset.inquiry;
    if (!product.value) product.value = 'CaviSphere';
    document.querySelector('#inquiry-context').value = (link.dataset.context || '').slice(0, 2000);
    document.querySelector('#email-fallback').hidden = true;
    closeMenu(); dialog.showModal(); document.body.classList.add('dialog-open');
  });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { const bounds = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); returnFocus?.focus(); });
}
form.addEventListener('submit', event => { event.preventDefault(); const href = makeInquiry(document.querySelector('#inquiry-product').value, document.querySelector('#inquiry-context').value); document.querySelector('#email-fallback').hidden = false; window.location.href = href; });
