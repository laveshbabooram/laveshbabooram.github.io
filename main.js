// Main JavaScript file for interactions

document.addEventListener('DOMContentLoaded', () => {
  // Setup cursor glow effect
  const cursorGlow = document.querySelector('.cursor-glow');

  if (cursorGlow) {
    document.addEventListener('mousemove', (e) => {
      cursorGlow.style.opacity = '1';
      // using requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
      });
    });

    document.addEventListener('mouseleave', () => {
      cursorGlow.style.opacity = '0';
    });
  }

  // Fade-in animation on scroll using Intersection Observer
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Apply initial hidden state and observe sections
  document.querySelectorAll('.content-section, .timeline-item, .project-card, .publication-item').forEach(el => {
    el.style.opacity = 0;
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });

  // Typewriter effect
  const typeText = document.getElementById('typewriter-text');
  if (typeText) {
    const words = ['Telecommunications Engineer', 'AI/ML Researcher', 'Author'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function type() {
      const currentWord = words[wordIndex];

      if (isDeleting) {
        typeText.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typeText.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }

      let typeSpeed = 100;

      if (isDeleting) {
        typeSpeed /= 2;
      }

      if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500;
      }

      setTimeout(type, typeSpeed);
    }

    setTimeout(type, 1000);
  }

  // --- Journey Timeline Horizontal Scroll Interactions ---
  const trackContainer = document.querySelector('.timeline-track-container');
  const leftBtn = document.querySelector('.nav-btn-left');
  const rightBtn = document.querySelector('.nav-btn-right');

  if (trackContainer) {
    // 1. Mouse Wheel to Horizontal Scroll
    trackContainer.addEventListener('wheel', (evt) => {
      // Only horizontal scroll on desktop width
      if (window.innerWidth > 1024) {
        evt.preventDefault();
        trackContainer.scrollLeft += evt.deltaY;
      }
    }, { passive: false });

    // 2. Drag to Scroll (Mouse Grabbing)
    let isDown = false;
    let startX;
    let scrollLeft;

    trackContainer.addEventListener('mousedown', (e) => {
      if (window.innerWidth > 1024) {
        isDown = true;
        trackContainer.classList.add('active-drag');
        startX = e.pageX - trackContainer.offsetLeft;
        scrollLeft = trackContainer.scrollLeft;
      }
    });

    trackContainer.addEventListener('mouseleave', () => {
      isDown = false;
      trackContainer.classList.remove('active-drag');
    });

    trackContainer.addEventListener('mouseup', () => {
      isDown = false;
      trackContainer.classList.remove('active-drag');
    });

    trackContainer.addEventListener('mousemove', (e) => {
      if (!isDown || window.innerWidth <= 1024) return;
      e.preventDefault();
      const x = e.pageX - trackContainer.offsetLeft;
      const walk = (x - startX) * 1.5; // scroll speed multiplier
      trackContainer.scrollLeft = scrollLeft - walk;
    });

    // 3. Floating Left/Right Navigation Buttons
    if (leftBtn && rightBtn) {
      function updateNavButtons() {
        const currentScroll = trackContainer.scrollLeft;
        const maxScroll = trackContainer.scrollWidth - trackContainer.clientWidth;

        if (currentScroll <= 5) {
          leftBtn.style.opacity = '0';
          leftBtn.style.pointerEvents = 'none';
        } else {
          leftBtn.style.opacity = '1';
          leftBtn.style.pointerEvents = 'auto';
        }

        if (currentScroll >= maxScroll - 5) {
          rightBtn.style.opacity = '0';
          rightBtn.style.pointerEvents = 'none';
        } else {
          rightBtn.style.opacity = '1';
          rightBtn.style.pointerEvents = 'auto';
        }
      }

      leftBtn.addEventListener('click', () => {
        trackContainer.scrollBy({ left: -400, behavior: 'smooth' });
      });

      rightBtn.addEventListener('click', () => {
        trackContainer.scrollBy({ left: 400, behavior: 'smooth' });
      });

      trackContainer.addEventListener('scroll', updateNavButtons);
      window.addEventListener('resize', updateNavButtons);

      // Run initial check once loaded
      setTimeout(updateNavButtons, 200);
    }
  }

  // --- Security Hashing and Authorization Gate ---
  const securityModal = document.getElementById('security-modal');
  const btnDownloadCv = document.getElementById('btn-download-cv');
  const btnCancelAuth = document.getElementById('btn-cancel-auth');
  const btnSubmitAuth = document.getElementById('btn-submit-auth');
  const securityInput = document.getElementById('security-code-input');
  const inputWrapper = document.querySelector('.security-input-wrapper');
  const modalFeedback = document.getElementById('modal-feedback');

  if (securityModal && btnDownloadCv && btnCancelAuth && btnSubmitAuth && securityInput) {
    // Expected SHA-256 hash of "pleaserecruitme"
    const targetHash = 'dca48f3f1a65bd36e7974636d00dcae29891b944fb40e77bec7b6ca5dc91fc54';

    // Helper function to calculate SHA-256 hash of user passcode inputs
    async function getSHA256Hash(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Open Modal
    btnDownloadCv.addEventListener('click', (e) => {
      e.preventDefault();
      securityModal.classList.add('open');
      setTimeout(() => {
        securityInput.focus();
      }, 100);
    });

    // Close Modal
    function closeModal() {
      securityModal.classList.remove('open');
      securityInput.value = '';
      if (inputWrapper) inputWrapper.classList.remove('error');
      if (modalFeedback) {
        modalFeedback.textContent = '';
        modalFeedback.className = 'modal-feedback-msg';
      }
    }

    btnCancelAuth.addEventListener('click', closeModal);

    // Close modal on click outside content
    securityModal.addEventListener('click', (e) => {
      if (e.target === securityModal) {
        closeModal();
      }
    });

    // Submit Authorization
    async function handleAuthentication() {
      const userInput = securityInput.value.trim().toLowerCase(); // Normalize input
      if (!userInput) return;

      if (modalFeedback) {
        modalFeedback.className = 'modal-feedback-msg';
        modalFeedback.textContent = 'Decrypting database logs...';
      }

      // Compute hash
      const computedHash = await getSHA256Hash(userInput);

      // Check match
      if (computedHash === targetHash) {
        if (modalFeedback) {
          modalFeedback.className = 'modal-feedback-msg feedback-success';
          modalFeedback.textContent = 'ACCESS GRANTED: DECRYPTION SUCCESSFUL';
        }
        if (inputWrapper) inputWrapper.classList.remove('error');

        // Dynamically trigger secure download
        setTimeout(() => {
          const downloadLink = document.createElement('a');
          downloadLink.href = `/cv-${targetHash}.pdf`;
          downloadLink.download = 'Lavesh_Babooram_CV.pdf';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          closeModal();
        }, 1200);
      } else {
        if (modalFeedback) {
          modalFeedback.className = 'modal-feedback-msg feedback-error';
          modalFeedback.textContent = 'ACCESS DENIED: INVALID SECURITY CLEARANCE';
        }
        if (inputWrapper) inputWrapper.classList.add('error');
        
        // Shake feedback
        setTimeout(() => {
          securityInput.select();
        }, 300);
      }
    }

    btnSubmitAuth.addEventListener('click', handleAuthentication);
    
    // Submit on Enter keypress
    securityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAuthentication();
      }
    });
  }

});
