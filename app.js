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
    "continue_btn": { en: "CONTINUE", he: "המשך", ar: "متابعة", ru: "ПРОДОЛЖИТЬ" },
    "leaderboard_btn": { en: "LEADERBOARD", he: "טבלת מובילים", ar: "لوحة المتصدرين", ru: "ТАБЛИЦА ЛИДЕРОВ" },
    "leaderboard_title": { en: "Top 100", he: "100 המובילים", ar: "أفضل 100", ru: "Топ 100" },
    "submit_score": { en: "Submit Score", he: "שלח תוצאה", ar: "إرسال النتيجة", ru: "Отправить результат" },
    "your_name": { en: "Your Name", he: "השם שלך", ar: "اسمك", ru: "Ваше имя" },
    "mode_multiplayer": { en: "1v1 Online", he: "1 נגד 1 אונליין", ar: "1 ضد 1 أونلاين", ru: "1 на 1 Онлайн" },
    "create_room": { en: "Create Room", he: "צור חדר", ar: "إنشاء غرفة", ru: "Создать комнату" },
    "join_room": { en: "Join Room", he: "הצטרף לחדר", ar: "الانضمام لغرفة", ru: "Присоединиться к комнате" }
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
    userBetInput: '',

    // Multiplayer Data
    roomId: null,
    isHost: false,
    myPlayerName: '',
    multiplayerPlayers: {}, // { name: { score, finished, isHost } }
    maxPlayers: 2,
    multiplayerStatus: null,
    isMultiplayer: false,

    // Timer
    questionTimer: 15,
    timerInterval: null
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
        case 'BET_MENU': html = renderBetMenu(); break;
        case 'SUBJECTS': html = renderSubjects(); break;
        case 'PLAYING_CLASSIC': html = renderClassic(); break;
        case 'PLAYING_BET': html = renderBetBurn(); break;
        case 'PLAYING_CLIMB': html = renderClimb(); break;
        case 'CLIMB_RESULT': html = renderClimbResult(); break;
        case 'GAME_OVER': html = renderGameOver(); break;
        case 'ADD_QUESTION': html = renderAddQuestion(); break;
        case 'LEADERBOARD': html = renderLeaderboard(); break;
        case 'MULTIPLAYER_MENU': html = renderMultiplayerMenu(); break;
        case 'MULTIPLAYER_LOBBY': html = renderMultiplayerLobby(); break;
        case 'MULTIPLAYER_WAIT': html = renderMultiplayerWaitScreen(); break;
        case 'MULTIPLAYER_RESULTS': html = renderMultiplayerResults(); break;
    }
    appContainer.innerHTML = html;
}

// --- SCREEN COMPONENTS ---
function renderSplash() {
    setTimeout(() => { state.currentScreen = 'MENU'; render(); }, 2000);
    return `<div class="screen-wrapper" style="align-items:center; justify-content:center; text-align:center;">
                <h1 style="font-size:clamp(36px, 12vw, 84px); line-height:1.2; color:var(--app-text)">המדריך למתחיל<br>באנימה</h1>
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
                <button class="neo-button bg-indigo" style="height:60px;" onclick="navigate('MODE_SELECT')">${getString('play_btn')}</button>
                <button class="neo-button bg-coral" style="height:60px; margin-top: 12px;" onclick="navigate('ADD_QUESTION')">${getString('add_btn')}</button>
            </div>
        </div>`;
}

function renderModeSelect() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_title')}</h2>
            <div class="button-group">
                <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLASSIC')"> ${getString('mode_classic')}</button>
                <button class="neo-button bg-coral" style="height:60px;" onclick="setMode('CLIMB')"> ${getString('mode_climb')}</button>
                <button class="neo-button bg-teal" style="height:60px;" onclick="setMode('BET_BURN')"> ${getString('mode_bet')}</button>
                <button class="neo-button bg-Back" style="height:60px;" onclick="setMode('MULTIPLAYER')"> ⚔️ ${getString('mode_multiplayer')}</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
        </div>`;
}

function renderSubjects() {
    const colourCycle = ['bg-indigo', 'bg-coral', 'bg-teal'];
    const cats = categoryList.map((c, i) =>
        `<button class="neo-button ${colourCycle[i % colourCycle.length]}" onclick="startPlay('${c}')">${c}</button>`
    ).join('');
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('sub_title')}</h2>
            <div class="button-group">
                ${cats}
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate(state.selectedMode === 'BET_BURN' ? 'BET_MENU' : 'MODE_SELECT')">${getString('back')}</button>
            </div>
        </div>`;
}

