// DOM Elements
const messagesEl = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');

// Welcome screen elements
const welcomeScreen = document.getElementById('welcome-screen');
const chatInterface = document.getElementById('chat-interface');
const welcomeForm = document.getElementById('welcome-form');
const welcomeInput = document.getElementById('welcome-input');
const welcomeSendBtn = document.getElementById('welcome-send-btn');
const chatSendBtn = document.getElementById('chat-send-btn');

// Custom select elements (removed - only sidebar model selector remains)

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const settingsBtn = document.getElementById('settings-btn');
const modelSelectSidebar = document.getElementById('model-select-sidebar');
const customSelectSidebar = document.getElementById('custom-model-select-sidebar');
const selectTriggerSidebar = document.getElementById('select-trigger-sidebar');
const selectValueSidebar = selectTriggerSidebar.querySelector('.select-value-sidebar');
const selectOptionsSidebar = document.getElementById('select-options-sidebar');
const historyList = document.getElementById('history-list');

// Settings modal elements
const settingsModal = document.getElementById('settings-modal');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const modelsList = document.getElementById('models-list');
const addModelOption = document.getElementById('add-model-option');
const selectOptionsScroll = document.getElementById('select-options-scroll');

// State
let isInChatMode = false;
let currentStreamController = null;
let isStreaming = false;
let userScrolledUp = false;
let conversationHistory = [];
let currentConversationId = null;
let activeModels = new Set(); // Track which models are enabled

// Auto-resize textarea function
function autoResizeTextarea(textarea) {
	textarea.style.height = 'auto';
	textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Check if user has scrolled up
function checkUserScroll() {
	const messagesContainer = messagesEl;
	const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 10;
	userScrolledUp = !isAtBottom;
}

// Smart scroll function - only scroll if user hasn't manually scrolled up
function smartScroll() {
	if (!userScrolledUp) {
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}
}

// Conversation history management
function generateConversationId() {
	return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createConversation(title, model) {
	const conversation = {
		id: generateConversationId(),
		title: title,
		model: model,
		messages: [],
		createdAt: new Date(),
		updatedAt: new Date()
	};
	conversationHistory.unshift(conversation);
	saveConversationHistory();
	renderConversationHistory();
	return conversation;
}

function updateConversation(conversationId, message) {
	const conversation = conversationHistory.find(c => c.id === conversationId);
	if (conversation) {
		conversation.messages.push(message);
		conversation.updatedAt = new Date();
		// Update title if it's the first user message
		if (conversation.messages.length === 1 && message.role === 'user') {
			conversation.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
		}
		saveConversationHistory();
		renderConversationHistory();
	}
}

function deleteConversation(conversationId) {
	conversationHistory = conversationHistory.filter(c => c.id !== conversationId);
	saveConversationHistory();
	renderConversationHistory();
	
	// If we deleted the current conversation, switch to welcome mode
	if (currentConversationId === conversationId) {
		switchToWelcomeMode();
	}
}

function loadConversation(conversationId) {
	const conversation = conversationHistory.find(c => c.id === conversationId);
	if (conversation) {
		currentConversationId = conversationId;
		
		// Clear current messages
		messagesEl.innerHTML = '';
		
		// Load conversation messages
		conversation.messages.forEach(msg => {
			if (msg.role === 'user') {
				// User messages: preserve formatting
				appendMessage(msg.content, msg.role);
			} else {
				// Bot messages: render as markdown
				const botEl = document.createElement('div');
				botEl.className = 'message bot';
				botEl.innerHTML = renderMarkdownToHtml(msg.content);
				messagesEl.appendChild(botEl);
				
				// Apply syntax highlighting and copy buttons
				try {
					if (typeof Prism !== 'undefined') {
						botEl.querySelectorAll('pre code').forEach(block => { 
							try{ 
								Prism.highlightElement(block); 
							} catch(e){} 
						});
					}
					addCopyButtons(botEl);
				} catch (e) {
					console.error('Post-render enhancements failed', e);
				}
			}
		});
		
		// Switch to chat mode
		switchToChatMode(conversation.model);
		
		// Update active conversation in history
		renderConversationHistory();
	}
}

function saveConversationHistory() {
	localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
}

// Active models management
function saveActiveModels() {
	localStorage.setItem('activeModels', JSON.stringify(Array.from(activeModels)));
}

function loadActiveModels() {
	const saved = localStorage.getItem('activeModels');
	if (saved) {
		try {
			activeModels = new Set(JSON.parse(saved));
		} catch (e) {
			console.error('Failed to load active models:', e);
			activeModels = new Set();
		}
	}
	
	// If no active models are saved, enable the first few models by default
	if (activeModels.size === 0) {
		const defaultModels = [
			"deepseek/deepseek-chat-v3.1:free",
			"openai/gpt-oss-20b:free",
			"meta-llama/llama-3.3-70b-instruct:free",
			"google/gemini-2.0-flash-exp:free"
		];
		defaultModels.forEach(model => activeModels.add(model));
		saveActiveModels();
	}
}

function loadConversationHistory() {
	const saved = localStorage.getItem('conversationHistory');
	if (saved) {
		try {
			conversationHistory = JSON.parse(saved);
			// Convert date strings back to Date objects
			conversationHistory.forEach(conv => {
				conv.createdAt = new Date(conv.createdAt);
				conv.updatedAt = new Date(conv.updatedAt);
			});
		} catch (e) {
			console.error('Failed to load conversation history:', e);
			conversationHistory = [];
		}
	}
	renderConversationHistory();
}

function renderConversationHistory() {
	historyList.innerHTML = '';
	
	conversationHistory.forEach(conversation => {
		const historyItem = document.createElement('div');
		historyItem.className = 'history-item';
		if (conversation.id === currentConversationId) {
			historyItem.classList.add('active');
		}
		
		historyItem.innerHTML = `
			<div class="history-item-title">${conversation.title}</div>
			<div class="history-item-date">${formatDate(conversation.updatedAt)}</div>
			<button class="history-item-delete" onclick="deleteConversation('${conversation.id}')">×</button>
		`;
		
		historyItem.addEventListener('click', (e) => {
			if (!e.target.classList.contains('history-item-delete')) {
				loadConversation(conversation.id);
			}
		});
		
		historyList.appendChild(historyItem);
	});
}

function formatDate(date) {
	const now = new Date();
	const diff = now - date;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);
	
	if (minutes < 1) return 'Şimdi';
	if (minutes < 60) return `${minutes} dk önce`;
	if (hours < 24) return `${hours} saat önce`;
	if (days < 7) return `${days} gün önce`;
	return date.toLocaleDateString('tr-TR');
}

// Custom select functionality (removed - only sidebar model selector remains)

// Sidebar custom select functionality
function setupSidebarCustomSelect() {
	// Toggle dropdown
	selectTriggerSidebar.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleSidebarSelect();
	});
	
	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		if (!customSelectSidebar.contains(e.target)) {
			closeSidebarSelect();
		}
	});
	
	// Handle keyboard navigation
	selectTriggerSidebar.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleSidebarSelect();
		} else if (e.key === 'Escape') {
			closeSidebarSelect();
		}
	});
}

