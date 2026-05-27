// --- LANGUAGE SYSTEM ---
const Lang = {
    EN: { code: "en", display: "English", isRtl: false },
    HE: { code: "he", display: "עברית", isRtl: true },
    AR: { code: "ar", display: "العربية", isRtl: true },
    RU: { code: "ru", display: "Русский", isRtl: false }
};

const dict = {
    "menu_title": { en: "Main Menu", he: "תפריט ראשי", ar: "القائمة الرئيسية", ru: "Главное меню" },
    "play_btn": { en: "PLAY", he: "שחק", ar: "يلعب", ru: "ИГРАТЬ" },
    "add_btn": { en: "ADD QUESTION", he: "הוסף שאלה", ar: "أضف سؤالا", ru: "ДОБАВИТЬ ВОПРОС" },
    "mode_title": { en: "Choose Challenge", he: "בחר אתגר", ar: "اختر تحديك", ru: "Выберите режим" },
    "mode_classic": { en: "Classic Mode", he: "מצב רגיל", ar: "الوضع الكلاسيكي", ru: "Классика" },
    "mode_climb": { en: "The Climb", he: "הטיפוס", ar: "التسلق", ru: "Восхождение" },
    "mode_bet": { en: "Bet & Burn", he: "המר ושרוף", ar: "الرهان والحرق", ru: "Ставка и сжигание" },
    "sub_title": { en: "Select Subject", he: "בחר נושא", ar: "اختر الموضوع", ru: "Выберите тему" },
    "check_btn": { en: "CHECK", he: "בדיקה", ar: "بדיקה", ru: "ПРОВЕРИТЬ" },
    "back": { en: "Back", he: "חזור", ar: "رجوع", ru: "Назад" },
    "game_over": { en: "Finished!", he: "סיימנו!", ar: "انتهينا!", ru: "Готово!" },
    "continue_btn": { en: "CONTINUE", he: "המשך", ar: "متابعة", ru: "ПРОДОЛЖИТЬ" }
};

function getString(key) {
    return dict[key]?.[state.currentLang.code] || dict[key]?.["en"] || key;
}

const SHOW_LANG_SELECTOR = false; // Flag to enable/disable language selection

// --- APP STATE ---
const state = {
    currentLang: Lang.HE,
    currentScreen: 'SPLASH',
    selectedMode: 'CLASSIC',
    activeCategory: '',
    questionBank: [], // Will be populated by Firebase
    currentPlayList: [],

    // Game Session Data
    currentIndex: 0,
    score: 0,
    energy: 100,
    rank: 0,           // Climb: current level 0-10
    climbLastResult: null, // 'up' | 'down' | null
    selectedOption: null,
    isAnimating: false,
    currentPhase: 'BETTING', // For Bet & Burn
    userBetInput: ''
};

const categoryList = ["אנימה", "תרבות פופ", "מושגים"];
const appContainer = document.getElementById('app-container');

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- GOOGLE TRANSLATE (free public endpoint, no API key required) ---
async function translateToLang(text, targetLang, sourceLang) {
    if (!text) return '';
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json = await res.json();
        return json[0].map(s => s[0]).join('');
    } catch (e) {
        console.warn(`Translation failed (${targetLang}):`, e);
        return text; // fallback: original text
    }
}

async function translateToAllLangs(text, sourceLang) {
    const targets = ['en', 'he', 'ar', 'ru'].filter(l => l !== sourceLang);
    const results = { [sourceLang]: text };
    await Promise.all(targets.map(async lang => {
        results[lang] = await translateToLang(text, lang, sourceLang);
    }));
    return results;
}

// --- RENDER ENGINE ---
function render() {
    document.documentElement.dir = state.currentLang.isRtl ? "rtl" : "ltr";

    let html = '';
    switch (state.currentScreen) {
        case 'SPLASH': html = renderSplash(); break;
        case 'MENU': html = renderMenu(); break;
        case 'MODE_SELECT': html = renderModeSelect(); break;
        case 'SUBJECTS': html = renderSubjects(); break;
        case 'PLAYING_CLASSIC': html = renderClassic(); break;
        case 'PLAYING_BET': html = renderBetBurn(); break;
        case 'PLAYING_CLIMB': html = renderClimb(); break;
        case 'CLIMB_RESULT': html = renderClimbResult(); break;
        case 'GAME_OVER': html = renderGameOver(); break;
        case 'ADD_QUESTION': html = renderAddQuestion(); break;
    }
    appContainer.innerHTML = html;
}