function renderBetMenu() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_bet')}</h2>
            <div class="button-group">
                <button class="neo-button bg-coral" style="height:60px;" onclick="navigate('SUBJECTS')">התחל / המשך</button>
                <button class="neo-button bg-teal" style="height:60px; margin-top:12px;" onclick="navigate('LEADERBOARD')">${getString('leaderboard_btn')}</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MODE_SELECT')">${getString('back')}</button>
            </div>
        </div>`;
}

// --- GAME MODES ---
function generateOptionsHTML(opts) {
    // Get correct answer to highlight it if needed
    let correctOpt = null;
    if (state.isAnimatingResult && state.currentPlayList && state.currentPlayList[state.currentIndex]) {
        const q = state.currentPlayList[state.currentIndex];
        correctOpt = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    }

    return opts.map((opt) => {
        const safeOpt = opt.replace(/"/g, '&quot;');
        let btnClass = '';
        let icon = '';

        if (state.selectedOption === opt) {
            if (state.isAnimatingResult) {
                btnClass = state.lastResultIsCorrect ? 'bg-correct animate-pop' : 'bg-wrong animate-shake';
                icon = state.lastResultIsCorrect ? '✓ ' : '✗ ';
            } else {
                btnClass = 'bg-indigo toggled';
            }
        } else if (state.isAnimatingResult && opt === correctOpt) {
            // Reveal the correct answer in green if they guessed wrong
            btnClass = 'bg-correct animate-pop';
            icon = '✓ ';
        }

        return `<button class="neo-button ${btnClass}"
                ${state.isAnimatingResult ? 'disabled' : ''}
                data-opt="${safeOpt}" onclick="selectOption(this.dataset.opt)">${icon}${opt}</button>`;
    }).join('');
}

function renderClassic() {
    const q = state.currentPlayList[state.currentIndex];
    if (!q) return navigate('MENU');
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    const progress = (state.currentIndex / state.currentPlayList.length) * 100;

    // Start timer for multiplayer if it hasn't started for this question
    if (state.isMultiplayer && !state.isAnimatingResult && !state.timerInterval) {
        startQuestionTimer();
    }

    return `
        <div class="screen-wrapper">
            <div style="display:flex; justify-content:center;">
                <button class="neo-button bg-Back" style="width:auto; padding:8px 20px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
            <div class="spacer-md"></div>
            <div class="progress-container"><div class="progress-fill" style="width: ${progress}%"></div></div>
            <div class="spacer-md"></div>
            ${state.isMultiplayer ? `<div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;">⏳ ${state.questionTimer}s</div><div class="spacer-md"></div>` : ''}
            <h2 style="font-size: 20px;">${qText}</h2>
            <div class="spacer-lg"></div>
            ${generateOptionsHTML(opts)}
            <div style="margin-top:auto;">
                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''} 
                        onclick="checkAnswer()">${getString('check_btn')}</button>
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
            <p class="bold">מאגר אנרגיה</p>
            <h1 class="color-indigo" style="font-size: 48px;">⚡ ${state.energy}</h1>
            <div class="spacer-lg"></div>
            <p>הזן את ההימור שלך (מקסימום ${state.energy}):</p>
            <input type="number" class="neo-input bet-input" value="${state.userBetInput}" oninput="updateBet(this.value)">
            <div class="spacer-md"></div>
            <button id="lockBetBtn" class="neo-button ${isValid ? 'bg-coral' : ''}" ${!isValid ? 'disabled' : ''} 
                    onclick="lockInBet()">נעל הימור</button>`;
    } else {
        content = `
            <p class="color-coral bold" style="font-size:18px;">הימור: ⚡ ${state.userBetInput}</p>
            <div class="spacer-md"></div>
            <h2 style="font-size: 22px;">${qText}</h2>
            <div class="spacer-lg"></div>
            ${generateOptionsHTML(opts)}
            <div style="margin-top:auto; width: 100%;">
                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''} 
                        onclick="checkBetAnswer()">${getString('check_btn')}</button>
            </div>`;
    }

    return `
        <div class="screen-wrapper">
            <div style="display:flex; justify-content:center;">
                <button class="neo-button bg-Back" style="width:auto; padding:8px 20px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
            <div class="spacer-md"></div>
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                ${content}
            </div>
        </div>`;
}

function buildMountainSVG(rank, animateClass) {
    // Wider canvas: viewBox 520x240
    // Peak: (260, 28), Left base: (20, 220), Right base: (500, 220)
    const t = rank / 10;
    const cx = 20 + 240 * t;   // 20 -> 260
    const cy = 220 - 192 * t;  // 220 -> 28

    const stepMarkers = Array.from({ length: 11 }, (_, i) => {
        const mt = i / 10;
        const mx = 20 + 240 * mt;
        const my = 220 - 192 * mt;
        return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5"
            fill="${i <= rank ? '#21026e' : 'rgba(33,2,110,0.2)'}"
            stroke="white" stroke-width="1.5"/>`;
    }).join('');

    // Calculate old rank to animate from
    const oldRank = animateClass === 'climber-up' ? Math.max(-1, rank - 1) :
        (animateClass === 'climber-down' ? Math.min(10, rank + 1) : rank);

    const tOld = oldRank / 10;
    const oldX = 20 + 240 * tOld;
    const oldY = 220 - 192 * tOld;

    const tNew = rank / 10;
    const newX = 20 + 240 * tNew;
    const newY = 220 - 192 * tNew;

    let dynamicAnim = '';
    let climberClass = '';
    if (animateClass === 'climber-up') {
        dynamicAnim = `
        <style>
            @keyframes climbUpAction {
                0% { transform: translate(${oldX.toFixed(1)}px, ${oldY.toFixed(1)}px) rotate(0deg); }
                25% { transform: translate(${(oldX + (newX - oldX) * 0.25).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.25 - 12).toFixed(1)}px) rotate(15deg); }
                50% { transform: translate(${(oldX + (newX - oldX) * 0.50).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.50 - 4).toFixed(1)}px) rotate(-10deg); }
                75% { transform: translate(${(oldX + (newX - oldX) * 0.75).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.75 - 12).toFixed(1)}px) rotate(10deg); }
                100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px) rotate(0deg); }
            }
            .dynamic-climber {
                animation: climbUpAction 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
        </style>`;
        climberClass = 'dynamic-climber';
    } else if (animateClass === 'climber-down') {
        dynamicAnim = `
        <style>
            @keyframes climbDownAction {
                0% { transform: translate(${oldX.toFixed(1)}px, ${oldY.toFixed(1)}px) rotate(0deg); }
                25% { transform: translate(${(oldX + (newX - oldX) * 0.25).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.25 + 5).toFixed(1)}px) rotate(-20deg); }
                50% { transform: translate(${(oldX + (newX - oldX) * 0.50).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.50 + 15).toFixed(1)}px) rotate(-40deg); }
                75% { transform: translate(${(oldX + (newX - oldX) * 0.75).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.75 + 5).toFixed(1)}px) rotate(-20deg); }
                100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px) rotate(0deg); }
            }
            .dynamic-climber {
                animation: climbDownAction 0.9s ease-in-out forwards;
            }
        </style>`;
        climberClass = 'dynamic-climber';
    } else {
        dynamicAnim = `
        <style>
            @keyframes climbIdle {
                0%, 100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px); }
                50% { transform: translate(${newX.toFixed(1)}px, ${(newY - 3).toFixed(1)}px); }
            }
            .dynamic-climber {
                animation: climbIdle 2s ease-in-out infinite;
            }
        </style>`;
        climberClass = 'dynamic-climber';
    }

    const climber = `
        ${dynamicAnim}
        <g class="${climberClass}" id="climber-avatar">
            <!-- Body -->
            <line x1="0" y1="-16" x2="0" y2="-4" stroke="#21026e" stroke-width="3" stroke-linecap="round"/>
            <!-- Head -->
            <circle cx="0" cy="-21" r="5" fill="#f97b57" stroke="#21026e" stroke-width="2"/>
            <!-- Left arm -->
            <line x1="0" y1="-14" x2="-9" y2="-8" stroke="#21026e" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Right arm (holding pick) -->
            <line x1="0" y1="-14" x2="9" y2="-19" stroke="#21026e" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Pick axe handle -->
            <line x1="9" y1="-19" x2="15" y2="-24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
            <!-- Pick axe head -->
            <line x1="12" y1="-27" x2="18" y2="-21" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Left leg -->
            <line x1="0" y1="-4" x2="-6" y2="5" stroke="#21026e" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Right leg -->
            <line x1="0" y1="-4" x2="6" y2="3" stroke="#21026e" stroke-width="2.5" stroke-linecap="round"/>
        </g>`;

    return `
    <svg viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg"
         style="width:100%; max-width:100%; display:block; margin:0 auto; overflow:hidden; border-radius:16px;">

        <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#b39dff"/>
                <stop offset="100%" stop-color="#e8dfff"/>
            </linearGradient>
            <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7c6dab"/>
                <stop offset="100%" stop-color="#4a3880"/>
            </linearGradient>
            <linearGradient id="rock2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#a090cc"/>
                <stop offset="100%" stop-color="#6a5aa0"/>
            </linearGradient>
        </defs>

        <!-- Sky -->
        <rect x="0" y="0" width="520" height="240" fill="url(#skyGrad)"/>

        <!-- Sun -->
        <circle cx="460" cy="36" r="22" fill="#ffe066" opacity="0.85"/>
        <circle cx="460" cy="36" r="28" fill="#ffe066" opacity="0.25"/>

        <!-- Clouds -->
        <ellipse cx="80" cy="52" rx="38" ry="16" fill="white" opacity="0.7"/>
        <ellipse cx="114" cy="46" rx="28" ry="14" fill="white" opacity="0.7"/>
        <ellipse cx="52"  cy="56" rx="22" ry="11" fill="white" opacity="0.6"/>
        <ellipse cx="370" cy="62" rx="34" ry="14" fill="white" opacity="0.55"/>
        <ellipse cx="402" cy="56" rx="24" ry="12" fill="white" opacity="0.55"/>

        <!-- Far-left small mountain -->
        <polygon points="0,220 80,120 160,220" fill="#c0b0e8" opacity="0.45"/>

        <!-- Far-right mountain -->
        <polygon points="360,220 450,80 540,220" fill="url(#rock2Grad)" opacity="0.6"/>
        <polygon points="410,220 450,120 490,220" fill="white" opacity="0.2"/>

        <!-- Main mountain -->
        <polygon points="20,220 260,28 500,220" fill="url(#rockGrad)"/>

        <!-- Rock face detail lines -->
        <line x1="260" y1="28" x2="180" y2="160" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
        <line x1="260" y1="28" x2="340" y2="160" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

        <!-- Snow cap -->
        <polygon points="260,28 228,90 292,90" fill="white" opacity="0.92"/>
        <polygon points="260,28 245,60 275,60" fill="white" opacity="0.5"/>

        <!-- Ground -->
        <rect x="0" y="218" width="520" height="22" fill="#3a2870"/>
        <rect x="0" y="218" width="520" height="4" fill="rgba(255,255,255,0.08)"/>

        <!-- Step markers -->
        ${stepMarkers}

        <!-- Level label -->
        <text x="260" y="234" text-anchor="middle" font-size="12" font-weight="bold"
              fill="white" font-family="sans-serif">רמה ${rank} / 10</text>

        <!-- Climber -->
        ${climber}

        <!-- Victory flag -->
        ${rank >= 10 ? `
        <line x1="260" y1="28" x2="260" y2="4" stroke="#f97b57" stroke-width="2.5"/>
        <polygon points="260,4 280,12 260,20" fill="#f97b57"/>` : ''}
    </svg>`;
}