function toggleSidebarSelect() {
	const isOpen = selectOptionsSidebar.classList.contains('open');
	if (isOpen) {
		closeSidebarSelect();
	} else {
		openSidebarSelect();
	}
}

function openSidebarSelect() {
	selectOptionsSidebar.classList.add('open');
	selectTriggerSidebar.classList.add('active');
	selectTriggerSidebar.setAttribute('aria-expanded', 'true');
}

function closeSidebarSelect() {
	selectOptionsSidebar.classList.remove('open');
	selectTriggerSidebar.classList.remove('active');
	selectTriggerSidebar.setAttribute('aria-expanded', 'false');
}

function selectSidebarOption(value, text) {
	selectValueSidebar.textContent = text;
	modelSelectSidebar.value = value;
	
	// Update selected state
	selectOptionsSidebar.querySelectorAll('.select-option-sidebar').forEach(option => {
		option.classList.remove('selected');
		if (option.dataset.value === value) {
			option.classList.add('selected');
		}
	});
	
	closeSidebarSelect();
}

// Update send button state
function updateSendButtonState(isStreaming) {
	if (isInChatMode) {
		chatSendBtn.disabled = false; // Always enabled
		const icon = chatSendBtn.querySelector('.btn-icon');
		if (isStreaming) {
			icon.src = '../assets/stop.svg';
			icon.alt = 'Durdur';
			chatSendBtn.classList.add('stop-stream-btn');
		} else {
			icon.src = '../assets/send.svg';
			icon.alt = 'Gönder';
			chatSendBtn.classList.remove('stop-stream-btn');
		}
	} else {
		welcomeSendBtn.disabled = false; // Always enabled
		const icon = welcomeSendBtn.querySelector('.btn-icon');
		if (isStreaming) {
			icon.src = '../assets/stop.svg';
			icon.alt = 'Durdur';
			welcomeSendBtn.classList.add('stop-stream-btn');
		} else {
			icon.src = '../assets/send.svg';
			icon.alt = 'Gönder';
			welcomeSendBtn.classList.remove('stop-stream-btn');
		}
	}
}