// --- SCREEN COMPONENTS ---
function renderSplash() {
    setTimeout(() => { state.currentScreen = 'MENU'; render(); }, 2000);
    return `<div class="screen-wrapper" style="align-items:center; justify-content:center;">
                <h1 style="font-size:42px; color:var(--app-text)">אוטאקו טריוויה</h1>
            </div>`;
}

function renderMenu() {
    const langs = Object.values(Lang).map(l =>
        `<span style="cursor:pointer; padding:8px; color: ${state.currentLang === l ? 'var(--vibrant-indigo)' : 'var(--deep-indigo)'}" 
               onclick="setLang('${l.code}')">${l.display}</span>`
    ).join(' | ');

    return `
        <div class="screen-wrapper">
            ${SHOW_LANG_SELECTOR ? `<div style="margin-bottom:40px; text-align: center;">${langs}</div>` : ''}
            <h1 class="main-title">${getString('menu_title')}</h1>
            <div class="button-group">
                <button class="neo-button bg-coral" style="height:60px;" onclick="navigate('MODE_SELECT')">${getString('play_btn')}</button>
                <button class="neo-button bg-teal" style="height:60px;" onclick="navigate('ADD_QUESTION')">${getString('add_btn')}</button>
            </div>
        </div>`;
}

function renderModeSelect() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_title')}</h2>
            <div class="button-group">
                <button class="neo-button bg-teal" style="height:60px;" onclick="setMode('CLASSIC')"> ${getString('mode_classic')}</button>
                <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLIMB')"> ${getString('mode_climb')}</button>
                <button class="neo-button bg-coral" style="height:60px;" onclick="setMode('BET_BURN')"> ${getString('mode_bet')}</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
        </div>`;
}

function renderSubjects() {
    const colourCycle = ['bg-teal', 'bg-indigo', 'bg-coral'];
    const cats = categoryList.map((c, i) =>
        `<button class="neo-button ${colourCycle[i % colourCycle.length]}" onclick="startPlay('${c}')">${c}</button>`
    ).join('');
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('sub_title')}</h2>
            <div class="button-group">
                ${cats}
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MODE_SELECT')">${getString('back')}</button>
            </div>
        </div>`;
}

// --- GAME MODES ---
function renderClassic() {
    const q = state.currentPlayList[state.currentIndex];
    if (!q) return navigate('MENU');
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    const progress = (state.currentIndex / state.currentPlayList.length) * 100;

    return `
        <div class="screen-wrapper">
            <button class="neo-button bg-Back" style="width:auto; padding:8px 20px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
            <div class="spacer-md"></div>
            <div class="progress-container"><div class="progress-fill" style="width: ${progress}%"></div></div>
            <div class="spacer-md"></div>
            <p class="text-center bold color-indigo">שאלה ${state.currentIndex + 1} מתוך ${state.currentPlayList.length}</p>
            <div class="spacer-md"></div>
            <h2 style="font-size: 20px;">${qText}</h2>
            <div class="spacer-lg"></div>
            ${opts.map(opt => `
                <button class="neo-button ${state.selectedOption === opt ? 'bg-indigo toggled' : ''}" 
                        onclick="selectOption('${opt}')">${opt}</button>
            `).join('')}
            <div style="margin-top:auto;">
                <button class="neo-button bg-coral" ${!state.selectedOption ? 'disabled' : ''} 
                        onclick="checkClassicAnswer()">${getString('check_btn')}</button>
            </div>
        </div>`;
}

