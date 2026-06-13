document.addEventListener('DOMContentLoaded', () => {
    const isFileProtocol = window.location.protocol === 'file:';
    const PROD_API_URL = '';
    let API_BASE_URL;

    if (PROD_API_URL) {
        API_BASE_URL = PROD_API_URL;
    } else if (isFileProtocol) {
        API_BASE_URL = 'http://localhost:8000';
    } else {
        API_BASE_URL = window.location.origin;
    }
    // DOM Element Targets
    const selectionGrid = document.getElementById('selection-grid');
    const viewContainer = document.querySelector('.feature-view-container');
    const featureCards = document.querySelectorAll('.feature-card');
    const backBtn = document.getElementById('back-to-hub');
    const dynamicPanels = document.querySelectorAll('.dynamic-panel');
    const username = document.querySelector('.username');
    const avatar = document.querySelector('.avatar');

    const storedUser = JSON.parse(sessionStorage.getItem('eduai_user') || 'null');

    if (storedUser?.first_name) {
        username.textContent = storedUser.first_name;
        avatar.textContent = storedUser.first_name.slice(0, 2).toUpperCase();
    } else {
        // Redirect to login if user is not authenticated
        window.location.href = '/';
        return;
    }

    // --- Profile Dropdown & Logout Logic ---
    const userProfileBtn = document.getElementById('user-profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (userProfileBtn && profileDropdown && logoutBtn) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });

        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            logoutBtn.innerHTML = 'Logging out...';
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST'
                });
            } catch (err) {
                console.error('Logout error:', err);
            } finally {
                sessionStorage.clear();
                localStorage.clear();
                const chatOutput = document.getElementById('chat-output');
                const notesOutput = document.getElementById('notes-output');
                const researchLogs = document.getElementById('research-logs');
                if (chatOutput) chatOutput.innerHTML = '';
                if (notesOutput) notesOutput.innerHTML = '';
                if (researchLogs) researchLogs.innerHTML = '';
                window.location.href = '/';
            }
        });
    }
    // ---------------------------------------

    // 1. Navigation Flow: Selecting an Option Card
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetPanelId = card.getAttribute('data-action');

            // Prevent opening WIP sections (removed for research-section)

            // Hide selection interface grid
            selectionGrid.classList.remove('active');

            // Show dynamic functionality interface container
            viewContainer.classList.add('active');

            // Activate the corresponding custom panel view
            dynamicPanels.forEach(panel => {
                if (panel.id === targetPanelId) {
                    panel.classList.add('active');
                    if (targetPanelId === 'rag-section') {
                        loadChatSessions();
                    }
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    });

    // 2. Navigation Flow: Back to Dashboard Selection Hub
    backBtn.addEventListener('click', () => {
        viewContainer.classList.remove('active');
        dynamicPanels.forEach(panel => panel.classList.remove('active'));
        selectionGrid.classList.add('active');
    });

    // 3. RAG Chat Simulation
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatOutput = document.getElementById('chat-output');
    const strictDocsToggle = document.getElementById('strict-docs-toggle');
    const ragFileInput = document.getElementById('rag-file-input');
    const ragFileName = document.getElementById('rag-file-name');
    const uploadRagFileBtn = document.getElementById('upload-rag-file');
    const ragUploadStatus = document.getElementById('rag-upload-status');
    const strictDocsModal = document.getElementById('strict-docs-modal');
    const strictDocsYes = document.getElementById('strict-docs-yes');
    const strictDocsNo = document.getElementById('strict-docs-no');
    let docsAvailable = false;
    let useStrictlyRetriever = false;

    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');
    let currentSessionId = null;

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            currentSessionId = null;
            document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
            chatOutput.innerHTML = '<div class="message system">System initialized. Awaiting source queries or document specifications...</div>';
        });
    }

    async function loadChatSessions() {
        if (!chatHistoryList) return;
        try {
            const response = await fetch(`${API_BASE_URL}/rag-agent/sessions`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch sessions');
            const sessions = await response.json();

            chatHistoryList.innerHTML = '';
            if (sessions.length === 0) {
                chatHistoryList.innerHTML = '<li class="history-item placeholder">History will load here</li>';
                return;
            }

            sessions.forEach(session => {
                const li = document.createElement('li');
                li.className = 'history-item';
                if (session._id === currentSessionId) {
                    li.classList.add('active');
                }
                li.textContent = session.title || 'Untitled Chat';
                li.addEventListener('click', () => loadChatHistory(session._id, li));
                chatHistoryList.appendChild(li);
            });
        } catch (err) {
            console.error('Error loading sessions:', err);
            chatHistoryList.innerHTML = '<li class="history-item placeholder">History will load here</li>';
        }
    }

    async function loadChatHistory(sessionId, liElement) {
        currentSessionId = sessionId;

        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
        if (liElement) liElement.classList.add('active');

        chatOutput.innerHTML = '';
        appendMsg('Loading history...', 'system', 'history-loader');

        try {
            const response = await fetch(`${API_BASE_URL}/rag-agent/messages/${sessionId}`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();

            const loader = document.getElementById('history-loader');
            if (loader) loader.remove();

            if (messages.length === 0) {
                appendMsg('No messages in this chat.', 'system');
                return;
            }

            messages.forEach(msg => {
                if (msg.role === 'user') {
                    appendMsg(msg.content, 'user');
                } else if (msg.role === 'assistant' || msg.role === 'bot') {
                    appendMsg(msg.content, 'bot');
                }
            });

        } catch (err) {
            console.error('Error loading messages:', err);
            const loader = document.getElementById('history-loader');
            if (loader) loader.remove();
            appendMsg('Failed to load messages.', 'system');
        }
    }

    updateStrictDocsToggle();

    ragFileInput.addEventListener('change', () => {
        const file = ragFileInput.files[0];
        if (file) {
            ragFileName.textContent = `Attached: ${file.name}`;
            ragFileName.style.display = 'inline-block';
            setUploadStatus('', '');
            uploadRagFileBtn.click();
        } else {
            ragFileName.style.display = 'none';
        }
    });

    uploadRagFileBtn.addEventListener('click', async () => {
        const file = ragFileInput.files[0];

        if (!file) {
            setUploadStatus('Choose a document first.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        uploadRagFileBtn.disabled = true;
        uploadRagFileBtn.textContent = 'Uploading...';
        setUploadStatus('Uploading and indexing document...', '');

        try {
            const response = await fetch(`${API_BASE_URL}/rag-agent/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const data = await parseApiResponse(response);

            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, 'Document upload failed'));
            }

            docsAvailable = true;
            setUploadStatus(`${data.message}. ${data.chunks || 0} chunks, ${data.vectors || 0} vectors indexed.`, 'success');
            appendMsg(`Document uploaded: ${file.name}`, 'system');
            updateStrictDocsToggle();
            openStrictDocsModal();
        } catch (error) {
            setUploadStatus(error.message, 'error');
        } finally {
            uploadRagFileBtn.disabled = false;
            uploadRagFileBtn.textContent = 'Upload to RAG';
        }
    });

    strictDocsYes.addEventListener('click', () => {
        useStrictlyRetriever = true;
        updateStrictDocsToggle();
        closeStrictDocsModal();
        appendMsg('Strict document mode enabled. Answers will use only uploaded documents.', 'system');
    });

    strictDocsNo.addEventListener('click', () => {
        useStrictlyRetriever = false;
        updateStrictDocsToggle();
        closeStrictDocsModal();
        appendMsg('Flexible RAG mode enabled. Answers can use documents plus general knowledge.', 'system');
    });

    strictDocsToggle.addEventListener('click', () => {
        if (!docsAvailable) {
            appendMsg('Upload a document before enabling docs-only mode.', 'system');
            return;
        }

        useStrictlyRetriever = !useStrictlyRetriever;
        updateStrictDocsToggle();
        appendMsg(
            useStrictlyRetriever
                ? 'Next questions will use only uploaded documents.'
                : 'Next questions can use uploaded documents plus general knowledge.',
            'system'
        );
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        appendMsg(query, 'user');
        chatInput.value = '';

        const typingId = 'typing-' + Date.now();
        appendMsg('<div class="skeleton-loader title" style="margin-bottom:8px; width:40%;"></div><div class="skeleton-loader text"></div><div class="skeleton-loader text short"></div>', 'bot', typingId);

        try {
            const response = await fetch(`${API_BASE_URL}/rag-agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    user_query: query,
                    docs_available: docsAvailable,
                    use_strictly_retriever: docsAvailable && useStrictlyRetriever,
                }),
                credentials: 'include',
            });
            const data = await parseApiResponse(response);

            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, 'Chat request failed'));
            }

            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            appendMsg(data.result?.final_answer || data.final_answer || data.message || 'No answer returned.', 'bot');

            if (!currentSessionId && data.session_id) {
                currentSessionId = data.session_id;
                loadChatSessions();
            }
        } catch (error) {
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            appendMsg(error.message, 'system');
        }
    });

    function formatMarkdown(text) {
        if (!text) return '';

        let html = text
            // Replace #### Headings
            .replace(/^#### (.*$)/gim, '<h4 class="chat-heading" style="margin-top: 12px; font-size: 1.05rem;">$1</h4>')
            // Replace ### Headings
            .replace(/^### (.*$)/gim, '<h3 class="chat-heading" style="margin-top: 16px; font-size: 1.15rem; color: var(--accent);">$1</h3>')
            // Replace ## Headings
            .replace(/^## (.*$)/gim, '<h2 class="chat-heading" style="margin-top: 20px; font-size: 1.3rem; border-bottom: 1px solid var(--border); padding-bottom: 4px;">$1</h2>')
            // Replace **bold**
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Replace *italic*
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Replace links [text](url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--accent); text-decoration: underline;">$1</a>')
            // Replace bullet points (basic implementation)
            .replace(/^- (.*$)/gim, '<li class="chat-bullet" style="margin-left: 20px;">$1</li>')
            // Format meta fields (formula, example, analogy)
            .replace(/^(formula|example|analogy): (.*$)/gim, '<p class="chat-meta"><strong>$1</strong>: $2</p>');

        html = html.replace(/\n/g, '<br>');

        // Clean up excessive breaks after block elements
        html = html.replace(/<\/h3><br>/g, '</h3>');
        html = html.replace(/<\/ul><br>/g, '</ul>');
        html = html.replace(/<\/p><br>/g, '</p>');
        html = html.replace(/(<br>){2,}/g, '<br>');

        return html;
    }

    function appendMsg(text, type, id = null) {
        const div = document.createElement('div');
        div.classList.add('message', type);
        if (id) div.id = id;
        if (id && (text.includes('typing-dots') || text.includes('skeleton-loader'))) {
            div.innerHTML = text;
        } else if (type === 'bot') {
            div.innerHTML = formatMarkdown(text);
        } else {
            div.textContent = text;
        }
        chatOutput.appendChild(div);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    async function parseApiResponse(response) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }

        return { detail: await response.text() };
    }

    function getApiErrorMessage(data, fallback) {
        if (Array.isArray(data.detail)) {
            return data.detail.map((error) => error.msg).join(' ');
        }

        return data.detail || fallback;
    }

    function setUploadStatus(message, type) {
        ragUploadStatus.textContent = message;
        ragUploadStatus.className = type ? `upload-status ${type}` : 'upload-status';
    }

    function openStrictDocsModal() {
        strictDocsModal.classList.add('active');
        strictDocsModal.setAttribute('aria-hidden', 'false');
    }

    function closeStrictDocsModal() {
        strictDocsModal.classList.remove('active');
        strictDocsModal.setAttribute('aria-hidden', 'true');
    }

    function updateStrictDocsToggle() {
        strictDocsToggle.disabled = !docsAvailable;
        strictDocsToggle.setAttribute('aria-pressed', String(docsAvailable && useStrictlyRetriever));

        if (!docsAvailable) {
            strictDocsToggle.textContent = 'No docs';
            strictDocsToggle.title = 'Upload a document to enable docs-only mode';
            return;
        }

        strictDocsToggle.textContent = useStrictlyRetriever ? 'Docs only' : 'Flexible';
        strictDocsToggle.title = useStrictlyRetriever
            ? 'This question will use only uploaded documents'
            : 'This question can use uploaded documents plus general knowledge';
    }

    // 4. Notes Generation Logic
    const genNotesBtn = document.getElementById('generate-notes-btn');
    const notesOutput = document.getElementById('notes-output');
    const notesFileInput = document.getElementById('notes-file-input');
    const notesFileName = document.getElementById('notes-file-name');

    notesFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            notesFileName.textContent = `Attached: ${e.target.files[0].name}`;
            notesFileName.style.color = 'var(--success)';
            notesFileName.style.fontWeight = 'bold';
        } else {
            notesFileName.textContent = 'PDF, DOCX, TXT, or Markdown';
            notesFileName.style.color = 'var(--text-muted)';
            notesFileName.style.fontWeight = 'normal';
        }
    });

    genNotesBtn.addEventListener('click', async () => {
        if (!notesFileInput.files || notesFileInput.files.length === 0) {
            alert('Please upload a book or document first.');
            return;
        }

        const file = notesFileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        notesOutput.innerHTML = `
            <div style="padding: 20px;">
                <div class="skeleton-loader title"></div>
                <div class="skeleton-loader text"></div>
                <div class="skeleton-loader text"></div>
                <div class="skeleton-loader text short" style="margin-bottom: 30px;"></div>
                <div class="skeleton-loader title" style="width: 45%;"></div>
                <div class="skeleton-loader text"></div>
                <div class="skeleton-loader text short"></div>
                <p style="color: var(--accent); text-align: center; margin-top: 30px; font-weight: 500;">Synthesizing markdown document...</p>
            </div>
        `;
        genNotesBtn.disabled = true;
        genNotesBtn.textContent = "Processing...";

        try {
            const response = await fetch(`${API_BASE_URL}/notebook-agent/generate-notes`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to generate notes');
            }

            const data = await response.json();

            // Format markdown response into HTML
            let formattedNotes = formatMarkdown(data.notes);

            notesOutput.innerHTML = `
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success); border-radius: 4px;">
                    <strong style="color: var(--success)">Success!</strong> Processed ${data.total_windows} overlapping page windows.
                </div>
                ${formattedNotes}
            `;

        } catch (error) {
            notesOutput.innerHTML = `<p style="color: #f87171;">Error: ${error.message}</p>`;
        } finally {
            genNotesBtn.disabled = false;
            genNotesBtn.textContent = "Compile Notes";
        }
    });

    // 5. Research Agent Output Trace Simulation
    const startResearchBtn = document.getElementById('start-research-btn');
    const researchLogs = document.getElementById('research-logs');
    const topicInput = document.getElementById('research-topic');
    let progressInterval = null;

    function renderResearchLoading(topic, isResuming = false) {
        researchLogs.classList.remove('has-results');
        if (progressInterval) clearInterval(progressInterval);

        const statusMessage = isResuming ? "Resuming execution with feedback..." : `Spawning autonomous researcher for: "${topic}"`;

        researchLogs.innerHTML = `
            <div class="research-progress-container">
                <div class="radar-scanner">
                    <div class="radar-ring ring-1"></div>
                    <div class="radar-ring ring-2"></div>
                    <div class="radar-ring ring-3"></div>
                    <div class="radar-dot"></div>
                </div>
                <div class="progress-details" style="width: 100%;">
                    <h4 id="progress-phase-title" style="color: #fff; font-size: 1.1rem; margin-bottom: 6px; font-weight: 600;">Initializing...</h4>
                    <p id="progress-phase-desc" style="color: var(--text-muted); font-size: 0.88rem; max-width: 400px; margin: 0 auto 16px;">${statusMessage}</p>
                    
                    <div class="progress-bar-container" style="width: 280px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin: 0 auto;">
                        <div id="progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--accent), var(--success)); transition: width 0.5s ease; border-radius: 10px;"></div>
                    </div>
                </div>
                <div id="progress-terminal" style="width: 100%; max-width: 500px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 0.78rem; color: #a1a1aa; text-align: left; max-height: 120px; overflow-y: auto; margin: 0 auto;">
                    <div style="color: var(--accent); font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">SYSTEM LOGS</div>
                    <div id="progress-terminal-lines" style="display: flex; flex-direction: column; gap: 4px;">
                        <div>&gt; Spawning autonomous orchestrator graph...</div>
                    </div>
                </div>
            </div>
        `;

        const phaseTitleEl = document.getElementById('progress-phase-title');
        const phaseDescEl = document.getElementById('progress-phase-desc');
        const barFillEl = document.getElementById('progress-bar-fill');
        const terminalLinesEl = document.getElementById('progress-terminal-lines');
        const terminalEl = document.getElementById('progress-terminal');

        const phases = [
            { time: 0, title: "Spawning Agent...", desc: "Initializing autonomous researcher thread." },
            { time: 5, title: "Formulating Query Strategy...", desc: "Analyzing research target and breaking it down into search vectors." },
            { time: 15, title: "Querying Web Databases...", desc: "Executing web queries to search academic papers and technical blogs." },
            { time: 35, title: "Extracting Relevant Content...", desc: "Reading search result pages and extracting content blocks." },
            { time: 65, title: "Synthesizing Concepts...", desc: "Cross-referencing facts, validating credibility, and building outline nodes." },
            { time: 100, title: "Compiling Research Report...", desc: "Orchestrating markdown document sections and formatting final output." }
        ];

        const logPool = [
            "Constructing search objectives from query input...",
            "Sending search queries to web indexer...",
            "Web query returned 8 relevant URLs...",
            "Scraping content snippets from top references...",
            "Evaluating page source content relevance...",
            "Filtering duplicate search information...",
            "Synthesizing key findings and facts...",
            "Verifying search references and citation links...",
            "Structuring Section 1: Introduction & Context...",
            "Structuring Section 2: Technical Deep Dive...",
            "Structuring Section 3: Comparative Analysis...",
            "Structuring Section 4: Performance & Latency...",
            "Generating final markdown output...",
            "Performing self-correction consistency check..."
        ];

        let timeElapsed = 0;
        let lastLogTime = 0;
        let logIndex = 0;

        function updateProgress() {
            timeElapsed += 0.2;
            
            // Asymptotic percentage: never quite reaches 99% until complete
            const percent = 99 * (1 - Math.exp(-timeElapsed / 55));
            if (barFillEl) barFillEl.style.width = `${Math.min(percent, 99)}%`;

            // Update Phase Title & Desc
            let currentPhase = phases[0];
            for (const phase of phases) {
                if (timeElapsed >= phase.time) {
                    currentPhase = phase;
                }
            }
            if (phaseTitleEl) phaseTitleEl.textContent = currentPhase.title;
            if (phaseDescEl && timeElapsed > 2) phaseDescEl.textContent = currentPhase.desc;

            // Push simulated logs every 6 seconds on average
            if (timeElapsed - lastLogTime >= 6 && logIndex < logPool.length) {
                lastLogTime = timeElapsed;
                const logMsg = logPool[logIndex++];
                if (terminalLinesEl) {
                    const div = document.createElement('div');
                    div.innerHTML = `[${Math.round(timeElapsed)}s] &gt; ${logMsg}`;
                    terminalLinesEl.appendChild(div);
                    if (terminalEl) terminalEl.scrollTop = terminalEl.scrollHeight;
                }
            }
        }

        progressInterval = setInterval(updateProgress, 200);
    }

    function stopResearchProgress() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }

    function displayResearchResults(data) {
        stopResearchProgress();
        researchLogs.classList.add('has-results');

        let evidenceHtml = '';
        if (data.evidence && data.evidence.length > 0) {
            evidenceHtml = `
                <details class="sources-details" style="margin-bottom: 24px; background: rgba(30, 41, 59, 0.4); border: 1px solid var(--border); border-radius: 12px; padding: 16px; transition: all 0.3s ease;">
                    <summary class="sources-summary" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-weight: 600; color: #fff; font-size: 1.1rem; outline: none; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                            <span>Verified Research Sources (${data.evidence.length})</span>
                        </div>
                        <span class="collapse-icon" style="transition: transform 0.3s ease; color: var(--text-muted); font-size: 0.9rem;">▼</span>
                    </summary>
                    <div class="sources-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 16px;">
                        ${data.evidence.map((e, idx) => {
                            let domain = '';
                            try {
                                domain = new URL(e.url).hostname.replace('www.', '');
                            } catch(err) {
                                domain = 'source';
                            }
                            return `
                                <div class="source-card">
                                    <div>
                                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                                            <span class="chip" style="font-size: 0.65rem; background: rgba(59, 130, 246, 0.15); color: #93c5fd; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.25); text-transform: none; letter-spacing: normal;">${domain}</span>
                                            <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;">#${idx + 1}</span>
                                        </div>
                                        <a href="${e.url}" target="_blank" class="source-title-link">${e.title || 'Research Link'}</a>
                                        <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0;">${e.snippet || ''}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </details>
            `;
        }

        researchLogs.innerHTML = `
            <div style="margin-bottom: 24px; padding: 12px 16px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success); border-radius: 6px; font-family: 'Inter', sans-serif;">
                <strong style="color: var(--success); font-size: 1.05rem;">Success!</strong> <span style="color: #e5e7eb;">${data.message}</span>
            </div>
            ${evidenceHtml}
            <div class="markdown-body" style="color: #f3f4f6; font-family: 'Inter', sans-serif; line-height: 1.7; font-size: 1.05rem; background: rgba(0,0,0,0.15); padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                ${formatMarkdown(data.final_answer)}
            </div>
        `;
    }

    startResearchBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert('Please enter a research topic.');
            return;
        }

        renderResearchLoading(topic);

        startResearchBtn.disabled = true;
        startResearchBtn.textContent = "Executing...";

        try {
            const response = await fetch(`${API_BASE_URL}/research-agent/launch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic
                }),
                credentials: 'include',
            });

            const data = await parseApiResponse(response);

            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, 'Research failed'));
            }

            if (data.status === 'awaiting_feedback') {
                stopResearchProgress();
                startResearchBtn.disabled = false;
                startResearchBtn.textContent = "Launch Deep Research Agent";

                // Populate queries list
                const queriesList = document.getElementById('research-queries-list');
                queriesList.innerHTML = '';
                if (data.queries && data.queries.length > 0) {
                    data.queries.forEach(q => {
                        const li = document.createElement('li');
                        li.textContent = q;
                        queriesList.appendChild(li);
                    });
                } else {
                    queriesList.innerHTML = '<li>No queries generated.</li>';
                }

                // Show feedback container
                document.getElementById('feedback-container').style.display = 'block';
                document.getElementById('feedback-container').dataset.threadId = data.thread_id;

                researchLogs.innerHTML = `
                    <div style="padding: 10px;">
                        <span class="log-entry system" style="color: var(--warning);">[Engine] Paused. Awaiting human-in-the-loop review of queries.</span>
                    </div>
                `;
            } else {
                startResearchBtn.disabled = false;
                startResearchBtn.textContent = "Launch Deep Research Agent";
                displayResearchResults(data);
            }

        } catch (error) {
            stopResearchProgress();
            startResearchBtn.disabled = false;
            startResearchBtn.textContent = "Launch Deep Research Agent";
            researchLogs.innerHTML = `<span class="log-entry error" style="color: #f87171; display: block; padding: 10px;">[Error] ${error.message}</span>`;
        }
    });

    // Handle Feedback Submission
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');

    async function handleFeedbackSubmission(feedbackText) {
        const threadId = document.getElementById('feedback-container').dataset.threadId;
        if (!threadId) return;

        document.getElementById('feedback-container').style.display = 'none';

        renderResearchLoading(null, true);

        startResearchBtn.disabled = true;
        startResearchBtn.textContent = "Executing...";

        try {
            const response = await fetch(`${API_BASE_URL}/research-agent/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    thread_id: threadId,
                    feedback: feedbackText
                }),
                credentials: 'include',
            });

            const data = await parseApiResponse(response);

            if (!response.ok) {
                throw new Error(getApiErrorMessage(data, 'Research feedback failed'));
            }

            if (data.status === 'awaiting_feedback') {
                stopResearchProgress();
                startResearchBtn.disabled = false;
                startResearchBtn.textContent = "Launch Deep Research Agent";

                const queriesList = document.getElementById('research-queries-list');
                queriesList.innerHTML = '';
                if (data.queries && data.queries.length > 0) {
                    data.queries.forEach(q => {
                        const li = document.createElement('li');
                        li.textContent = q;
                        queriesList.appendChild(li);
                    });
                }

                document.getElementById('feedback-container').style.display = 'block';
                document.getElementById('feedback-container').dataset.threadId = data.thread_id;
                
                // Clear the input textarea for the next loop
                const feedbackInputEl = document.getElementById('research-feedback-input');
                if (feedbackInputEl) feedbackInputEl.value = '';

                researchLogs.innerHTML = `
                    <div style="padding: 10px;">
                        <span class="log-entry system" style="color: var(--warning);">[Engine] Paused again. Awaiting further review.</span>
                    </div>
                `;
            } else {
                startResearchBtn.disabled = false;
                startResearchBtn.textContent = "Launch Deep Research Agent";
                displayResearchResults(data);
            }

        } catch (error) {
            stopResearchProgress();
            startResearchBtn.disabled = false;
            startResearchBtn.textContent = "Launch Deep Research Agent";
            researchLogs.innerHTML = `<span class="log-entry error" style="color: #f87171; display: block; padding: 10px;">[Error] ${error.message}</span>`;
        }
    }

    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', () => {
            const feedbackInput = document.getElementById('research-feedback-input').value.trim();
            handleFeedbackSubmission(feedbackInput || 'start');
        });
    }
});
