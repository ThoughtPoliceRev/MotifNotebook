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

    // Auto-save function
    function autoSave() {
        const editors = ['character-editor', 'scene-editor', 'story-editor', 'extra-editor', 'rolls-editor'];
        const saveData = {};
        
        editors.forEach(editor => {
            if (tinymce.get(editor)) {
                saveData[editor] = tinymce.get(editor).getContent();
            }
        });

        try {
            localStorage.setItem('motif-oracle-auto-save', JSON.stringify(saveData));
            console.log('Auto-save completed');
        } catch (error) {
            console.error('Error during auto-save:', error);
        }
    }

    // Set up auto-save interval
    setInterval(autoSave, 30000); // Auto-save every 30 seconds

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

    // Core dice rolling function with animation
    function rollDice() {
        const dice = [
            document.getElementById('dice1'),
            document.getElementById('dice2'),
            document.getElementById('dice3')
        ];
        
        // Generate final rolls first
        const finalRolls = dice.map(() => Math.floor(Math.random() * 6));
        
        // Start rolling animation
        dice.forEach(die => {
            die.classList.add('rolling');
        });
        
        // Generate random roll duration between 1.5 and 2.5 seconds
        const rollDuration = Math.random() * 1000 + 1500; // 1500-2500ms
        
        // Show random numbers during animation
        const animationInterval = setInterval(() => {
            dice.forEach(die => {
                if (die.classList.contains('rolling')) {
                    die.textContent = Math.floor(Math.random() * 6) + 1;
                }
            });
        }, 100); // Update numbers every 100ms
        
        return new Promise(resolve => {
            // Stop rolling animation after the random duration
            setTimeout(() => {
                clearInterval(animationInterval);
                dice.forEach((die, index) => {
                    die.classList.remove('rolling');
                    die.textContent = finalRolls[index] + 1;
                    
                    // Add a brief scaling effect when the die lands
                    die.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        die.style.transform = 'scale(1)';
                    }, 150);
                });
                resolve(finalRolls);
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
    // startAutoSave();

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
});