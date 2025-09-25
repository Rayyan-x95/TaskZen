class Task {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';
        this.priority = data.priority || 'medium';
        this.status = data.status || 'todo';
        this.dueDate = data.dueDate || null;
        this.categories = data.categories || [];
        this.tags = data.tags || [];
        this.subtasks = data.subtasks || [];
        this.notes = data.notes || [];
        this.attachments = data.attachments || [];
        this.recurring = data.recurring || null;
        this.created = data.created || new Date().toISOString();
        this.modified = data.modified || new Date().toISOString();
        this.completed = data.completed || null;
    }

    addSubtask(title) {
        this.subtasks.push({
            id: Date.now(),
            title,
            completed: false,
            created: new Date().toISOString()
        });
        this.modified = new Date().toISOString();
    }

    toggleSubtask(subtaskId) {
        const subtask = this.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            this.modified = new Date().toISOString();
        }
    }

    addNote(content) {
        this.notes.push({
            id: Date.now(),
            content,
            created: new Date().toISOString()
        });
        this.modified = new Date().toISOString();
    }

    addAttachment(name, type, content) {
        this.attachments.push({
            id: Date.now(),
            name,
            type,
            content,
            created: new Date().toISOString()
        });
        this.modified = new Date().toISOString();
    }

    setRecurring(pattern) {
        this.recurring = {
            pattern,
            createdFrom: this.id,
            lastGenerated: new Date().toISOString()
        };
        this.modified = new Date().toISOString();
    }

    complete() {
        this.status = 'done';
        this.completed = new Date().toISOString();
        this.modified = new Date().toISOString();
    }

    reopen() {
        this.status = 'todo';
        this.completed = null;
        this.modified = new Date().toISOString();
    }

    addCategory(categoryId) {
        if (!this.categories.includes(categoryId)) {
            this.categories.push(categoryId);
            this.modified = new Date().toISOString();
        }
    }

    removeCategory(categoryId) {
        const index = this.categories.indexOf(categoryId);
        if (index !== -1) {
            this.categories.splice(index, 1);
            this.modified = new Date().toISOString();
        }
    }

    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            this.modified = new Date().toISOString();
        }
    }

    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index !== -1) {
            this.tags.splice(index, 1);
            this.modified = new Date().toISOString();
        }
    }

    updatePriority(priority) {
        this.priority = priority;
        this.modified = new Date().toISOString();
    }

    updateDueDate(dueDate) {
        this.dueDate = dueDate;
        this.modified = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            priority: this.priority,
            status: this.status,
            dueDate: this.dueDate,
            categories: this.categories,
            tags: this.tags,
            subtasks: this.subtasks,
            notes: this.notes,
            attachments: this.attachments,
            recurring: this.recurring,
            created: this.created,
            modified: this.modified,
            completed: this.completed
        };
    }

    static fromJSON(json) {
        return new Task(json);
    }
}

export default Task;