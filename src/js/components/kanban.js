import taskManager from '../utils/taskManager.js';
import notifications from '../utils/notifications.js';

class KanbanComponent {
    constructor() {
        this.columns = {
            todo: document.querySelector('.kanban-column[data-status="todo"] .kanban-tasks'),
            'in-progress': document.querySelector('.kanban-column[data-status="in-progress"] .kanban-tasks'),
            done: document.querySelector('.kanban-column[data-status="done"] .kanban-tasks')
        };

        this.initializeDragAndDrop();
    }

    initializeDragAndDrop() {
        // Make all kanban columns droppable
        Object.values(this.columns).forEach(column => {
            column.addEventListener('dragover', e => this.handleDragOver(e));
            column.addEventListener('drop', e => this.handleDrop(e));
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const column = e.target.closest('.kanban-column');
        if (column) {
            column.classList.add('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        
        const column = e.target.closest('.kanban-column');
        if (!column) return;

        column.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;

        await this.updateTaskStatus(parseInt(taskId), newStatus);
    }

    async updateTaskStatus(taskId, newStatus) {
        try {
            const task = await taskManager.getTask(taskId);
            if (!task) return;

            task.state = newStatus;
            if (newStatus === 'done') {
                task.complete();
            } else if (task.completed) {
                task.reopen();
            }

            await taskManager.updateTask(task);
            await this.render();

            // Notify if task is completed
            if (newStatus === 'done') {
                notifications.sendNotification('Task Completed! 🎉', {
                    body: `Great job completing "${task.title}"!`
                });
            }
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    }

    async render() {
        try {
            // Get tasks by status
            const todoTasks = await taskManager.getTasksByStatus('todo');
            const inProgressTasks = await taskManager.getTasksByStatus('in-progress');
            const doneTasks = await taskManager.getTasksByStatus('done');

            // Clear all columns
            Object.values(this.columns).forEach(column => column.innerHTML = '');

            // Sort function for tasks
            const sortTasks = (tasks) => {
                return tasks.sort((a, b) => {
                    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
                    if (a.priority !== b.priority) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            };

            // Render tasks in each column
            sortTasks(todoTasks).forEach(task => {
                this.columns.todo.appendChild(this.createTaskElement(task));
            });

            sortTasks(inProgressTasks).forEach(task => {
                this.columns['in-progress'].appendChild(this.createTaskElement(task));
            });

            sortTasks(doneTasks).forEach(task => {
                this.columns.done.appendChild(this.createTaskElement(task));
            });

        } catch (error) {
            console.error('Error rendering Kanban board:', error);
        }
    }

    createTaskElement(task) {
        const element = document.createElement('div');
        element.className = `kanban-task priority-${task.priority}`;
        element.draggable = true;
        element.dataset.taskId = task.id;

        element.innerHTML = `
            <div class="task-header">
                <h4>${task.title}</h4>
                <span class="priority-badge">${task.priority}</span>
            </div>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            ${task.dueDate ? `
                <div class="task-due-date">
                    <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
            ` : ''}
            ${task.subtasks ? `
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${this.calculateProgress(task)}%"></div>
                    </div>
                    <span>${this.getCompletedSubtasks(task)}/${task.subtasks.length}</span>
                </div>
            ` : ''}
        `;

        // Add drag and drop event listeners
        element.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', task.id);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });

        // Add click handler to edit task
        element.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('editTask', { detail: task.id }));
        });

        return element;
    }

    calculateProgress(task) {
        if (!task.subtasks || task.subtasks.length === 0) return 0;
        return (this.getCompletedSubtasks(task) / task.subtasks.length) * 100;
    }

    getCompletedSubtasks(task) {
        if (!task.subtasks) return 0;
        return task.subtasks.filter(subtask => subtask.completed).length;
    }
}

export default KanbanComponent;