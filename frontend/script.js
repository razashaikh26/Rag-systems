class ChatApp {
    constructor() {
        this.apiBase = 'https://razashaikh9921-main-dev.hf.space';
        this.currentChatId = null;
        this.chats = [];
        this.authToken = null;
        this.currentFile = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadFromStorage();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Main elements
        this.sidebar = document.getElementById('sidebar');
        this.chatHistory = document.getElementById('chatHistory');
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatContainer = document.getElementById('chatContainer');
        
        // Buttons
        this.newChatBtn = document.getElementById('newChatBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.fileUploadBtn = document.getElementById('fileUploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.removeFileBtn = document.getElementById('removeFile');
        
        // Modal and preview elements
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.filePreview = document.getElementById('filePreview');
        this.fileName = document.getElementById('fileName');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.username = document.getElementById('username');
    }

    setupEventListeners() {
        // Message input
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Buttons
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.fileUploadBtn.addEventListener('click', () => this.fileInput.click());
        this.removeFileBtn.addEventListener('click', () => this.removeFile());
        
        // File input
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Example prompts
        document.querySelectorAll('.example-prompt').forEach(prompt => {
            prompt.addEventListener('click', (e) => {
                const promptText = e.currentTarget.getAttribute('data-prompt');
                
                // Start a new chat first
                this.startNewChat();
                
                // Set the message input
                this.messageInput.value = promptText;
                this.handleInputChange();
                
                // Send the message immediately
                setTimeout(() => {
                    this.sendMessage();
                }, 100); // Small delay to ensure chat is properly initialized
            });
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    handleInputChange() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!this.sendBtn.disabled) {
                this.sendMessage();
            }
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('username');
        
        if (token && user) {
            this.authToken = token;
            this.username.textContent = user;
            this.hideLoginModal();
        } else {
            this.showLoginModal();
        }
    }

    showLoginModal() {
        this.loginModal.style.display = 'flex';
    }

    hideLoginModal() {
        this.loginModal.style.display = 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Username:', username);
        console.log('API Base:', this.apiBase);
        
        if (!username || username.trim() === '') {
            this.showNotification('Please enter a username', 'error');
            return;
        }
        
        this.showLoading();

        try {
            // Try different formats to match FastAPI expectations
            let response;
            let data;

            console.log('Trying login methods...');

            // Method 1: Try as form data first
            try {
                console.log('Method 1: FormData');
                const formData = new FormData();
                formData.append('username', username);

                response = await fetch(`${this.apiBase}/login`, {
                    method: 'POST',
                    body: formData
                });
                
                console.log('FormData response status:', response.status);
                data = await response.json();
                console.log('FormData response data:', data);
            } catch (error) {
                console.log('Form data failed:', error);
            }

            // Method 2: Try as URL encoded if form data failed
            if (!response || !response.ok) {
                try {
                    console.log('Method 2: URL encoded');
                    const params = new URLSearchParams();
                    params.append('username', username);

                    response = await fetch(`${this.apiBase}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params.toString()
                    });
                    
                    console.log('URL encoded response status:', response.status);
                    data = await response.json();
                    console.log('URL encoded response data:', data);
                } catch (error) {
                    console.log('URL encoded failed:', error);
                }
            }

            // Method 3: Try as query parameter if body methods failed
            if (!response || !response.ok) {
                try {
                    console.log('Method 3: Query parameter');
                    response = await fetch(`${this.apiBase}/login?username=${encodeURIComponent(username)}`, {
                        method: 'POST'
                    });
                    
                    console.log('Query param response status:', response.status);
                    data = await response.json();
                    console.log('Query param response data:', data);
                } catch (error) {
                    console.log('Query params failed:', error);
                }
            }

            console.log('Final response status:', response?.status);
            console.log('Final data:', data);

            if (response && response.ok && data && data.token) {
                console.log('Login successful, token:', data.token);
                this.authToken = data.token;
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('username', username);
                this.username.textContent = username;
                this.hideLoginModal();
                this.showNotification('Login successful!', 'success');
            } else {
                // Better error message handling
                let errorMessage = 'Login failed';
                if (data && data.detail) {
                    if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map(item => 
                            typeof item === 'object' ? JSON.stringify(item) : item
                        ).join(', ');
                    } else if (typeof data.detail === 'object') {
                        errorMessage = JSON.stringify(data.detail);
                    } else {
                        errorMessage = data.detail;
                    }
                } else if (data && data.error) {
                    errorMessage = data.error;
                }
                
                console.log('Login failed with error:', errorMessage);
                this.showNotification(errorMessage, 'error');
                console.error('Login failed. Status:', response?.status, 'Data:', data);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please check your connection.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('chats');
        this.authToken = null;
        this.chats = [];
        this.currentChatId = null;
        this.updateChatHistory();
        this.clearMessages();
        this.showWelcomeScreen();
        this.showLoginModal();
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['.txt', '.pdf', '.docx', '.csv'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showNotification('Please upload a .txt, .pdf, .docx, or .csv file', 'error');
            return;
        }

        // Show loading on upload button
        this.fileUploadBtn.classList.add('loading');
        this.fileUploadBtn.querySelector('span').textContent = 'Uploading...';
        
        // Also show global loading
        this.showLoading();

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBase}/inject/file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.currentFile = {
                    name: file.name,
                    data: result
                };
                this.showFilePreview(file.name);
                this.showNotification('File uploaded successfully!', 'success');
            } else {
                throw new Error('File upload failed');
            }
        } catch (error) {
            console.error('File upload error:', error);
            this.showNotification('File upload failed. Please try again.', 'error');
        } finally {
            // Reset upload button
            this.fileUploadBtn.classList.remove('loading');
            this.fileUploadBtn.querySelector('span').textContent = 'Upload File';
            
            this.hideLoading();
            this.fileInput.value = '';
        }
    }

    showFilePreview(filename) {
        this.fileName.textContent = filename;
        this.filePreview.style.display = 'block';
    }

    removeFile() {
        this.currentFile = null;
        this.filePreview.style.display = 'none';
        this.fileInput.value = '';
    }

    startNewChat() {
        // Generate new chat ID
        this.currentChatId = this.generateId();
        
        // Create new chat object
        const newChat = {
            id: this.currentChatId,
            title: 'New Chat',
            messages: [],
            timestamp: Date.now()
        };
        
        // Add to beginning of chats array
        this.chats.unshift(newChat);
        
        // Update UI
        this.updateChatHistory();
        this.clearMessages();
        this.showWelcomeScreen();
        this.saveToStorage();
        
        // Log for debugging
        console.log('Started new chat:', this.currentChatId);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.authToken) return;

        console.log('sendMessage called with currentChatId:', this.currentChatId);

        // Hide welcome screen and show messages
        this.hideWelcomeScreen();

        // Ensure we have a current chat - if not, create one
        if (!this.currentChatId) {
            console.log('No current chat, creating new one');
            this.startNewChat();
        }

        // Get current chat - ensure it exists
        let currentChat = this.chats.find(chat => chat.id === this.currentChatId);
        if (!currentChat) {
            console.log('Current chat not found, creating new one');
            this.startNewChat();
            currentChat = this.chats.find(chat => chat.id === this.currentChatId);
        }

        if (!currentChat) {
            console.error('Failed to create/find current chat');
            return;
        }

        console.log('Using chat:', currentChat.id, 'Title:', currentChat.title);

        // Add user message
        const userMessage = {
            id: this.generateId(),
            type: 'user',
            content: message,
            timestamp: Date.now()
        };

        currentChat.messages.push(userMessage);
        this.addMessageToUI(userMessage);

        // Update chat title if it's the first message
        if (currentChat.title === 'New Chat') {
            currentChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            this.updateChatHistory();
        }

        // Clear input
        this.messageInput.value = '';
        this.handleInputChange();
        this.autoResizeTextarea();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            console.log('=== DEBUGGING ASK REQUEST ===');
            console.log('Message:', message);
            console.log('Auth token:', this.authToken);
            console.log('API Base:', this.apiBase);
            
            // Use query parameter for FastAPI
            const url = new URL(`${this.apiBase}/ask`);
            url.searchParams.append('question', message);
            
            console.log('Request URL with params:', url.toString());

            const requestHeaders = {
                'Authorization': `Bearer ${this.authToken}`
            };
            console.log('Request headers:', requestHeaders);

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: requestHeaders
            });

            console.log('Fetch completed successfully');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                console.log('Response not OK, trying to read error...');
                
                let errorMessage = `API Error (${response.status})`;
                
                try {
                    // Clone the response so we can try multiple read methods
                    const responseClone1 = response.clone();
                    const responseClone2 = response.clone();
                    
                    // Try to read as text first
                    const errorText = await responseClone1.text();
                    console.log('Raw error text:', errorText);
                    console.log('Error text length:', errorText.length);
                    
                    if (errorText) {
                        // Try to parse as JSON for structured error
                        try {
                            const errorJson = JSON.parse(errorText);
                            console.log('Parsed error JSON:', errorJson);
                            if (errorJson.detail) {
                                if (Array.isArray(errorJson.detail)) {
                                    errorMessage = `API Error (${response.status}): ${errorJson.detail.map(d => d.msg || d).join(', ')}`;
                                } else {
                                    errorMessage = `API Error (${response.status}): ${errorJson.detail}`;
                                }
                            } else {
                                errorMessage = `API Error (${response.status}): ${errorText}`;
                            }
                        } catch (jsonParseError) {
                            console.log('Could not parse error as JSON:', jsonParseError);
                            errorMessage = `API Error (${response.status}): ${errorText}`;
                        }
                    } else {
                        // Try to read as JSON directly
                        try {
                            const errorJson = await responseClone2.json();
                            console.log('Direct JSON parse result:', errorJson);
                            errorMessage = `API Error (${response.status}): ${JSON.stringify(errorJson)}`;
                        } catch (jsonError) {
                            console.log('Could not read response as JSON either:', jsonError);
                            errorMessage = `API Error (${response.status}): Empty or unreadable response`;
                        }
                    }
                } catch (readError) {
                    console.log('Failed to read error response:', readError);
                    errorMessage = `API Error (${response.status}): Could not read error response - ${readError.message}`;
                }
                
                console.log('Final error message:', errorMessage);
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Ask API Response:', data); // Debug log

            if (response.ok) {
                let content = 'No response received';
                
                // Handle different response formats with better debugging
                if (typeof data === 'string') {
                    content = data;
                } else if (data && typeof data === 'object') {
                    // Check for common response properties
                    if (data.response && typeof data.response === 'string') {
                        content = data.response;
                    } else if (data.answer && typeof data.answer === 'string') {
                        content = data.answer;
                    } else if (data.message && typeof data.message === 'string') {
                        content = data.message;
                    } else if (data.text && typeof data.text === 'string') {
                        content = data.text;
                    } else if (data.result && typeof data.result === 'string') {
                        content = data.result;
                    } else {
                        // If it's an object, convert to readable format
                        content = JSON.stringify(data, null, 2);
                    }
                } else {
                    content = String(data);
                }

                const assistantMessage = {
                    id: this.generateId(),
                    type: 'assistant',
                    content: content,
                    timestamp: Date.now()
                };

                currentChat.messages.push(assistantMessage);
                this.addMessageToUI(assistantMessage);
            } else {
                throw new Error(data.detail || 'Failed to get response');
            }
        } catch (error) {
            console.error('Send message error:', error);
            
            // Extract meaningful error message
            let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';
            
            if (error && error.message && error.message !== '[object Object]') {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error) {
                // Try to extract useful info from error object
                errorMessage = `Error: ${JSON.stringify(error)}`;
            }
            
            console.log('Processed error message:', errorMessage);
            
            const errorMessageObj = {
                id: this.generateId(),
                type: 'assistant',
                content: errorMessage,
                timestamp: Date.now()
            };
            currentChat.messages.push(errorMessageObj);
            this.addMessageToUI(errorMessageObj);
        } finally {
            this.hideTypingIndicator();
            this.saveToStorage();
        }
    }

    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.messages.style.display = 'none';
    }

    hideWelcomeScreen() {
        this.welcomeScreen.style.display = 'none';
        this.messages.style.display = 'block';
    }

    addMessageToUI(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}`;
        messageEl.innerHTML = `
            <div class="message-avatar">
                ${message.type === 'user' ? 
                    '<i class="fas fa-user"></i>' : 
                    '<i class="fas fa-robot"></i>'
                }
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${this.formatMessageContent(message.content)}
                </div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="chatApp.copyMessage('${message.id}')">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    ${message.type === 'assistant' ? 
                        `<button class="message-action-btn" onclick="chatApp.regenerateResponse('${message.id}')">
                            <i class="fas fa-redo"></i> Regenerate
                        </button>` : ''
                    }
                </div>
            </div>
        `;

        this.messages.appendChild(messageEl);
        this.scrollToBottom();
    }

    formatMessageContent(content) {
        // Handle non-string content with better error handling
        if (content === null || content === undefined) {
            return 'No content available';
        }
        
        if (typeof content !== 'string') {
            // Check if it's an object that might have been incorrectly passed
            if (typeof content === 'object') {
                console.warn('Object passed to formatMessageContent:', content);
                return '<pre>' + JSON.stringify(content, null, 2) + '</pre>';
            }
            content = String(content);
        }
        
        // Escape HTML to prevent XSS
        content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        this.messages.appendChild(typingEl);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) {
            typingEl.remove();
        }
    }

    copyMessage(messageId) {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        const message = chat?.messages.find(m => m.id === messageId);
        
        if (message) {
            navigator.clipboard.writeText(message.content).then(() => {
                this.showNotification('Message copied to clipboard', 'success');
            });
        }
    }

    async regenerateResponse(messageId) {
        const chat = this.chats.find(c => c.id === this.currentChatId);
        const messageIndex = chat?.messages.findIndex(m => m.id === messageId);
        
        if (chat && messageIndex > 0) {
            const userMessage = chat.messages[messageIndex - 1];
            
            // Remove the assistant message
            chat.messages.splice(messageIndex, 1);
            
            // Clear UI and show typing
            this.clearMessages();
            this.loadChatMessages(this.currentChatId);
            this.showTypingIndicator();
            
            // Regenerate response
            try {
                console.log('=== DEBUGGING REGENERATE REQUEST ===');
                console.log('User message:', userMessage.content);
                console.log('Auth token:', this.authToken);
                
                // Use query parameter for FastAPI
                const url = new URL(`${this.apiBase}/ask`);
                url.searchParams.append('question', userMessage.content);
                
                console.log('Regenerate request URL with params:', url.toString());

                const requestHeaders = {
                    'Authorization': `Bearer ${this.authToken}`
                };
                console.log('Request headers:', requestHeaders);

                const response = await fetch(url.toString(), {
                    method: 'POST',
                    headers: requestHeaders
                });

                console.log('Regenerate fetch completed successfully');
                console.log('Response status:', response.status);
                console.log('Response headers:', Object.fromEntries(response.headers.entries()));

                if (!response.ok) {
                    console.log('Regenerate response not OK, trying to read error...');
                    
                    let errorMessage = `API Error (${response.status})`;
                    
                    try {
                        // Clone the response so we can try multiple read methods
                        const responseClone1 = response.clone();
                        const responseClone2 = response.clone();
                        
                        // Try to read as text first
                        const errorText = await responseClone1.text();
                        console.log('Regenerate raw error text:', errorText);
                        console.log('Regenerate error text length:', errorText.length);
                        
                        if (errorText) {
                            // Try to parse as JSON for structured error
                            try {
                                const errorJson = JSON.parse(errorText);
                                console.log('Regenerate parsed error JSON:', errorJson);
                                if (errorJson.detail) {
                                    if (Array.isArray(errorJson.detail)) {
                                        errorMessage = `API Error (${response.status}): ${errorJson.detail.map(d => d.msg || d).join(', ')}`;
                                    } else {
                                        errorMessage = `API Error (${response.status}): ${errorJson.detail}`;
                                    }
                                } else {
                                    errorMessage = `API Error (${response.status}): ${errorText}`;
                                }
                            } catch (jsonParseError) {
                                console.log('Regenerate could not parse error as JSON:', jsonParseError);
                                errorMessage = `API Error (${response.status}): ${errorText}`;
                            }
                        } else {
                            // Try to read as JSON directly
                            try {
                                const errorJson = await responseClone2.json();
                                console.log('Regenerate direct JSON parse result:', errorJson);
                                errorMessage = `API Error (${response.status}): ${JSON.stringify(errorJson)}`;
                            } catch (jsonError) {
                                console.log('Regenerate could not read response as JSON either:', jsonError);
                                errorMessage = `API Error (${response.status}): Empty or unreadable response`;
                            }
                        }
                    } catch (readError) {
                        console.log('Regenerate failed to read error response:', readError);
                        errorMessage = `API Error (${response.status}): Could not read error response - ${readError.message}`;
                    }
                    
                    console.log('Regenerate final error message:', errorMessage);
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('Regenerate API Response:', data); // Debug log

                if (response.ok) {
                    let content = 'No response received';
                    
                    // Handle different response formats with better debugging
                    if (typeof data === 'string') {
                        content = data;
                    } else if (data && typeof data === 'object') {
                        // Check for common response properties
                        if (data.response && typeof data.response === 'string') {
                            content = data.response;
                        } else if (data.answer && typeof data.answer === 'string') {
                            content = data.answer;
                        } else if (data.message && typeof data.message === 'string') {
                            content = data.message;
                        } else if (data.text && typeof data.text === 'string') {
                            content = data.text;
                        } else if (data.result && typeof data.result === 'string') {
                            content = data.result;
                        } else {
                            // If it's an object, convert to readable format
                            content = JSON.stringify(data, null, 2);
                        }
                    } else {
                        content = String(data);
                    }

                    const assistantMessage = {
                        id: this.generateId(),
                        type: 'assistant',
                        content: content,
                        timestamp: Date.now()
                    };

                    chat.messages.push(assistantMessage);
                    this.addMessageToUI(assistantMessage);
                } else {
                    throw new Error(data.detail || 'Failed to regenerate response');
                }
            } catch (error) {
                console.error('Regenerate error:', error);
                
                // Extract meaningful error message
                let errorMessage = 'Failed to regenerate response';
                
                if (error && error.message && error.message !== '[object Object]') {
                    errorMessage = error.message;
                } else if (error && typeof error === 'string') {
                    errorMessage = error;
                } else if (error) {
                    // Try to extract useful info from error object
                    errorMessage = `Regenerate Error: ${JSON.stringify(error)}`;
                }
                
                console.log('Processed regenerate error message:', errorMessage);
                this.showNotification(errorMessage, 'error');
            } finally {
                this.hideTypingIndicator();
                this.saveToStorage();
            }
        }
    }

    updateChatHistory() {
        this.chatHistory.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatEl = document.createElement('div');
            chatEl.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatEl.innerHTML = `
                <div class="chat-title">${chat.title}</div>
                <div class="chat-actions">
                    <button class="chat-action-btn" onclick="chatApp.deleteChat('${chat.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            chatEl.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-actions')) {
                    this.loadChat(chat.id);
                }
            });
            
            this.chatHistory.appendChild(chatEl);
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        this.updateChatHistory();
        this.clearMessages();
        
        if (this.chats.find(c => c.id === chatId)?.messages.length === 0) {
            this.showWelcomeScreen();
        } else {
            this.hideWelcomeScreen();
            this.loadChatMessages(chatId);
        }
    }

    loadChatMessages(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.messages.forEach(message => {
                this.addMessageToUI(message);
            });
        }
    }

    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            this.chats = this.chats.filter(chat => chat.id !== chatId);
            
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                this.clearMessages();
                this.showWelcomeScreen();
            }
            
            this.updateChatHistory();
            this.saveToStorage();
        }
    }

    clearMessages() {
        this.messages.innerHTML = '';
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#6366f1';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToStorage() {
        localStorage.setItem('chats', JSON.stringify(this.chats));
        localStorage.setItem('currentChatId', this.currentChatId);
    }

    loadFromStorage() {
        const chatsData = localStorage.getItem('chats');
        const currentChatId = localStorage.getItem('currentChatId');
        
        if (chatsData) {
            this.chats = JSON.parse(chatsData);
            this.updateChatHistory();
        }
        
        if (currentChatId && this.chats.find(c => c.id === currentChatId)) {
            this.loadChat(currentChatId);
        } else {
            this.showWelcomeScreen();
        }
    }
}

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});