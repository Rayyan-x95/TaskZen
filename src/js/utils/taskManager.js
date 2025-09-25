import Task from '../models/Task.js';
import Category from '../models/Category.js';
import storage from '../utils/storage.js';
import notifications from '../utils/notifications.js';
import DateUtils from '../utils/dateUtils.js';

class TaskManager {
    constructor() {
        this.initializeRecurringTasks();
    }

    // Core Task Operations
    async createTask(taskData) {
        const task = new Task(taskData);
        const id = await storage.addItem('tasks', task.toJSON());
        task.id = id;

        // Set up reminders if due date is provided
        if (task.dueDate) {
            this.scheduleReminder(task);
        }

        // Create next occurrence if task is recurring
        if (task.recurring) {
            this.scheduleNextRecurrence(task);
        }

        return task;
    }

    async getTask(taskId) {
        const taskData = await storage.getItem('tasks', taskId);
        return taskData ? Task.fromJSON(taskData) : null;
    }

    async updateTask(taskData) {
        const task = new Task(taskData);
        await storage.updateItem('tasks', task.toJSON());

        // Update reminders
        if (task.dueDate) {
            this.scheduleReminder(task);
        }

        return task;
    }

    async deleteTask(taskId) {
        await storage.deleteItem('tasks', taskId);
    }

    // Category Operations
    async createCategory(categoryData) {
        const category = new Category(categoryData);
        const id = await storage.addItem('categories', category.toJSON());
        category.id = id;
        return category;
    }

    async getCategory(categoryId) {
        const categoryData = await storage.getItem('categories', categoryId);
        return categoryData ? Category.fromJSON(categoryData) : null;
    }

    async updateCategory(categoryData) {
        const category = new Category(categoryData);
        await storage.updateItem('categories', category.toJSON());
        return category;
    }

    async deleteCategory(categoryId) {
        // Remove category from all tasks first
        const tasks = await this.getTasksByCategory(categoryId);
        for (const task of tasks) {
            task.removeCategory(categoryId);
            await this.updateTask(task.toJSON());
        }

        await storage.deleteItem('categories', categoryId);
    }

    // Query Operations
    async getAllTasks() {
        const tasksData = await storage.getAllItems('tasks');
        return tasksData.map(data => Task.fromJSON(data));
    }

    async getAllCategories() {
        const categoriesData = await storage.getAllItems('categories');
        return categoriesData.map(data => Category.fromJSON(data));
    }

    async getTasksByCategory(categoryId) {
        const tasks = await this.getAllTasks();
        return tasks.filter(task => task.categories.includes(categoryId));
    }

    async getTasksByTag(tag) {
        const tasks = await this.getAllTasks();
        return tasks.filter(task => task.tags.includes(tag));
    }

    async getTasksByStatus(status) {
        const tasks = await this.getAllTasks();
        return tasks.filter(task => task.state === status);
    }

    async getTasksByPriority(priority) {
        const tasks = await this.getAllTasks();
        return tasks.filter(task => task.priority === priority);
    }

