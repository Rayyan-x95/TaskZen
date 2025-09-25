/**
 * Mobile Enhancements for TaskZen
 * Handles touch interactions, gestures, responsive behavior, and device-specific features
 */

class MobileEnhancements {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isSwipeEnabled = true;
        this.menuOpen = false;
        this.init();
    }

    init() {
        this.setupTouchHandlers();
        this.setupResponsiveNavigation();
        this.setupSwipeGestures();
        this.setupPullToRefresh();
        this.setupKeyboardHandling();
        this.setupOrientationChange();
        this.setupHapticFeedback();
        this.setupAccessibilityFeatures();
    }

    setupTouchHandlers() {
        // Improve touch responsiveness
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

        // Add touch feedback to buttons
        document.addEventListener('touchstart', (e) => {
            if (e.target.matches('button, .btn, .touch-target')) {
                e.target.style.transform = 'scale(0.95)';
                e.target.style.opacity = '0.8';
                this.triggerHapticFeedback('light');
            }
        });

        document.addEventListener('touchend', (e) => {
            if (e.target.matches('button, .btn, .touch-target')) {
                e.target.style.transform = '';
                e.target.style.opacity = '';
            }
        });
    }

    setupResponsiveNavigation() {
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.getElementById('mainNav');

        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close menu on outside click
            document.addEventListener('click', (e) => {
                if (this.menuOpen && !mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Handle navigation clicks
            mainNav.addEventListener('click', (e) => {
                if (e.target.matches('.nav-item')) {
                    if (window.innerWidth <= 768) {
                        this.closeMobileMenu();
                    }
                    this.triggerHapticFeedback('medium');
                }
            });
        }
    }

    toggleMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.getElementById('mainNav');

        if (menuToggle && mainNav) {
            this.menuOpen = !this.menuOpen;
            menuToggle.classList.toggle('active', this.menuOpen);
            mainNav.classList.toggle('mobile-open', this.menuOpen);
            
            // Prevent scrolling when menu is open
            document.body.style.overflow = this.menuOpen ? 'hidden' : '';
            
            this.triggerHapticFeedback('medium');
        }
    }

    closeMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.getElementById('mainNav');

        if (menuToggle && mainNav && this.menuOpen) {
            this.menuOpen = false;
            menuToggle.classList.remove('active');
            mainNav.classList.remove('mobile-open');
            document.body.style.overflow = '';
        }
    }

    setupSwipeGestures() {
        const taskList = document.getElementById('taskList');
        if (!taskList) return;

        taskList.addEventListener('touchstart', (e) => {
            if (e.target.closest('.task-item')) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        });

        taskList.addEventListener('touchmove', (e) => {
            if (!this.isSwipeEnabled || !e.target.closest('.task-item')) return;

            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = touchX - this.touchStartX;
            const deltaY = touchY - this.touchStartY;

            // Horizontal swipe detection
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
                e.preventDefault(); // Prevent scrolling
                this.handleTaskSwipe(e.target.closest('.task-item'), deltaX);
            }
        });

        taskList.addEventListener('touchend', (e) => {
            if (e.target.closest('.task-item')) {
                this.resetTaskSwipe(e.target.closest('.task-item'));
            }
        });
    }

    handleTaskSwipe(taskElement, deltaX) {
        if (!taskElement) return;

        const swipeDistance = Math.min(Math.abs(deltaX), 100);
        const direction = deltaX > 0 ? 'right' : 'left';

        if (direction === 'right') {
            // Swipe right - show complete action
            taskElement.style.transform = `translateX(${swipeDistance}px)`;
            taskElement.style.backgroundColor = 'var(--success-color)';
            if (swipeDistance > 50) {
                this.showSwipeAction(taskElement, 'complete', '✓');
            }
        } else {
            // Swipe left - show delete action
            taskElement.style.transform = `translateX(-${swipeDistance}px)`;
            taskElement.style.backgroundColor = 'var(--danger-color)';
            if (swipeDistance > 50) {
                this.showSwipeAction(taskElement, 'delete', '🗑️');
            }
        }
    }

    showSwipeAction(taskElement, action, icon) {
        let actionIndicator = taskElement.querySelector('.swipe-action');
        if (!actionIndicator) {
            actionIndicator = document.createElement('div');
            actionIndicator.className = 'swipe-action';
            taskElement.appendChild(actionIndicator);
        }
        
        actionIndicator.textContent = icon;
        actionIndicator.className = `swipe-action ${action}`;
    }

    resetTaskSwipe(taskElement) {
        if (!taskElement) return;

        taskElement.style.transform = '';
        taskElement.style.backgroundColor = '';
        
        const actionIndicator = taskElement.querySelector('.swipe-action');
        if (actionIndicator) {
            actionIndicator.remove();
        }
    }

    setupPullToRefresh() {
        let startY = 0;
        let pullDistance = 0;
        const threshold = 80;
        let refreshTriggered = false;

        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-refresh-indicator';
        refreshIndicator.innerHTML = '⟳ Pull to refresh';
        document.body.appendChild(refreshIndicator);

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY > 0) {
                pullDistance = e.touches[0].clientY - startY;
                
                if (pullDistance > 0) {
                    e.preventDefault();
                    const progress = Math.min(pullDistance / threshold, 1);
                    refreshIndicator.style.transform = `translateY(${pullDistance * 0.5}px)`;
                    refreshIndicator.style.opacity = progress;
                    
                    if (pullDistance > threshold && !refreshTriggered) {
                        refreshIndicator.innerHTML = '⟳ Release to refresh';
                        this.triggerHapticFeedback('medium');
                        refreshTriggered = true;
                    }
                }
            }
        });

        document.addEventListener('touchend', () => {
            if (pullDistance > threshold && refreshTriggered) {
                this.triggerRefresh();
            }
            
            refreshIndicator.style.transform = '';
            refreshIndicator.style.opacity = '0';
            refreshIndicator.innerHTML = '⟳ Pull to refresh';
            startY = 0;
            pullDistance = 0;
            refreshTriggered = false;
        });
    }

    triggerRefresh() {
        // Trigger refresh animation and action
        const refreshEvent = new CustomEvent('pullRefresh');
        document.dispatchEvent(refreshEvent);
        this.triggerHapticFeedback('heavy');
    }

    setupKeyboardHandling() {
        let initialViewportHeight = window.innerHeight;

        const handleViewportChange = () => {
            const viewportHeight = window.innerHeight;
            const keyboardHeight = initialViewportHeight - viewportHeight;
            
            if (keyboardHeight > 150) {
                // Keyboard is likely open
                document.body.classList.add('keyboard-open');
                document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
            } else {
                // Keyboard is likely closed
                document.body.classList.remove('keyboard-open');
                document.documentElement.style.setProperty('--keyboard-height', '0px');
            }
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialViewportHeight = window.innerHeight;
                handleViewportChange();
            }, 500);
        });

        // Focus management for better mobile UX
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea, select')) {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
    }

    setupOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // Close mobile menu on orientation change
            this.closeMobileMenu();
            
            // Adjust layout after orientation change
            setTimeout(() => {
                this.adjustLayoutForOrientation();
            }, 100);
        });
    }

    adjustLayoutForOrientation() {
        const isLandscape = window.innerHeight < window.innerWidth;
        document.body.classList.toggle('landscape', isLandscape);
        document.body.classList.toggle('portrait', !isLandscape);
    }

    setupHapticFeedback() {
        // Check if device supports haptic feedback
        this.hapticSupported = 'vibrate' in navigator;
    }

    triggerHapticFeedback(intensity = 'light') {
        if (!this.hapticSupported) return;

        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30, 10, 30],
            success: [10, 5, 15],
            error: [50, 10, 50, 10, 50]
        };

        navigator.vibrate(patterns[intensity] || patterns.light);
    }

    setupAccessibilityFeatures() {
        // Improve focus management
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.menuOpen) {
                    this.closeMobileMenu();
                }
                
                // Close any open modals
                const openModals = document.querySelectorAll('.modal.active');
                openModals.forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });

        // Add skip link for keyboard navigation
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Announce dynamic content changes to screen readers
        this.createLiveRegion();
    }

    createLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    // Utility methods for responsive behavior
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    getBreakpoint() {
        if (this.isMobile()) return 'mobile';
        if (this.isTablet()) return 'tablet';
        return 'desktop';
    }
}

// Initialize mobile enhancements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileEnhancements = new MobileEnhancements();
});

// Export for use in other modules
export default MobileEnhancements;