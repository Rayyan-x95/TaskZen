import notifications from '../utils/notifications.js';

class PomodoroComponent {
    constructor() {
        this.time = 25 * 60; // 25 minutes in seconds
        this.initialTime = this.time;
        this.isRunning = false;
        this.isBreak = false;
        this.breakTime = 5 * 60; // 5 minutes in seconds
        this.interval = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('startPomodoro').addEventListener('click', () => this.toggleTimer());
        document.getElementById('resetPomodoro').addEventListener('click', () => this.resetTimer());

        // Widget collapse/expand
        const widget = document.getElementById('pomodoroWidget');
        const toggleButton = widget.querySelector('.toggle-widget');
        
        toggleButton.addEventListener('click', () => {
            widget.classList.toggle('collapsed');
            toggleButton.textContent = widget.classList.contains('collapsed') ? '▼' : '▲';
        });
    }

    toggleTimer() {
        const startButton = document.getElementById('startPomodoro');
        
        if (this.isRunning) {
            this.pauseTimer();
            startButton.textContent = 'Start';
        } else {
            this.startTimer();
            startButton.textContent = 'Pause';
        }
    }

    startTimer() {
        this.isRunning = true;
        
        if (this.time === 0) {
            this.resetTimer();
        }

        this.interval = setInterval(() => {
            this.time--;
            this.updateDisplay();

            if (this.time === 0) {
                this.completeTimer();
            }
        }, 1000);

        // Show notification when timer starts
        notifications.sendPomodoroNotification(this.isBreak ? 'breakStart' : 'start');
    }

    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.interval);
    }

    resetTimer() {
        this.pauseTimer();
        this.time = this.isBreak ? this.breakTime : this.initialTime;
        this.updateDisplay();
        document.getElementById('startPomodoro').textContent = 'Start';
    }

    completeTimer() {
        this.pauseTimer();
        
        if (this.isBreak) {
            // Break is over, switch to work mode
            this.isBreak = false;
            this.time = this.initialTime;
            notifications.sendPomodoroNotification('breakEnd');
        } else {
            // Work session is over, switch to break mode
            this.isBreak = true;
            this.time = this.breakTime;
            notifications.sendPomodoroNotification('end');
        }

        this.updateDisplay();
        this.updateTimerStyle();
    }

    updateDisplay() {
        const minutes = Math.floor(this.time / 60);
        const seconds = this.time % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('pomodoroTimer').textContent = display;
    }

    updateTimerStyle() {
        const timer = document.getElementById('pomodoroTimer');
        timer.className = `timer ${this.isBreak ? 'break' : 'work'}`;
    }

    // Settings methods for customization
    setWorkDuration(minutes) {
        this.initialTime = minutes * 60;
        if (!this.isBreak) {
            this.time = this.initialTime;
            this.updateDisplay();
        }
    }

    setBreakDuration(minutes) {
        this.breakTime = minutes * 60;
        if (this.isBreak) {
            this.time = this.breakTime;
            this.updateDisplay();
        }
    }
}

export default PomodoroComponent;