// Handle textarea keyboard events
function setupTextareaHandlers(textarea, form) {
	textarea.addEventListener('input', () => {
		autoResizeTextarea(textarea);
	});
	
	textarea.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			if (e.shiftKey) {
				// Shift+Enter: Allow new line (default behavior)
				// Do nothing, let the default behavior happen
			} else {
				// Enter alone: Send message
				e.preventDefault();
				form.dispatchEvent(new Event('submit'));
			}
		}
	});
}

function appendMessage(text, role = 'bot'){
	const el = document.createElement('div');
	el.className = 'message ' + role;
	
	if (role === 'user') {
		// Kullanıcı mesajları için satır sonlarını koru ve HTML'i güvenli hale getir
		const escapedText = escapeHtml(text);
		el.innerHTML = escapedText.replace(/\n/g, '<br>');
	} else {
		// Bot mesajları için normal textContent kullan
		el.textContent = text;
	}
	
	messagesEl.appendChild(el);
	messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Create an empty bot message element and return it
function createBotMessage(){
    const el = document.createElement('div');
    el.className = 'message bot';
    el.textContent = '';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
}

// Typewriter effect: progressively writes `text` into `el`
function typeWrite(el, text, speed = 0.1){
    return new Promise((resolve) => {
        let i = 0;
        el.textContent = '';
        function step(){
            if (i < text.length && isStreaming){
                el.textContent += text[i++];
                smartScroll();
                // small variation in delay for a more natural feel
                const jitter = Math.random() * 0.05; // Çok küçük jitter
                setTimeout(step, speed + jitter);
            } else {
                resolve();
            }
        }
        step();
    });
}

// Typewriter that renders Markdown progressively. On each character appended,
// it converts the accumulated buffer to HTML via renderMarkdownToHtml and injects
// it into `el`. This allows code blocks and other markdown to appear gradually.
function typeWriteMarkdown(el, text, speed = 0.1){
    return new Promise((resolve) => {
        let i = 0;
        let buffer = '';
        el.innerHTML = '';
        function step(){
            if (i < text.length && isStreaming){
                buffer += text[i++];
                try{
                    const html = renderMarkdownToHtml(buffer);
                    el.innerHTML = html;
                    // highlight code blocks incrementally with Prism.js
                    if (typeof Prism !== 'undefined'){
                        el.querySelectorAll('pre code').forEach(block => { 
                            try{ 
                                Prism.highlightElement(block); 
                            } catch(e){} 
                        });
                    }
                } catch (e){
                    // fallback to plain text when render fails mid-stream
                    el.textContent = buffer;
                }
                smartScroll();
                const jitter = Math.random() * 0.05; // Çok küçük jitter
                setTimeout(step, speed + jitter);
            } else {
                resolve();
            }
        }
        step();
    });
}

// Add copy buttons to code blocks inside a container
function addCopyButtons(container){
    if (!container) return;
    const pres = container.querySelectorAll('pre');
    pres.forEach(pre => {
        if (pre.dataset.copy === 'true') return;
        pre.dataset.copy = 'true';
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.title = 'Kodu kopyala';
        btn.textContent = 'Copy';
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(pre.innerText);
                const old = btn.textContent;
                btn.textContent = 'Copied';
                setTimeout(() => btn.textContent = old, 1500);
            } catch (e) {
                btn.textContent = 'Err';
                setTimeout(() => btn.textContent = 'Copy', 1500);
            }
        });
        pre.appendChild(btn);
    });
}