function renderBetBurn() {
    const q = state.currentPlayList[state.currentIndex];
    if (!q) return navigate('MENU');
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    let content = '';
    if (state.currentPhase === 'BETTING') {
        const isValid = parseInt(state.userBetInput) > 0 && parseInt(state.userBetInput) <= state.energy;
        content = `
            <p class="bold">ENERGY POOL</p>
            <h1 class="color-indigo" style="font-size: 48px;">⚡ ${state.energy}</h1>
            <div class="spacer-lg"></div>
            <p>Enter your wager:</p>
            <input type="number" class="neo-input bet-input" value="${state.userBetInput}" oninput="updateBet(this.value)">
            <div class="spacer-md"></div>
            <button class="neo-button ${isValid ? 'bg-coral' : ''}" ${!isValid ? 'disabled' : ''} 
                    onclick="lockInBet()">LOCK IN BET</button>`;
    } else {
        content = `
            <p class="color-coral bold" style="font-size:18px;">WAGER: ⚡ ${state.userBetInput}</p>
            <div class="spacer-md"></div>
            <h2 style="font-size: 22px;">${qText}</h2>
            <div class="spacer-lg"></div>
            ${opts.map(opt => `
                <button class="neo-button ${state.selectedOption === opt ? 'bg-indigo toggled' : ''}" 
                        ${state.isAnimating ? 'disabled' : ''} onclick="selectOption('${opt}')">${opt}</button>
            `).join('')}
            <div style="margin-top:auto; width: 100%;">
                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimating ? 'disabled' : ''} 
                        onclick="checkBetAnswer()">${getString('check_btn')}</button>
            </div>`;
    }

    return `
        <div class="screen-wrapper">
            <div style="display:flex; justify-content:space-between;">
                <button class="neo-button bg-Back" style="width:auto; padding:8px 20px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
                <span class="bold color-indigo">שאלה ${state.currentIndex + 1} מתוך ${state.currentPlayList.length}</span>
            </div>
            <div class="spacer-md"></div>
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                ${content}
            </div>
        </div>`;
}

function renderClimb() {
    // Cycle questions if we run out
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    if (!q) { navigate('MENU'); return ''; }
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    // Build 10-step rank bar
    const rankDots = Array.from({ length: 10 }, (_, i) => {
        const filled = i < state.rank;
        const isNext = i === state.rank;
        return `<div style="
            width: 28px; height: 28px; border-radius: 50%;
            border: 2px solid var(--app-text);
            background: ${filled ? 'var(--app-text)' : isNext ? 'rgba(33,2,110,0.15)' : 'transparent'};
            display:flex; align-items:center; justify-content:center;
            font-size:12px;
        ">${filled ? '★' : ''}</div>`;
    }).join('');

    return `
        <div class="screen-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button class="neo-button bg-Back" style="width:auto; padding:8px 16px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
                <span class="bold color-indigo" style="font-size:13px;">שאלה ${state.currentIndex + 1}</span>
            </div>
            <div class="spacer-sm"></div>

            <!-- Rank bar -->
            <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; padding: 8px 0;">
                ${rankDots}
            </div>
            <p class="text-center bold color-indigo" style="font-size:13px; margin-bottom:4px;">רמה ${state.rank} / 10</p>

            <div class="spacer-md"></div>
            <h2 style="font-size: 20px; text-align:center;">${qText}</h2>
            <div class="spacer-lg"></div>

            ${opts.map(opt => `
                <button class="neo-button ${state.selectedOption === opt ? 'bg-indigo toggled' : ''}"
                        onclick="selectOption('${opt.replace(/'/g, '&#39;')}')">${opt}</button>
            `).join('')}

            <div style="margin-top:auto;">
                <button class="neo-button bg-coral" ${!state.selectedOption ? 'disabled' : ''}
                        onclick="checkClimbAnswer()">${getString('check_btn')}</button>
            </div>
        </div>`;
}