function renderClimb() {
    // Cycle questions if we run out
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    if (!q) { navigate('MENU'); return ''; }
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    const screenAnimClass = !state.selectedOption ? 'climb-enter' : '';
    const panelAnimClass = !state.selectedOption ? 'climb-question-enter' : '';

    return `
        <div class="screen-wrapper ${screenAnimClass}" id="climb-screen">
            <div style="display:flex; justify-content:center; align-items:center;">
                <button class="neo-button bg-Back" style="width:auto; padding:8px 20px; margin-bottom:0;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
            <div class="spacer-sm"></div>

            <!-- Mountain SVG -->
            ${buildMountainSVG(state.rank, '')}

            <div class="spacer-md"></div>
            <div class="${panelAnimClass}">
                <h2 style="font-size: 20px; text-align:center;">${qText}</h2>
                <div class="spacer-lg"></div>

                ${generateOptionsHTML(opts)}
            </div>

            <div style="margin-top:auto;">
                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''}
                        onclick="checkClimbAnswer()">${getString('check_btn')}</button>
            </div>
        </div>`;
}


function renderClimbResult() {
    const won = state.climbLastResult === 'up';
    const label = won ? 'נכון! הצלחת לעלות רמה!' : 'לא נכון. ירדת רמה';
    const bg = won ? 'var(--accent-teal)' : 'var(--accent-mint)';
    const animClass = won ? 'climber-up' : 'climber-down';

    // Auto-advance to next question after 2.5s
    setTimeout(() => {
        const wrapper = document.querySelector('.screen-wrapper');
        if (wrapper) wrapper.classList.add('climb-exit');

        setTimeout(() => {
            if (state.rank >= 10) {
                navigate('GAME_OVER');
            } else if (state.rank < 0) {
                navigate('GAME_OVER');
            } else {
                state.selectedOption = null;
                navigate('PLAYING_CLIMB');
            }
        }, 300);
    }, 2500);

    return `
        <div class="screen-wrapper climb-enter" style="padding: 0; overflow: hidden; align-items:center; justify-content:center;">
            <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px 0;">
                
                <h1 style="font-size: 28px; color: var(--app-text); text-align: center; margin-bottom: 30px;">
                    ${label}
                </h1>
                
                <!-- Mountain SVG -->
                <div style="width: 100%; max-width: 600px; padding: 0 16px;">
                    ${buildMountainSVG(state.rank, animClass)}
                </div>
                
            </div>
        </div>`;
}

