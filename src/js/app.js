import TaskComponent from './components/task.js';
import KanbanComponent from './components/kanban.js';
import CalendarComponent from './components/calendar.js';
import PomodoroComponent from './components/pomodoro.js';
import AnalyticsComponent from './components/analytics.js';
import CollaborationComponent from './components/collaboration.js';
import { showAuthIfNeeded } from './components/oauth.js';
import SmartAutomationComponent from './components/smartAutomation.js';
import storage from './utils/storage.js';
import notifications from './utils/notifications.js';

class App {
    constructor() {
        this.currentView = 'tasks';
        this.isOnline = navigator.onLine;
        this.installPrompt = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        
    showAuthIfNeeded();
    this.initializeComponents();
    this.initializeEventListeners();
    this.initializeTheme();
    this.initializePWAFeatures();
    this.initializeMobileFeatures();
    this.registerServiceWorker();
    }

    async initializeComponents() {
        this.taskComponent = new TaskComponent();
        this.kanbanComponent = new KanbanComponent();
        this.calendarComponent = new CalendarComponent();
        this.pomodoroComponent = new PomodoroComponent();
        this.analyticsComponent = new AnalyticsComponent();
        this.collaborationComponent = new CollaborationComponent();
        this.smartAutomationComponent = new SmartAutomationComponent();

        // Initial render
        await this.taskComponent.renderTasks();
        await this.kanbanComponent.render();
        
        // Load collaboration data
        this.collaborationComponent.loadStoredData();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelector('.main-nav').addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-item')) {
                this.switchView(e.target.dataset.view);
                // Update nav state for mobile
                this.updateNavState(e.target);
            }
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Voice search button
        const voiceBtn = document.getElementById('voiceSearch');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.startVoiceSearch();
            });
        }

        // Task-related events
        window.addEventListener('createTask', (e) => {
            this.taskComponent.showTaskModal(e.detail);
        });

        window.addEventListener('editTask', (e) => {
            this.taskComponent.editTask(e.detail);
        });

        // Pull-to-refresh
        window.addEventListener('pullRefresh', () => {
            this.handlePullRefresh();
        });

        // Network status
        window.addEventListener('online', () => {
            this.handleOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.handleOnlineStatus(false);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        window.addEventListener('taskUpdated', async () => {
            await this.taskComponent.renderTasks();
            await this.kanbanComponent.render();
            await this.calendarComponent.render();
            await this.analyticsComponent.updateCharts();
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: New Task
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.taskComponent.showTaskModal();
            }

            // Escape: Close modal
            if (e.key === 'Escape') {
                const modal = document.getElementById('taskModal');
                if (modal.classList.contains('active')) {
                    this.taskComponent.closeTaskModal();
                }
            }
        });
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update view visibility
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}View`);
        });

        // Refresh the newly activated view
        switch (viewName) {
            case 'kanban':
                this.kanbanComponent.render();
                break;
            case 'calendar':
                this.calendarComponent.render();
                break;
            case 'analytics':
                this.analyticsComponent.updateCharts();
                break;
                case 'smartAutomation':
                    // Smart Automation component renders automatically
                    break;
        }
    }
    
        switchAutomationTab(tabName) {
            // Hide all automation sections
            document.querySelectorAll('.automation-section').forEach(section => {
                section.classList.remove('active');
            });
        
            // Remove active state from all tabs
            document.querySelectorAll('.automation-tab').forEach(tab => {
                tab.classList.remove('active');
            });
        
            // Show selected section and activate tab
            const targetSection = document.getElementById(tabName);
            const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        
            if (targetSection && targetTab) {
                targetSection.classList.add('active');
                targetTab.classList.add('active');
            }
        }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.className = `theme-${savedTheme}`;
        this.updateThemeToggleButton(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.body.className.replace('theme-', '');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.className = `theme-${newTheme}`;
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggleButton(newTheme);
    }

    updateThemeToggleButton(theme) {
        const button = document.getElementById('themeToggle');
        button.textContent = theme === 'light' ? '🌙' : '☀️';
        button.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('ServiceWorker registration successful');

                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, notify user
                            notifications.sendNotification('Update Available', {
                                body: 'A new version of TaskZen is available. Refresh to update.',
                                requireInteraction: true,
                                actions: [{
                                    action: 'refresh',
                                    title: 'Refresh Now'
                                }]
                            });
                        }
                    });
                });
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});