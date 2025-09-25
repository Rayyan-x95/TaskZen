import taskManager from '../utils/taskManager.js';
import DateUtils from '../utils/dateUtils.js';

class SmartAutomationComponent {
    constructor() {
        this.templates = new Map();
        this.aiSuggestions = [];
        this.automationRules = [];
        this.smartPatterns = new Map();
        this.initializeEventListeners();
        this.loadStoredData();
        this.startSmartAnalysis();
    }

    initializeEventListeners() {
        // Template management
        document.getElementById('createTemplate')?.addEventListener('click', () => {
            this.showCreateTemplateModal();
        });
        
        document.getElementById('useTemplate')?.addEventListener('click', () => {
            this.showTemplateSelector();
        });
        
        // Smart suggestions
        document.getElementById('viewSuggestions')?.addEventListener('click', () => {
            this.showSmartSuggestions();
        });
        
        document.getElementById('refreshSuggestions')?.addEventListener('click', () => {
            this.generateSmartSuggestions();
        });
        
        // Automation rules
        document.getElementById('manageAutomation')?.addEventListener('click', () => {
            this.showAutomationRules();
        });
        
        // Recurring tasks
        document.addEventListener('taskCreated', (e) => {
            this.handleNewTask(e.detail);
        });
        
        document.addEventListener('taskCompleted', (e) => {
            this.handleTaskCompletion(e.detail);
        });
        
        // AI-powered organization
        document.getElementById('organizeAI')?.addEventListener('click', () => {
            this.performAIOrganization();
        });
    }

    loadStoredData() {
        // Load templates
        const templates = JSON.parse(localStorage.getItem('taskTemplates') || '{}');
        this.templates = new Map(Object.entries(templates));
        
        // Load automation rules
        this.automationRules = JSON.parse(localStorage.getItem('automationRules') || '[]');
        
        // Load smart patterns
        const patterns = JSON.parse(localStorage.getItem('smartPatterns') || '{}');
        this.smartPatterns = new Map(Object.entries(patterns));
        
        this.renderTemplates();
        this.renderAutomationRules();
    }

    startSmartAnalysis() {
        // Analyze user patterns every hour
        setInterval(() => {
            this.analyzeUserPatterns();
            this.generateSmartSuggestions();
        }, 3600000); // 1 hour
        
        // Initial analysis
        setTimeout(() => {
            this.analyzeUserPatterns();
            this.generateSmartSuggestions();
        }, 5000); // 5 seconds after initialization
    }

    async analyzeUserPatterns() {
        try {
            const tasks = await taskManager.getAllTasks();
            const completedTasks = tasks.filter(t => t.completed);
            
            // Analyze completion patterns
            this.analyzeCompletionPatterns(completedTasks);
            
            // Analyze priority patterns
            this.analyzePriorityPatterns(tasks);
            
            // Analyze time patterns
            this.analyzeTimePatterns(completedTasks);
            
            // Analyze category patterns
            this.analyzeCategoryPatterns(tasks);
            
            // Save patterns
            this.savePatterns();
            
        } catch (error) {
            console.error('Error analyzing user patterns:', error);
        }
    }

    analyzeCompletionPatterns(completedTasks) {
        const patterns = {
            bestDays: this.findBestCompletionDays(completedTasks),
            bestTimes: this.findBestCompletionTimes(completedTasks),
            avgCompletionTime: this.calculateAverageCompletionTime(completedTasks),
            productivityCycles: this.identifyProductivityCycles(completedTasks)
        };
        
        this.smartPatterns.set('completion', patterns);
    }

    findBestCompletionDays(tasks) {
        const dayStats = {};
        
        tasks.forEach(task => {
            if (task.completedAt) {
                const day = new Date(task.completedAt).getDay();
                dayStats[day] = (dayStats[day] || 0) + 1;
            }
        });
        
        return Object.entries(dayStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([day, count]) => ({
                day: parseInt(day),
                dayName: DateUtils.getDayName(parseInt(day)),
                count
            }));
    }