function renderGameOver() {
    let headline = '';
    let subline = '';
    let submitHtml = '';

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
        const savedName = localStorage.getItem('otakuPlayerName') || '';
        submitHtml = `
            <div style="margin-top: 24px; padding: 16px; background: rgba(33,2,110,0.05); border-radius: 16px;">
                <p class="bold" style="margin-bottom: 8px;">${getString('your_name')}</p>
                <input type="text" id="playerNameInput" class="neo-input" value="${savedName}" placeholder="${getString('your_name')}" style="text-align: center; margin-bottom: 12px;">
                <button class="neo-button bg-teal" id="submitScoreBtn" onclick="submitScore()">${getString('submit_score')}</button>
            </div>
        `;
    } else {
        headline = getString('game_over');
        subline = `<span dir="ltr">${state.score} / ${state.currentPlayList.length}</span>`;
    }

    return `
        <div class="text-center" style="margin-top:auto; margin-bottom:auto; width: 100%;">
            <h1 class="color-indigo">${headline}</h1>
            <div class="spacer-md"></div>
            <h1 style="font-size:48px;" class="color-indigo">${subline}</h1>
            ${submitHtml}
            <div class="spacer-lg"></div>
            <button class="neo-button bg-coral" style="height:56px;" onclick="navigate('MENU')">${getString('continue_btn')}</button>
        </div>`;
}

