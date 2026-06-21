// Nav scroll effect
const landingNav = document.getElementById('landingNav');
if (landingNav) {
  window.addEventListener('scroll', () => {
    landingNav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Mobile drawer
const hamburger = document.getElementById('hamburger');
const mobileDrawer = document.getElementById('mobileDrawer');
const mobileBackdrop = document.getElementById('mobileBackdrop');
const mobileDrawerClose = document.getElementById('mobileDrawerClose');

function openDrawer() {
  mobileDrawer.classList.add('open');
  mobileBackdrop.classList.add('open');
  hamburger.classList.add('open');
}
function closeDrawer() {
  mobileDrawer.classList.remove('open');
  mobileBackdrop.classList.remove('open');
  hamburger.classList.remove('open');
}
if (hamburger) {
  hamburger.addEventListener('click', openDrawer);
  mobileDrawerClose.addEventListener('click', closeDrawer);
  mobileBackdrop.addEventListener('click', closeDrawer);
  document.querySelectorAll('.mobile-drawer a').forEach(a => a.addEventListener('click', closeDrawer));
}

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Example chip clicks -> redirect to signup with prefilled idea
document.querySelectorAll('.hero-example').forEach(chip => {
  chip.addEventListener('click', () => {
    window.location.href = '/auth/signup';
  });
});
