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

// --- APP STATE ---
const state = {
    currentLang: Lang.EN,
    currentScreen: 'SPLASH',
    selectedMode: 'CLASSIC',
    activeCategory: '',
    questionBank: [], // Will be populated by Firebase
    currentPlayList: [],

    // Game Session Data
    currentIndex: 0,
    score: 0,
    energy: 100,
    rank: 0,
    selectedOption: null,
    isAnimating: false,
    currentPhase: 'BETTING', // For Bet & Burn
    userBetInput: ''
};

const categoryList = ["Anime", "Pop Culture", "Terms"];
const appContainer = document.getElementById('app-container');

// --- MOCK DATABASE (Replace with Firebase Firestore Web SDK later) ---
function initDB() {
    // Placeholder data to allow UI testing
    state.questionBank = [
        {
            category: "Anime",
            textMap: { en: "What is the highest grossing anime film?", he: "מהו סרט האנימה המכניס ביותר?" },
            optionsMap: { en: ["Your Name", "Demon Slayer", "Spirited Away", "Akira"] },
            correctMap: { en: "Demon Slayer" }
        }
    ];
}

// --- TRANSLATOR MOCK (Replace with Google Cloud Translate API for Web) ---
async function translateText(text, sourceLang) {
    console.log("Translation API call would happen here for:", text);
    return { en: text, he: text + " (he)", ar: text + " (ar)", ru: text + " (ru)" };
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
        case 'GAME_OVER': html = renderGameOver(); break;
        case 'ADD_QUESTION': html = renderAddQuestion(); break;
    }
    appContainer.innerHTML = html;
}

// --- SCREEN COMPONENTS ---
function renderSplash() {
    setTimeout(() => { state.currentScreen = 'MENU'; render(); }, 2000);
    return `<div style="display:flex;height:100%;align-items:center;justify-content:center;">
                <h1 style="font-size:42px;color:var(--deep-indigo)">Otaku Trivia</h1>
            </div>`;
}

function renderMenu() {
    const langs = Object.values(Lang).map(l =>
        `<span style="cursor:pointer; padding:8px; color: ${state.currentLang === l ? 'var(--vibrant-indigo)' : 'var(--deep-indigo)'}" 
               onclick="setLang('${l.code}')">${l.display}</span>`
    ).join(' | ');

    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto;">
            <div style="margin-bottom:40px;">${langs}</div>
            <h1 style="font-size:32px;">${getString('menu_title')}</h1>
            <button class="neo-button bg-coral" style="height:60px;" onclick="navigate('MODE_SELECT')">${getString('play_btn')}</button>
            <button class="neo-button bg-teal" style="height:60px;" onclick="navigate('ADD_QUESTION')">${getString('add_btn')}</button>
        </div>`;
}

function renderModeSelect() {
    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto;">
            <h2>${getString('mode_title')}</h2>
            <button class="neo-button bg-teal" style="height:60px;" onclick="setMode('CLASSIC')">🏆 ${getString('mode_classic')}</button>
            <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLIMB')">⛰️ ${getString('mode_climb')}</button>
            <button class="neo-button bg-coral" style="height:60px;" onclick="setMode('BET_BURN')">🔥 ${getString('mode_bet')}</button>
            <div class="spacer-lg"></div>
            <button class="neo-button bg-coral" onclick="navigate('MENU')">${getString('back')}</button>
        </div>`;
}

function renderSubjects() {
    const colourCycle = ['bg-teal', 'bg-indigo', 'bg-coral'];
    const cats = categoryList.map((c, i) =>
        `<button class="neo-button ${colourCycle[i % colourCycle.length]}" onclick="startPlay('${c}')">${c}</button>`
    ).join('');
    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto;">
            <h2>${getString('sub_title')}</h2>
            ${cats}
            <div class="spacer-lg"></div>
            <button class="neo-button bg-coral" onclick="navigate('MODE_SELECT')">${getString('back')}</button>
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
        <div style="display:flex; flex-direction:column; height:100%;">
            <span style="cursor:pointer; font-weight:bold;" onclick="navigate('MENU')">${getString('back')}</span>
            <div class="spacer-md"></div>
            <div class="progress-container"><div class="progress-fill" style="width: ${progress}%"></div></div>
            <div class="spacer-md"></div>
            <p class="text-center bold color-coral">Question ${state.currentIndex + 1} / ${state.currentPlayList.length}</p>
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
        <div style="display:flex; flex-direction:column; height:100%;">
            <div style="display:flex; justify-content:space-between;">
                <span style="cursor:pointer; font-weight:bold;" onclick="navigate('MENU')">${getString('back')}</span>
                <span class="bold">Q: ${state.currentIndex + 1} / ${state.currentPlayList.length}</span>
            </div>
            <div class="spacer-md"></div>
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                ${content}
            </div>
        </div>`;
}

function renderClimb() {
    // Basic structural representation of the climb visualizer for web
    return `<div class="text-center" style="margin-top:auto; margin-bottom:auto;">
        <h2>The Climb Mode</h2>
        <p>HTML/CSS Canvas alternative would render steps here based on state.rank: ${state.rank}/10</p>
        <button class="neo-button" onclick="navigate('GAME_OVER')">Trigger Win/Loss Simulation</button>
    </div>`;
}

function renderGameOver() {
    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto;">
            <h1 class="color-indigo">${getString('game_over')}</h1>
            <div class="spacer-md"></div>
            <h1 style="font-size:48px;" class="color-indigo">
                ${state.selectedMode === 'BET_BURN' ? '⚡ ' + state.energy : state.score + ' / ' + state.currentPlayList.length}
            </h1>
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
        <div style="display:flex; flex-direction:column; height:100%; overflow-y:auto; padding-bottom: 20px;">
            <h2 class="color-indigo">Add New Question</h2>
            
            <label class="bold">Question Text</label>
            <input type="text" id="newQText" class="neo-input" placeholder="e.g., Who is the author of One Piece?">
            
            <label class="bold">Options (4)</label>
            <input type="text" id="newQOpt1" class="neo-input" placeholder="Option 1">
            <input type="text" id="newQOpt2" class="neo-input" placeholder="Option 2">
            <input type="text" id="newQOpt3" class="neo-input" placeholder="Option 3">
            <input type="text" id="newQOpt4" class="neo-input" placeholder="Option 4">
            
            <label class="bold">Correct Answer</label>
            <input type="text" id="newQCorrect" class="neo-input" placeholder="Must match one of the options exactly">
            
            <div class="spacer-sm"></div>
            <div style="display: flex; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                ${cats}
            </div>
            
            <button class="neo-button bg-teal" id="saveQBtn" onclick="saveNewQuestion()">SAVE QUESTION</button>
            <div class="spacer-lg"></div>
            <button class="neo-button bg-coral" onclick="navigate('MENU')">${getString('back')}</button>
        </div>
    `;
}