let cachedLeaderboard = null;

function renderLeaderboard() {
    if (!cachedLeaderboard) {
        fetchLeaderboard(); // async call
        return `
            <div class="screen-wrapper" style="align-items:center; justify-content:center;">
                <h2 class="main-title">${getString('leaderboard_title')}</h2>
                <p class="bold color-indigo">טוען נתונים...</p>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('BET_MENU')">${getString('back')}</button>
            </div>
        `;
    }

    const listHtml = cachedLeaderboard.map((entry, idx) => {
        let badge = '';
        if (idx === 0) badge = '🥇';
        else if (idx === 1) badge = '🥈';
        else if (idx === 2) badge = '🥉';
        else badge = `<span style="font-size:14px; opacity:0.6;">${idx + 1}</span>`;

        return `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">${badge}</div>
            <div class="leaderboard-name">${entry.name}</div>
            <div class="leaderboard-score">⚡ ${entry.score}</div>
        </div>`;
    }).join('');

    return `
        <div class="screen-wrapper">
            <h2 class="main-title" style="margin-top: 0; margin-bottom: 24px;">${getString('leaderboard_title')}</h2>
            <div class="leaderboard-list">
                ${listHtml || '<p class="text-center bold color-indigo">אין עדיין תוצאות.</p>'}
            </div>
            <div class="spacer-lg"></div>
            <button class="neo-button bg-Back" style="max-width: 100px; margin-bottom: 20px;" onclick="navigate('BET_MENU')">${getString('back')}</button>
        </div>
    `;
}

async function fetchLeaderboard() {
    try {
        const qNoWhere = window.query(
            window.collection(window.db, "leaderboard"),
            window.orderBy('score', 'desc'),
            window.limit(100)
        );
        const snapshot = await window.getDocs(qNoWhere);
        cachedLeaderboard = [];
        snapshot.forEach(doc => cachedLeaderboard.push(doc.data()));
        if (state.currentScreen === 'LEADERBOARD') {
            render();
        }
    } catch (e) {
        console.error(e);
        showToast("שגיאה בטעינת הטבלה", 'error');
        cachedLeaderboard = [];
        if (state.currentScreen === 'LEADERBOARD') {
            render();
        }
    }
}

