import DateUtils from '../utils/dateUtils.js';
import taskManager from '../utils/taskManager.js';

class CalendarComponent {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.viewMode = 'month'; // month, week, day
        this.draggedTask = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.initializeEventListeners();
        this.setupTouchGestures();
        this.render();
    }

    initializeEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', () => this.previousPeriod());
        document.getElementById('nextMonth')?.addEventListener('click', () => this.nextPeriod());
        document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());
        
        // View mode toggles
        document.getElementById('monthView')?.addEventListener('click', () => this.setViewMode('month'));
        document.getElementById('weekView')?.addEventListener('click', () => this.setViewMode('week'));
        document.getElementById('dayView')?.addEventListener('click', () => this.setViewMode('day'));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        
        // Window resize
        window.addEventListener('resize', () => this.debounce(() => this.render(), 300));
    }
    
    setupTouchGestures() {
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return;
        
        calendarGrid.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        calendarGrid.addEventListener('touchend', (e) => {
            if (!e.changedTouches[0]) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = this.touchStartX - touchEndX;
            const diffY = this.touchStartY - touchEndY;
            
            // Horizontal swipe threshold
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 100) {
                if (diffX > 0) {
                    this.nextPeriod(); // Swipe left - next
                } else {
                    this.previousPeriod(); // Swipe right - previous
                }
            }
        }, { passive: true });
    }

    previousPeriod() {
        switch (this.viewMode) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
        }
        this.render();
    }

    nextPeriod() {
        switch (this.viewMode) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
        }
        this.render();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.render();
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}View`)?.classList.add('active');
        this.render();
    }
    
    handleKeyboardNavigation(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousPeriod();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextPeriod();
                break;
            case 'Home':
                e.preventDefault();
                this.goToToday();
                break;
            case 'm':
                e.preventDefault();
                this.setViewMode('month');
                break;
            case 'w':
                e.preventDefault();
                this.setViewMode('week');
                break;
            case 'd':
                e.preventDefault();
                this.setViewMode('day');
                break;
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async render() {
        switch (this.viewMode) {
            case 'month':
                await this.renderMonthView();
                break;
            case 'week':
                await this.renderWeekView();
                break;
            case 'day':
                await this.renderDayView();
                break;
        }
        this.updatePeriodDisplay();
    }
    
    updatePeriodDisplay() {
        const currentPeriodEl = document.getElementById('currentMonth');
        if (!currentPeriodEl) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        switch (this.viewMode) {
            case 'month':
                currentPeriodEl.textContent = 
                    `${this.currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
                break;
            case 'week':
                const weekStart = DateUtils.getWeekStart(this.currentDate);
                const weekEnd = DateUtils.getWeekEnd(this.currentDate);
                currentPeriodEl.textContent = 
                    `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                break;
            case 'day':
                currentPeriodEl.textContent = this.currentDate.toLocaleDateString('default', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                break;
        }
    }
    
    async renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = DateUtils.getMonthDays(year, month);
        const firstDay = DateUtils.getMonthFirstDay(year, month);

        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';
        calendarGrid.className = 'calendar-grid month-view';

        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Add blank spaces for days before the first of the month
        for (let i = 0; i < firstDay; i++) {
            const blankDay = document.createElement('div');
            blankDay.className = 'calendar-day empty';
            calendarGrid.appendChild(blankDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const date = new Date(year, month, day);
            const isToday = DateUtils.isToday(date);
            
            if (isToday) {
                dayElement.classList.add('today');
            }

            dayElement.innerHTML = `
                <span class="day-number">${day}</span>
                <div class="day-content"></div>
            `;

            // Add tasks for this day
            const tasks = await this.getTasksForDate(date);
            const dayContent = dayElement.querySelector('.day-content');
            
            tasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = `calendar-task priority-${task.priority}`;
                taskElement.textContent = task.title;
                taskElement.title = task.title;
                taskElement.dataset.taskId = task.id;
                dayContent.appendChild(taskElement);
            });

            dayElement.addEventListener('click', () => this.handleDayClick(date));
            this.setupDragAndDrop(dayElement, date);
            calendarGrid.appendChild(dayElement);
        }
    }
    
    async renderWeekView() {
        const weekStart = DateUtils.getWeekStart(this.currentDate);
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';
        calendarGrid.className = 'calendar-grid week-view';
        
        // Create time slots
        const timeSlots = this.generateTimeSlots();
        const days = [];
        
        // Generate week days
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date);
        }
        
        // Header row with days
        const headerRow = document.createElement('div');
        headerRow.className = 'week-header';
        
        const timeHeaderCell = document.createElement('div');
        timeHeaderCell.className = 'time-header-cell';
        headerRow.appendChild(timeHeaderCell);
        
        days.forEach(date => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'week-day-header';
            dayHeader.innerHTML = `
                <div class="day-name">${date.toLocaleDateString('default', { weekday: 'short' })}</div>
                <div class="day-number ${DateUtils.isToday(date) ? 'today' : ''}">${date.getDate()}</div>
            `;
            headerRow.appendChild(dayHeader);
        });
        
        calendarGrid.appendChild(headerRow);
        
        // Time slots with tasks
        for (const timeSlot of timeSlots) {
            const slotRow = document.createElement('div');
            slotRow.className = 'time-slot-row';
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = timeSlot;
            slotRow.appendChild(timeLabel);
            
            for (const date of days) {
                const slotCell = document.createElement('div');
                slotCell.className = 'time-slot-cell';
                slotCell.dataset.date = date.toISOString().split('T')[0];
                slotCell.dataset.time = timeSlot;
                
                // Add tasks for this time slot
                const tasks = await this.getTasksForTimeSlot(date, timeSlot);
                tasks.forEach(task => {
                    const taskElement = this.createTaskElement(task);
                    slotCell.appendChild(taskElement);
                });
                
                slotCell.addEventListener('click', () => this.handleTimeSlotClick(date, timeSlot));
                this.setupDragAndDrop(slotCell, date);
                slotRow.appendChild(slotCell);
            }
            
            calendarGrid.appendChild(slotRow);
        }
    }
    
    async renderDayView() {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';
        calendarGrid.className = 'calendar-grid day-view';
        
        const timeSlots = this.generateTimeSlots();
        const tasks = await this.getTasksForDate(this.currentDate);
        
        timeSlots.forEach(timeSlot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'day-time-slot';
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = timeSlot;
            
            const slotContent = document.createElement('div');
            slotContent.className = 'time-slot-content';
            slotContent.dataset.date = this.currentDate.toISOString().split('T')[0];
            slotContent.dataset.time = timeSlot;
            
            // Add tasks for this time slot
            const slotTasks = tasks.filter(task => {
                const taskTime = task.dueTime || '09:00';
                return taskTime.startsWith(timeSlot.split(':')[0]);
            });
            
            slotTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                slotContent.appendChild(taskElement);
            });
            
            slotElement.appendChild(timeLabel);
            slotElement.appendChild(slotContent);
            
            slotContent.addEventListener('click', () => this.handleTimeSlotClick(this.currentDate, timeSlot));
            this.setupDragAndDrop(slotContent, this.currentDate);
            calendarGrid.appendChild(slotElement);
        });
    }
    
    generateTimeSlots() {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }
    
    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `calendar-task priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="task-time">${task.dueTime || ''}</div>
            <div class="task-title">${task.title}</div>
            <div class="task-progress">${task.progress || 0}%</div>
        `;
        taskElement.title = `${task.title}\nDue: ${task.dueDate || 'Not set'}\nPriority: ${task.priority}`;
        taskElement.dataset.taskId = task.id;
        taskElement.draggable = true;
        return taskElement;
    }
    
    setupDragAndDrop(element, date) {
        // Allow drop
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });
        
        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });
        
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const timeSlot = element.dataset.time;
            
            if (taskId && this.draggedTask) {
                await this.moveTask(taskId, date, timeSlot);
                this.render();
            }
        });
        
        // Setup dragging for task elements
        element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('calendar-task')) {
                this.draggedTask = e.target.dataset.taskId;
                e.dataTransfer.setData('text/plain', this.draggedTask);
                e.target.style.opacity = '0.5';
            }
        });
        
        element.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('calendar-task')) {
                e.target.style.opacity = '1';
                this.draggedTask = null;
            }
        });
    }
    
    async moveTask(taskId, newDate, timeSlot) {
        try {
            const task = await taskManager.getTask(taskId);
            if (task) {
                task.dueDate = newDate.toISOString().split('T')[0];
                if (timeSlot) {
                    task.dueTime = timeSlot;
                }
                await taskManager.updateTask(task);
                
                // Show success feedback
                this.showNotification(`Task moved to ${newDate.toLocaleDateString()}${timeSlot ? ` at ${timeSlot}` : ''}`, 'success');
            }
        } catch (error) {
            console.error('Error moving task:', error);
            this.showNotification('Failed to move task', 'error');
        }
    }
    
    async getTasksForTimeSlot(date, timeSlot) {
        const tasks = await this.getTasksForDate(date);
        const hour = parseInt(timeSlot.split(':')[0]);
        
        return tasks.filter(task => {
            if (!task.dueTime) return hour === 9; // Default to 9 AM
            const taskHour = parseInt(task.dueTime.split(':')[0]);
            return taskHour === hour;
        });
    }
    
    handleTimeSlotClick(date, timeSlot) {
        const event = new CustomEvent('createTask', {
            detail: {
                dueDate: date.toISOString().split('T')[0],
                dueTime: timeSlot
            }
        });
        window.dispatchEvent(event);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async getTasksForDate(date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            return await taskManager.getTasksByDueDate(startOfDay, endOfDay);
        } catch (error) {
            console.error('Error fetching tasks for calendar:', error);
            return [];
        }
    }

    handleDayClick(date) {
        // Dispatch event for task creation with pre-filled date
        const event = new CustomEvent('createTask', {
            detail: {
                dueDate: date.toISOString().split('T')[0]
            }
        });
        window.dispatchEvent(event);
    }
}

export default CalendarComponent;