import taskManager from '../utils/taskManager.js';
import DateUtils from '../utils/dateUtils.js';

class CollaborationComponent {
    constructor() {
        this.currentWorkspace = null;
        this.connectedUsers = new Map();
        this.comments = new Map();
        this.shareSettings = {
            allowEditing: true,
            allowComments: true,
            requireApproval: false
        };
        this.initializeEventListeners();
        this.setupRealtimeConnection();
    }

    initializeEventListeners() {
        // Workspace management
        document.getElementById('createWorkspace')?.addEventListener('click', () => {
            this.showCreateWorkspaceModal();
        });
        
        document.getElementById('joinWorkspace')?.addEventListener('click', () => {
            this.showJoinWorkspaceModal();
        });
        
        document.getElementById('shareWorkspace')?.addEventListener('click', () => {
            this.showShareWorkspaceModal();
        });
        
        // Comments
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-comment-btn')) {
                const taskId = e.target.dataset.taskId;
                this.showCommentModal(taskId);
            }
            
            if (e.target.classList.contains('comment-reply-btn')) {
                const commentId = e.target.dataset.commentId;
                this.showReplyModal(commentId);
            }
        });
        
        // Real-time task updates
        document.addEventListener('taskUpdated', (e) => {
            this.broadcastTaskUpdate(e.detail);
        });
        
        // User presence
        document.addEventListener('visibilitychange', () => {
            this.updatePresenceStatus();
        });
        
        // Collaboration settings
        document.getElementById('collaborationSettings')?.addEventListener('click', () => {
            this.showCollaborationSettings();
        });
    }

    setupRealtimeConnection() {
        // Simulate WebSocket connection for real-time features
        // In a real implementation, this would connect to a WebSocket server
        this.isConnected = true;
        this.userId = this.generateUserId();
        this.username = localStorage.getItem('username') || 'Anonymous User';
        
        // Simulate connection status
        this.updateConnectionStatus(true);
        
        // Start presence heartbeat
        this.startPresenceHeartbeat();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    startPresenceHeartbeat() {
        setInterval(() => {
            if (this.isConnected && this.currentWorkspace) {
                this.updatePresence();
            }
        }, 30000); // Update every 30 seconds
    }

    updatePresence() {
        const presence = {
            userId: this.userId,
            username: this.username,
            lastSeen: new Date().toISOString(),
            status: document.hidden ? 'away' : 'active',
            currentView: this.getCurrentView()
        };
        
        // Simulate broadcasting presence
        this.connectedUsers.set(this.userId, presence);
        this.renderConnectedUsers();
    }

    getCurrentView() {
        const activeView = document.querySelector('.view.active');
        return activeView ? activeView.id : 'tasks';
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusEl.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    async createWorkspace(name, description = '') {
        try {
            const workspace = {
                id: this.generateWorkspaceId(),
                name,
                description,
                createdBy: this.userId,
                createdAt: new Date().toISOString(),
                members: [
                    {
                        userId: this.userId,
                        username: this.username,
                        role: 'owner',
                        joinedAt: new Date().toISOString()
                    }
                ],
                settings: { ...this.shareSettings }
            };
            
            // Save workspace locally (in real app, this would be saved to server)
            const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
            workspaces.push(workspace);
            localStorage.setItem('workspaces', JSON.stringify(workspaces));
            
            this.currentWorkspace = workspace;
            this.renderWorkspaceInfo();
            this.showNotification(`Workspace "${name}" created successfully!`, 'success');
            
            return workspace;
        } catch (error) {
            console.error('Error creating workspace:', error);
            this.showNotification('Failed to create workspace', 'error');
        }
    }

    generateWorkspaceId() {
        return 'ws_' + Math.random().toString(36).substr(2, 12);
    }

    async joinWorkspace(inviteCode) {
        try {
            // Simulate joining workspace
            const workspace = await this.findWorkspaceByInviteCode(inviteCode);
            
            if (!workspace) {
                throw new Error('Invalid invite code');
            }
            
            // Add user to workspace
            workspace.members.push({
                userId: this.userId,
                username: this.username,
                role: 'member',
                joinedAt: new Date().toISOString()
            });
            
            this.currentWorkspace = workspace;
            this.renderWorkspaceInfo();
            this.showNotification(`Joined workspace "${workspace.name}"!`, 'success');
            
        } catch (error) {
            console.error('Error joining workspace:', error);
            this.showNotification('Failed to join workspace', 'error');
        }
    }

    async findWorkspaceByInviteCode(inviteCode) {
        // Simulate finding workspace by invite code
        const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
        return workspaces.find(ws => ws.inviteCode === inviteCode);
    }

    generateInviteLink() {
        if (!this.currentWorkspace) return null;
        
        const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
        this.currentWorkspace.inviteCode = inviteCode;
        
        // Update workspace
        this.updateWorkspace(this.currentWorkspace);
        
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?invite=${inviteCode}`;
    }

    updateWorkspace(workspace) {
        const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
        const index = workspaces.findIndex(ws => ws.id === workspace.id);
        if (index !== -1) {
            workspaces[index] = workspace;
            localStorage.setItem('workspaces', JSON.stringify(workspaces));
        }
    }

    async addComment(taskId, content, parentCommentId = null) {
        try {
            const comment = {
                id: this.generateCommentId(),
                taskId,
                content,
                authorId: this.userId,
                authorName: this.username,
                createdAt: new Date().toISOString(),
                parentCommentId,
                reactions: {},
                edited: false
            };
            
            // Save comment
            const taskComments = this.comments.get(taskId) || [];
            taskComments.push(comment);
            this.comments.set(taskId, taskComments);
            
            // Persist to localStorage
            const allComments = Object.fromEntries(this.comments);
            localStorage.setItem('taskComments', JSON.stringify(allComments));
            
            // Broadcast comment to other users
            this.broadcastComment(comment);
            
            // Update UI
            this.renderTaskComments(taskId);
            
            return comment;
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showNotification('Failed to add comment', 'error');
        }
    }

    generateCommentId() {
        return 'comment_' + Math.random().toString(36).substr(2, 12);
    }

    broadcastComment(comment) {
        // Simulate broadcasting comment to other users
        console.log('Broadcasting comment:', comment);
        
        // In real implementation, this would send via WebSocket
        this.simulateRealtimeComment(comment);
    }

    simulateRealtimeComment(comment) {
        // Simulate receiving comment from another user after a delay
        setTimeout(() => {
            if (Math.random() > 0.7) { // 30% chance of simulated response
                const response = {
                    id: this.generateCommentId(),
                    taskId: comment.taskId,
                    content: this.generateRandomResponse(),
                    authorId: 'simulated_user',
                    authorName: 'Team Member',
                    createdAt: new Date().toISOString(),
                    parentCommentId: comment.id,
                    reactions: {},
                    edited: false
                };
                
                const taskComments = this.comments.get(comment.taskId) || [];
                taskComments.push(response);
                this.comments.set(comment.taskId, taskComments);
                
                this.renderTaskComments(comment.taskId);
                this.showNotification('New comment received', 'info');
            }
        }, 2000 + Math.random() * 5000); // 2-7 seconds delay
    }

    generateRandomResponse() {
        const responses = [
            "Great progress on this!",
            "I can help with this task.",
            "This looks good to me.",
            "Let's discuss this further.",
            "Nice work!",
            "I have some suggestions.",
            "This is ready for review.",
            "Can you provide more details?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async shareTask(taskId, userIds = [], permissions = {}) {
        try {
            const task = await taskManager.getTask(taskId);
            if (!task) throw new Error('Task not found');
            
            const shareInfo = {
                taskId,
                sharedBy: this.userId,
                sharedAt: new Date().toISOString(),
                sharedWith: userIds,
                permissions: {
                    canEdit: permissions.canEdit || false,
                    canComment: permissions.canComment || true,
                    canShare: permissions.canShare || false
                }
            };
            
            // Update task with sharing info
            task.sharing = shareInfo;
            await taskManager.updateTask(task);
            
            // Notify shared users
            this.notifySharedUsers(shareInfo, task);
            
            this.showNotification('Task shared successfully!', 'success');
            
        } catch (error) {
            console.error('Error sharing task:', error);
            this.showNotification('Failed to share task', 'error');
        }
    }

    notifySharedUsers(shareInfo, task) {
        // Simulate notifying shared users
        shareInfo.sharedWith.forEach(userId => {
            console.log(`Notifying user ${userId} about shared task: ${task.title}`);
        });
    }

    broadcastTaskUpdate(taskData) {
        if (!this.currentWorkspace) return;
        
        const update = {
            type: 'taskUpdate',
            taskId: taskData.id,
            changes: taskData,
            updatedBy: this.userId,
            updatedAt: new Date().toISOString(),
            workspaceId: this.currentWorkspace.id
        };
        
        // Simulate broadcasting update
        console.log('Broadcasting task update:', update);
        
        // Show real-time update notification
        this.showRealtimeUpdate(update);
    }

    showRealtimeUpdate(update) {
        // Show subtle notification about real-time changes
        const notification = document.createElement('div');
        notification.className = 'realtime-update';
        notification.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <span class="update-text">Task updated by ${update.updatedBy}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    renderWorkspaceInfo() {
        const container = document.getElementById('workspaceInfo');
        if (!container || !this.currentWorkspace) return;
        
        container.innerHTML = `
            <div class="workspace-header">
                <div class="workspace-details">
                    <h3>${this.currentWorkspace.name}</h3>
                    <p>${this.currentWorkspace.description}</p>
                    <div class="workspace-stats">
                        <span>${this.currentWorkspace.members.length} members</span>
                        <span>Created ${DateUtils.formatDate(this.currentWorkspace.createdAt)}</span>
                    </div>
                </div>
                <div class="workspace-actions">
                    <button class="btn secondary" id="shareWorkspace">
                        <span class="btn-icon">📤</span>
                        <span class="btn-text">Share</span>
                    </button>
                    <button class="btn secondary" id="collaborationSettings">
                        <span class="btn-icon">⚙️</span>
                        <span class="btn-text">Settings</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderConnectedUsers() {
        const container = document.getElementById('connectedUsers');
        if (!container) return;
        
        const users = Array.from(this.connectedUsers.values());
        
        container.innerHTML = `
            <div class="connected-users">
                <h4>Connected Users (${users.length})</h4>
                <div class="users-list">
                    ${users.map(user => `
                        <div class="user-item ${user.status}">
                            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div class="user-info">
                                <div class="user-name">${user.username}</div>
                                <div class="user-status">${user.status}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTaskComments(taskId) {
        const container = document.querySelector(`[data-task-comments="${taskId}"]`);
        if (!container) return;
        
        const comments = this.comments.get(taskId) || [];
        const rootComments = comments.filter(c => !c.parentCommentId);
        
        container.innerHTML = `
            <div class="comments-section">
                <div class="comments-header">
                    <h4>Comments (${comments.length})</h4>
                </div>
                <div class="comments-list">
                    ${rootComments.map(comment => this.renderComment(comment, comments)).join('')}
                </div>
                <div class="add-comment">
                    <textarea class="comment-input" placeholder="Add a comment..." data-task-id="${taskId}"></textarea>
                    <button class="btn primary comment-submit" data-task-id="${taskId}">Post Comment</button>
                </div>
            </div>
        `;
        
        // Add event listeners for new comment form
        const submitBtn = container.querySelector('.comment-submit');
        const textArea = container.querySelector('.comment-input');
        
        submitBtn?.addEventListener('click', () => {
            const content = textArea.value.trim();
            if (content) {
                this.addComment(taskId, content);
                textArea.value = '';
            }
        });
        
        textArea?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                submitBtn?.click();
            }
        });
    }

    renderComment(comment, allComments) {
        const replies = allComments.filter(c => c.parentCommentId === comment.id);
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">${comment.authorName}</div>
                    <div class="comment-date">${DateUtils.getRelativeTime(new Date(comment.createdAt))}</div>
                </div>
                <div class="comment-content">${this.formatCommentContent(comment.content)}</div>
                <div class="comment-actions">
                    <button class="comment-action comment-reply-btn" data-comment-id="${comment.id}">Reply</button>
                    <button class="comment-action comment-react-btn" data-comment-id="${comment.id}">👍</button>
                </div>
                ${replies.length > 0 ? `
                    <div class="comment-replies">
                        ${replies.map(reply => this.renderComment(reply, allComments)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    formatCommentContent(content) {
        // Basic formatting for comments
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    showCreateWorkspaceModal() {
        const modal = this.createModal('Create Workspace', `
            <div class="form-group">
                <label for="workspaceName">Workspace Name</label>
                <input type="text" id="workspaceName" class="form-input" placeholder="Enter workspace name" required>
            </div>
            <div class="form-group">
                <label for="workspaceDesc">Description (optional)</label>
                <textarea id="workspaceDesc" class="form-input" placeholder="Workspace description"></textarea>
            </div>
        `, [
            {
                text: 'Create',
                class: 'btn primary',
                handler: () => {
                    const name = document.getElementById('workspaceName').value.trim();
                    const description = document.getElementById('workspaceDesc').value.trim();
                    
                    if (name) {
                        this.createWorkspace(name, description);
                        this.closeModal(modal);
                    }
                }
            },
            {
                text: 'Cancel',
                class: 'btn secondary',
                handler: () => this.closeModal(modal)
            }
        ]);
    }

    showJoinWorkspaceModal() {
        const modal = this.createModal('Join Workspace', `
            <div class="form-group">
                <label for="inviteCode">Invite Code</label>
                <input type="text" id="inviteCode" class="form-input" placeholder="Enter invite code" required>
            </div>
        `, [
            {
                text: 'Join',
                class: 'btn primary',
                handler: () => {
                    const inviteCode = document.getElementById('inviteCode').value.trim();
                    
                    if (inviteCode) {
                        this.joinWorkspace(inviteCode);
                        this.closeModal(modal);
                    }
                }
            },
            {
                text: 'Cancel',
                class: 'btn secondary',
                handler: () => this.closeModal(modal)
            }
        ]);
    }

    showShareWorkspaceModal() {
        if (!this.currentWorkspace) return;
        
        const inviteLink = this.generateInviteLink();
        
        const modal = this.createModal('Share Workspace', `
            <div class="share-options">
                <div class="form-group">
                    <label>Invite Link</label>
                    <div class="input-group">
                        <input type="text" class="form-input" value="${inviteLink}" readonly>
                        <button class="btn secondary copy-link-btn">Copy</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Permissions</label>
                    <div class="permission-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" id="allowEditing" ${this.shareSettings.allowEditing ? 'checked' : ''}>
                            Allow editing tasks
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="allowComments" ${this.shareSettings.allowComments ? 'checked' : ''}>
                            Allow comments
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="requireApproval" ${this.shareSettings.requireApproval ? 'checked' : ''}>
                            Require approval for new members
                        </label>
                    </div>
                </div>
            </div>
        `, [
            {
                text: 'Done',
                class: 'btn primary',
                handler: () => {
                    // Update share settings
                    this.shareSettings.allowEditing = document.getElementById('allowEditing').checked;
                    this.shareSettings.allowComments = document.getElementById('allowComments').checked;
                    this.shareSettings.requireApproval = document.getElementById('requireApproval').checked;
                    
                    this.closeModal(modal);
                }
            }
        ]);
        
        // Add copy functionality
        const copyBtn = modal.querySelector('.copy-link-btn');
        copyBtn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(inviteLink);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        });
    }

    createModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `<button class="${btn.class}">${btn.text}</button>`).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => this.closeModal(modal));
        
        buttons.forEach((btn, index) => {
            const btnEl = modal.querySelectorAll('.modal-footer button')[index];
            btnEl?.addEventListener('click', btn.handler);
        });
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
        
        return modal;
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
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

    // Load existing data on initialization
    loadStoredData() {
        // Load workspaces
        const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
        const userWorkspaces = workspaces.filter(ws => 
            ws.members.some(member => member.userId === this.userId)
        );
        
        if (userWorkspaces.length > 0) {
            this.currentWorkspace = userWorkspaces[0];
            this.renderWorkspaceInfo();
        }
        
        // Load comments
        const comments = JSON.parse(localStorage.getItem('taskComments') || '{}');
        this.comments = new Map(Object.entries(comments));
        
        // Check for invite code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite');
        if (inviteCode) {
            this.joinWorkspace(inviteCode);
        }
    }
}

export default CollaborationComponent;