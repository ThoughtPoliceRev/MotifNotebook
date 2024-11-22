document.addEventListener('DOMContentLoaded', () => {
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

    // Tab Management
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
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).style.display = 'block';
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

    tinymce.init({
        ...editorConfig,
        selector: '#rolls-editor'
    });

    tinymce.init({
        ...editorConfig,
        selector: '#character-editor'
    });

    tinymce.init({
        ...editorConfig,
        selector: '#scene-editor'
    });

    tinymce.init({
        ...editorConfig,
        selector: '#story-editor'
    });

    tinymce.init({
        ...editorConfig,
        selector: '#extra-editor'
    }).then(() => {
        // Load most recent auto-save after all editors are initialized
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        if (sessions['Auto Save']) {
            loadSession('Auto Save');
        }
    });

    // Core dice rolling function with animation
    function rollDice() {
        const dice = [
            document.getElementById('dice1'),
            document.getElementById('dice2'),
            document.getElementById('dice3')
        ];
        
        // Generate rolls first
        const rolls = dice.map(() => Math.floor(Math.random() * 6));
        
        // Start rolling animation
        dice.forEach(die => {
            die.classList.add('rolling');
        });
        
        // Generate random roll duration between 1 and 3 seconds
        const rollDuration = Math.random() * 2000 + 1000; // 1000-3000ms
        
        return new Promise(resolve => {
            // Stop rolling animation after the random duration
            setTimeout(() => {
                dice.forEach((die, index) => {
                    die.classList.remove('rolling');
                    die.textContent = rolls[index] + 1;
                    
                    // Add a brief scaling effect when the die lands
                    die.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        die.style.transform = 'scale(1)';
                    }, 100);
                });
                resolve(rolls);
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

    // Session Management
    const AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds
    const BACKUP_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    let autoSaveInterval;
    let backupSaveInterval;

    function startAutoSave() {
        // Clear any existing intervals
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        if (backupSaveInterval) clearInterval(backupSaveInterval);

        // Set up 30-second Auto Save
        autoSaveInterval = setInterval(() => {
            saveSession('Auto Save');
        }, AUTO_SAVE_INTERVAL);

        // Set up 5-minute Backup Save
        backupSaveInterval = setInterval(() => {
            saveSession('Backup Save');
        }, BACKUP_SAVE_INTERVAL);

        // Initial save
        saveSession('Auto Save');
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

        const data = getSessionData();
        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        sessions[sessionName] = data;
        localStorage.setItem('motif-sessions', JSON.stringify(sessions));
        console.log(`Session saved as: ${sessionName}`);
    }

    function loadSession(sessionName) {
        // Wait for all editors to be ready
        if (!tinymce.get('rolls-editor') || 
            !tinymce.get('character-editor') || 
            !tinymce.get('scene-editor') || 
            !tinymce.get('story-editor') || 
            !tinymce.get('extra-editor')) {
            console.log('Editors not ready yet, retrying in 100ms');
            setTimeout(() => loadSession(sessionName), 100);
            return;
        }

        const sessions = JSON.parse(localStorage.getItem('motif-sessions') || '{}');
        const data = sessions[sessionName];
        if (data) {
            tinymce.get('rolls-editor').setContent(data.oracle || '');
            tinymce.get('character-editor').setContent(data.character || '');
            tinymce.get('scene-editor').setContent(data.scene || '');
            tinymce.get('story-editor').setContent(data.story || '');
            tinymce.get('extra-editor').setContent(data.extra || '');
        }
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

    function showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
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

    // Event Listeners for Session Management
    document.getElementById('save-session-btn').addEventListener('click', () => {
        const modal = showModal('Save Session', `
            <div class="modal-body">
                <input type="text" id="session-name" placeholder="Enter session name">
            </div>
            <div class="modal-footer">
                <button id="save-confirm">Save</button>
                <button class="close-modal">Cancel</button>
            </div>
        `);

        modal.querySelector('#save-confirm').onclick = () => {
            const sessionName = modal.querySelector('#session-name').value;
            if (sessionName) {
                saveSession(sessionName);
                document.body.removeChild(modal);
            }
        };
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
                return `<li data-session="${name}" class="auto-save">
                    ${name} (${new Date(data.timestamp).toLocaleString()})
                </li>`;
            })
            .join('');

        // Create HTML for user saves
        const userSaveList = userSaves
            .map(([name, data]) => `<li data-session="${name}">
                ${name} (${new Date(data.timestamp).toLocaleString()})
            </li>`)
            .join('');

        const modal = showModal('Load Session', `
            <ul class="session-list">
                ${autoSaveList}
                ${userSaveList ? '<li class="separator"></li>' + userSaveList : ''}
            </ul>
        `);

        modal.querySelectorAll('.session-list li').forEach(li => {
            if (!li.classList.contains('separator')) {
                li.onclick = () => {
                    loadSession(li.dataset.session);
                    document.body.removeChild(modal);
                };
            }
        });
    });

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

    // Start autosave when the page loads
    startAutoSave();

    // Load saved content from localStorage
    const savedContent = localStorage.getItem('motifOracle');
    if (savedContent) {
        const data = JSON.parse(savedContent);
        Object.keys(data).forEach(editor => {
            if (tinymce.get(`${editor}-editor`)) {
                tinymce.get(`${editor}-editor`).setContent(data[editor] || '');
            }
        });
    }

    // Save content to localStorage when it changes
    ['rolls', 'character', 'scene', 'story', 'extra'].forEach(editor => {
        tinymce.get(`${editor}-editor`).on('change', () => {
            const content = {
                rolls: tinymce.get('rolls-editor').getContent(),
                character: tinymce.get('character-editor').getContent(),
                scene: tinymce.get('scene-editor').getContent(),
                story: tinymce.get('story-editor').getContent(),
                extra: tinymce.get('extra-editor').getContent()
            };
            localStorage.setItem('motifOracle', JSON.stringify(content));
        });
    });

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
});