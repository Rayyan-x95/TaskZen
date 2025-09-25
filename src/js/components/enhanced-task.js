/**
 * Enhanced Task Component with Advanced Features
 * Includes drag-and-drop, quick actions, bulk operations, and smart filtering
 */

import taskManager from '../utils/taskManager.js';
import notifications from '../utils/notifications.js';
import DateUtils from '../utils/dateUtils.js';

class EnhancedTaskComponent {
    constructor() {
        this.selectedTasks = new Set();
        this.draggedTask = null;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
        this.currentFilter = {
            priority: '',
            status: '',
            category: '',
            search: '',
            dateRange: '',
            tags: []
        };
        this.viewMode = 'list'; // list, grid, compact
        
        this.initializeEventListeners();
        this.initializeDragAndDrop();
        this.initializeQuickActions();
        this.initializeAdvancedFilters();
    }

    initializeEventListeners() {
        // Enhanced task form submission
        document.getElementById('taskForm')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Enhanced task list events with delegation
        document.getElementById('taskList')?.addEventListener('click', (e) => this.handleTaskAction(e));
        document.getElementById('taskList')?.addEventListener('dblclick', (e) => this.handleTaskDoubleClick(e));

        // Bulk selection
        document.getElementById('taskList')?.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('task-checkbox')) {
                this.handleTaskSelection(e);
            }
        });

        // Enhanced filters
        document.getElementById('priorityFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('searchTasks')?.addEventListener('input', (e) => this.handleSearch(e));

        // View mode toggles
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchViewMode(e.target.dataset.view));
        });

        // Sort controls
        this.initializeSortControls();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Add task button
        document.getElementById('addTask')?.addEventListener('click', () => this.showTaskModal());

        // Quick add input (if exists)
        document.getElementById('quickAddInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                this.quickAddTask(e.target.value.trim());
                e.target.value = '';
            }
        });
    }

    initializeDragAndDrop() {
        const taskList = document.getElementById('taskList');
        if (!taskList) return;

        // Make task list a drop zone
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.showDropIndicator(e);
        });

        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleTaskDrop(e);
            this.hideDropIndicator();
        });

        taskList.addEventListener('dragleave', () => {
            this.hideDropIndicator();
        });
    }

    initializeQuickActions() {
        // Create quick action toolbar
        this.createQuickActionToolbar();

        // Quick action buttons
        document.getElementById('bulkComplete')?.addEventListener('click', () => {
            this.bulkCompleteSelected();
        });

        document.getElementById('bulkDelete')?.addEventListener('click', () => {
            this.bulkDeleteSelected();
        });

        document.getElementById('bulkPriority')?.addEventListener('click', () => {
            this.showBulkPriorityDialog();
        });

        document.getElementById('bulkCategory')?.addEventListener('click', () => {
            this.showBulkCategoryDialog();
        });

        // Select all/none
        document.getElementById('selectAll')?.addEventListener('click', () => {
            this.selectAllTasks();
        });

        document.getElementById('selectNone')?.addEventListener('click', () => {
            this.clearSelection();
        });
    }

    initializeAdvancedFilters() {
        // Date range filter
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', () => this.applyFilters());
        }

        // Tag filter with autocomplete
        this.initializeTagFilter();

        // Smart filters
        this.initializeSmartFilters();

        // Save/load filter presets
        this.initializeFilterPresets();
    }

    initializeSortControls() {
        const sortControls = document.querySelector('.sort-controls');
        if (!sortControls) {
            this.createSortControls();
        }

        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                this.handleSort(sortBy);
            });
        });
    }

    // Enhanced Task Rendering
    async renderTasks() {
        const tasks = await taskManager.getAllTasks();
        const filteredTasks = this.applyCurrentFilters(tasks);
        const sortedTasks = this.applySorting(filteredTasks);
        
        const taskList = document.getElementById('taskList');
        if (!taskList) return;

        // Show empty state if no tasks
        if (sortedTasks.length === 0) {
            this.showEmptyState();
            return;
        }

        // Render based on view mode
        switch (this.viewMode) {
            case 'grid':
                this.renderGridView(sortedTasks);
                break;
            case 'compact':
                this.renderCompactView(sortedTasks);
                break;
            default:
                this.renderListView(sortedTasks);
        }

        // Update task count
        this.updateTaskCount(sortedTasks.length, tasks.length);
    }

    renderListView(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.className = 'task-list list-view';
        taskList.innerHTML = tasks.map(task => this.createTaskHTML(task, 'list')).join('');
        this.attachTaskEventListeners();
    }

    renderGridView(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.className = 'task-list grid-view';
        taskList.innerHTML = tasks.map(task => this.createTaskHTML(task, 'grid')).join('');
        this.attachTaskEventListeners();
    }

    renderCompactView(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.className = 'task-list compact-view';
        taskList.innerHTML = tasks.map(task => this.createTaskHTML(task, 'compact')).join('');
        this.attachTaskEventListeners();
    }

    createTaskHTML(task, viewMode = 'list') {
        const isSelected = this.selectedTasks.has(task.id);
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
        const priorityClass = `priority-${task.priority}`;
        const statusClass = `status-${task.status}`;

        const baseHTML = `
            <div class="task-item ${priorityClass} ${statusClass} ${isOverdue ? 'overdue' : ''} ${isSelected ? 'selected' : ''}" 
                 data-task-id="${task.id}" 
                 draggable="true">
                
                <div class="task-checkbox-container">
                    <input type="checkbox" class="task-checkbox" ${isSelected ? 'checked' : ''} 
                           aria-label="Select task">
                </div>

                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${this.escapeHTML(task.title)}</h3>
                        <div class="task-actions">
                            ${this.createTaskActionButtons(task)}
                        </div>
                    </div>
                    
                    ${viewMode !== 'compact' ? `
                        <p class="task-description">${this.escapeHTML(task.description || '')}</p>
                    ` : ''}
                    
                    <div class="task-meta">
                        <div class="task-meta-left">
                            <span class="priority-badge priority-${task.priority}">
                                ${this.getPriorityIcon(task.priority)} ${task.priority}
                            </span>
                            <span class="status-badge status-${task.status}">
                                ${this.getStatusIcon(task.status)} ${task.status}
                            </span>
                            ${task.dueDate ? `
                                <span class="due-date ${isOverdue ? 'overdue' : ''}">
                                    📅 ${DateUtils.formatDate(task.dueDate)}
                                </span>
                            ` : ''}
                        </div>
                        
                        ${viewMode !== 'compact' ? `
                            <div class="task-meta-right">
                                ${task.tags.map(tag => `
                                    <span class="tag">#${tag}</span>
                                `).join('')}
                                ${task.subtasks?.length ? `
                                    <span class="subtask-count">
                                        📋 ${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length}
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="task-drag-handle" aria-label="Drag to reorder">
                    ⋮⋮
                </div>
            </div>
        `;

        return baseHTML;
    }

    createTaskActionButtons(task) {
        return `
            <div class="task-quick-actions">
                <button class="quick-action-btn complete-btn" data-action="toggle-complete" 
                        title="${task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}">
                    ${task.status === 'completed' ? '↶' : '✓'}
                </button>
                <button class="quick-action-btn priority-btn" data-action="cycle-priority" 
                        title="Change priority">
                    ${this.getPriorityIcon(task.priority)}
                </button>
                <button class="quick-action-btn edit-btn" data-action="edit" title="Edit task">
                    ✏️
                </button>
                <button class="quick-action-btn delete-btn" data-action="delete" title="Delete task">
                    🗑️
                </button>
                <button class="quick-action-btn more-btn" data-action="more" title="More actions">
                    ⋯
                </button>
            </div>
        `;
    }

    // Advanced Filtering
    applyCurrentFilters(tasks) {
        return tasks.filter(task => {
            // Priority filter
            if (this.currentFilter.priority && task.priority !== this.currentFilter.priority) {
                return false;
            }

            // Status filter
            if (this.currentFilter.status && task.status !== this.currentFilter.status) {
                return false;
            }

            // Search filter
            if (this.currentFilter.search) {
                const searchTerm = this.currentFilter.search.toLowerCase();
                const searchable = [
                    task.title,
                    task.description,
                    ...task.tags,
                    ...(task.categories || [])
                ].join(' ').toLowerCase();
                
                if (!searchable.includes(searchTerm)) {
                    return false;
                }
            }

            // Date range filter
            if (this.currentFilter.dateRange && task.dueDate) {
                if (!this.isTaskInDateRange(task, this.currentFilter.dateRange)) {
                    return false;
                }
            }

            // Tag filter
            if (this.currentFilter.tags.length > 0) {
                const hasMatchingTag = this.currentFilter.tags.some(tag => 
                    task.tags.includes(tag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            return true;
        });
    }

    applySorting(tasks) {
        return tasks.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'priority':
                    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'dueDate':
                    aValue = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                    bValue = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
                    break;
                case 'status':
                    const statusOrder = { todo: 1, 'in-progress': 2, completed: 3 };
                    aValue = statusOrder[a.status] || 0;
                    bValue = statusOrder[b.status] || 0;
                    break;
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
            }

            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Drag and Drop Implementation
    attachTaskEventListeners() {
        document.querySelectorAll('.task-item').forEach(taskElement => {
            taskElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
            taskElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    handleDragStart(e) {
        this.draggedTask = e.currentTarget;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
        e.currentTarget.style.opacity = '0.5';
        
        // Add visual feedback
        document.body.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.currentTarget.style.opacity = '';
        document.body.classList.remove('dragging');
        this.hideDropIndicator();
    }

    handleTaskDrop(e) {
        if (!this.draggedTask) return;

        const dropTarget = e.target.closest('.task-item');
        const taskList = document.getElementById('taskList');
        
        if (dropTarget && dropTarget !== this.draggedTask) {
            // Determine drop position
            const rect = dropTarget.getBoundingClientRect();
            const dropPosition = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            
            // Reorder tasks
            if (dropPosition === 'before') {
                taskList.insertBefore(this.draggedTask, dropTarget);
            } else {
                taskList.insertBefore(this.draggedTask, dropTarget.nextSibling);
            }
            
            // Update task order in storage
            this.updateTaskOrder();
            
            // Show success feedback
            this.showToast('Task reordered successfully');
        }

        this.draggedTask = null;
    }

    showDropIndicator(e) {
        const dropTarget = e.target.closest('.task-item');
        if (dropTarget && dropTarget !== this.draggedTask) {
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
            
            const rect = dropTarget.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
                dropTarget.parentNode.insertBefore(indicator, dropTarget);
            } else {
                dropTarget.parentNode.insertBefore(indicator, dropTarget.nextSibling);
            }
        }
    }

    hideDropIndicator() {
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }

    // Bulk Operations
    handleTaskSelection(e) {
        const taskId = parseInt(e.target.closest('.task-item').dataset.taskId);
        
        if (e.target.checked) {
            this.selectedTasks.add(taskId);
        } else {
            this.selectedTasks.delete(taskId);
        }
        
        this.updateBulkActionToolbar();
        this.updateTaskSelectionUI();
    }

    selectAllTasks() {
        const visibleTasks = document.querySelectorAll('.task-item');
        visibleTasks.forEach(taskElement => {
            const taskId = parseInt(taskElement.dataset.taskId);
            this.selectedTasks.add(taskId);
            const checkbox = taskElement.querySelector('.task-checkbox');
            if (checkbox) checkbox.checked = true;
        });
        
        this.updateBulkActionToolbar();
        this.updateTaskSelectionUI();
    }

    clearSelection() {
        this.selectedTasks.clear();
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateBulkActionToolbar();
        this.updateTaskSelectionUI();
    }

    async bulkCompleteSelected() {
        const tasks = Array.from(this.selectedTasks);
        for (const taskId of tasks) {
            await taskManager.updateTaskStatus(taskId, 'completed');
        }
        
        this.showToast(`${tasks.length} tasks marked as completed`);
        this.clearSelection();
        this.renderTasks();
    }

    async bulkDeleteSelected() {
        if (!confirm(`Delete ${this.selectedTasks.size} selected tasks?`)) return;
        
        const tasks = Array.from(this.selectedTasks);
        for (const taskId of tasks) {
            await taskManager.deleteTask(taskId);
        }
        
        this.showToast(`${tasks.length} tasks deleted`);
        this.clearSelection();
        this.renderTasks();
    }

    // Quick Actions
    async handleTaskAction(e) {
        const action = e.target.dataset.action;
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;
        
        const taskId = parseInt(taskElement.dataset.taskId);
        
        switch (action) {
            case 'toggle-complete':
                await this.toggleTaskComplete(taskId);
                break;
            case 'cycle-priority':
                await this.cyclePriority(taskId);
                break;
            case 'edit':
                this.editTask(taskId);
                break;
            case 'delete':
                await this.deleteTask(taskId);
                break;
            case 'more':
                this.showTaskContextMenu(taskElement, taskId);
                break;
        }
    }

    async quickAddTask(title) {
        const taskData = {
            title: title,
            priority: 'medium',
            status: 'todo',
            createdAt: new Date().toISOString()
        };
        
        await taskManager.createTask(taskData);
        this.renderTasks();
        this.showToast('Task added successfully');
    }

    // Utility methods
    getPriorityIcon(priority) {
        const icons = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }

    getStatusIcon(status) {
        const icons = {
            todo: '📝',
            'in-progress': '⏳',
            completed: '✅'
        };
        return icons[status] || '❓';
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        // Implementation depends on your toast system
        if (window.app && window.app.showToast) {
            window.app.showToast(message);
        }
    }

    // Initialize remaining methods (placeholders for full implementation)
    createQuickActionToolbar() { /* Implementation */ }
    updateBulkActionToolbar() { /* Implementation */ }
    updateTaskSelectionUI() { /* Implementation */ }
    createSortControls() { /* Implementation */ }
    initializeTagFilter() { /* Implementation */ }
    initializeSmartFilters() { /* Implementation */ }
    initializeFilterPresets() { /* Implementation */ }
    showEmptyState() { /* Implementation */ }
    updateTaskCount() { /* Implementation */ }
    updateTaskOrder() { /* Implementation */ }
    isTaskInDateRange() { /* Implementation */ }
    cyclePriority() { /* Implementation */ }
    toggleTaskComplete() { /* Implementation */ }
    showTaskContextMenu() { /* Implementation */ }
}

export default EnhancedTaskComponent;