function renderClimbResult() {
    const won = state.climbLastResult === 'up';
    const emoji = won ? '⬆️' : '⬇️';
    const label = won ? 'נכון! הצלחת לעלות רמה!' : 'לא נכון. ירדת רמה';
    const bg = won ? 'var(--accent-teal)' : 'var(--accent-mint)';
    const TOTAL_STEPS = 10;

    // Mountain made of Unicode blocks — each level is a row
    const mountain = Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const level = TOTAL_STEPS - 1 - i;       // level 9 at top, 0 at bottom
        const filled = level < state.rank;
        const isClimber = level === state.rank - 1 && won || level === state.rank && !won;
        const width = 30 + (level + 1) * 26;    // wider at bottom
        return `<div style="
            width: ${width}px;
            height: 26px;
            background: ${filled ? 'var(--app-text)' : 'rgba(33,2,110,0.12)'};
            border-radius: 4px;
            display:flex; align-items:center; justify-content:center;
            margin: 2px auto;
            position:relative;
            transition: all 0.5s ease;
        ">${isClimber ? '<span style="font-size:18px; position:absolute;">🧗</span>' : ''}</div>`;
    }).join('');

    // Auto-advance to next question after 2s
    setTimeout(() => {
        if (state.rank >= 10) {
            navigate('GAME_OVER');
        } else if (state.rank < 0) {
            navigate('GAME_OVER');
        } else {
            state.selectedOption = null;
            navigate('PLAYING_CLIMB');
        }
    }, 2000);

    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <div style="
                text-align:center;
                background: ${bg};
                border-radius: 24px;
                padding: 32px 24px;
                width: 100%;
                max-width: 360px;
                border: 2px solid var(--app-text);
                box-shadow: 0 6px 0 rgba(33,2,110,0.3);
            ">
                <div style="font-size: 56px; margin-bottom: 8px;">${emoji}</div>
                <h2 style="font-size: 22px; margin-bottom: 20px;">${label}</h2>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    ${mountain}
                </div>
                <p class="bold" style="margin-top: 16px; font-size: 18px;">רמה ${Math.max(0, state.rank)} / 10</p>
            </div>
        </div>`;
}

function renderGameOver() {
    let headline = '';
    let subline = '';
    if (state.selectedMode === 'CLIMB') {
        if (state.rank >= 10) {
            headline = '🏆 עברת את האתגר!';
            subline = 'הגעת לרמה 10!';
        } else {
            headline = '💥 ירדת מההר!';
            subline = `סיימת ברמה ${Math.max(0, state.rank)}`;
        }
    } else if (state.selectedMode === 'BET_BURN') {
        headline = getString('game_over');
        subline = '⚡ ' + state.energy;
    } else {
        headline = getString('game_over');
        subline = state.score + ' / ' + state.currentPlayList.length;
    }

    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto;">
            <h1 class="color-indigo">${headline}</h1>
            <div class="spacer-md"></div>
            <h1 style="font-size:48px;" class="color-indigo">${subline}</h1>
            <div class="spacer-lg"></div>
            <button class="neo-button bg-coral" style="height:56px;" onclick="navigate('MENU')">${getString('continue_btn')}</button>
        </div>`;
}

// --- ADD QUESTION SCREEN & LOGIC ---

function renderAddQuestion() {
    // Generate radio buttons for categories
    const cats = categoryList.map(c =>
        `<label style="margin-right: 16px; font-weight: bold; cursor: pointer; color: var(--deep-indigo);">
            <input type="radio" name="newQCategory" value="${c}" ${c === 'Anime' ? 'checked' : ''}> ${c}
         </label>`
    ).join('');

    return `
        <div class="screen-wrapper" style="align-items: center; padding-bottom: 40px;">
            <h2 class="main-title" style="margin-top: 0;">הוסף שאלה חדשה</h2>
            
            <div style="width: 100%; max-width: 400px; text-align: right;">
                <label class="bold">טקסט השאלה</label>
                <input type="text" id="newQText" class="neo-input" placeholder="לדוגמא, מי היוצר של וואן פיס?">
                
                <label class="bold">אפשרויות (4)</label>
                <input type="text" id="newQOpt1" class="neo-input" placeholder="אפשרות 1" oninput="updateCorrectDropdown()">
                <input type="text" id="newQOpt2" class="neo-input" placeholder="אפשרות 2" oninput="updateCorrectDropdown()">
                <input type="text" id="newQOpt3" class="neo-input" placeholder="אפשרות 3" oninput="updateCorrectDropdown()">
                <input type="text" id="newQOpt4" class="neo-input" placeholder="אפשרות 4" oninput="updateCorrectDropdown()">
                
                <label class="bold">תשובה נכונה</label>
                <select id="newQCorrect" class="neo-input" style="height: 58px; font-weight: bold; background-color: var(--white); -webkit-appearance: listbox;">
                    <option value="">-- בחר את התשובה הנכונה --</option>
                </select>
            </div>
            
            <div class="spacer-sm"></div>
            <div style="display: flex; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; flex-direction: row-reverse;">
                ${cats}
            </div>
            
            <button class="neo-button bg-teal" id="saveQBtn" onclick="saveNewQuestion()">שמור שאלה</button>
            <div class="spacer-lg"></div>
            <button class="neo-button bg-Back" style="margin-bottom: 40px; max-width: 100px;" onclick="navigate('MENU')">${getString('back')}</button>
        </div>
    `;
}

