class NotificationManager {
    constructor() {
        this.hasPermission = false;
        this.checkPermission();
    }

    async checkPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        if (Notification.permission === 'granted') {
            this.hasPermission = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === 'granted';
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
    }

    async sendNotification(title, options = {}) {
        if (!this.hasPermission) {
            const granted = await this.requestPermission();
            if (!granted) return;
        }

        const defaultOptions = {
            icon: '/src/assets/icons/icon-192x192.png',
            badge: '/src/assets/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            tag: 'taskzen-notification',
            renotify: true,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (options.onClick) {
                    options.onClick();
                }
            };

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    scheduleNotification(title, options = {}, delay) {
        setTimeout(() => {
            this.sendNotification(title, options);
        }, delay);
    }

    // Reminder specific notifications
    async sendTaskReminder(task) {
        const timeUntilDue = new Date(task.dueDate) - new Date();
        const hoursUntilDue = Math.floor(timeUntilDue / (1000 * 60 * 60));
        
        let message;
        if (hoursUntilDue <= 1) {
            message = 'Due in less than an hour!';
        } else if (hoursUntilDue <= 24) {
            message = `Due in ${hoursUntilDue} hours`;
        } else {
            const daysUntilDue = Math.floor(hoursUntilDue / 24);
            message = `Due in ${daysUntilDue} days`;
        }

        return this.sendNotification(`Task Reminder: ${task.title}`, {
            body: message,
            tag: `task-${task.id}`,
            data: {
                taskId: task.id,
                type: 'task-reminder'
            },
            onClick: () => {
                // Navigate to task detail view
                window.dispatchEvent(new CustomEvent('openTask', { detail: task.id }));
            }
        });
    }

    // Pomodoro notifications
    sendPomodoroNotification(type) {
        const messages = {
            start: 'Pomodoro session started! Stay focused!',
            end: 'Great job! Time for a break!',
            breakStart: 'Break time started. Relax!',
            breakEnd: 'Break time is over. Ready to focus again?'
        };

        return this.sendNotification('Pomodoro Timer', {
            body: messages[type],
            tag: 'pomodoro',
            data: { type: 'pomodoro' }
        });
    }

    // Achievement notifications
    sendAchievementNotification(achievement) {
        return this.sendNotification('Achievement Unlocked! 🏆', {
            body: achievement.description,
            icon: achievement.icon || '/src/assets/icons/achievement.png',
            tag: `achievement-${achievement.id}`,
            data: {
                type: 'achievement',
                achievementId: achievement.id
            }
        });
    }
}

// Create and export a single instance
const notifications = new NotificationManager();
export default notifications;