/**
 * ============================================
 * OlimpX - Page Transition Helper
 * ============================================
 */

/**
 * Programmatic navigation with fade-out
 */
export function navigateTo(url, delay = 150) {
  if (!url) return;
  
  document.body.classList.add('page-is-exiting');
  
  setTimeout(() => {
    window.location.href = url;
  }, delay);
}

/**
 * Initialize transitions
 */
export function initPageTransitions() {
  // Only add fade-in class if not already visible
  // For most pages, we'll just let them load naturally to be safe
  console.log('Page transitions initialized');
  
  // Intercept links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript') || link.target === '_blank') return;

    e.preventDefault();
    navigateTo(href);
  });
}