// Escape HTML special chars
function escapeHtml(str){
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Basic URL sanitizer (allow only http[s] and mailto)
function sanitizeUrl(url){
    try {
        const u = url.trim();
        if (/^(https?:|mailto:)/i.test(u)) return u;
    } catch (e) {}
    return '#';
}

// Render a subset of Markdown -> safe HTML. This is lightweight and
// intended for UI display, not a full markdown implementation.
// When available, prefer using marked + DOMPurify + Prism.js for full
// markdown rendering. Fallback to the simple renderer above if not loaded.
function renderMarkdownToHtml(md){
    if (!md) return '';
    // prefer library-based rendering when available
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined'){
        try{
            // Configure Prism.js integration with marked
            if (typeof Prism !== 'undefined'){
                marked.setOptions({
                    highlight: function(code, lang){
                        try{
                            if (lang && Prism.languages[lang]){
                                return Prism.highlight(code, Prism.languages[lang], lang);
                            }
                            return Prism.highlight(code, Prism.languages.auto, 'auto');
                        } catch (e){
                            return escapeHtml(code);
                        }
                    }
                });
            }

            const raw = marked.parse(md);
            // sanitize generated HTML before injecting
            return DOMPurify.sanitize(raw, {ADD_ATTR: ['target']});
        } catch (e){
            console.error('marked/DOMPurify render failed', e);
            // fallback to basic escape
            return escapeHtml(md).replace(/\n/g, '<br>');
        }
    }

    // Fallback: simple renderer (escape + paragraphs)
    return escapeHtml(md).replace(/\n/g, '<br>');
}

function extractTextFromResponse(data){
	if (data?.choices && data.choices[0]?.message?.content) return data.choices[0].message.content;
	if (typeof data === 'string') return data;
	if (data?.output) return data.output;
	return JSON.stringify(data);
}

async function fetchModels(){
	// Complete list of available models
	return [
		"deepseek/deepseek-chat-v3.1:free",
		"deepseek/deepseek-chat-v3-0324:free",
		"deepseek/deepseek-r1-0528:free",
		"deepseek/deepseek-r1:free",
		"tngtech/deepseek-r1t2-chimera:free",
		"qwen/qwen3-coder:free",
		"z-ai/glm-4.5-air:free",
		"tngtech/deepseek-r1t-chimera:free",
		"moonshotai/kimi-k2:free",
		"qwen/qwen3-235b-a22b:free",
		"meta-llama/llama-3.3-70b-instruct:free",
		"google/gemini-2.0-flash-exp:free",
		"microsoft/mai-ds-r1:free",
		"mistralai/mistral-small-3.2-24b-instruct:free",
		"openai/gpt-oss-20b:free",
		"qwen/qwen2.5-vl-72b-instruct:free",
		"deepseek/deepseek-r1-0528-qwen3-8b:free",
		"cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
		"meta-llama/llama-4-maverick:free",
		"qwen/qwen3-14b:free",
		"mistralai/mistral-nemo:free",
		"deepseek/deepseek-r1-distill-llama-70b:free",
		"google/gemma-3-27b-it:free",
		"qwen/qwen-2.5-coder-32b-instruct:free",
		"moonshotai/kimi-dev-72b:free",
		"meta-llama/llama-3.1-405b-instruct:free",
		"agentica-org/deepcoder-14b-preview:free",
		"mistralai/mistral-7b-instruct:free",
		"qwen/qwen3-30b-a3b:free",
		"meta-llama/llama-3.3-8b-instruct:free",
		"meta-llama/llama-4-scout:free",
		"qwen/qwen-2.5-72b-instruct:free",
		"mistralai/mistral-small-3.1-24b-instruct:free",
		"qwen/qwen3-8b:free",
		"qwen/qwen3-4b:free",
		"qwen/qwq-32b:free",
		"cognitivecomputations/dolphin3.0-mistral-24b:free",
		"shisa-ai/shisa-v2-llama3.3-70b:free",
		"mistralai/devstral-small-2505:free",
		"nousresearch/deephermes-3-llama-3-8b-preview:free",
		"meta-llama/llama-3.2-3b-instruct:free",
		"qwen/qwen2.5-vl-32b-instruct:free",
		"moonshotai/kimi-vl-a3b-thinking:free",
		"nvidia/nemotron-nano-9b-v2:free",
		"openai/gpt-oss-120b:free",
		"tencent/hunyuan-a13b-instruct:free",
		"mistralai/mistral-small-24b-instruct-2501:free",
		"google/gemma-3n-e2b-it:free",
		"google/gemma-2-9b-it:free",
		"google/gemma-3-12b-it:free",
		"arliai/qwq-32b-arliai-rpr-v1:free",
		"cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
		"google/gemma-3-4b-it:free",
		"google/gemma-3n-e4b-it:free",
		"nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
		"rekaai/reka-flash-3:free",
		"deepseek/deepseek-r1-distill-qwen-14b:free"
	];
}

// Switch to chat mode
function switchToChatMode(selectedModel) {
	welcomeScreen.style.display = 'none';
	chatInterface.style.display = 'flex';
	isInChatMode = true;
	
	// Focus on chat input
	input.focus();
}

