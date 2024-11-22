document.addEventListener('DOMContentLoaded', async () => {
    // Dice interpretations - hardcoded values for simplicity
    const diceInterpretations = {
        "1": {
            "Plain": ["No", "No", "No", "Yes", "Yes", "Yes"],
            "Mixed": ["No", "No", "Mixed or Maybe", "Mixed or Maybe", "Yes", "Yes"]
        },
        "2": {
            "Wrinkle": ["But", "But", "Plain Answer", "Plain Answer", "And", "And"],
            "Certainty": ["Uncertain/Very Weak", "Some Doubt/Fairly Weak", "Average Doubt", "Pretty Middling", "Fairly Certain/Strong", "Very Certain/Very Strong"]
        },
        "3": {
            "Activity": ["None", "Low", "Moderate", "Moderate", "High", "Very High"],
            "Advantage": ["Very Disadvantageous", "Disadvantageous", "Neutral", "Neutral", "Advantageous", "Very Advantageous"],
            "Attention": ["Completely Ignored", "Overlooked", "Normal Notice", "Normal Notice", "Extra Attention", "Completely Noticed"],
            "Disposition": ["Hostile", "Unfriendly", "Neutral", "Neutral", "Friendly", "Very Friendly"],
            "Impression": ["Very Negative", "Negative", "Neutral", "Neutral", "Positive", "Very Positive"],
            "Progress": ["Major Setback", "Minor Setback", "As Expected", "As Expected", "Extra Progress", "Breakthrough"],
            "Safety": ["Very Dangerous", "Dangerous", "Normal Risk", "Normal Risk", "Safe", "Very Safe"],
            "Supernatural": ["None", "Trace", "Low", "Modest", "Strong", "Overwhelming"],
            "Utility": ["Useless", "Limited Use", "Somewhat Useful", "Somewhat Useful", "Very Useful", "Essential"],
            "Value": ["Worthless", "Low Value", "Average", "Average", "Valuable", "Priceless"],
            "Weird": ["Very Mundane", "Normal", "Notable", "Slightly Odd", "Strange", "Very Weird"],
            "YOUR CHOICE": ["None/Complete Opposite", "Little/Opposite", "Weak/Mildly Contrary", "Average/Modest", "Notable/Strong", "Extreme/Overwhelming"]
        }
    };

    // Main tab switching
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.main-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const tabId = tab.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.style.display = 'block';
                if (tabId === 'print') {
                    updatePrintPreview();
                }
            }
        });
    });

    // Notebook Tab Management
    document.querySelectorAll('.notebook-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.notebook-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.notebook-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).style.display = 'block';
        });
    });

    // Initialize TinyMCE editors
    const editorConfig = {
        height: 500,
        menubar: false,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
            'bold italic backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
    };

    await Promise.all([
        tinymce.init({...editorConfig, selector: '#character-editor'}),
        tinymce.init({...editorConfig, selector: '#scene-editor'}),
        tinymce.init({...editorConfig, selector: '#story-editor'}),
        tinymce.init({...editorConfig, selector: '#extra-editor'}),
        tinymce.init({...editorConfig, selector: '#rolls-editor'})
    ]);

    // Session Management
    const AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds
    const BACKUP_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    let autoSaveInterval;
    let backupSaveInterval;

    function startAutoSave() {
        // Clear any existing intervals
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        if (backupSaveInterval) clearInterval(backupSaveInterval);

        // Load existing Auto Save if it exists
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        if (sessions['Auto Save']) {
            loadSession('Auto Save', true); // Skip confirmation for Auto Save
        }

        // Set up 30-second Auto Save
        autoSaveInterval = setInterval(() => {
            try {
                const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
                // Remove any previous Auto Save
                if (sessions['Auto Save']) {
                    delete sessions['Auto Save'];
                }
                saveSession('Auto Save');
            } catch (error) {
                console.error('Auto Save failed:', error);
            }
        }, AUTO_SAVE_INTERVAL);

        // Set up 5-minute Backup Save
        backupSaveInterval = setInterval(() => {
            try {
                const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
                // Remove any previous Backup Save
                if (sessions['Backup Save']) {
                    delete sessions['Backup Save'];
                }
                saveSession('Backup Save');
            } catch (error) {
                console.error('Backup Save failed:', error);
            }
        }, BACKUP_SAVE_INTERVAL);

        // Wait a short time before initial save to ensure content is loaded
        setTimeout(() => {
            saveSession('Auto Save');
        }, 1000);
    }

    function getSessionData() {
        return {
            oracle: tinymce.get('rolls-editor').getContent(),
            character: tinymce.get('character-editor').getContent(),
            scene: tinymce.get('scene-editor').getContent(),
            story: tinymce.get('story-editor').getContent(),
            extra: tinymce.get('extra-editor').getContent(),
            timestamp: new Date().toISOString()
        };
    }

    function saveSession(sessionName = 'Auto Save') {
        // Wait for all editors to be ready
        if (!tinymce.get('rolls-editor') || 
            !tinymce.get('character-editor') || 
            !tinymce.get('scene-editor') || 
            !tinymce.get('story-editor') || 
            !tinymce.get('extra-editor')) {
            console.log('Editors not ready yet, skipping save');
            return;
        }

        try {
            const data = getSessionData();
            const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
            
            // If this is an Auto Save or Backup Save, remove any previous version
            if (sessionName === 'Auto Save' || sessionName === 'Backup Save') {
                delete sessions[sessionName];
            }
            
            sessions[sessionName] = data;
            localStorage.setItem('motif-sessions', JSON.stringify(sessions));
            
            // Clean up old storage keys
            localStorage.removeItem('motif-oracle-auto-save');
            localStorage.removeItem('motifOracle');
            
            console.log(`Session saved as: ${sessionName}`);
        } catch (error) {
            console.error(`Failed to save session ${sessionName}:`, error);
        }
    }

    // Start autosave when the page loads
    startAutoSave();

    // Remove the old change-based save listeners
    ['rolls', 'character', 'scene', 'story', 'extra'].forEach(editor => {
        if (tinymce.get(`${editor}-editor`)) {
            tinymce.get(`${editor}-editor`).on('change', () => {
                // Trigger an auto-save on editor changes instead
                clearTimeout(window.autoSaveTimeout);
                window.autoSaveTimeout = setTimeout(() => {
                    saveSession('Auto Save');
                }, 1000); // Debounce auto-save to prevent too frequent saves
            });
        }
    });

    // Core dice rolling function with animation
    function rollDice() {
        const dice = document.querySelectorAll('.dice');
        const results = [];
        
        // Generate random roll duration between 1 and 3 seconds
        const rollDuration = Math.random() * 2000 + 1000; // 1000-3000ms
        let diceFinished = 0;
        
        dice.forEach(die => {
            die.classList.add('rolling');
            // Start showing random numbers during animation
            const randomInterval = setInterval(() => {
                die.textContent = Math.floor(Math.random() * 6) + 1;
            }, 50);

            setTimeout(() => {
                clearInterval(randomInterval);
                die.classList.remove('rolling');
                const result = Math.floor(Math.random() * 6) + 1;
                die.textContent = result;
                results.push(result);

                // Add landing effect
                die.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    die.style.transform = 'scale(1)';
                }, 150);

                diceFinished++;
                
                // Check for triples and handle results after all dice have finished
                if (diceFinished === 3) {
                    if (results[0] === results[1] && results[1] === results[2]) {
                        dice.forEach(d => {
                            d.classList.add('triple-roll');
                            setTimeout(() => {
                                d.classList.remove('triple-roll');
                            }, 3000);
                        });
                    }
                    
                    // Handle the roll results
                    const interpretation = generateInterpretation(results);
                    const editor = tinymce.get('rolls-editor');
                    if (editor) {
                        const content = editor.getContent();
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                        const newRoll = `<p><em>[${timeStr}]</em><br><strong>Q:</strong> ${document.getElementById('question-input').value || 'No question'}<br><strong>A:</strong> ${results.join(', ')} | ${interpretation}</p>`;
                        editor.setContent(content + newRoll);
                        editor.selection.select(editor.getBody(), true);
                        editor.selection.collapse(false);
                        
                        // Clear the question input after adding to log
                        document.getElementById('question-input').value = '';
                    }
                }
            }, rollDuration);
        });
    }

    // Generate interpretation based on dice rolls
    function generateInterpretation(rolls) {
        const select1 = document.getElementById('select1').value;
        const select2 = document.getElementById('select2').value;
        const select3 = document.getElementById('select3').value;
        
        return [
            diceInterpretations["1"][select1][rolls[0]],
            diceInterpretations["2"][select2][rolls[1]],
            diceInterpretations["3"][select3][rolls[2]]
        ].join(' | ');
    }

    // Roll button handler
    document.getElementById('roll-btn').addEventListener('click', async () => {
        const rollBtn = document.getElementById('roll-btn');
        const resultDiv = document.getElementById('roll-results');
        
        // Disable roll button during animation
        rollBtn.disabled = true;
        
        try {
            const question = document.getElementById('question-input').value.trim();
            const rolls = await rollDice();
            const interpretation = generateInterpretation(rolls);
            
            // Format and display result
            let resultHTML = '';
            if (question) {
                resultHTML += `<div class="question">Q: ${question}</div>`;
            }
            resultHTML += `<div class="answer">A: ${interpretation}</div>`;
            resultDiv.innerHTML = resultHTML;
            
            // Add to roll history
            const editor = tinymce.get('rolls-editor');
            if (editor) {
                const timestamp = new Date().toLocaleTimeString();
                const newEntry = `<p><strong>[${timestamp}]</strong><br>${resultHTML}</p>`;
                editor.setContent(editor.getContent() + newEntry);
                editor.selection.select(editor.getBody(), true);
                editor.selection.collapse(false);
            }
        } catch (error) {
            console.error('Error during roll:', error);
        } finally {
            // Re-enable roll button
            rollBtn.disabled = false;
        }
    });

    // Load latest auto-save if it exists
    const autoSaveKey = 'motif-oracle-auto-save';
    const savedData = localStorage.getItem(autoSaveKey);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            // Only load if there's actual content
            if (Object.values(data).some(content => content.trim() !== '')) {
                Object.entries(data).forEach(([editor, content]) => {
                    if (tinymce.get(editor)) {
                        tinymce.get(editor).setContent(content);
                    }
                });
                console.log('Auto-save loaded successfully');
            }
        } catch (error) {
            console.error('Error loading auto-save:', error);
        }
    }

    // Automatically show the first main tab and first notebook tab when the page loads
    const firstMainTab = document.querySelector('.main-tab');
    if (firstMainTab) {
        firstMainTab.classList.add('active');
        const mainTabId = firstMainTab.dataset.tab;
        const mainTabContent = document.getElementById(`${mainTabId}-tab`);
        if (mainTabContent) {
            mainTabContent.style.display = 'block';
        }
    }

    const firstNotebookTab = document.querySelector('.notebook-tab');
    if (firstNotebookTab) {
        firstNotebookTab.classList.add('active');
        const notebookTabId = firstNotebookTab.dataset.tab;
        const notebookTabContent = document.getElementById(`${notebookTabId}-tab`);
        if (notebookTabContent) {
            notebookTabContent.style.display = 'block';
        }
    }

    // Update print preview content
    function updatePrintPreview() {
        // Get content from TinyMCE editors
        const sections = ['character', 'scene', 'story', 'extra', 'rolls'];
        sections.forEach(section => {
            const content = tinymce.get(`${section}-editor`).getContent();
            // Clean up empty paragraphs that TinyMCE might add
            const cleanContent = content.replace(/<p>(\s|&nbsp;)*<\/p>/g, '');
            document.getElementById(`print-${section}`).innerHTML = cleanContent;
        });
    }

    // Convert HTML to plain text
    function htmlToText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    // Convert HTML to Markdown-like text
    function htmlToMarkdown(html) {
        const text = htmlToText(html);
        // Simple markdown conversion - you might want to enhance this
        return text.split('\n').map(line => line.trim()).join('\n\n');
    }

    // Generate session report
    function generateReport(format) {
        const character = tinymce.get('character-editor').getContent();
        const scene = tinymce.get('scene-editor').getContent();
        const story = tinymce.get('story-editor').getContent();
        const extra = tinymce.get('extra-editor').getContent();
        const rolls = tinymce.get('rolls-editor').getContent();
        
        let content = '';
        const timestamp = new Date().toLocaleString();
        
        switch (format) {
            case 'txt':
                content = `MOTIF ORACLE NOTEBOOK - SESSION REPORT
Generated: ${timestamp}

CHARACTER
${htmlToText(character)}

SCENE NOTES
${htmlToText(scene)}

STORY SO FAR
${htmlToText(story)}

EXTRA NOTES
${htmlToText(extra)}

ORACLE ROLLS
${htmlToText(rolls)}`;
                break;
                
            case 'md':
                content = `# MOTIF ORACLE NOTEBOOK - SESSION REPORT
*Generated: ${timestamp}*

## CHARACTER
${htmlToMarkdown(character)}

## SCENE NOTES
${htmlToMarkdown(scene)}

## STORY SO FAR
${htmlToMarkdown(story)}

## EXTRA NOTES
${htmlToMarkdown(extra)}

## ORACLE ROLLS
${htmlToMarkdown(rolls)}`;
                break;
                
            case 'html':
                content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Motif Oracle Notebook - Session Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        h1, h2 { color: #8b0000; }
        h2 { border-bottom: 2px solid #8b0000; padding-bottom: 0.5rem; }
        .timestamp { font-style: italic; color: #666; }
        .section { margin: 2rem 0; }
    </style>
</head>
<body>
    <h1>MOTIF ORACLE NOTEBOOK - SESSION REPORT</h1>
    <p class="timestamp">Generated: ${timestamp}</p>
    
    <div class="section">
        <h2>CHARACTER</h2>
        ${character}
    </div>
    
    <div class="section">
        <h2>SCENE NOTES</h2>
        ${scene}
    </div>
    
    <div class="section">
        <h2>STORY SO FAR</h2>
        ${story}
    </div>
    
    <div class="section">
        <h2>EXTRA NOTES</h2>
        ${extra}
    </div>
    
    <div class="section">
        <h2>ORACLE ROLLS</h2>
        ${rolls}
    </div>
</body>
</html>`;
                break;
        }
        
        return content;
    }

    // Print button handler
    document.getElementById('print-session-btn').addEventListener('click', () => {
        const modal = showModal('Print Session', `
            <div class="modal-body">
                <input type="text" id="print-session-name" placeholder="Enter session name">
                <div class="format-select">
                    <label>
                        <input type="radio" name="format" value="txt" checked> Plain Text
                    </label>
                    <label>
                        <input type="radio" name="format" value="md"> Markdown
                    </label>
                    <label>
                        <input type="radio" name="format" value="html"> HTML
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button id="print-confirm">Export</button>
                <button class="close-modal">Cancel</button>
            </div>
        `);

        modal.querySelector('#print-confirm').onclick = async () => {
            const sessionName = modal.querySelector('#print-session-name').value.trim();
            const format = modal.querySelector('input[name="format"]:checked').value;
            
            if (sessionName) {
                const content = generateReport(format);
                const extension = format === 'md' ? 'md' : format === 'html' ? 'html' : 'txt';
                
                const zip = new JSZip();
                zip.file(`${sessionName}.${extension}`, content);
                
                const blob = await zip.generateAsync({type: "blob"});
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `MotifReport-${sessionName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                document.body.removeChild(modal);
            }
        };
    });

    // Update print preview when switching to the tab
    document.querySelector('.main-tab[data-tab="print"]').addEventListener('click', updatePrintPreview);

    // Save Session functionality
    const saveSessionBtn = document.getElementById('save-session-btn');
    const saveSessionModal = document.getElementById('save-session-modal');
    const saveSessionSelect = document.getElementById('save-session-select');
    const newSaveInput = document.getElementById('new-save-input');
    const sessionNameInput = document.getElementById('session-name-input');
    const saveSessionOk = document.getElementById('save-session-ok');
    const saveSessionCancel = document.getElementById('save-session-cancel');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    const successMessage = document.getElementById('success-message');

    function showSuccessMessage() {
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }

    function updateSaveSessionSelect() {
        // Clear existing options except NEW_SAVE
        while (saveSessionSelect.options.length > 1) {
            saveSessionSelect.remove(1);
        }

        // Add existing saves to the dropdown
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        const autoSaves = ['Auto Save', 'Backup Save'].filter(name => sessions[name]);
        const userSaves = Object.entries(sessions)
            .filter(([name]) => !autoSaves.includes(name))
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

        // Add auto-saves first
        autoSaves.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${new Date(sessions[name].timestamp).toLocaleString()})`;
            saveSessionSelect.appendChild(option);
        });

        // Add separator if we have both auto-saves and user saves
        if (autoSaves.length > 0 && userSaves.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            saveSessionSelect.appendChild(separator);
        }

        // Add user saves
        userSaves.forEach(([name, data]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${new Date(data.timestamp).toLocaleString()})`;
            saveSessionSelect.appendChild(option);
        });
    }

    saveSessionSelect.addEventListener('change', () => {
        if (saveSessionSelect.value === 'NEW_SAVE') {
            newSaveInput.style.display = 'block';
            sessionNameInput.value = '';
            sessionNameInput.focus();
        } else {
            newSaveInput.style.display = 'none';
        }
    });

    saveSessionOk.addEventListener('click', () => {
        if (saveSessionSelect.value === 'NEW_SAVE') {
            const sessionName = sessionNameInput.value.trim();
            if (!sessionName) {
                alert('Please enter a session name');
                sessionNameInput.focus();
                return;
            }
            const key = sessionName;
            if (localStorage.getItem('motif-sessions')) {
                const sessions = JSON.parse(localStorage.getItem('motif-sessions'));
                if (sessions[key]) {
                    confirmModal.style.display = 'block';
                    confirmYes.onclick = () => {
                        saveSession(key);
                        confirmModal.style.display = 'none';
                        saveSessionModal.style.display = 'none';
                        showSuccessMessage();
                    };
                    confirmNo.onclick = () => {
                        confirmModal.style.display = 'none';
                    };
                } else {
                    saveSession(key);
                    saveSessionModal.style.display = 'none';
                    showSuccessMessage();
                }
            } else {
                saveSession(key);
                saveSessionModal.style.display = 'none';
                showSuccessMessage();
            }
        } else if (saveSessionSelect.value !== '') {
            const selectedSave = saveSessionSelect.value;
            confirmModal.style.display = 'block';
            confirmYes.onclick = () => {
                saveSession(selectedSave);
                confirmModal.style.display = 'none';
                saveSessionModal.style.display = 'none';
                showSuccessMessage();
            };
            confirmNo.onclick = () => {
                confirmModal.style.display = 'none';
            };
        }
    });

    saveSessionCancel.addEventListener('click', () => {
        saveSessionModal.style.display = 'none';
    });

    confirmNo.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === saveSessionModal) {
            saveSessionModal.style.display = 'none';
        }
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });

    // Event Listeners for Session Management
    document.getElementById('save-session-btn').addEventListener('click', () => {
        updateSaveSessionSelect();
        saveSessionModal.style.display = 'block';
        if (saveSessionSelect.value === 'NEW_SAVE') {
            newSaveInput.style.display = 'block';
            sessionNameInput.value = '';
            sessionNameInput.focus();
        } else {
            newSaveInput.style.display = 'none';
        }
    });

    document.getElementById('load-session-btn').addEventListener('click', () => {
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        
        // Separate auto-saves and user saves
        const autoSaves = ['Auto Save', 'Backup Save'].filter(name => sessions[name]);
        const userSaves = Object.entries(sessions)
            .filter(([name]) => !autoSaves.includes(name))
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

        // Create HTML for auto-saves
        const autoSaveList = autoSaves
            .map(name => {
                const data = sessions[name];
                return `<li data-session="${name}" class="auto-save" style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
                    <span class="session-name">${name} (${new Date(data.timestamp).toLocaleString()})</span>
                    <button class="delete-btn" style="background: none; border: none; cursor: pointer; padding: 4px; color: #666;" title="Delete session">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </li>`;
            })
            .join('');

        // Create HTML for user saves
        const userSaveList = userSaves
            .map(([name, data]) => `<li data-session="${name}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
                <span class="session-name">${name} (${new Date(data.timestamp).toLocaleString()})</span>
                <button class="delete-btn" style="background: none; border: none; cursor: pointer; padding: 4px; color: #666;" title="Delete session">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            </li>`)
            .join('');

        const modal = showModal('Load Session', `
            <ul class="session-list" style="list-style: none; padding: 0; margin: 0;">
                ${autoSaveList}
                ${userSaveList ? '<li class="separator" style="border-top: 1px solid #ddd; margin: 8px 0;"></li>' + userSaveList : ''}
            </ul>
        `);

        // Add click handlers for session names and delete buttons
        modal.querySelectorAll('.session-list li:not(.separator)').forEach(li => {
            const sessionName = li.dataset.session;
            const nameSpan = li.querySelector('.session-name');
            const deleteBtn = li.querySelector('.delete-btn');

            // Add hover effect to delete button
            deleteBtn.onmouseover = () => deleteBtn.style.color = '#dc3545';
            deleteBtn.onmouseout = () => deleteBtn.style.color = '#666';

            nameSpan.onclick = async () => {
                document.body.removeChild(modal);
                loadSession(sessionName);
            };

            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await confirmDeleteSession(sessionName);
                if (confirmed) {
                    deleteSession(sessionName);
                    document.body.removeChild(modal);
                    // Refresh the session list
                    document.getElementById('load-session-btn').click();
                }
            };
        });
    });

    // Update save session select to include delete buttons
    function updateSaveSessionSelect() {
        // Clear existing options except NEW_SAVE
        while (saveSessionSelect.options.length > 1) {
            saveSessionSelect.remove(1);
        }

        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        
        // Add Auto Save and Backup Save first if they exist
        ['Auto Save', 'Backup Save'].forEach(name => {
            if (sessions[name]) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} (${new Date(sessions[name].timestamp).toLocaleString()})`;
                saveSessionSelect.appendChild(option);
            }
        });

        // Add separator if there are user saves
        const userSaves = Object.entries(sessions)
            .filter(([name]) => !['Auto Save', 'Backup Save'].includes(name))
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));

        if (userSaves.length > 0 && (sessions['Auto Save'] || sessions['Backup Save'])) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            saveSessionSelect.appendChild(separator);
        }

        // Add user saves
        userSaves.forEach(([name, data]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${new Date(data.timestamp).toLocaleString()})`;
            saveSessionSelect.appendChild(option);
        });
    }

    async function confirmDeleteSession(sessionName) {
        return new Promise((resolve) => {
            const modal = showModal('Delete Session', `
                <div class="modal-body">
                    <p>Are you sure you want to delete "${sessionName}"? This cannot be undone.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button id="delete-confirm" style="padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                    <button id="delete-cancel" style="padding: 8px 16px; background-color: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            `);

            const deleteBtn = modal.querySelector('#delete-confirm');
            const cancelBtn = modal.querySelector('#delete-cancel');

            // Add hover effects
            deleteBtn.onmouseover = () => deleteBtn.style.backgroundColor = '#bb2d3b';
            deleteBtn.onmouseout = () => deleteBtn.style.backgroundColor = '#dc3545';
            cancelBtn.onmouseover = () => {
                cancelBtn.style.backgroundColor = '#e9e9e9';
                cancelBtn.style.borderColor = '#ccc';
            };
            cancelBtn.onmouseout = () => {
                cancelBtn.style.backgroundColor = '#f5f5f5';
                cancelBtn.style.borderColor = '#ddd';
            };

            deleteBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            // Close on outside click
            modal.onclick = (event) => {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            };
        });
    }

    function deleteSession(sessionName) {
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        delete sessions[sessionName];
        localStorage.setItem('motif-sessions', JSON.stringify(sessions));
        showNotification(`Session "${sessionName}" deleted successfully`);
    }

    async function confirmLoadSession(sessionName) {
        return new Promise((resolve) => {
            const modal = showModal('Load Session', `
                <div class="modal-body">
                    <p>Are you sure you want to load "${sessionName}"? This will overwrite your current session.</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button id="load-confirm" style="padding: 8px 16px; background-color: #8b0000; color: white; border: none; border-radius: 4px; cursor: pointer;">Load</button>
                    <button id="load-cancel" style="padding: 8px 16px; background-color: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            `);

            const loadBtn = modal.querySelector('#load-confirm');
            const cancelBtn = modal.querySelector('#load-cancel');

            // Add hover effects
            loadBtn.onmouseover = () => loadBtn.style.backgroundColor = '#a00000';
            loadBtn.onmouseout = () => loadBtn.style.backgroundColor = '#8b0000';
            cancelBtn.onmouseover = () => {
                cancelBtn.style.backgroundColor = '#e9e9e9';
                cancelBtn.style.borderColor = '#ccc';
            };
            cancelBtn.onmouseout = () => {
                cancelBtn.style.backgroundColor = '#f5f5f5';
                cancelBtn.style.borderColor = '#ddd';
            };

            loadBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            // Close on outside click
            modal.onclick = (event) => {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            };
        });
    }

    function loadSession(sessionName, skipConfirmation = false) {
        // Wait for all editors to be ready
        if (!tinymce.get('rolls-editor') || 
            !tinymce.get('character-editor') || 
            !tinymce.get('scene-editor') || 
            !tinymce.get('story-editor') || 
            !tinymce.get('extra-editor')) {
            console.log('Editors not ready yet, retrying in 100ms');
            setTimeout(() => loadSession(sessionName, skipConfirmation), 100);
            return;
        }

        const loadContent = async () => {
            if (!skipConfirmation) {
                const confirmed = await confirmLoadSession(sessionName);
                if (!confirmed) return;
            }

            const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
            const data = sessions[sessionName];
            if (data) {
                tinymce.get('rolls-editor').setContent(data.oracle || '');
                tinymce.get('character-editor').setContent(data.character || '');
                tinymce.get('scene-editor').setContent(data.scene || '');
                tinymce.get('story-editor').setContent(data.story || '');
                tinymce.get('extra-editor').setContent(data.extra || '');
                showNotification(`Session "${sessionName}" loaded successfully`);
            }
        };

        loadContent();
    }

    function showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.zIndex = '1000';  // Ensure modal appears on top
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
        };

        return modal;
    }

    async function exportSession(sessionName) {
        const data = getSessionData();
        const zip = new JSZip();
        zip.file(`${sessionName}.json`, JSON.stringify(data, null, 2));
        const content = await zip.generateAsync({type: "blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MotifNotebook-${sessionName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function importSession(file) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const jsonFile = Object.values(zipContent.files)[0];
        const content = await jsonFile.async("string");
        const data = JSON.parse(content);
        const sessionName = file.name.replace('.zip', '');
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        sessions[sessionName] = data;
        localStorage.setItem('motif-sessions', JSON.stringify(sessions));
        loadSession(sessionName);
    }

    function showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        notification.style.color = 'white';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';

        document.body.appendChild(notification);
        // Trigger reflow
        notification.offsetHeight;
        notification.style.opacity = '1';

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }

    async function confirmLoadSession(sessionName) {
        return new Promise((resolve) => {
            const modal = showModal('Load Session', `
                <div class="modal-body">
                    <p>Are you sure you want to load "${sessionName}"? This will overwrite your current session.</p>
                </div>
                <div class="modal-footer">
                    <button id="load-confirm" class="primary">Load</button>
                    <button class="close-modal">Cancel</button>
                </div>
            `);

            modal.querySelector('#load-confirm').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            modal.querySelector('.close-modal').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            // Close on outside click
            modal.onclick = (event) => {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                    resolve(false);
                }
            };
        });
    }

    document.getElementById('export-session-btn').addEventListener('click', () => {
        const modal = showModal('Export Session', `
            <div class="modal-body">
                <input type="text" id="export-name" placeholder="Enter session name">
            </div>
            <div class="modal-footer">
                <button id="export-confirm">Export</button>
                <button class="close-modal">Cancel</button>
            </div>
        `);

        modal.querySelector('#export-confirm').onclick = () => {
            const sessionName = modal.querySelector('#export-name').value;
            if (sessionName) {
                exportSession(sessionName);
                document.body.removeChild(modal);
            }
        };
    });

    document.getElementById('import-session-btn').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await importSession(file);
            }
        };
        input.click();
    });

    document.getElementById('new-session-btn').addEventListener('click', () => {
        const modal = showModal('New Session', `
            <div class="modal-body">
                <p>Warning: This will delete all unsaved session data. Are you sure you want to continue?</p>
            </div>
            <div class="modal-footer">
                <button id="new-confirm">Continue</button>
                <button class="close-modal">Cancel</button>
            </div>
        `);

        modal.querySelector('#new-confirm').onclick = () => {
            tinymce.get('rolls-editor').setContent('');
            tinymce.get('character-editor').setContent('');
            tinymce.get('scene-editor').setContent('');
            tinymce.get('story-editor').setContent('');
            tinymce.get('extra-editor').setContent('');
            document.body.removeChild(modal);
        };
    });
});