async function saveNewQuestion() {
    const qText = document.getElementById('newQText').value.trim();
    const opt1 = document.getElementById('newQOpt1').value.trim();
    const opt2 = document.getElementById('newQOpt2').value.trim();
    const opt3 = document.getElementById('newQOpt3').value.trim();
    const opt4 = document.getElementById('newQOpt4').value.trim();
    const correct = document.getElementById('newQCorrect').value.trim();
    const category = document.querySelector('input[name="newQCategory"]:checked').value;

    const opts = [opt1, opt2, opt3, opt4];

    // Basic validation
    if (!qText || opts.some(o => !o) || !correct) {
        alert("Please fill in all fields!");
        return;
    }

    if (!opts.includes(correct)) {
        alert("The Correct Answer must exactly match one of the 4 options.");
        return;
    }

    // UI Feedback
    const btn = document.getElementById('saveQBtn');
    btn.innerText = "SAVING...";
    btn.disabled = true;

    // Simulate the Kotlin translateTextToAllLanguages function
    const tQ = await translateText(qText, state.currentLang.code);
    const tA = await translateText(correct, state.currentLang.code);

    // Simulate translating the array of options
    const tO = {
        en: opts,
        he: opts.map(o => o + " (he)"),
        ar: opts.map(o => o + " (ar)"),
        ru: opts.map(o => o + " (ru)")
    };

    const newQuestion = {
        category: category,
        textMap: tQ,
        optionsMap: tO,
        correctMap: tA
    };

    // Push to local state (Replace this with db.collection("questions").add(newQ) later)
    state.questionBank.push(newQuestion);

    alert("Question added successfully!");
    navigate('MENU');
}


function initDB() {
    // Listen to the "questions" collection in your existing Firestore
    window.onSnapshot(window.collection(window.db, "questions"), (snapshot) => {
        state.questionBank = [];
        snapshot.forEach((doc) => {
            state.questionBank.push(doc.data());
        });
        console.log("Loaded questions from Firebase:", state.questionBank.length);

        // Re-render if we are on a screen that needs the data
        if (state.currentScreen === 'MENU') render();
    });
}

async function saveNewQuestion() {
    // ... (keep all the form validation and translation code the same) ...

    const newQuestion = {
        category: category,
        textMap: tQ,
        optionsMap: tO,
        correctMap: tA
    };

    try {
        // Send directly to the same Firestore collection your Kotlin app uses
        await window.addDoc(window.collection(window.db, "questions"), newQuestion);
        alert("Question added successfully to Firebase!");
        navigate('MENU');
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Failed to save. Check console.");
    }
}

// --- ACTIONS ---
window.setLang = (code) => { state.currentLang = Object.values(Lang).find(l => l.code === code); render(); };
window.navigate = (screen) => { state.currentScreen = screen; render(); };
window.setMode = (mode) => { state.selectedMode = mode; navigate('SUBJECTS'); };
window.startPlay = (cat) => {
    state.activeCategory = cat;
    state.currentPlayList = state.questionBank.filter(q => q.category === cat);
    // Reset variables
    state.currentIndex = 0; state.score = 0; state.energy = 100; state.rank = 0; state.currentPhase = 'BETTING'; state.userBetInput = '';

    if (state.currentPlayList.length > 0) {
        navigate(state.selectedMode === 'BET_BURN' ? 'PLAYING_BET' : state.selectedMode === 'CLIMB' ? 'PLAYING_CLIMB' : 'PLAYING_CLASSIC');
    } else {
        alert("No questions found for this category! Please add some via DB.");
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

// Initialize
//initDB();
//render();