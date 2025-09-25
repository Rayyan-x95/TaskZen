import taskManager from '../utils/taskManager.js';
import notifications from '../utils/notifications.js';
import DateUtils from '../utils/dateUtils.js';

class TaskComponent {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Task form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

        // Task list events
        document.getElementById('taskList').addEventListener('click', (e) => this.handleTaskAction(e));

        // Task filters
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('searchTasks').addEventListener('input', () => this.filterTasks());

        // Add task button
        document.getElementById('addTask').addEventListener('click', () => this.showTaskModal());

        // Subtask events
        document.getElementById('addSubtask').addEventListener('click', () => this.addSubtaskField());
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const taskId = form.dataset.taskId;

        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: 'todo',
            subtasks: this.getSubtasks(),
            categories: Array.from(document.getElementById('taskCategories').selectedOptions).map(opt => opt.value),
            tags: document.getElementById('taskTags').value.split(',').map(tag => tag.trim()).filter(Boolean)
        };

        if (taskId) {
            taskData.id = parseInt(taskId);
            await taskManager.updateTask(taskData);
        } else {
            await taskManager.createTask(taskData);
        }

        this.closeTaskModal();
        this.renderTasks();
    }

    async handleTaskAction(e) {
        const action = e.target.dataset.action;
        const taskId = parseInt(e.target.closest('.task-card').dataset.taskId);

        if (!action || !taskId) return;

        const task = await taskManager.getTask(taskId);
        if (!task) return;

        switch (action) {
            case 'edit':
                await this.editTask(taskId);
                break;
            case 'delete':
                await this.deleteTask(taskId);
                break;
            case 'complete':
                task.complete();
                await taskManager.updateTask(task);
                this.renderTasks();
                break;
            case 'reopen':
                task.reopen();
                await taskManager.updateTask(task);
                this.renderTasks();
                break;
            case 'subtask':
                task.toggleSubtask(parseInt(e.target.dataset.subtaskId));
                await taskManager.updateTask(task);
                this.renderTasks();
                break;
            case 'addNote':
                const note = prompt('Enter a note:');
                if (note) {
                    task.addNote(note);
                    await taskManager.updateTask(task);
                    this.renderTasks();
                }
                break;
        }
    }

    async editTask(taskId) {
        const task = await taskManager.getTask(taskId);
        if (!task) return;

        const form = document.getElementById('taskForm');
        form.dataset.taskId = taskId;

        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate;

        // Set categories
        const categorySelect = document.getElementById('taskCategories');
        task.categories.forEach(catId => {
            const option = categorySelect.querySelector(`option[value="${catId}"]`);
            if (option) option.selected = true;
        });

        // Set tags
        document.getElementById('taskTags').value = task.tags.join(', ');

        this.renderSubtaskFields(task.subtasks || []);
        this.renderNotes(task.notes || []);
        this.showTaskModal();
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            await taskManager.deleteTask(taskId);
            this.renderTasks();
        }
    }

    async toggleTaskCompletion(taskId) {
        const task = await taskManager.getTask(taskId);
        if (!task) return;

        task.completed = !task.completed;
        task.lastModified = new Date().toISOString();
        if (task.completed) {
            task.completedDate = new Date().toISOString();
        } else {
            task.completedDate = null;
        }

        await taskManager.updateTask(task);
        this.renderTasks();

        if (task.completed) {
            notifications.sendNotification('Task Completed! 🎉', {
                body: `Great job completing "${task.title}"!`
            });
        }
    }

    async toggleSubtask(taskId, subtaskId) {
        const task = await storage.getItem('tasks', taskId);
        if (!task || !task.subtasks) return;

        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            task.lastModified = new Date().toISOString();
            await storage.updateItem('tasks', task);
            this.renderTasks();
        }
    }

    async filterTasks() {
        const priority = document.getElementById('priorityFilter').value;
        const categoryId = document.getElementById('categoryFilter').value;
        const search = document.getElementById('searchTasks').value.toLowerCase();
        const tag = document.getElementById('tagFilter').value;

        let tasks = [];

        if (priority) {
            tasks = await taskManager.getTasksByPriority(priority);
        } else if (categoryId) {
            tasks = await taskManager.getTasksByCategory(categoryId);
        } else if (tag) {
            tasks = await taskManager.getTasksByTag(tag);
        } else if (search) {
            tasks = await taskManager.searchTasks(search);
        } else {
            tasks = await taskManager.getAllTasks();
        }

        this.renderTaskList(tasks);
    }

    getSubtasks() {
        const subtasksList = document.getElementById('subtasksList');
        const subtasks = [];
        let id = 1;

        subtasksList.querySelectorAll('.subtask-item').forEach(item => {
            const input = item.querySelector('input[type="text"]');
            if (input && input.value.trim()) {
                subtasks.push({
                    id: id++,
                    title: input.value.trim(),
                    completed: false
                });
            }
        });

        return subtasks;
    }

    addSubtaskField() {
        const subtasksList = document.getElementById('subtasksList');
        const div = document.createElement('div');
        div.className = 'subtask-item';
        div.innerHTML = `
            <input type="text" placeholder="Subtask">
            <button type="button" class="btn secondary" onclick="this.parentElement.remove()">×</button>
        `;
        subtasksList.appendChild(div);
    }

    renderSubtaskFields(subtasks) {
        const subtasksList = document.getElementById('subtasksList');
        subtasksList.innerHTML = '';

        subtasks.forEach(subtask => {
            const div = document.createElement('div');
            div.className = 'subtask-item';
            div.innerHTML = `
                <input type="text" placeholder="Subtask" value="${subtask.title}">
                <button type="button" class="btn secondary" onclick="this.parentElement.remove()">×</button>
            `;
            subtasksList.appendChild(div);
        });
    }

    showTaskModal() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskForm').removeAttribute('data-task-id');
        document.getElementById('subtasksList').innerHTML = '';
        document.getElementById('taskModal').classList.add('active');
    }

    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
    }

    async renderTasks() {
        const tasks = await taskManager.getAllTasks();
        this.renderTaskList(tasks);
    }

    renderTaskList(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        tasks.sort((a, b) => {
            // Sort by status (incomplete first)
            if (a.status !== b.status) {
                return a.status === 'done' ? 1 : -1;
            }
            // Then by due date
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            card.dataset.taskId = task.id;
            card.dataset.priority = task.priority;

            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const dueDateText = dueDate ? DateUtils.formatDate(dueDate) : 'No due date';
            const isOverdue = dueDate && DateUtils.isOverdue(dueDate);

            card.innerHTML = `
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <div class="task-priority ${task.priority}">${task.priority}</div>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">${dueDateText}</span>
                    <div class="task-actions">
                        <button class="btn secondary" data-action="edit">Edit</button>
                        <button class="btn ${task.completed ? 'success' : 'primary'}" data-action="complete">
                            ${task.completed ? 'Completed' : 'Complete'}
                        </button>
                        <button class="btn danger" data-action="delete">Delete</button>
                    </div>
                </div>
            `;

            if (task.subtasks && task.subtasks.length > 0) {
                const subtasksList = document.createElement('div');
                subtasksList.className = 'subtasks-list';
                task.subtasks.forEach(subtask => {
                    const subtaskElement = document.createElement('div');
                    subtaskElement.className = 'subtask';
                    subtaskElement.innerHTML = `
                        <input type="checkbox" 
                               ${subtask.completed ? 'checked' : ''} 
                               data-action="subtask" 
                               data-subtask-id="${subtask.id}">
                        <span>${subtask.title}</span>
                    `;
                    subtasksList.appendChild(subtaskElement);
                });
                card.appendChild(subtasksList);
            }

            taskList.appendChild(card);
        });
    }
}

export default TaskComponent;