window.submitScore = async () => {
    const nameInput = document.getElementById('playerNameInput');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
        showToast("אנא הזן שם!", 'error');
        return;
    }

    // Save to cookies/localStorage
    localStorage.setItem('otakuPlayerName', name);

    const btn = document.getElementById('submitScoreBtn');
    btn.disabled = true;
    btn.innerText = "שומר...";

    try {
        await window.addDoc(window.collection(window.db, "leaderboard"), {
            name: name,
            score: state.energy,
            mode: 'BET_BURN',
            timestamp: window.serverTimestamp()
        });
        showToast("התוצאה נשמרה בהצלחה!", 'success');
        cachedLeaderboard = null; // Invalidate cache so it fetches fresh
        navigate('LEADERBOARD');
    } catch (e) {
        console.error(e);
        showToast("שגיאה בשמירת התוצאה", 'error');
        btn.disabled = false;
        btn.innerText = getString('submit_score');
    }
};

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
function shuffleArray(array) {
    let newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

window.setLang = (code) => { state.currentLang = Object.values(Lang).find(l => l.code === code); render(); };
window.navigate = (screen) => {
    if (window.clearQuestionTimer) window.clearQuestionTimer();
    state.currentScreen = screen;
    render();
};
window.setMode = (mode) => {
    state.selectedMode = mode;
    if (mode === 'MULTIPLAYER') {
        state.isMultiplayer = true;
        navigate('MULTIPLAYER_MENU');
    } else if (mode === 'BET_BURN') {
        state.isMultiplayer = false;
        navigate('BET_MENU');
    } else {
        state.isMultiplayer = false;
        navigate('SUBJECTS');
    }
};
window.startPlay = (cat) => {
    state.activeCategory = cat;

    // Filter questions by category
    let playlist = state.questionBank.filter(q => q.category === cat);

    // Clone questions to shuffle their options independently without affecting the global bank
    playlist = playlist.map(q => {
        const clonedQ = { ...q, optionsMap: {} };
        for (let lang in q.optionsMap) {
            clonedQ.optionsMap[lang] = shuffleArray(q.optionsMap[lang]);
        }
        return clonedQ;
    });

    // Shuffle the overall question order
    state.currentPlayList = shuffleArray(playlist);

    // Reset variables
    state.currentIndex = 0; state.score = 0;

    // Persist energy across subjects
    const savedEnergy = parseInt(localStorage.getItem('otakuBetBurnEnergy'));
    state.energy = (savedEnergy && savedEnergy > 0) ? savedEnergy : 100;
    localStorage.setItem('otakuBetBurnEnergy', state.energy);

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
window.updateBet = (val) => {
    state.userBetInput = val;
    const isValid = parseInt(val) > 0 && parseInt(val) <= state.energy;
    const btn = document.getElementById('lockBetBtn');
    if (btn) {
        if (isValid) {
            btn.classList.add('bg-coral');
            btn.disabled = false;
        } else {
            btn.classList.remove('bg-coral');
            btn.disabled = true;
        }
    }
};
window.lockInBet = () => { state.currentPhase = 'ANSWERING'; render(); };

window.checkAnswer = () => {
    clearQuestionTimer();

    const q = state.currentPlayList[state.currentIndex];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    render();

    setTimeout(async () => {
        state.isAnimatingResult = false;
        if (isCorrect) state.score++;

        if (state.isMultiplayer) {
            try {
                // Update specific player inside the players object
                const updatePath = `players.${state.myPlayerName}.score`;
                await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                    [updatePath]: state.score
                });
            } catch (e) { console.error("Error syncing score:", e); }
        }

        if (state.currentIndex < state.currentPlayList.
            length - 1) {
            state.currentIndex++;
            state.selectedOption = null;
            state.questionTimer = 15; // Reset timer for next question
            render();
        } else {
            if (state.isMultiplayer) {
                try {
                    const updatePath = `players.${state.myPlayerName}.finished`;
                    await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                        [updatePath]: true
                    });
                } catch (e) { console.error("Error finishing match:", e); }
                navigate('MULTIPLAYER_WAIT');
            } else {
                navigate('GAME_OVER');
            }
        }
    }, 1200);
};

window.startQuestionTimer = () => {
    state.questionTimer = 15;
    state.timerInterval = setInterval(() => {
        state.questionTimer--;
        if (state.questionTimer <= 0) {
            clearQuestionTimer();
            state.selectedOption = "TIMEOUT_INCORRECT"; // Force an incorrect answer
            window.checkAnswer();
        } else {
            render(); // update the timer text
        }
    }, 1000);
};

window.clearQuestionTimer = () => {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
};

window.checkClimbAnswer = () => {
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    render();

    setTimeout(() => {
        const finalizeAndNavigate = () => {
            state.isAnimatingResult = false;
            if (isCorrect) {
                state.rank = Math.min(10, state.rank + 1);
                state.climbLastResult = 'up';
            } else {
                state.rank = Math.max(-1, state.rank - 1);
                state.climbLastResult = 'down';
            }
            state.currentIndex++;
            navigate('CLIMB_RESULT');
        };

        const wrapper = document.querySelector('.screen-wrapper');
        if (wrapper) {
            wrapper.classList.add('climb-exit');
            setTimeout(finalizeAndNavigate, 300);
        } else {
            finalizeAndNavigate();
        }
    }, 1200);
};

