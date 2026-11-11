/**
 * Sai Fitness Gym - Consolidated Frontend Interactions (js/main.js)
 * Handles mobile navigation, smooth scrolling, gallery filtering & lightbox,
 * contact form frontend validation, and subtle reveal animations.
 */

'use strict';

document.documentElement.classList.add('js-enabled');

const Validation = {
    isValidEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).trim());
    },

    isValidPhone(phone) {
        const cleaned = String(phone).trim();
        const digits = cleaned.replace(/\D/g, '');
        const formatRe = /^[+]?[\d\s().-]+$/;
        return formatRe.test(cleaned) && digits.length >= 7 && digits.length <= 15;
    },

    showError(inputElement, message) {
        if (!inputElement) return;
        this.clearError(inputElement);
        inputElement.classList.add('is-invalid');
        inputElement.setAttribute('aria-invalid', 'true');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.textContent = message;

        const parent = inputElement.parentElement;
        if (parent) {
            parent.appendChild(errorDiv);
        }
    },

    clearError(inputElement) {
        if (!inputElement) return;
        inputElement.classList.remove('is-invalid');
        inputElement.removeAttribute('aria-invalid');

        const parent = inputElement.parentElement;
        if (parent) {
            const existingError = parent.querySelector('.form-error');
            if (existingError) {
                existingError.remove();
            }
        }
    },

    clearAllErrors(formElement) {
        if (!formElement) return;
        formElement.querySelectorAll('.is-invalid').forEach((input) => {
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        });
        formElement.querySelectorAll('.form-error').forEach((err) => err.remove());
    }
};