async function saveNewQuestion() {
    const qText = document.getElementById('newQText').value.trim();
    const opt1 = document.getElementById('newQOpt1').value.trim();
    const opt2 = document.getElementById('newQOpt2').value.trim();
    const opt3 = document.getElementById('newQOpt3').value.trim();
    const opt4 = document.getElementById('newQOpt4').value.trim();
    const correct = document.getElementById('newQCorrect').value;
    const category = document.querySelector('input[name="newQCategory"]:checked').value;

    const opts = [opt1, opt2, opt3, opt4];

    // Basic validation
    if (!qText || opts.some(o => !o) || !correct) {
        showToast("נא למלא את כל השדות!", 'error');
        return;
    }

    // UI Feedback
    const btn = document.getElementById('saveQBtn');
    btn.innerText = "מתרגם ושומר...";
    btn.disabled = true;

    try {
        const src = state.currentLang.code;

        // Translate question text into all 4 languages
        const tQ = await translateToAllLangs(qText, src);

        // Translate each option into all 4 languages in parallel
        const translatedOpts = await Promise.all(opts.map(o => translateToAllLangs(o, src)));

        // Build optionsMap: { en: [...], he: [...], ar: [...], ru: [...] }
        const tO = {
            en: translatedOpts.map(t => t.en),
            he: translatedOpts.map(t => t.he),
            ar: translatedOpts.map(t => t.ar),
            ru: translatedOpts.map(t => t.ru)
        };

        // Translate the correct answer into all 4 languages
        const tA = await translateToAllLangs(correct, src);

        const newQuestion = {
            category: category,
            textMap: tQ,
            optionsMap: tO,
            correctMap: tA
        };

        // Save to Firebase Firestore
        await window.addDoc(window.collection(window.db, "questions"), newQuestion);
        showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", 'success', 3500);
        navigate('MENU');

    } catch (error) {
        console.error("Error saving question:", error);
        showToast("שגיאה בשמירת השאלה: " + error.message, 'error', 5000);
        const btn2 = document.getElementById('saveQBtn');
        if (btn2) { btn2.innerText = "שמור שאלה"; btn2.disabled = false; }
    }
}

function initDB() {
    // Listen to the "questions" collection in your existing Firestore
    if (!window.db) {
        console.error("Firebase is not initialized yet!");
        return;
    }
    window.onSnapshot(window.collection(window.db, "questions"), (snapshot) => {
        state.questionBank = [];
        snapshot.forEach((doc) => {
            state.questionBank.push(doc.data());
        });
        console.log("Loaded questions from Firebase:", state.questionBank.length);

        // Re-render if we are on a screen that needs the data
        if (state.currentScreen === 'MENU') render();
    }, (error) => {
        console.error("Firebase connection error:", error);
        showToast("שגיאה בהתחברות ל-Firebase: " + error.message, 'error', 6000);
    });
}

