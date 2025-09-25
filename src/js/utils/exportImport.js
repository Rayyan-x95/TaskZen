import taskManager from './taskManager.js';
import notifications from './notifications.js';

class ExportImportManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('exportTasks').addEventListener('click', () => this.exportTasks());
        document.getElementById('importTasks').addEventListener('click', () => this.importTasks());
    }

    async exportTasks() {
        try {
            // Get export format
            const format = document.getElementById('exportFormat').value;
            const data = await taskManager.exportTasks(format);
            
            // Create download
            const blob = new Blob([data], { type: this.getMimeType(format) });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0];
            
            // Create and trigger download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `taskzen-export-${timestamp}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            notifications.sendNotification('Export Complete', {
                body: 'Your tasks have been exported successfully!'
            });
        } catch (error) {
            console.error('Export error:', error);
            notifications.sendNotification('Export Failed', {
                body: 'There was an error exporting your tasks.'
            });
        }
    }

    async importTasks() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.csv';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const format = file.name.split('.').pop().toLowerCase();
                const reader = new FileReader();

                reader.onload = async (event) => {
                    try {
                        const data = event.target.result;
                        const success = await taskManager.importTasks(data, format);

                        if (success) {
                            notifications.sendNotification('Import Complete', {
                                body: 'Your tasks have been imported successfully!'
                            });
                            // Refresh the UI
                            window.dispatchEvent(new CustomEvent('taskUpdated'));
                        } else {
                            throw new Error('Import failed');
                        }
                    } catch (error) {
                        console.error('Import processing error:', error);
                        notifications.sendNotification('Import Failed', {
                            body: 'There was an error processing your import file.'
                        });
                    }
                };

                reader.onerror = () => {
                    notifications.sendNotification('Import Failed', {
                        body: 'There was an error reading your import file.'
                    });
                };

                reader.readAsText(file);
            };

            input.click();
        } catch (error) {
            console.error('Import error:', error);
            notifications.sendNotification('Import Failed', {
                body: 'There was an error importing your tasks.'
            });
        }
    }

    getMimeType(format) {
        switch (format.toLowerCase()) {
            case 'json':
                return 'application/json';
            case 'csv':
                return 'text/csv';
            default:
                return 'text/plain';
        }
    }

    // Cloud sync methods
    async syncWithGoogleDrive(accessToken) {
        // Implement Google Drive sync
    }

    async syncWithDropbox(accessToken) {
        // Implement Dropbox sync
    }

    generateQRCode(data) {
        // Implement QR code generation for sharing
    }
}

// Create and export a single instance
const exportImport = new ExportImportManager();
export default exportImport;