    findBestCompletionTimes(tasks) {
        const hourStats = {};
        
        tasks.forEach(task => {
            if (task.completedAt) {
                const hour = new Date(task.completedAt).getHours();
                hourStats[hour] = (hourStats[hour] || 0) + 1;
            }
        });
        
        return Object.entries(hourStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                timeRange: `${hour}:00-${parseInt(hour) + 1}:00`,
                count
            }));
    }

    calculateAverageCompletionTime(tasks) {
        const completionTimes = tasks
            .filter(t => t.createdAt && t.completedAt)
            .map(t => new Date(t.completedAt) - new Date(t.createdAt));
        
        if (completionTimes.length === 0) return 0;
        
        const avgMs = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
        return Math.round(avgMs / (1000 * 60 * 60 * 24)); // Days
    }

    identifyProductivityCycles(tasks) {
        // Group tasks by week and identify patterns
        const weeklyData = {};
        
        tasks.forEach(task => {
            if (task.completedAt) {
                const weekNumber = DateUtils.getWeekNumber(new Date(task.completedAt));
                const year = new Date(task.completedAt).getFullYear();
                const key = `${year}-W${weekNumber}`;
                
                weeklyData[key] = (weeklyData[key] || 0) + 1;
            }
        });
        
        const values = Object.values(weeklyData);
        const avgWeekly = values.reduce((a, b) => a + b, 0) / values.length;
        
        return {
            averageWeeklyCompletions: Math.round(avgWeekly),
            peakWeeks: Object.entries(weeklyData)
                .filter(([, count]) => count > avgWeekly * 1.2)
                .length,
            lowWeeks: Object.entries(weeklyData)
                .filter(([, count]) => count < avgWeekly * 0.8)
                .length
        };
    }

    analyzePriorityPatterns(tasks) {
        const priorityStats = {
            urgent: { created: 0, completed: 0, avgTime: 0 },
            high: { created: 0, completed: 0, avgTime: 0 },
            medium: { created: 0, completed: 0, avgTime: 0 },
            low: { created: 0, completed: 0, avgTime: 0 }
        };
        
        tasks.forEach(task => {
            const priority = task.priority || 'medium';
            priorityStats[priority].created++;
            
            if (task.completed) {
                priorityStats[priority].completed++;
                
                if (task.createdAt && task.completedAt) {
                    const completionTime = new Date(task.completedAt) - new Date(task.createdAt);
                    priorityStats[priority].avgTime += completionTime;
                }
            }
        });
        
        // Calculate averages
        Object.keys(priorityStats).forEach(priority => {
            const stats = priorityStats[priority];
            if (stats.completed > 0) {
                stats.avgTime = Math.round(stats.avgTime / stats.completed / (1000 * 60 * 60 * 24)); // Days
                stats.completionRate = (stats.completed / stats.created * 100).toFixed(1);
            }
        });
        
        this.smartPatterns.set('priority', priorityStats);
    }

    analyzeTimePatterns(tasks) {
        const patterns = {
            dueDateAccuracy: this.calculateDueDateAccuracy(tasks),
            estimateAccuracy: this.calculateEstimateAccuracy(tasks),
            timeOfDayPreferences: this.findTimeOfDayPreferences(tasks)
        };
        
        this.smartPatterns.set('time', patterns);
    }

    calculateDueDateAccuracy(tasks) {
        const tasksWithDueDates = tasks.filter(t => t.dueDate && t.completedAt);
        if (tasksWithDueDates.length === 0) return 0;
        
        const onTime = tasksWithDueDates.filter(t => 
            new Date(t.completedAt) <= new Date(t.dueDate)
        ).length;
        
        return (onTime / tasksWithDueDates.length * 100).toFixed(1);
    }

    calculateEstimateAccuracy(tasks) {
        const tasksWithEstimates = tasks.filter(t => 
            t.estimatedTime && t.actualTime && t.completed
        );
        
        if (tasksWithEstimates.length === 0) return null;
        
        const accuracies = tasksWithEstimates.map(task => {
            const diff = Math.abs(task.estimatedTime - task.actualTime);
            return 1 - (diff / task.estimatedTime);
        });
        
        const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
        return (avgAccuracy * 100).toFixed(1);
    }

    findTimeOfDayPreferences(tasks) {
        const creationHours = {};
        const completionHours = {};
        
        tasks.forEach(task => {
            if (task.createdAt) {
                const hour = new Date(task.createdAt).getHours();
                creationHours[hour] = (creationHours[hour] || 0) + 1;
            }
            
            if (task.completedAt) {
                const hour = new Date(task.completedAt).getHours();
                completionHours[hour] = (completionHours[hour] || 0) + 1;
            }
        });
        
        return {
            preferredCreationHours: this.getTopHours(creationHours),
            preferredCompletionHours: this.getTopHours(completionHours)
        };
    }

    getTopHours(hourStats) {
        return Object.entries(hourStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                timeRange: `${hour}:00-${parseInt(hour) + 1}:00`,
                count
            }));
    }

    analyzeCategoryPatterns(tasks) {
        const categoryStats = {};
        
        tasks.forEach(task => {
            const category = task.category || 'Uncategorized';
            
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    total: 0,
                    completed: 0,
                    avgPriority: [],
                    avgCompletionTime: []
                };
            }
            
            categoryStats[category].total++;
            
            if (task.completed) {
                categoryStats[category].completed++;
                
                if (task.createdAt && task.completedAt) {
                    const time = new Date(task.completedAt) - new Date(task.createdAt);
                    categoryStats[category].avgCompletionTime.push(time);
                }
            }
            
            const priorityValue = { urgent: 4, high: 3, medium: 2, low: 1 }[task.priority] || 2;
            categoryStats[category].avgPriority.push(priorityValue);
        });
        
        // Calculate averages
        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            
            stats.completionRate = (stats.completed / stats.total * 100).toFixed(1);
            
            if (stats.avgCompletionTime.length > 0) {
                const avgTime = stats.avgCompletionTime.reduce((a, b) => a + b, 0) / stats.avgCompletionTime.length;
                stats.avgCompletionDays = Math.round(avgTime / (1000 * 60 * 60 * 24));
            }
            
            if (stats.avgPriority.length > 0) {
                const avgPriorityValue = stats.avgPriority.reduce((a, b) => a + b, 0) / stats.avgPriority.length;
                stats.avgPriorityLevel = Math.round(avgPriorityValue);
            }
        });
        
        this.smartPatterns.set('categories', categoryStats);
    }

    async generateSmartSuggestions() {
        const suggestions = [];
        
        // Pattern-based suggestions
        suggestions.push(...this.generatePatternSuggestions());
        
        // Overdue task suggestions
        suggestions.push(...await this.generateOverdueSuggestions());
        
        // Productivity optimization suggestions
        suggestions.push(...this.generateProductivitySuggestions());
        
        // Template suggestions
        suggestions.push(...this.generateTemplateSuggestions());
        
        // Priority suggestions
        suggestions.push(...this.generatePrioritySuggestions());
        
        this.aiSuggestions = suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10); // Top 10 suggestions
        
        this.renderSuggestions();
    }

    generatePatternSuggestions() {
        const suggestions = [];
        const completionPattern = this.smartPatterns.get('completion');
        
        if (completionPattern?.bestTimes?.length > 0) {
            const bestTime = completionPattern.bestTimes[0];
            suggestions.push({
                type: 'schedule',
                title: 'Optimize Your Schedule',
                description: `You're most productive at ${bestTime.timeRange}. Consider scheduling important tasks during this time.`,
                action: 'scheduleOptimal',
                confidence: 0.8,
                icon: '⏰'
            });
        }
        
        if (completionPattern?.bestDays?.length > 0) {
            const bestDay = completionPattern.bestDays[0];
            suggestions.push({
                type: 'planning',
                title: 'Plan for Peak Days',
                description: `You complete the most tasks on ${bestDay.dayName}. Plan important work for this day.`,
                action: 'planPeakDays',
                confidence: 0.7,
                icon: '📅'
            });
        }
        
        return suggestions;
    }

    async generateOverdueSuggestions() {
        const suggestions = [];
        const tasks = await taskManager.getAllTasks();
        const overdueTasks = tasks.filter(t => 
            !t.completed && t.dueDate && DateUtils.isOverdue(t.dueDate)
        );
        
        if (overdueTasks.length > 0) {
            suggestions.push({
                type: 'urgent',
                title: 'Address Overdue Tasks',
                description: `You have ${overdueTasks.length} overdue task(s). Consider breaking them into smaller tasks or adjusting priorities.`,
                action: 'reviewOverdue',
                confidence: 0.9,
                icon: '⚠️',
                data: overdueTasks
            });
        }
        
        // Suggest rescheduling if many tasks are overdue
        if (overdueTasks.length > 5) {
            suggestions.push({
                type: 'reschedule',
                title: 'Reschedule Overdue Tasks',
                description: 'Consider rescheduling some overdue tasks to more realistic dates.',
                action: 'bulkReschedule',
                confidence: 0.8,
                icon: '📆'
            });
        }
        
        return suggestions;
    }

    generateProductivitySuggestions() {
        const suggestions = [];
        const timePattern = this.smartPatterns.get('time');
        
        if (timePattern?.dueDateAccuracy && parseFloat(timePattern.dueDateAccuracy) < 70) {
            suggestions.push({
                type: 'improvement',
                title: 'Improve Due Date Planning',
                description: `Your due date accuracy is ${timePattern.dueDateAccuracy}%. Consider adding buffer time to your estimates.`,
                action: 'improvePlanning',
                confidence: 0.7,
                icon: '🎯'
            });
        }
        
        if (timePattern?.estimateAccuracy && parseFloat(timePattern.estimateAccuracy) < 60) {
            suggestions.push({
                type: 'improvement',
                title: 'Refine Time Estimates',
                description: `Your time estimate accuracy is ${timePattern.estimateAccuracy}%. Track actual time spent to improve estimates.`,
                action: 'improveEstimates',
                confidence: 0.6,
                icon: '⏱️'
            });
        }
        
        return suggestions;
    }

    generateTemplateSuggestions() {
        const suggestions = [];
        const categoryPattern = this.smartPatterns.get('categories');
        
        if (categoryPattern) {
            const frequentCategories = Object.entries(categoryPattern)
                .filter(([, stats]) => stats.total >= 5)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 3);
            
            frequentCategories.forEach(([category, stats]) => {
                suggestions.push({
                    type: 'template',
                    title: `Create ${category} Template`,
                    description: `You've created ${stats.total} tasks in the ${category} category. A template could save you time.`,
                    action: 'createTemplate',
                    confidence: 0.6,
                    icon: '📝',
                    data: { category, stats }
                });
            });
        }
        
        return suggestions;
    }

    generatePrioritySuggestions() {
        const suggestions = [];
        const priorityPattern = this.smartPatterns.get('priority');
        
        if (priorityPattern?.low?.completionRate && parseFloat(priorityPattern.low.completionRate) < 50) {
            suggestions.push({
                type: 'priority',
                title: 'Review Low Priority Tasks',
                description: `Low priority tasks have a ${priorityPattern.low.completionRate}% completion rate. Consider if they're still relevant.`,
                action: 'reviewLowPriority',
                confidence: 0.5,
                icon: '🔍'
            });
        }
        
        if (priorityPattern?.urgent?.avgTime > priorityPattern?.medium?.avgTime) {
            suggestions.push({
                type: 'priority',
                title: 'Urgent Task Planning',
                description: 'Urgent tasks are taking longer than expected. Consider better planning to avoid urgent situations.',
                action: 'improveUrgentPlanning',
                confidence: 0.7,
                icon: '🚨'
            });
        }
        
        return suggestions;
    }

    async createTemplate(name, description, tasks, category) {
        const template = {
            id: this.generateTemplateId(),
            name,
            description,
            category,
            tasks: tasks.map(task => ({
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'medium',
                estimatedTime: task.estimatedTime || 60,
                tags: task.tags || [],
                daysFromStart: task.daysFromStart || 0
            })),
            createdAt: new Date().toISOString(),
            usageCount: 0
        };
        
        this.templates.set(template.id, template);
        this.saveTemplates();
        this.renderTemplates();
        
        return template;
    }

    generateTemplateId() {
        return 'template_' + Math.random().toString(36).substr(2, 12);
    }

    async useTemplate(templateId, startDate = new Date()) {
        const template = this.templates.get(templateId);
        if (!template) return;
        
        const createdTasks = [];
        
        for (const taskTemplate of template.tasks) {
            const dueDate = DateUtils.addDays(startDate, taskTemplate.daysFromStart);
            
            const task = {
                title: taskTemplate.title,
                description: taskTemplate.description,
                priority: taskTemplate.priority,
                estimatedTime: taskTemplate.estimatedTime,
                tags: [...taskTemplate.tags],
                dueDate: dueDate.toISOString().split('T')[0],
                category: template.category,
                fromTemplate: templateId,
                createdAt: new Date().toISOString()
            };
            
            const createdTask = await taskManager.addTask(task);
            createdTasks.push(createdTask);
        }
        
        // Update template usage
        template.usageCount++;
        template.lastUsed = new Date().toISOString();
        this.saveTemplates();
        
        this.showNotification(`Created ${createdTasks.length} tasks from template "${template.name}"`, 'success');
        
        return createdTasks;
    }

    createAutomationRule(name, trigger, conditions, actions) {
        const rule = {
            id: this.generateRuleId(),
            name,
            trigger, // 'taskCreated', 'taskCompleted', 'dueDateReached', 'schedule'
            conditions: conditions || [],
            actions,
            enabled: true,
            createdAt: new Date().toISOString(),
            executionCount: 0
        };
        
        this.automationRules.push(rule);
        this.saveAutomationRules();
        this.renderAutomationRules();
        
        return rule;
    }

    generateRuleId() {
        return 'rule_' + Math.random().toString(36).substr(2, 12);
    }

    async handleNewTask(task) {
        const applicableRules = this.automationRules.filter(rule => 
            rule.enabled && rule.trigger === 'taskCreated'
        );
        
        for (const rule of applicableRules) {
            if (this.evaluateConditions(rule.conditions, task)) {
                await this.executeActions(rule.actions, task);
                rule.executionCount++;
            }
        }
        
        this.saveAutomationRules();
    }

    async handleTaskCompletion(task) {
        const applicableRules = this.automationRules.filter(rule => 
            rule.enabled && rule.trigger === 'taskCompleted'
        );
        
        for (const rule of applicableRules) {
            if (this.evaluateConditions(rule.conditions, task)) {
                await this.executeActions(rule.actions, task);
                rule.executionCount++;
            }
        }
        
        // Handle recurring tasks
        if (task.recurrence) {
            await this.createRecurringTask(task);
        }
        
        this.saveAutomationRules();
    }

    evaluateConditions(conditions, task) {
        return conditions.every(condition => {
            switch (condition.type) {
                case 'priority':
                    return task.priority === condition.value;
                case 'category':
                    return task.category === condition.value;
                case 'tag':
                    return task.tags && task.tags.includes(condition.value);
                case 'title_contains':
                    return task.title.toLowerCase().includes(condition.value.toLowerCase());
                default:
                    return true;
            }
        });
    }

    async executeActions(actions, task) {
        for (const action of actions) {
            switch (action.type) {
                case 'setPriority':
                    task.priority = action.value;
                    await taskManager.updateTask(task);
                    break;
                case 'addTag':
                    if (!task.tags) task.tags = [];
                    if (!task.tags.includes(action.value)) {
                        task.tags.push(action.value);
                        await taskManager.updateTask(task);
                    }
                    break;
                case 'setCategory':
                    task.category = action.value;
                    await taskManager.updateTask(task);
                    break;
                case 'createSubTask':
                    const subTask = {
                        title: action.value,
                        parentTaskId: task.id,
                        priority: task.priority,
                        category: task.category,
                        createdAt: new Date().toISOString()
                    };
                    await taskManager.addTask(subTask);
                    break;
                case 'notification':
                    this.showNotification(action.value.replace('{taskTitle}', task.title), 'info');
                    break;
            }
        }
    }

    async createRecurringTask(completedTask) {
        const { interval, unit } = DateUtils.parseRecurrence(completedTask.recurrence);
        const nextDueDate = DateUtils.getNextOccurrence(
            new Date(completedTask.dueDate || completedTask.createdAt), 
            completedTask.recurrence
        );
        
        const newTask = {
            ...completedTask,
            id: undefined, // Will get new ID
            completed: false,
            completedAt: null,
            dueDate: nextDueDate.toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            title: completedTask.title + ` (${new Date().toLocaleDateString()})`
        };
        
        delete newTask.completedAt;
        
        const createdTask = await taskManager.addTask(newTask);
        this.showNotification(
            `Recurring task "${createdTask.title}" created for ${nextDueDate.toLocaleDateString()}`, 
            'info'
        );
        
        return createdTask;
    }

    async performAIOrganization() {
        try {
            const tasks = await taskManager.getAllTasks();
            const incompleteTasks = tasks.filter(t => !t.completed);
            
            // AI-powered organization suggestions
            const organizationSuggestions = this.generateOrganizationSuggestions(incompleteTasks);
            
            this.showOrganizationModal(organizationSuggestions);
            
        } catch (error) {
            console.error('Error performing AI organization:', error);
            this.showNotification('Failed to analyze tasks for AI organization', 'error');
        }
    }

    generateOrganizationSuggestions(tasks) {
        const suggestions = [];
        
        // Priority reorganization
        const unpriorityTasks = tasks.filter(t => !t.priority || t.priority === 'medium');
        if (unpriorityTasks.length > 0) {
            suggestions.push({
                type: 'priority',
                title: 'Prioritize Tasks',
                description: `${unpriorityTasks.length} tasks need priority assignment based on due dates and content.`,
                tasks: unpriorityTasks.slice(0, 5),
                suggestedAction: 'auto-prioritize'
            });
        }
        
        // Category organization
        const uncategorizedTasks = tasks.filter(t => !t.category);
        if (uncategorizedTasks.length > 0) {
            suggestions.push({
                type: 'category',
                title: 'Categorize Tasks',
                description: `${uncategorizedTasks.length} tasks could be auto-categorized based on their content.`,
                tasks: uncategorizedTasks.slice(0, 5),
                suggestedAction: 'auto-categorize'
            });
        }
        
        // Due date suggestions
        const tasksWithoutDueDates = tasks.filter(t => !t.dueDate);
        if (tasksWithoutDueDates.length > 0) {
            suggestions.push({
                type: 'schedule',
                title: 'Add Due Dates',
                description: `${tasksWithoutDueDates.length} tasks could benefit from suggested due dates.`,
                tasks: tasksWithoutDueDates.slice(0, 5),
                suggestedAction: 'suggest-due-dates'
            });
        }
        
        return suggestions;
    }

    savePatterns() {
        const patterns = Object.fromEntries(this.smartPatterns);
        localStorage.setItem('smartPatterns', JSON.stringify(patterns));
    }

    saveTemplates() {
        const templates = Object.fromEntries(this.templates);
        localStorage.setItem('taskTemplates', JSON.stringify(templates));
    }

    saveAutomationRules() {
        localStorage.setItem('automationRules', JSON.stringify(this.automationRules));
    }

    renderTemplates() {
        const container = document.getElementById('templatesContainer');
        if (!container) return;
        
        const templateArray = Array.from(this.templates.values());
        
        container.innerHTML = `
            <div class="templates-grid">
                ${templateArray.map(template => `
                    <div class="template-card" data-template-id="${template.id}">
                        <div class="template-header">
                            <h4>${template.name}</h4>
                            <div class="template-meta">
                                <span>Used ${template.usageCount} times</span>
                                <span>${template.tasks.length} tasks</span>
                            </div>
                        </div>
                        <div class="template-description">
                            ${template.description}
                        </div>
                        <div class="template-actions">
                            <button class="btn primary use-template-btn" data-template-id="${template.id}">
                                Use Template
                            </button>
                            <button class="btn secondary edit-template-btn" data-template-id="${template.id}">
                                Edit
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners
        container.querySelectorAll('.use-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.useTemplate(btn.dataset.templateId);
            });
        });
    }

    renderSuggestions() {
        const container = document.getElementById('smartSuggestions');
        if (!container || this.aiSuggestions.length === 0) return;
        
        container.innerHTML = `
            <div class="suggestions-list">
                ${this.aiSuggestions.map(suggestion => `
                    <div class="suggestion-card ${suggestion.type}">
                        <div class="suggestion-icon">${suggestion.icon}</div>
                        <div class="suggestion-content">
                            <h4>${suggestion.title}</h4>
                            <p>${suggestion.description}</p>
                            <div class="suggestion-confidence">
                                Confidence: ${Math.round(suggestion.confidence * 100)}%
                            </div>
                        </div>
                        <div class="suggestion-actions">
                            <button class="btn primary apply-suggestion-btn" data-action="${suggestion.action}" data-suggestion='${JSON.stringify(suggestion)}'>
                                Apply
                            </button>
                            <button class="btn secondary dismiss-suggestion-btn">
                                Dismiss
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners
        container.querySelectorAll('.apply-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = JSON.parse(btn.dataset.suggestion);
                this.applySuggestion(suggestion);
            });
        });
        
        container.querySelectorAll('.dismiss-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.suggestion-card').remove();
            });
        });
    }

    renderAutomationRules() {
        const container = document.getElementById('automationRules');
        if (!container) return;
        
        container.innerHTML = `
            <div class="automation-rules-list">
                ${this.automationRules.map(rule => `
                    <div class="rule-card ${rule.enabled ? 'enabled' : 'disabled'}">
                        <div class="rule-header">
                            <h4>${rule.name}</h4>
                            <div class="rule-toggle">
                                <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-rule-id="${rule.id}">
                            </div>
                        </div>
                        <div class="rule-details">
                            <div class="rule-trigger">
                                <strong>Trigger:</strong> ${rule.trigger}
                            </div>
                            <div class="rule-stats">
                                Executed ${rule.executionCount} times
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async applySuggestion(suggestion) {
        try {
            switch (suggestion.action) {
                case 'scheduleOptimal':
                    this.showOptimalScheduleDialog();
                    break;
                case 'reviewOverdue':
                    this.showOverdueTasksDialog(suggestion.data);
                    break;
                case 'createTemplate':
                    this.showCreateTemplateModal(suggestion.data);
                    break;
                default:
                    this.showNotification('Suggestion applied!', 'success');
            }
        } catch (error) {
            console.error('Error applying suggestion:', error);
            this.showNotification('Failed to apply suggestion', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

export default SmartAutomationComponent;