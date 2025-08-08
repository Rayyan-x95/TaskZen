// Application State
const state = {
    tasks: [],
    tags: [],
    view: 'list', // list, kanban, timeline
    filters: {
        tags: [],
        date: 'all',
        search: '',
        priority: 'all'
    },
    settings: {
        theme: 'light',
        notifications: true,
        compactView: false
    }
};

// Task Manager Class
class TaskManager {
    constructor() {
        this.tasks = [];
        this.categories = new Map();
        this.eventBus = new EventEmitter();
    }

    addTask(task) {
        const newTask = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            ...task
        };
        
        this.tasks.unshift(newTask);
        this.save();
        this.eventBus.emit('taskAdded', newTask);
        return newTask;
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            this.save();
            this.eventBus.emit('taskUpdated', this.tasks[index]);
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save();
        this.eventBus.emit('taskDeleted', id);
    }

    getTasksByView(view) {
        switch(view) {
            case 'kanban':
                return this.getKanbanGroups();
            case 'timeline':
                return this.getTimelineGroups();
            default:
                return this.getFilteredTasks();
        }
    }

    // ... add more methods for task management
}

// UI Manager Class
class UIManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentView = 'list';
        this.setupEventListeners();
    }

    renderTasks() {
        const tasks = this.taskManager.getTasksByView(this.currentView);
        const container = document.getElementById('taskContainer');
        
        switch(this.currentView) {
            case 'kanban':
                this.renderKanbanView(tasks);
                break;
            case 'timeline':
                this.renderTimelineView(tasks);
                break;
            default:
                this.renderListView(tasks);
        }
    }

    // ... add more methods for UI management
}

// Initialize the application
const app = {
    taskManager: new TaskManager(),
    uiManager: null,
    
    async init() {
        await this.loadData();
        this.uiManager = new UIManager(this.taskManager);
        this.setupServiceWorker();
    },
    
    async loadData() {
        // Load data from IndexedDB or localStorage
    },
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }
};

// Start the application
document.addEventListener('DOMContentLoaded', () => app.init());
