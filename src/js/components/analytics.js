import taskManager from '../utils/taskManager.js';
import DateUtils from '../utils/dateUtils.js';

class AnalyticsComponent {
    constructor() {
        this.selectedPeriod = '30';
        this.chartInstances = {};
        this.initializeEventListeners();
        this.initializeCharts();
    }
    
    initializeEventListeners() {
        // Period selection
        document.getElementById('analyticsPeriod')?.addEventListener('change', (e) => {
            this.selectedPeriod = e.target.value;
            this.render();
        });
        
        // Analytics refresh
        document.getElementById('refreshAnalytics')?.addEventListener('click', () => {
            this.render();
        });
        
        // Export data
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportAnalytics();
        });
    }

    async initializeCharts() {
        await this.renderCompletionChart();
        await this.renderPriorityChart();
        await this.renderHeatmap();
    }

    async renderCompletionChart() {
        const tasks = await taskManager.getAllTasks();
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const inProgressTasks = tasks.filter(task => task.state === 'in-progress').length;
        const todoTasks = totalTasks - completedTasks - inProgressTasks;

        const ctx = document.getElementById('completionChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'To Do'],
                datasets: [{
                    data: [completedTasks, inProgressTasks, todoTasks],
                    backgroundColor: [
                        'var(--success-color)',
                        'var(--warning-color)',
                        'var(--primary-color)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async renderPriorityChart() {
        const tasks = await taskManager.getAllTasks();
        const priorities = {
            urgent: tasks.filter(task => task.priority === 'urgent').length,
            high: tasks.filter(task => task.priority === 'high').length,
            medium: tasks.filter(task => task.priority === 'medium').length,
            low: tasks.filter(task => task.priority === 'low').length
        };

        const ctx = document.getElementById('priorityChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Urgent', 'High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Tasks by Priority',
                    data: [priorities.urgent, priorities.high, priorities.medium, priorities.low],
                    backgroundColor: [
                        'var(--danger-color)',
                        'var(--warning-color)',
                        'var(--primary-color)',
                        'var(--success-color)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    async renderHeatmap() {
        const tasks = await taskManager.getAllTasks();
        const heatmapContainer = document.getElementById('heatmap');
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 364); // Get data for the last year

        // Create date-based activity map
        const activityMap = new Map();
        tasks.forEach(task => {
            if (task.completed) {
                const date = new Date(task.completed).toISOString().split('T')[0];
                activityMap.set(date, (activityMap.get(date) || 0) + 1);
            }
        });

        // Generate heatmap cells
        heatmapContainer.innerHTML = '';
        const weeksInYear = 52;
        const daysInWeek = 7;

        const heatmapGrid = document.createElement('div');
        heatmapGrid.className = 'heatmap-grid';

        // Add day labels
        const dayLabels = document.createElement('div');
        dayLabels.className = 'day-labels';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = day;
            dayLabels.appendChild(label);
        });
        heatmapContainer.appendChild(dayLabels);

        // Create cells for each day
        for (let week = 0; week < weeksInYear; week++) {
            const weekElement = document.createElement('div');
            weekElement.className = 'heatmap-week';

            for (let day = 0; day < daysInWeek; day++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + (week * 7) + day);
                const dateString = date.toISOString().split('T')[0];
                const count = activityMap.get(dateString) || 0;

                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                cell.dataset.date = dateString;
                cell.dataset.count = count;
                cell.title = `${dateString}: ${count} tasks completed`;

                // Add intensity class based on count
                if (count > 0) {
                    const intensity = Math.min(Math.ceil(count / 3), 4);
                    cell.classList.add(`intensity-${intensity}`);
                }

                weekElement.appendChild(cell);
            }

            heatmapGrid.appendChild(weekElement);
        }

        heatmapContainer.appendChild(heatmapGrid);
    }

    async updateCharts() {
        await this.renderCompletionChart();
        await this.renderPriorityChart();
        await this.renderHeatmap();
    }
}

export default AnalyticsComponent;