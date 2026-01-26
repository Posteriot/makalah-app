// script.js - Makalah AI Hybrid Mockup Interactions

document.addEventListener('DOMContentLoaded', () => {
    console.log('Makalah AI Mockup Loaded');

    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, observerOptions);

    // Apply reveal to bento items and pricing cards
    document.querySelectorAll('.bento-item, .pricing-card, .section-header').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
        observer.observe(item);
    });

    // Custom animation for revealed items
    const style = document.createElement('style');
    style.innerHTML = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Hero Mockup Typewriter effect simulation
    const mockContent = document.querySelector('.mock-content');
    if (mockContent) {
        // Subtle move of aurora based on mouse
        document.addEventListener('mousemove', (e) => {
            const aurora = document.querySelector('.hero-vivid-bg');
            if (aurora) {
                const moveX = (e.clientX - window.innerWidth / 2) * 0.02;
                const moveY = (e.clientY - window.innerHeight / 2) * 0.02;
                aurora.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
            }
        });
    }
});
