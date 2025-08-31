// AI Debate Arena - Frontend JavaScript
class DebateArena {
    constructor() {
        this.debate = [];
        this.currentRound = 0;
        this.maxRounds = 10;
        this.isDebateActive = false;
        this.debateStartTime = null;
        this.debateHistory = [];
        this.searchResults = 0;
        this.debateId = null;
        // Dynamic API URL for both local and production
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        // In production (Render), use same domain without port
        // In local development, use localhost:3001
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.apiBaseUrl = `${protocol}//${hostname}:3001/api`;
        } else {
            // Production - use same domain and port as current page
            this.apiBaseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
        }

        this.initializeElements();
        this.setupEventListeners();
        this.updateUI();
    }

    initializeElements() {
        // Control elements
        this.themeInput = document.getElementById('debate-theme');
        this.maxRoundsInput = document.getElementById('max-rounds');
        this.searchInput = document.getElementById('search-query');
        this.startBtn = document.getElementById('start-debate');
        this.generateAI1Btn = document.getElementById('generate-ai1');
        this.generateAI2Btn = document.getElementById('generate-ai2');
        this.stopBtn = document.getElementById('stop-debate');
        this.resetBtn = document.getElementById('reset-debate');

        // Display elements
        this.transcript = document.getElementById('transcript');
        this.currentRoundDisplay = document.getElementById('current-round');
        this.totalRoundsDisplay = document.getElementById('total-rounds');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.ai1Status = document.getElementById('ai1-status');
        this.ai2Status = document.getElementById('ai2-status');

        // Integrated response controls
        this.responseControls = document.getElementById('response-controls');
        this.responseRound = document.getElementById('response-round');

        // Stats elements
        this.totalRoundsStat = document.getElementById('total-rounds-stat');
        this.debateDuration = document.getElementById('debate-duration');
        this.searchResultsDisplay = document.getElementById('search-results');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startDebate());
        this.generateAI1Btn.addEventListener('click', () => this.generateAI1Response());
        this.generateAI2Btn.addEventListener('click', () => this.generateAI2Response());
        this.stopBtn.addEventListener('click', () => this.stopDebate());
        this.resetBtn.addEventListener('click', () => this.resetDebate());
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.themeInput.addEventListener('input', () => this.updateTheme());
        this.maxRoundsInput.addEventListener('input', () => this.updateMaxRounds());
    }

    updateUI() {
        this.currentRoundDisplay.textContent = this.currentRound;
        this.totalRoundsDisplay.textContent = this.maxRounds;
        this.totalRoundsStat.textContent = this.debateHistory.length;
        this.searchResultsDisplay.textContent = this.searchResults;

        if (this.debateStartTime) {
            const duration = Math.floor((Date.now() - this.debateStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            this.debateDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateTheme() {
        // Theme is updated in real-time as user types
    }

    updateMaxRounds() {
        this.maxRounds = parseInt(this.maxRoundsInput.value) || 10;
        this.totalRoundsDisplay.textContent = this.maxRounds;
    }

    async startDebate() {
        if (this.isDebateActive) return;

        this.isDebateActive = true;
        this.debateStartTime = Date.now();
        this.currentRound = 0;
        this.debate = [];

        // Update UI
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.themeInput.disabled = true;
        this.maxRoundsInput.disabled = true;

        // Clear transcript and add welcome message
        this.transcript.innerHTML = '';

        // Scroll to the chat area
        this.scrollToChat();

        // Start the debate
        await this.runDebate();
    }

    stopDebate() {
        this.isDebateActive = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.themeInput.disabled = false;
        this.maxRoundsInput.disabled = false;
        this.hideTypingIndicator();
        this.updateAIStatus('ready');

        // Hide integrated response controls
        this.hideResponseControls();
    }

    resetDebate() {
        this.stopDebate();
        this.debate = [];
        this.currentRound = 0;
        this.debateHistory = [];
        this.debateStartTime = null;
        this.debateId = null;
        this.updateUI();

        // Hide integrated response controls
        this.hideResponseControls();

        // Clear transcript and show welcome message
        this.transcript.innerHTML = `
            <div class="welcome-message">
                <div class="message-content">
                    <i class="fas fa-info-circle"></i>
                    <p>¡Bienvenido a la Arena de Debate IA! Configura el tema del debate y las rondas máximas, luego haz clic en "Iniciar Debate" para comenzar la batalla.</p>
                </div>
            </div>
        `;

        this.updateAIStatus('ready');
    }

    showButton(button) {
        button.style.display = 'flex';
    }

    hideButton(button) {
        button.style.display = 'none';
    }

    enableButton(button) {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }

    disableButton(button) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
    }

    showResponseControls() {
        this.responseControls.style.display = 'block';
    }

    hideResponseControls() {
        this.responseControls.style.display = 'none';
    }

    updateResponseRound(round) {
        this.responseRound.textContent = round;
    }

    async runDebate() {
        const theme = this.themeInput.value.trim() || 'General Debate';

        try {
            // Start the debate with AI1's first message
            this.currentRound = 1;
            this.updateUI();

            this.updateAIStatus('thinking', 'ai1');
            this.showTypingIndicator();
            this.disableButton(this.generateAI1Btn);
            this.disableButton(this.generateAI2Btn);

            const startResponse = await this.apiCall('/debate/start', {
                theme,
                maxRounds: this.maxRounds
            });

            if (startResponse.error) {
                throw new Error(startResponse.error);
            }

            this.debateId = startResponse.debateId;
            this.addMessage('AI Warrior 1', startResponse.response, 'ai1');
            this.hideTypingIndicator();
            this.updateAIStatus('ready', 'ai1');

            // Show integrated response controls for AI2
            this.showResponseControls();
            this.updateResponseRound(1);
            this.disableButton(this.generateAI1Btn);
            this.enableButton(this.generateAI2Btn);

        } catch (error) {
            console.error('Debate error:', error);
            this.addSystemMessage(`❌ An error occurred during the debate: ${error.message}. Please check that the server is running.`);
            this.stopDebate();
        }
    }

    async generateAI1Response() {
        if (!this.debateId || !this.isDebateActive) return;

        try {
            this.updateAIStatus('thinking', 'ai1');
            this.showTypingIndicator();
            this.disableButton(this.generateAI1Btn);
            this.disableButton(this.generateAI2Btn);

            const response = await this.apiCall('/debate/next-round', {
                debateId: this.debateId
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.addMessage('AI Warrior 1', response.response, 'ai1');
            this.hideTypingIndicator();
            this.updateAIStatus('ready', 'ai1');

            // Show integrated controls for AI2
            this.updateResponseRound(this.currentRound);
            this.disableButton(this.generateAI1Btn);
            this.enableButton(this.generateAI2Btn);

        } catch (error) {
            console.error('AI1 response error:', error);
            this.addSystemMessage(`❌ Error generando respuesta de AI1: ${error.message}`);
            this.stopDebate();
        }
    }

    async generateAI2Response() {
        if (!this.debateId || !this.isDebateActive) return;

        try {
            this.updateAIStatus('thinking', 'ai2');
            this.showTypingIndicator();
            this.disableButton(this.generateAI1Btn);
            this.disableButton(this.generateAI2Btn);

            const response = await this.apiCall('/debate/continue', {
                debateId: this.debateId
            });

            if (response.error) {
                throw new Error(response.error);
            }

            if (response.finished) {
                this.addSystemMessage('🎉 Debate completed! The battle has ended.');
                this.stopDebate();
                return;
            }

            this.addMessage('AI Warrior 2', response.response, 'ai2');
            this.hideTypingIndicator();
            this.updateAIStatus('ready', 'ai2');

            // Check if we've reached max rounds
            if (this.currentRound >= this.maxRounds) {
                this.addSystemMessage('🎉 Debate completed! The battle has ended.');
                this.stopDebate();
                return;
            }

            // Show integrated controls for AI1 in next round
            this.currentRound++;
            this.updateUI();
            this.updateResponseRound(this.currentRound);
            this.disableButton(this.generateAI2Btn);
            this.enableButton(this.generateAI1Btn);

        } catch (error) {
            console.error('AI2 response error:', error);
            this.addSystemMessage(`❌ Error generando respuesta de AI2: ${error.message}`);
            this.stopDebate();
        }
    }

    async apiCall(endpoint, data) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call to ${endpoint} failed:`, error);
            return { error: error.message };
        }
    }

    addMessage(sender, content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        // Create message elements
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

        const senderSpan = document.createElement('span');
        senderSpan.className = 'message-sender';
        senderSpan.textContent = sender;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = new Date().toLocaleTimeString();

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);

        // Assemble the message
        headerDiv.appendChild(avatarDiv);
        headerDiv.appendChild(senderSpan);
        headerDiv.appendChild(timeSpan);
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);

        this.transcript.appendChild(messageDiv);
        this.debate.push(content);
        this.debateHistory.push({
            sender,
            content,
            type,
            timestamp: new Date(),
            round: this.currentRound
        });

        // Improved auto-scroll with timeout to ensure DOM is updated
        setTimeout(() => {
            this.scrollToLatestMessage();
        }, 50);

        // Update stats
        this.updateUI();
    }

    scrollToLatestMessage() {
        // Get the latest message
        const messages = this.transcript.querySelectorAll('.message');
        const latestMessage = messages[messages.length - 1];

        if (latestMessage) {
            // Scroll the transcript container to show the latest message
            this.transcript.scrollTop = this.transcript.scrollHeight;

            // Also scroll the main page to ensure the chat area is visible
            const chatArea = document.querySelector('.debate-display');
            if (chatArea) {
                chatArea.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.style.textAlign = 'left';
        contentDiv.style.fontWeight = '500';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);
        this.transcript.appendChild(messageDiv);

        // Use improved scrolling
        setTimeout(() => {
            this.scrollToLatestMessage();
        }, 50);
    }

    formatMessage(content) {
        // Escape HTML entities first to prevent XSS and ensure proper rendering
        let formatted = this.escapeHtml(content);

        // Handle line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        // Handle markdown-style formatting
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');

        // Handle code blocks
        formatted = formatted
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        // Handle quotes
        formatted = formatted.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // Handle lists
        formatted = formatted
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            .replace(/^- (.+)$/gm, '<li>$1</li>');

        // Wrap consecutive list items
        formatted = formatted.replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');

        // Handle paragraphs (double line breaks)
        formatted = formatted.replace(/\n\n/g, '</p><p>');
        if (!formatted.startsWith('<p>') && !formatted.startsWith('<')) {
            formatted = '<p>' + formatted + '</p>';
        }

        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    updateAIStatus(status, ai = null) {
        const statusElement = ai === 'ai1' ? this.ai1Status : ai === 'ai2' ? this.ai2Status : null;

        if (statusElement) {
            statusElement.style.background = status === 'thinking' ? '#ffa726' :
                                          status === 'ready' ? '#2ed573' :
                                          '#8892a0';
            statusElement.style.boxShadow = status === 'thinking' ? '0 0 10px #ffa726' :
                                          status === 'ready' ? '0 0 10px #2ed573' :
                                          'none';
        }

        // Update status text
        const statusText = status === 'thinking' ? 'Thinking...' :
                          status === 'ready' ? 'Ready' :
                          'Inactive';

        if (ai === 'ai1') {
            document.querySelector('.ai1-fighter .status-text').textContent = statusText;
        } else if (ai === 'ai2') {
            document.querySelector('.ai2-fighter .status-text').textContent = statusText;
        }
    }

    handleSearch() {
        const query = this.searchInput.value.toLowerCase().trim();

        if (!query) {
            // Reset all messages to visible
            document.querySelectorAll('.message').forEach(msg => {
                msg.style.display = 'block';
                msg.style.opacity = '1';
            });
            this.searchResults = 0;
            this.updateUI();
            return;
        }

        let results = 0;
        document.querySelectorAll('.message').forEach(msg => {
            const content = msg.textContent.toLowerCase();
            if (content.includes(query)) {
                msg.style.display = 'block';
                msg.style.opacity = '1';
                results++;
            } else {
                msg.style.display = 'none';
                msg.style.opacity = '0.3';
            }
        });

        this.searchResults = results;
        this.updateUI();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    scrollToChat() {
        // Scroll to the debate display area
        const chatArea = document.querySelector('.debate-display');
        if (chatArea) {
            chatArea.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}

// Initialize the debate arena when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing DebateArena...');

    try {
        const arena = new DebateArena();
        console.log('DebateArena initialized successfully');

        // Add some keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        if (!arena.isDebateActive) {
                            console.log('Starting debate via keyboard shortcut');
                            arena.startDebate();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        console.log('Resetting debate via keyboard shortcut');
                        arena.resetDebate();
                        break;
                }
            }
        });

        // Make arena available globally for debugging
        window.arena = arena;
        console.log('Arena available as window.arena for debugging');

    } catch (error) {
        console.error('Error initializing DebateArena:', error);
    }
});

// Add loading animation to the page
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    console.log('Page fully loaded');
});