window.checkBetAnswer = () => {
    const q = state.currentPlayList[state.currentIndex];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;
    const bet = parseInt(state.userBetInput);

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    render();

    setTimeout(() => {
        state.isAnimatingResult = false;

        if (isCorrect) {
            state.energy += bet;
        } else {
            state.energy -= bet;
        }

        // Save latest points to local database
        localStorage.setItem('otakuBetBurnEnergy', state.energy);

        if (state.energy <= 0) {
            navigate('GAME_OVER');
        } else if (state.currentIndex >= Math.min(state.currentPlayList.length - 1, 9)) {
            navigate('GAME_OVER');
        } else {
            state.userBetInput = '';
            state.selectedOption = null;
            state.currentPhase = 'BETTING';
            state.currentIndex++;
            render();
        }
    }, 1200);
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

// --- MULTIPLAYER LOBBY AND SCREENS ---
// --- MULTIPLAYER LOBBY AND SCREENS ---
let unsubscribeMultiplayer = null;

function renderMultiplayerMenu() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_multiplayer')}</h2>
            <div class="button-group">
                <label class="bold color-indigo" style="font-size:18px;">מספר שחקנים מקסימלי:</label>
                <select id="maxPlayersInput" class="neo-input" style="margin-bottom: 15px; font-weight: bold; background-color: var(--white); font-size:18px; text-align:center;">
                    <option value="2">2 שחקנים</option>
                    <option value="3">3 שחקנים</option>
                    <option value="4">4 שחקנים</option>
                    <option value="5">5 שחקנים</option>
                </select>
                <button class="neo-button bg-coral" style="height:60px;" onclick="createMultiplayerRoom()">צור חדר (מארח)</button>
                <div class="spacer-lg"></div>
                <input type="text" id="joinCodeInput" class="neo-input" placeholder="הכנס קוד חדר" style="text-align: center; font-size: 24px; text-transform: uppercase; margin-bottom: 12px;">
                <button class="neo-button bg-teal" style="height:60px;" onclick="joinMultiplayerRoom()">הצטרף לחדר</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MODE_SELECT')">${getString('back')}</button>
            </div>
        </div>
    `;
}

window.createMultiplayerRoom = async () => {
    let name = localStorage.getItem('otakuPlayerName');
    if (!name) {
        name = prompt("הכנס את שמך:");
        if (!name) return;
        localStorage.setItem('otakuPlayerName', name);
    }

    const maxPlayers = parseInt(document.getElementById('maxPlayersInput').value) || 2;
    state.maxPlayers = maxPlayers;

    // Generate 4-char code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    state.roomId = code;
    state.isHost = true;
    state.myPlayerName = name;
    state.multiplayerStatus = 'waiting';
    state.multiplayerPlayers = {
        [name]: { score: 0, finished: false, isHost: true }
    };

    // Shuffle questions - pull 10 random questions from the entire bank
    const shuffled = [...state.questionBank].sort(() => Math.random() - 0.5).slice(0, 10).map(q => {
        const clonedQ = { ...q, optionsMap: {} };
        for (let lang in q.optionsMap) {
            clonedQ.optionsMap[lang] = shuffleArray(q.optionsMap[lang]);
        }
        return clonedQ;
    });

    try {
        await window.setDoc(window.doc(window.db, "rooms", code), {
            status: 'waiting',
            maxPlayers: maxPlayers,
            hostName: name,
            players: state.multiplayerPlayers,
            playlist: shuffled
        });

        listenToRoom(code);
        navigate('MULTIPLAYER_LOBBY');
    } catch (e) {
        console.error(e);
        showToast("שגיאה ביצירת חדר", 'error');
    }
};

window.joinMultiplayerRoom = async () => {
    const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
    if (!code) return showToast("הכנס קוד", 'error');

    let name = localStorage.getItem('otakuPlayerName');
    if (!name) {
        name = prompt("הכנס את שמך:");
        if (!name) return;
        localStorage.setItem('otakuPlayerName', name);
    }

    try {
        const roomRef = window.doc(window.db, "rooms", code);
        const roomSnap = await window.getDoc(roomRef);

        if (!roomSnap.exists()) {
            return showToast("חדר לא נמצא!", 'error');
        }

        const data = roomSnap.data();
        if (data.status !== 'waiting') {
            return showToast("המשחק כבר התחיל או שהחדר מלא!", 'error');
        }

        if (Object.keys(data.players).length >= data.maxPlayers) {
            return showToast("החדר מלא!", 'error');
        }

        // Prevent identical names
        let finalName = name;
        let counter = 2;
        while (data.players[finalName]) {
            finalName = `${name} (${counter})`;
            counter++;
        }

        state.roomId = code;
        state.isHost = false;
        state.myPlayerName = finalName;
        state.currentPlayList = data.playlist;
        state.maxPlayers = data.maxPlayers;

        const newPlayers = { ...data.players, [finalName]: { score: 0, finished: false, isHost: false } };

        await window.updateDoc(roomRef, {
            players: newPlayers,
            status: Object.keys(newPlayers).length >= data.maxPlayers ? 'playing' : 'waiting'
        });

        listenToRoom(code);

        if (Object.keys(newPlayers).length >= data.maxPlayers) {
            state.currentIndex = 0;
            state.score = 0;
            navigate('PLAYING_CLASSIC');
        } else {
            navigate('MULTIPLAYER_LOBBY');
        }
    } catch (e) {
        console.error(e);
        showToast("שגיאה בהצטרפות", 'error');
    }
};

window.startGameNow = async () => {
    if (!state.isHost) return;
    try {
        await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
            status: 'playing'
        });
    } catch (e) { console.error(e); }
};

function listenToRoom(code) {
    if (unsubscribeMultiplayer) unsubscribeMultiplayer();

    unsubscribeMultiplayer = window.onSnapshot(window.doc(window.db, "rooms", code), (doc) => {
        if (!doc.exists()) return;
        const data = doc.data();
        state.multiplayerStatus = data.status;
        state.multiplayerPlayers = data.players || {};

        if (data.status === 'playing' && state.currentScreen === 'MULTIPLAYER_LOBBY') {
            state.currentPlayList = data.playlist;
            state.currentIndex = 0;
            state.score = 0;
            navigate('PLAYING_CLASSIC');
        }

        if (state.currentScreen === 'MULTIPLAYER_WAIT') {
            const allFinished = Object.values(state.multiplayerPlayers).every(p => p.finished);
            if (allFinished) {
                navigate('MULTIPLAYER_RESULTS');
            } else {
                render(); // update leaderboard live
            }
        }

        if (state.currentScreen === 'MULTIPLAYER_LOBBY') {
            render(); // update player list live
        }
    });
}

function renderMultiplayerLobby() {
    const playersArr = Object.keys(state.multiplayerPlayers);
    const playersListHtml = playersArr.map(pName =>
        `<div style="background:var(--white); padding:10px 15px; margin:8px 0; border-radius:8px; border: 2px solid var(--app-text); font-weight:bold; font-size:18px;">
            ${pName} ${state.multiplayerPlayers[pName].isHost ? '👑' : ''}
        </div>`
    ).join('');

    const isFull = playersArr.length >= state.maxPlayers;

    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <h2 class="main-title">חדר המתנה</h2>
            <p>קוד החדר שלך:</p>
            <h1 class="color-coral" style="font-size: 64px; letter-spacing: 4px; background: var(--white); padding: 10px 20px; border-radius: 12px; border: 4px solid var(--app-text);">${state.roomId}</h1>
            <div class="spacer-md"></div>
            
            <p class="bold" style="font-size: 20px;">שחקנים בחדר (${playersArr.length}/${state.maxPlayers}):</p>
            <div style="width: 100%; max-width: 300px; margin-bottom: 20px;">
                ${playersListHtml}
            </div>
            
            ${state.isHost && !isFull ? `<button class="neo-button bg-coral" style="max-width:200px;" onclick="startGameNow()">התחל עכשיו</button>` : ''}
            
            <div class="spacer-md"></div>
            ${!isFull ? `<p style="opacity:0.7;">המשחק יתחיל ברגע שהחדר יתמלא או כשהמארח יתחיל...</p>
            <div class="loader" style="margin-top:20px;"></div>` : ''}
        </div>
    `;
}