// --- ACTIONS ---
window.setLang = (code) => { state.currentLang = Object.values(Lang).find(l => l.code === code); render(); };
window.navigate = (screen) => { state.currentScreen = screen; render(); };
window.setMode = (mode) => { state.selectedMode = mode; navigate('SUBJECTS'); };
window.startPlay = (cat) => {
    state.activeCategory = cat;
    state.currentPlayList = state.questionBank.filter(q => q.category === cat);
    // Reset variables
    state.currentIndex = 0; state.score = 0; state.energy = 100;
    state.rank = 0; state.climbLastResult = null;
    state.currentPhase = 'BETTING'; state.userBetInput = '';
    state.selectedOption = null;

    if (state.currentPlayList.length > 0) {
        navigate(state.selectedMode === 'BET_BURN' ? 'PLAYING_BET' : state.selectedMode === 'CLIMB' ? 'PLAYING_CLIMB' : 'PLAYING_CLASSIC');
    } else {
        showToast("לא נמצאו שאלות עבור נושא זה. אנא הוסף שאלות חדשות!", 'info', 4000);
    }
};

window.selectOption = (opt) => { state.selectedOption = opt; render(); };
window.updateBet = (val) => { state.userBetInput = val; render(); };
window.lockInBet = () => { state.currentPhase = 'ANSWERING'; render(); };

window.checkClassicAnswer = () => {
    const q = state.currentPlayList[state.currentIndex];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    if (state.selectedOption === correct) state.score++;

    if (state.currentIndex < state.currentPlayList.length - 1) {
        state.currentIndex++;
        state.selectedOption = null;
        render();
    } else {
        navigate('GAME_OVER');
    }
};

window.checkClimbAnswer = () => {
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    if (isCorrect) {
        state.rank = Math.min(10, state.rank + 1);
        state.climbLastResult = 'up';
    } else {
        state.rank = Math.max(-1, state.rank - 1);
        state.climbLastResult = 'down';
    }

    state.currentIndex++;
    // Navigate to result screen; it auto-advances after 2s
    navigate('CLIMB_RESULT');
};

window.checkBetAnswer = () => {
    state.isAnimating = true;
    render();

    setTimeout(() => {
        const q = state.currentPlayList[state.currentIndex];
        const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
        const bet = parseInt(state.userBetInput);

        if (state.selectedOption === correct) {
            state.energy += bet;
        } else {
            state.energy -= bet;
            appContainer.classList.add('shake');
            setTimeout(() => appContainer.classList.remove('shake'), 400);
        }

        setTimeout(() => {
            if (state.energy <= 0) {
                navigate('GAME_OVER');
            } else if (state.currentIndex >= Math.min(state.currentPlayList.length - 1, 9)) {
                navigate('GAME_OVER');
            } else {
                state.userBetInput = '';
                state.selectedOption = null;
                state.isAnimating = false;
                state.currentPhase = 'BETTING';
                state.currentIndex++;
                render();
            }
        }, 800);
    }, 100);
};

// --- REACTIVE CORRECT ANSWER DROPDOWN ---
window.updateCorrectDropdown = () => {
    const opt1 = document.getElementById('newQOpt1')?.value.trim() || '';
    const opt2 = document.getElementById('newQOpt2')?.value.trim() || '';
    const opt3 = document.getElementById('newQOpt3')?.value.trim() || '';
    const opt4 = document.getElementById('newQOpt4')?.value.trim() || '';
    
    const select = document.getElementById('newQCorrect');
    if (!select) return;
    
    const prevValue = select.value;
    
    select.innerHTML = `
        <option value="">-- בחר את התשובה הנכונה --</option>
        ${opt1 ? `<option value="${opt1}">${opt1}</option>` : ''}
        ${opt2 ? `<option value="${opt2}">${opt2}</option>` : ''}
        ${opt3 ? `<option value="${opt3}">${opt3}</option>` : ''}
        ${opt4 ? `<option value="${opt4}">${opt4}</option>` : ''}
    `;
    
    if ([opt1, opt2, opt3, opt4].includes(prevValue)) {
        select.value = prevValue;
    }
};

// Initialize
// initDB() and render() are called from the Firebase module script in index.html