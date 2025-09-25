class DateUtils {
    static formatDate(date) {
        return new Date(date).toLocaleDateString();
    }

    static formatDateTime(date) {
        return new Date(date).toLocaleString();
    }

    static isToday(date) {
        const today = new Date();
        const compareDate = new Date(date);
        return (
            compareDate.getDate() === today.getDate() &&
            compareDate.getMonth() === today.getMonth() &&
            compareDate.getFullYear() === today.getFullYear()
        );
    }

    static isOverdue(date) {
        return new Date(date) < new Date() && !this.isToday(date);
    }

    static getDaysUntil(date) {
        const diff = new Date(date) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    static getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    static getMonthDays(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    static getMonthFirstDay(year, month) {
        return new Date(year, month, 1).getDay();
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static getDateRangeArray(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    static parseRecurrence(pattern) {
        const [interval, unit] = pattern.split(' ');
        return {
            interval: parseInt(interval),
            unit: unit.toLowerCase()
        };
    }

    static getNextOccurrence(date, pattern) {
        const { interval, unit } = this.parseRecurrence(pattern);
        const nextDate = new Date(date);

        switch (unit) {
            case 'day':
            case 'days':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            case 'week':
            case 'weeks':
                nextDate.setDate(nextDate.getDate() + (interval * 7));
                break;
            case 'month':
            case 'months':
                nextDate.setMonth(nextDate.getMonth() + interval);
                break;
            case 'year':
            case 'years':
                nextDate.setFullYear(nextDate.getFullYear() + interval);
                break;
            default:
                throw new Error('Invalid recurrence pattern');
        }

        return nextDate;
    }
    
    // Additional methods for enhanced calendar
    static getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    }
    
    static getWeekEnd(date) {
        const end = new Date(date);
        const day = end.getDay();
        const diff = end.getDate() - day + 6;
        end.setDate(diff);
        end.setHours(23, 59, 59, 999);
        return end;
    }
    
    static isDueToday(date) {
        return this.isToday(new Date(date));
    }
    
    static isDueTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(date).toDateString() === tomorrow.toDateString();
    }
    
    static getRelativeTime(date) {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (Math.abs(diffDays) > 0) {
            if (diffDays > 0) {
                return diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
            } else {
                return diffDays === -1 ? 'Yesterday' : `${Math.abs(diffDays)} days ago`;
            }
        } else if (Math.abs(diffHours) > 0) {
            if (diffHours > 0) {
                return diffHours === 1 ? 'In 1 hour' : `In ${diffHours} hours`;
            } else {
                return diffHours === -1 ? '1 hour ago' : `${Math.abs(diffHours)} hours ago`;
            }
        } else if (Math.abs(diffMinutes) > 0) {
            if (diffMinutes > 0) {
                return diffMinutes === 1 ? 'In 1 minute' : `In ${diffMinutes} minutes`;
            } else {
                return diffMinutes === -1 ? '1 minute ago' : `${Math.abs(diffMinutes)} minutes ago`;
            }
        } else {
            return 'Now';
        }
    }
}

export default DateUtils;