    async getTasksByDueDate(startDate, endDate) {
        const tasks = await this.getAllTasks();
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= startDate && dueDate <= endDate;
        });
    }

    async searchTasks(query) {
        const tasks = await this.getAllTasks();
        const searchText = query.toLowerCase();
        
        return tasks.filter(task => 
            task.title.toLowerCase().includes(searchText) ||
            task.description.toLowerCase().includes(searchText) ||
            task.tags.some(tag => tag.toLowerCase().includes(searchText)) ||
            task.notes.some(note => note.content.toLowerCase().includes(searchText))
        );
    }

    // Recurring Tasks
    async initializeRecurringTasks() {
        setInterval(async () => {
            const tasks = await this.getAllTasks();
            for (const task of tasks) {
                if (task.recurring && task.completed) {
                    await this.generateNextRecurrence(task);
                }
            }
        }, 3600000); // Check every hour
    }

    async generateNextRecurrence(task) {
        const { pattern } = task.recurring;
        const lastDate = new Date(task.recurring.lastGenerated);
        const nextDate = DateUtils.getNextOccurrence(lastDate, pattern);

        if (nextDate <= new Date()) {
            const newTaskData = {
                ...task.toJSON(),
                id: null,
                status: 'todo',
                dueDate: nextDate.toISOString(),
                completed: null,
                recurring: {
                    ...task.recurring,
                    lastGenerated: new Date().toISOString()
                }
            };

            await this.createTask(newTaskData);
            
            // Update the original task's last generated date
            task.recurring.lastGenerated = new Date().toISOString();
            await this.updateTask(task.toJSON());
        }
    }

    // Reminders
    scheduleReminder(task) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        
        // Schedule reminders at different intervals
        const reminderTimes = [
            { time: 24 * 60 * 60 * 1000, message: '24 hours' }, // 1 day before
            { time: 60 * 60 * 1000, message: '1 hour' }, // 1 hour before
            { time: 15 * 60 * 1000, message: '15 minutes' } // 15 minutes before
        ];

        reminderTimes.forEach(({ time, message }) => {
            const reminderDate = new Date(dueDate.getTime() - time);
            if (reminderDate > now) {
                const delay = reminderDate.getTime() - now.getTime();
                setTimeout(() => {
                    notifications.sendTaskReminder({
                        ...task,
                        reminderMessage: `Due in ${message}`
                    });
                }, delay);
            }
        });
    }

    // Export/Import
    async exportTasks(format = 'json') {
        const tasks = await this.getAllTasks();
        const categories = await this.getAllCategories();
        
        const data = {
            tasks: tasks.map(task => task.toJSON()),
            categories: categories.map(category => category.toJSON()),
            metadata: {
                exported: new Date().toISOString(),
                version: '1.0'
            }
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertTasksToCSV(tasks);
            default:
                throw new Error('Unsupported export format');
        }
    }

    async importTasks(data, format = 'json') {
        try {
            switch (format.toLowerCase()) {
                case 'json':
                    const parsed = JSON.parse(data);
                    
                    // Import categories first
                    for (const categoryData of parsed.categories) {
                        await this.createCategory(categoryData);
                    }

                    // Then import tasks
                    for (const taskData of parsed.tasks) {
                        await this.createTask(taskData);
                    }
                    break;

                case 'csv':
                    const tasks = this.convertCSVToTasks(data);
                    for (const taskData of tasks) {
                        await this.createTask(taskData);
                    }
                    break;

                default:
                    throw new Error('Unsupported import format');
            }

            return true;
        } catch (error) {
            console.error('Error importing tasks:', error);
            return false;
        }
    }

    convertTasksToCSV(tasks) {
        const headers = ['Title', 'Description', 'Priority', 'Status', 'Due Date', 'Categories', 'Tags'];
        const rows = tasks.map(task => [
            task.title,
            task.description,
            task.priority,
            task.state,
            task.dueDate || '',
            task.categories.join(';'),
            task.tags.join(';')
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    convertCSVToTasks(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => header.replace(/"/g, ''));
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.replace(/"/g, ''));
            const task = new Task();

            headers.forEach((header, index) => {
                switch (header.toLowerCase()) {
                    case 'title':
                        task.title = values[index];
                        break;
                    case 'description':
                        task.description = values[index];
                        break;
                    case 'priority':
                        task.priority = values[index];
                        break;
                    case 'status':
                        task.state = values[index];
                        break;
                    case 'due date':
                        task.dueDate = values[index];
                        break;
                    case 'categories':
                        task.categories = values[index].split(';').filter(Boolean);
                        break;
                    case 'tags':
                        task.tags = values[index].split(';').filter(Boolean);
                        break;
                }
            });

            return task.toJSON();
        });
    }
}

// Create and export a single instance
const taskManager = new TaskManager();
export default taskManager;