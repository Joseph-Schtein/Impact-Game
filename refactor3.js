const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

const adminCode = `
// --- ADMIN UI ---
function renderAdminLogin() {
    return \`
        <div class="screen-wrapper">
            <h1 class="main-title">Admin Login</h1>
            <div style="background: var(--white); padding: 20px; border-radius: 12px; max-width: 400px; width: 100%; border: 3px solid var(--app-text); margin-bottom: 20px;">
                <label class="bold color-indigo">Password:</label>
                <input type="password" id="adminPasswordInput" class="neo-input" placeholder="Enter password...">
                <button class="neo-button bg-indigo" style="margin-top: 15px;" onclick="verifyAdminLogin()">Login</button>
            </div>
            <button class="neo-button bg-coral" style="max-width: 150px;" onclick="navigate('MENU')">\${getString('back')}</button>
        </div>
    \`;
}

window.verifyAdminLogin = async () => {
    const pwd = document.getElementById('adminPasswordInput').value;
    if (!pwd) return;
    
    if (!window.functions) {
        showToast("Firebase Functions not initialized", "error");
        return;
    }
    
    document.getElementById('adminPasswordInput').disabled = true;
    showToast("Verifying...", "info");
    
    try {
        const verifyFn = window.httpsCallable(window.functions, 'verifyAdminPassword');
        const res = await verifyFn({ password: pwd });
        if (res.data.success) {
            state.isAdmin = true;
            navigate('ADMIN_PANEL');
        } else {
            showToast("Incorrect password!", "error");
            document.getElementById('adminPasswordInput').disabled = false;
        }
    } catch (e) {
        console.error(e);
        showToast("Error verifying password", "error");
        document.getElementById('adminPasswordInput').disabled = false;
    }
};

function renderAdminPanel() {
    if (!state.isAdmin) {
        return renderAdminLogin(); // fallback
    }
    
    const m = state.verificationMode || "AI_ONLY";
    
    let html = \`
        <div class="screen-wrapper" style="align-items: flex-start; overflow-y: auto; display: block; padding-top: 20px;">
            <h1 class="main-title" style="text-align:center;">Admin Dashboard</h1>
            
            <div style="background: var(--white); padding: 20px; border-radius: 12px; width: 100%; max-width: 600px; margin: 0 auto 20px; border: 3px solid var(--app-text);">
                <h3 class="color-indigo">Verification Settings</h3>
                <p style="font-size: 14px; opacity: 0.8; margin-bottom: 15px;">Choose how user-submitted questions are verified.</p>
                
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <label><input type="radio" name="vMode" value="AI_ONLY" \${m === 'AI_ONLY' ? 'checked' : ''}> AI Verification Only</label>
                    <label><input type="radio" name="vMode" value="MANUAL_ONLY" \${m === 'MANUAL_ONLY' ? 'checked' : ''}> Manual Verification Only</label>
                    <label><input type="radio" name="vMode" value="BOTH" \${m === 'BOTH' ? 'checked' : ''}> Both (AI + Manual)</label>
                    <label><input type="radio" name="vMode" value="NONE" \${m === 'NONE' ? 'checked' : ''}> None (Auto-Approve)</label>
                </div>
                <button class="neo-button bg-indigo" style="margin-top: 15px; max-width: 200px; padding: 10px;" onclick="saveAdminSettings()">Save Settings</button>
            </div>
            
            <div style="background: var(--white); padding: 20px; border-radius: 12px; width: 100%; max-width: 600px; margin: 0 auto 20px; border: 3px solid var(--app-text);">
                <h3 class="color-indigo">Pending Review</h3>
                <div id="pendingQuestionsContainer">Loading...</div>
            </div>
            
            <div style="text-align:center; padding-bottom: 40px;">
                <button class="neo-button bg-coral" style="max-width: 150px;" onclick="navigate('MENU')">\${getString('back')}</button>
            </div>
        </div>
    \`;
    
    // Load pending immediately
    loadPendingQuestions();
    
    return html;
}

window.saveAdminSettings = async () => {
    const val = document.querySelector('input[name="vMode"]:checked').value;
    try {
        await window.setDoc(window.doc(window.db, "system", "config"), { verificationMode: val }, { merge: true });
        showToast("Settings saved!", "success");
    } catch (e) {
        console.error(e);
        showToast("Failed to save settings", "error");
    }
};

window.loadPendingQuestions = async () => {
    try {
        const q = window.query(window.collection(window.db, "pendingQuestions"));
        const snap = await window.getDocs(q);
        let listHtml = "";
        
        if (snap.empty) {
            listHtml = "<p>No questions pending review.</p>";
        } else {
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                let preview = "Question: ";
                if (data.type === 'hangman') preview = "Hangman: " + data.word;
                else if (data.type === 'match_pair') preview = "Match Pairs: " + data.pairsMap?.en?.length + " pairs";
                else preview = "Trivia: " + (data.textMap?.en || data.textMap?.he || "?");
                
                listHtml += \`
                    <div style="border: 2px solid var(--app-text); border-radius: 8px; padding: 10px; margin-bottom: 10px; background: #f9f9f9;">
                        <strong>Type:</strong> \${data.type} <br>
                        <strong>Preview:</strong> \${preview} <br>
                        <strong>Target:</strong> \${data.targetCollection} <br>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button class="neo-button bg-indigo" style="padding: 5px 10px; font-size:14px;" onclick="approvePending('\${id}', '\${data.targetCollection}')">Approve</button>
                            <button class="neo-button bg-coral" style="padding: 5px 10px; font-size:14px;" onclick="rejectPending('\${id}')">Reject</button>
                        </div>
                    </div>
                \`;
            });
        }
        document.getElementById('pendingQuestionsContainer').innerHTML = listHtml;
    } catch (e) {
        console.error(e);
        document.getElementById('pendingQuestionsContainer').innerHTML = "<p>Error loading pending questions.</p>";
    }
};

window.approvePending = async (id, targetCollection) => {
    if (!confirm("Approve this question?")) return;
    try {
        const docRef = window.doc(window.db, "pendingQuestions", id);
        const snap = await window.getDoc(docRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        delete data.targetCollection; // clean up before inserting
        
        await window.addDoc(window.collection(window.db, targetCollection), data);
        await window.deleteDoc(docRef); // delete from pending
        
        showToast("Approved and moved to live!", "success");
        loadPendingQuestions(); // refresh
    } catch(e) {
        console.error(e);
        showToast("Error approving", "error");
    }
};

window.rejectPending = async (id) => {
    if (!confirm("Reject and delete this question permanently?")) return;
    try {
        const docRef = window.doc(window.db, "pendingQuestions", id);
        await window.deleteDoc(docRef);
        showToast("Question rejected", "success");
        loadPendingQuestions(); // refresh
    } catch(e) {
        console.error(e);
        showToast("Error rejecting", "error");
    }
};
`;

code += "\n\n" + adminCode;
fs.writeFileSync('public/app.js', code);
console.log('Modifications complete');