function renderMultiplayerWaitScreen() {
    const playersArr = Object.entries(state.multiplayerPlayers).sort((a, b) => b[1].score - a[1].score);

    const leaderboardHtml = playersArr.map(([pName, pData], idx) => {
        const isMe = pName === state.myPlayerName;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:10px 15px; margin:5px 0; border-radius:8px; border: 2px solid var(--app-text); font-weight:bold;">
            <div>#${idx + 1} &nbsp; ${pName} ${pData.finished ? '✅' : '⏳'}</div>
            <div dir="ltr">${pData.score} / 10</div>
        </div>`;
    }).join('');

    return `
        <div class="screen-wrapper" style="align-items:center;">
            <h2 class="main-title">סיימת!</h2>
            <div class="spacer-sm"></div>
            <p class="bold" style="font-size:24px;">טבלת מובילים זמנית:</p>
            <div style="width: 100%; max-width: 400px; margin-bottom: 20px;">
                ${leaderboardHtml}
            </div>
            
            <div class="spacer-lg"></div>
            <p class="bold color-indigo" style="font-size:18px;">ממתין ששאר השחקנים יסיימו...</p>
            <div class="loader" style="margin-top:20px;"></div>
        </div>
    `;
}

function renderMultiplayerResults() {
    const playersArr = Object.entries(state.multiplayerPlayers).sort((a, b) => b[1].score - a[1].score);
    const myRankIndex = playersArr.findIndex(([pName]) => pName === state.myPlayerName);

    let resultTitle = "תוצאות!";
    let resultColor = "var(--vibrant-indigo)";
    if (myRankIndex === 0) { resultTitle = "ניצחת!"; resultColor = "var(--vibrant-teal)"; }
    else { resultTitle = `מקום ${myRankIndex + 1}`; resultColor = "var(--vibrant-coral)"; }

    const podiumHtml = playersArr.map(([pName, pData], idx) => {
        const isMe = pName === state.myPlayerName;
        let medal = '';
        if (idx === 0) medal = '🥇';
        else if (idx === 1) medal = '🥈';
        else if (idx === 2) medal = '🥉';
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:15px; margin:5px 0; border-radius:8px; border: 3px solid var(--app-text); font-weight:bold; font-size:20px;">
            <div>${medal} #${idx + 1} &nbsp; ${pName}</div>
            <div dir="ltr">${pData.score} / 10</div>
        </div>`;
    }).join('');

    return `
        <div class="screen-wrapper" style="align-items:center;">
            <h1 style="font-size:48px; color:${resultColor};">${resultTitle}</h1>
            <div class="spacer-md"></div>
            
            <div style="width:100%; max-width: 400px;">
                ${podiumHtml}
            </div>
            
            <div class="spacer-lg"></div>
            <button class="neo-button bg-Back" style="height:60px; max-width:200px;" onclick="navigate('MENU')">${getString('continue_btn')}</button>
        </div>
    `;
}