// Switch back to welcome mode
function switchToWelcomeMode() {
	chatInterface.style.display = 'none';
	welcomeScreen.style.display = 'flex';
	isInChatMode = false;
	
	// Clear messages
	messagesEl.innerHTML = '';
	
	// Clear input fields
	input.value = '';
	welcomeInput.value = '';
	
	// Reset textarea heights
	autoResizeTextarea(input);
	autoResizeTextarea(welcomeInput);
	
	// Clear current conversation
	currentConversationId = null;
	
	// Update active conversation in history
	renderConversationHistory();
	
	// Focus on welcome input
	welcomeInput.focus();
}

async function populateModels(){
	// Clear existing options
	modelSelectSidebar.innerHTML = '';
	selectOptionsScroll.innerHTML = '';
	
	const allModels = await fetchModels();
	const activeModelsList = allModels.filter(model => activeModels.has(model));
	
	if (activeModelsList.length === 0) {
		selectValueSidebar.textContent = 'Model seçiliyor...';
		return;
	}
	
	activeModelsList.forEach((m, idx) => {
		// Add to sidebar model select (hidden)
		const optSidebar = document.createElement('option');
		optSidebar.value = m;
		optSidebar.textContent = m;
		if (idx === 0) optSidebar.selected = true;
		modelSelectSidebar.appendChild(optSidebar);
		
		// Add to sidebar custom select scroll container
		const sidebarOption = document.createElement('div');
		sidebarOption.className = 'select-option-sidebar';
		sidebarOption.dataset.value = m;
		sidebarOption.textContent = m;
		if (idx === 0) {
			sidebarOption.classList.add('selected');
			selectValueSidebar.textContent = m;
		}
		
		sidebarOption.addEventListener('click', () => {
			selectSidebarOption(m, m);
		});
		
		selectOptionsScroll.appendChild(sidebarOption);
	});
}

// Welcome form submit handler
welcomeForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	const text = welcomeInput.value.trim();
	if (!text) return;
	
	const selectedModel = modelSelectSidebar.value;
	
	// Switch to chat mode
	switchToChatMode(selectedModel);
	
	// Process the message
	await processMessage(text, selectedModel);
});

// Chat form submit handler
form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const text = input.value.trim();
	if (!text) return;
	
	const model = modelSelectSidebar.value; // Use the sidebar model
	await processMessage(text, model);
});

// Process message function
async function processMessage(text, model) {
	// Create new conversation if we're starting fresh
	if (!currentConversationId) {
		const conversation = createConversation(text, model);
		currentConversationId = conversation.id;
	}
	
	// Add user message
	appendMessage(text, 'user');
	
	// Save user message to conversation
	updateConversation(currentConversationId, { role: 'user', content: text });
	
	// Clear input
	if (isInChatMode) {
		input.value = '';
		input.disabled = true;
	} else {
		welcomeInput.value = '';
		welcomeInput.disabled = true;
	}
	
	// Show thinking indicator
	const typingEl = document.createElement('div');
	typingEl.className = 'message typing';
	typingEl.innerHTML = '<span>Düşünüyor</span><div class="thinking-dots"><span></span><span></span><span></span></div>';
	messagesEl.appendChild(typingEl);
	smartScroll();
	
	// Set streaming state and update button
	isStreaming = true;
	userScrolledUp = false; // Reset scroll state for new message
	updateSendButtonState(true);
	
	try {
		// Create AbortController for stream cancellation
		currentStreamController = new AbortController();
		
		// Geçmiş sohbetleri al
		const currentConversation = conversationHistory.find(c => c.id === currentConversationId);
		const conversationHistoryForAPI = currentConversation ? currentConversation.messages : [];
		
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				message: text, 
				model, 
				conversationHistory: conversationHistoryForAPI 
			}),
			signal: currentStreamController.signal
		});
		
		const data = await res.json();
		typingEl.remove();
		
		if (isStreaming) { // Only proceed if not stopped
			const reply = extractTextFromResponse(data) || 'Boş yanıt';
			
			// Save bot message to conversation
			updateConversation(currentConversationId, { role: 'bot', content: reply });
			
			// create bot message and render it with typewriter effect
			const botEl = createBotMessage();
			// render progressively as Markdown using the markdown-aware typewriter
			await typeWriteMarkdown(botEl, reply, 0.1);
			// final enhancements: syntax highlight and copy buttons
			try {
				if (typeof Prism !== 'undefined') {
					botEl.querySelectorAll('pre code').forEach(block => { try{ Prism.highlightElement(block); } catch(e){} });
				}
				addCopyButtons(botEl);
			} catch (e) {
				console.error('Post-render enhancements failed', e);
			}
		}
	} catch (err) {
		if (err.name !== 'AbortError') {
			typingEl.remove();
			appendMessage('Sunucu hatası: ' + String(err), 'bot');
		}
	} finally {
		// Reset streaming state and update button
		isStreaming = false;
		currentStreamController = null;
		updateSendButtonState(false);
		
		// Re-enable input
		if (isInChatMode) {
			input.disabled = false;
			input.focus();
		} else {
			welcomeInput.disabled = false;
			welcomeInput.focus();
		}
	}
}