const Toast = {
    container: null,

    init() {
        const existing = document.querySelector('.toast-container');
        if (existing) {
            this.container = existing;
            return;
        }
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 4000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} show`;

        const row = document.createElement('div');
        row.className = 'd-flex align-items-center w-100';

        const iconMap = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        const iconSpan = document.createElement('span');
        iconSpan.className = 'me-2 fw-bold';
        iconSpan.textContent = iconMap[type] || 'ℹ';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex-grow-1';
        contentDiv.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close btn-close-white ms-3';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => toast.remove());

        row.appendChild(iconSpan);
        row.appendChild(contentDiv);
        row.appendChild(closeBtn);
        toast.appendChild(row);
        this.container.appendChild(toast);

        window.setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
};

function initNavbar() {
    const navbar = document.querySelector('.site-navbar');
    const navCollapse = document.getElementById('saiNavbar');

    if (navbar) {
        const syncScrollState = () => {
            navbar.classList.toggle('is-scrolled', window.scrollY > 20);
        };
        syncScrollState();
        window.addEventListener('scroll', syncScrollState, { passive: true });
    }

    if (navCollapse) {
        navCollapse.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992 && navCollapse.classList.contains('show') && window.bootstrap) {
                    const collapseInstance = bootstrap.Collapse.getOrCreateInstance(navCollapse);
                    collapseInstance.hide();
                }
            });
        });
    }
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const targetSelector = anchor.getAttribute('href');
            if (!targetSelector || targetSelector === '#') return;
            if (anchor.hasAttribute('data-bs-toggle')) return;

            const target = document.querySelector(targetSelector);
            if (!target) return;

            event.preventDefault();
            const header = document.querySelector('.site-navbar');
            const offset = header ? header.offsetHeight : 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;

            window.scrollTo({
                top: Math.max(0, top),
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
    });
}

function initGallery() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
    const triggers = Array.from(document.querySelectorAll('.gallery-trigger'));

    if (filterButtons.length > 0 && galleryItems.length > 0) {
        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');

                filterButtons.forEach((button) => {
                    const isMatch = button === btn;
                    button.classList.toggle('active', isMatch);
                    button.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
                });

                galleryItems.forEach((item) => {
                    const categories = (item.getAttribute('data-category') || '').split(/\s+/).filter(Boolean);
                    const shouldShow = filterValue === 'all' || categories.includes(filterValue);
                    item.classList.toggle('is-hidden', !shouldShow);
                });
            });
        });
    }

    if (triggers.length === 0) return;

    const backdrop = createLightboxElement();
    const mediaWrap = backdrop.querySelector('.lightbox-media-wrap');
    const lightboxTitle = backdrop.querySelector('.lightbox-caption-title');
    const lightboxDesc = backdrop.querySelector('.lightbox-caption-desc');
    const lightboxCount = backdrop.querySelector('.lightbox-counter');
    const prevBtn = backdrop.querySelector('.lightbox-prev');
    const nextBtn = backdrop.querySelector('.lightbox-next');
    const closeBtn = backdrop.querySelector('.lightbox-close');

    let activeTriggers = [];
    let currentIndex = 0;
    let lastFocusedTrigger = null;

    function getVisibleTriggers() {
        return triggers.filter((trigger) => {
            const parentItem = trigger.closest('.gallery-item');
            return !parentItem || !parentItem.classList.contains('is-hidden');
        });
    }

    function renderSlide(index) {
        if (activeTriggers.length === 0) return;
        currentIndex = (index + activeTriggers.length) % activeTriggers.length;
        const trigger = activeTriggers[currentIndex];
        const img = trigger.querySelector('img');

        const src = trigger.getAttribute('data-image') || (img ? img.getAttribute('src') : '');
        const alt = img ? img.getAttribute('alt') : '';
        const title = trigger.getAttribute('data-title') || alt || 'Sai Fitness Sanctuary';
        const description = trigger.getAttribute('data-description') || '';

        let lightboxImg = mediaWrap.querySelector('.lightbox-img');
        if (!lightboxImg) {
            lightboxImg = document.createElement('img');
            lightboxImg.className = 'lightbox-img';
            mediaWrap.insertBefore(lightboxImg, nextBtn);
        }

        lightboxImg.setAttribute('src', src);
        lightboxImg.setAttribute('alt', alt || title);
        lightboxTitle.textContent = title;
        lightboxDesc.textContent = description;
        lightboxCount.textContent = `${currentIndex + 1} / ${activeTriggers.length}`;

        const showNav = activeTriggers.length > 1;
        prevBtn.classList.toggle('d-none', !showNav);
        nextBtn.classList.toggle('d-none', !showNav);
    }

    function openLightbox(trigger) {
        activeTriggers = getVisibleTriggers();
        const foundIndex = activeTriggers.indexOf(trigger);
        if (foundIndex === -1) {
            activeTriggers = triggers;
        }
        lastFocusedTrigger = trigger;
        renderSlide(Math.max(0, activeTriggers.indexOf(trigger)));

        backdrop.classList.add('is-open');
        backdrop.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-active');
        closeBtn.focus();
    }

    function closeLightbox() {
        backdrop.classList.remove('is-open');
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lightbox-active');
        const activeImg = mediaWrap.querySelector('.lightbox-img');
        if (activeImg) {
            activeImg.remove();
        }
        if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
            lastFocusedTrigger.focus();
        }
    }

    triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => openLightbox(trigger));
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openLightbox(trigger);
            }
        });
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => renderSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => renderSlide(currentIndex + 1));

    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!backdrop.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
            closeLightbox();
        } else if (event.key === 'ArrowLeft') {
            renderSlide(currentIndex - 1);
        } else if (event.key === 'ArrowRight') {
            renderSlide(currentIndex + 1);
        }
    });
}

function createLightboxElement() {
    const existing = document.getElementById('galleryLightbox');
    if (existing) return existing;

    const backdrop = document.createElement('div');
    backdrop.id = 'galleryLightbox';
    backdrop.className = 'lightbox-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-label', 'Gallery image viewer');

    const dialog = document.createElement('div');
    dialog.className = 'lightbox-dialog';

    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'lightbox-media-wrap';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close image viewer');
    closeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'lightbox-nav lightbox-prev';
    prevBtn.setAttribute('aria-label', 'Previous image');
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'lightbox-nav lightbox-next';
    nextBtn.setAttribute('aria-label', 'Next image');
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';

    mediaWrap.appendChild(closeBtn);
    mediaWrap.appendChild(prevBtn);
    mediaWrap.appendChild(nextBtn);

    const caption = document.createElement('div');
    caption.className = 'lightbox-caption d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2';

    const textCol = document.createElement('div');
    const title = document.createElement('h4');
    title.className = 'font-heading h4 lightbox-caption-title';
    const desc = document.createElement('p');
    desc.className = 'small text-white-50 mb-0 lightbox-caption-desc';
    textCol.appendChild(title);
    textCol.appendChild(desc);

    const counter = document.createElement('span');
    counter.className = 'badge badge-gold lightbox-counter align-self-start align-self-sm-center';

    caption.appendChild(textCol);
    caption.appendChild(counter);

    dialog.appendChild(mediaWrap);
    dialog.appendChild(caption);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    return backdrop;
}

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const phoneInput = document.getElementById('contact-phone');
    const messageInput = document.getElementById('contact-message');
    const feedbackBanner = document.getElementById('contact-feedback');
    const modalTitleName = document.getElementById('modal-sender-name');

    [nameInput, emailInput, phoneInput, messageInput].forEach((field) => {
        if (!field) return;
        field.addEventListener('input', () => Validation.clearError(field));
    });

    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        Validation.clearAllErrors(contactForm);

        if (feedbackBanner) {
            feedbackBanner.classList.add('d-none');
        }

        let firstInvalid = null;

        const nameVal = nameInput ? nameInput.value.trim() : '';
        if (nameVal.length < 2) {
            Validation.showError(nameInput, 'Please enter your full name (at least 2 characters).');
            firstInvalid = firstInvalid || nameInput;
        }

        const emailVal = emailInput ? emailInput.value.trim() : '';
        if (!Validation.isValidEmail(emailVal)) {
            Validation.showError(emailInput, 'Please enter a valid email address.');
            firstInvalid = firstInvalid || emailInput;
        }

        const phoneVal = phoneInput ? phoneInput.value.trim() : '';
        if (!Validation.isValidPhone(phoneVal)) {
            Validation.showError(phoneInput, 'Please enter a valid phone number (7–15 digits).');
            firstInvalid = firstInvalid || phoneInput;
        }

        const messageVal = messageInput ? messageInput.value.trim() : '';
        if (messageVal.length < 10) {
            Validation.showError(messageInput, 'Please enter a message of at least 10 characters.');
            firstInvalid = firstInvalid || messageInput;
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return;
        }

        if (modalTitleName) {
            modalTitleName.textContent = nameVal;
        }

        if (feedbackBanner) {
            const feedbackName = feedbackBanner.querySelector('.feedback-name');
            if (feedbackName) {
                feedbackName.textContent = nameVal;
            }
            feedbackBanner.classList.remove('d-none');
        }

        contactForm.reset();

        const modalElem = document.getElementById('thankYouModal');
        if (modalElem && window.bootstrap) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalElem);
            bsModal.show();
        } else {
            Toast.show('Validation complete (frontend preview only — no message was sent).', 'info', 5000);
        }
    });
}

function initScrollReveal() {
    const revealItems = document.querySelectorAll('.reveal-on-scroll');
    if (revealItems.length === 0) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    revealItems.forEach((item) => observer.observe(item));
}

document.addEventListener('DOMContentLoaded', () => {
    Toast.init();
    initNavbar();
    initSmoothScroll();
    initGallery();
    initContactForm();
    initScrollReveal();
});
