class VoiceInput {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        // Set up event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.dispatchVoiceEvent('voiceStart');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.dispatchVoiceEvent('voiceEnd');
        };

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;

            if (result.isFinal) {
                this.dispatchVoiceEvent('voiceResult', { transcript });
                this.processVoiceCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.dispatchVoiceEvent('voiceError', { error: event.error });
        };
    }

    start() {
        if (!this.recognition) return;
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
        }
    }

    stop() {
        if (!this.recognition) return;
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping voice recognition:', error);
        }
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();

        // Command patterns
        const patterns = {
            addTask: /^(add|create|new) task (.+)$/i,
            completeTask: /^(complete|finish|done) task (.+)$/i,
            deleteTask: /^(delete|remove) task (.+)$/i,
            setPriority: /^set priority (high|medium|low|urgent) for (.+)$/i,
            setDueDate: /^set due date (.+) for (.+)$/i,
            switchView: /^(show|switch to|open) (tasks|kanban|calendar|analytics) view$/i,
            startTimer: /^(start|begin) (pomodoro|timer)$/i,
            stopTimer: /^(stop|pause) (pomodoro|timer)$/i
        };

        // Process commands
        if (patterns.addTask.test(command)) {
            const [, , title] = command.match(patterns.addTask);
            this.dispatchVoiceEvent('addTask', { title });
        }
        else if (patterns.completeTask.test(command)) {
            const [, , title] = command.match(patterns.completeTask);
            this.dispatchVoiceEvent('completeTask', { title });
        }
        else if (patterns.deleteTask.test(command)) {
            const [, , title] = command.match(patterns.deleteTask);
            this.dispatchVoiceEvent('deleteTask', { title });
        }
        else if (patterns.setPriority.test(command)) {
            const [, priority, title] = command.match(patterns.setPriority);
            this.dispatchVoiceEvent('setPriority', { title, priority });
        }
        else if (patterns.setDueDate.test(command)) {
            const [, date, title] = command.match(patterns.setDueDate);
            this.dispatchVoiceEvent('setDueDate', { title, date });
        }
        else if (patterns.switchView.test(command)) {
            const [, , view] = command.match(patterns.switchView);
            this.dispatchVoiceEvent('switchView', { view });
        }
        else if (patterns.startTimer.test(command)) {
            this.dispatchVoiceEvent('startTimer');
        }
        else if (patterns.stopTimer.test(command)) {
            this.dispatchVoiceEvent('stopTimer');
        }
    }

    dispatchVoiceEvent(type, detail = {}) {
        window.dispatchEvent(new CustomEvent('voice', {
            detail: { type, ...detail }
        }));
    }
}

// Create and export a single instance
const voiceInput = new VoiceInput();
export default voiceInput;