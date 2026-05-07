/**
 * OlimpX - Landing Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Check if user is logged in
  const token = localStorage.getItem('olimpx_token');
  if (token) {
    // Change "Login" button to "Dashboard"
    const loginBtns = document.querySelectorAll('.btn-login');
    loginBtns.forEach(btn => {
      if (btn.innerText.trim().toLowerCase() === 'kirish' || btn.innerText.trim().toLowerCase() === 'login') {
        btn.textContent = 'Dashboard';
        btn.href = 'pages/dashboard.html';
      }
    });
  }
  
  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fadeInUp');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
  });

  // Mobile Menu Toggle Logic
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('is-active');
      navLinks.classList.toggle('is-active');
      document.body.classList.toggle('no-scroll');
    });

    // Close menu when clicking on a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('is-active');
        navLinks.classList.remove('is-active');
        document.body.classList.remove('no-scroll');
      });
    });
  }
});