// Stop stream function
function stopStream() {
	// Stop streaming first
	isStreaming = false;
	
	// Abort the fetch request
	if (currentStreamController) {
		currentStreamController.abort();
	}
	
	// Update button state
	updateSendButtonState(false);
	
	// Remove typing indicator
	const typing = document.querySelector('.message.typing');
	if (typing) typing.remove();
	
	// Re-enable input
	if (isInChatMode) {
		input.disabled = false;
		input.focus();
	} else {
		welcomeInput.disabled = false;
		welcomeInput.focus();
	}
}

// Change model button handler (removed - model selection only in sidebar)

// Settings modal functionality
function openSettingsModal() {
	settingsModal.classList.add('open');
	populateModelsList();
}

function closeSettingsModal() {
	settingsModal.classList.remove('open');
}

function populateModelsList() {
	modelsList.innerHTML = '';
	const models = fetchModels();
	
	models.then(modelList => {
		modelList.forEach(model => {
			const modelItem = document.createElement('div');
			modelItem.className = 'model-item';
			modelItem.dataset.model = model;
			
			const isActive = activeModels.has(model);
			
			modelItem.innerHTML = `
				<span class="model-name">${model}</span>
				<div class="model-controls">
					<span class="model-status">free</span>
					<div class="model-switch ${isActive ? 'active' : ''}" data-model="${model}"></div>
				</div>
			`;
			
			// Add click handler for the switch
			const switchElement = modelItem.querySelector('.model-switch');
			switchElement.addEventListener('click', (e) => {
				e.stopPropagation();
				toggleModelActive(model, switchElement);
			});
			
			modelsList.appendChild(modelItem);
		});
	});
}

function toggleModelActive(model, switchElement) {
	if (activeModels.has(model)) {
		activeModels.delete(model);
		switchElement.classList.remove('active');
	} else {
		activeModels.add(model);
		switchElement.classList.add('active');
	}
	
	saveActiveModels();
	populateModels(); // Refresh the sidebar model list
	
	// If the currently selected model was disabled, select the first available model
	if (!activeModels.has(modelSelectSidebar.value)) {
		const activeModelsList = Array.from(activeModels);
		if (activeModelsList.length > 0) {
			selectSidebarOption(activeModelsList[0], activeModelsList[0]);
		} else {
			selectValueSidebar.textContent = 'Model seçiliyor...';
		}
	}
}

// Settings button handler
settingsBtn.addEventListener('click', () => {
	openSettingsModal();
});

// Add model option handler
addModelOption.addEventListener('click', (e) => {
	e.stopPropagation();
	closeSidebarSelect();
	openSettingsModal();
});

// Settings modal close handlers
settingsClose.addEventListener('click', () => {
	closeSettingsModal();
});

settingsOverlay.addEventListener('click', () => {
	closeSettingsModal();
});

// Close settings modal with Escape key
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && settingsModal.classList.contains('open')) {
		closeSettingsModal();
	}
});

// New chat button handler
newChatBtn.addEventListener('click', () => {
	switchToWelcomeMode();
});

// Initialize
loadActiveModels();
populateModels();

// Setup custom selects
setupSidebarCustomSelect();

// Setup textarea handlers
setupTextareaHandlers(welcomeInput, welcomeForm);
setupTextareaHandlers(input, form);

// Setup scroll listener for smart scrolling
messagesEl.addEventListener('scroll', checkUserScroll);

// Setup send button click handlers
welcomeSendBtn.addEventListener('click', (e) => {
	if (isStreaming) {
		e.preventDefault();
		stopStream();
	}
});

chatSendBtn.addEventListener('click', (e) => {
	if (isStreaming) {
		e.preventDefault();
		stopStream();
	}
});

// Load conversation history
loadConversationHistory();

welcomeInput.focus();
