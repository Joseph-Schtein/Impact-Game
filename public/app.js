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
    "mode_multiplayer": { en: "Online Match", he: "משחק אונליין", ar: "مباراة أونلاين", ru: "Онлайн матч" },
    "single_btn": { en: "SINGLE PLAYER", he: "שחקן יחיד", ar: "لاعب واحد", ru: "ОДИНОЧНАЯ ИГРА" },
    "multi_btn": { en: "MULTIPLAYER", he: "מרובה משתתפים", ar: "تعدد اللاعبين", ru: "МНОГОПОЛЬЗОВАТЕЛЬСКАЯ ИГРА" },
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
    timerInterval: null,

    // Multiplayer sync
    isWaitingForOthers: false,

    // Hangman State
    hangmanWord: [],
    hangmanGuessed: [],
    hangmanWrong: [],
    hangmanDone: false,
    hangmanWon: false,
    hangmanOpponentWrongCount: 0,
    hangmanOpponentDone: false,
    hangmanOpponentWon: false,
    hangmanOpponentWord: '',
    hangmanOpponentWrong: [],
    hangmanOpponentGuessed: [],
    hangmanWordBank: []
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
        case 'MODE_SELECT_MULTI': html = renderModeSelectMulti(); break;
        case 'BET_MENU': html = renderBetMenu(); break;
        case 'SUBJECTS': html = renderSubjects(); break;
        case 'PLAYING_CLASSIC': html = renderClassic(); break;
        case 'PLAYING_BET': html = renderBetBurn(); break;
        case 'PLAYING_CLIMB': html = renderClimb(); break;
        case 'PLAYING_MATCH_PAIRS': html = renderMatchPairs(); break;
        case 'CLIMB_RESULT': html = renderClimbResult(); break;
        case 'GAME_OVER': html = renderGameOver(); break;
        case 'ADD_QUESTION': html = renderAddQuestion(); break;
        case 'LEADERBOARD': html = renderLeaderboard(); break;
        case 'MULTIPLAYER_MENU': html = renderMultiplayerMenu(); break;
        case 'MULTIPLAYER_LOBBY': html = renderMultiplayerLobby(); break;
        case 'MULTIPLAYER_STARTING': html = renderMultiplayerStarting(); break;
        case 'MULTIPLAYER_WAIT': html = renderMultiplayerWaitScreen(); break;
        case 'MULTIPLAYER_RESULTS': html = renderMultiplayerResults(); break;
        case 'PLAYING_HANGMAN': html = renderHangman(); break;
        case 'HANGMAN_RESULTS': html = renderHangmanResults(); break;
    }
    appContainer.innerHTML = html;
}

// --- SCREEN COMPONENTS ---
function renderWaitingScreen() {
    const playersArr = Object.entries(state.multiplayerPlayers).sort((a, b) => b[1].score - a[1].score);
    const leaderboardHtml = playersArr.map(([pName, pData], idx) => {
        const isMe = pName === state.myPlayerName;
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-bolt"></i> ${pData.score}` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : `${pData.score} נק'`;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:8px 12px; margin:4px 0; border-radius:8px; border: 2px solid var(--app-text); font-weight:bold; font-size: 16px; width: 100%; max-width: 300px;">
            <div>#${idx + 1} &nbsp; ${pName}</div>
            <div dir="ltr">${scoreDisplay}</div>
        </div>`;
    }).join('');

    let rulesHtml = '';
    if (state.selectedMode === 'CLASSIC') {
        const p = Object.keys(state.multiplayerPlayers).length;
        rulesHtml = `<p style="font-size: 14px; opacity: 0.8; margin-top: 24px; max-width: 300px; text-align: center; line-height: 1.4;">
            <b>חוקי ניקוד:</b> העונה ראשון נכונה מקבל ${p} נק', השני ${Math.max(1, p - 1)} נק', וכו'. תשובה שגויה מעניקה 0 נק'.
        </p>`;
    } else if (state.selectedMode === 'CLIMB') {
        rulesHtml = `<p style="font-size: 14px; opacity: 0.8; margin-top: 24px; max-width: 300px; text-align: center; line-height: 1.4;">
            <b>חוקי הטיפוס:</b> תשובה נכונה מעלה אותך שלב, שגויה מורידה אותך שלב.
        </p>`;
    } else if (state.selectedMode === 'BET_BURN') {
        rulesHtml = `<p style="font-size: 14px; opacity: 0.8; margin-top: 24px; max-width: 300px; text-align: center; line-height: 1.4;">
            <b>חוקי הימור:</b> תשובה נכונה מוסיפה את ההימור שלך, שגויה שורפת אותו.
        </p>`;
    }

    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <h2 class="main-title" style="font-size: 26px; margin-bottom: 8px; text-align: center;">ממתין לשאר השחקנים...</h2>
            <div class="loader" style="margin-top:10px; margin-bottom: 24px;"></div>
            
            <p class="bold color-indigo" style="margin-bottom: 10px; font-size: 18px; text-align: center;">מצב נוכחי:</p>
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${leaderboardHtml}
            </div>
            
            ${rulesHtml}
        </div>`;
}

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
                <button class="neo-button bg-indigo" style="height:60px;" onclick="navigate('MODE_SELECT')">${getString('single_btn')}</button>
                <button class="neo-button bg-multiplayer" style="height:60px; margin-top: 12px;" onclick="navigate('MODE_SELECT_MULTI')">${getString('multi_btn')}</button>
                <button class="neo-button bg-coral" style="height:60px; margin-top: 12px;" onclick="navigate('ADD_QUESTION')">${getString('add_btn')}</button>
            </div>
        </div>`;
}

function renderModeSelect() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_title')}</h2>
            <div class="button-group">
                <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLASSIC', false)"><i class="uil uil-question mobile-cycle-1" style="font-size: 1.5em; vertical-align: middle;"></i> ${getString('mode_classic')}</button>
                <button class="neo-button bg-multiplayer" style="height:60px;" onclick="setMode('MATCH_PAIRS', false)"><i class="uil uil-puzzle-piece mobile-cycle-4"></i> התאמת זוגות</button>
                <button class="neo-button bg-coral" style="height:60px;" onclick="setMode('CLIMB', false)"><i class="uil uil-mountains-sun mobile-cycle-2"></i> ${getString('mode_climb')}</button>
                <button class="neo-button bg-teal" style="height:60px; margin-top:12px;" onclick="setMode('BET_BURN', false)"><i class="uil uil-dollar-alt mobile-cycle-3"></i> ${getString('mode_bet')}</button>
                <button class="neo-button bg-periwinkle" style="height:60px; margin-top:12px;" onclick="setMode('HANGMAN', false)"><i class="uil uil-bullseye mobile-cycle-5"></i> איש תלוי</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
        </div>`;
}

function renderModeSelectMulti() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('multi_btn')}</h2>
            <div class="button-group">
                <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLASSIC', true)"><i class="uil uil-question mobile-cycle-1" style="font-size: 1.5em; vertical-align: middle;"></i> ${getString('mode_classic')}</button>
                <button class="neo-button bg-multiplayer" style="height:60px;" onclick="setMode('MATCH_PAIRS', true)"><i class="uil uil-puzzle-piece mobile-cycle-4"></i> התאמת זוגות</button>
                <button class="neo-button bg-coral" style="height:60px;" onclick="setMode('CLIMB', true)"><i class="uil uil-mountains-sun mobile-cycle-2"></i> ${getString('mode_climb')}</button>
                <button class="neo-button bg-teal" style="height:60px; margin-top:12px;" onclick="setMode('BET_BURN', true)"><i class="uil uil-dollar-alt mobile-cycle-3"></i> ${getString('mode_bet')}</button>
                <button class="neo-button bg-periwinkle" style="height:60px; margin-top:12px;" onclick="setMode('HANGMAN', true)"><i class="uil uil-bullseye mobile-cycle-5"></i> איש תלוי</button>
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
        } else if (state.isAnimatingResult) {
            if (opt === correctOpt) {
                btnClass = 'bg-correct animate-pop';
                icon = '✓ ';
            } else if (state.selectedOption === "TIMEOUT_INCORRECT" || !state.selectedOption) {
                btnClass = 'bg-wrong animate-shake';
                icon = '✗ ';
            }
        }

        return `<button class="neo-button ${btnClass}"
                ${state.isAnimatingResult ? 'disabled' : ''}
                data-opt="${safeOpt}" onclick="selectOption(this.dataset.opt)">${icon}${opt}</button>`;
    }).join('');
}

function renderClassic() {
    if (state.isWaitingForOthers) {
        return renderWaitingScreen();
    }

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
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <div class="progress-container"><div class="progress-fill" style="width: ${progress}%"></div></div>
            <div class="spacer-md"></div>
            ${state.isMultiplayer ? `<div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;"><i class="uit uit-hourglass"></i> ${state.questionTimer}s</div><div class="spacer-md"></div>` : ''}
            <h2 style="font-size: 20px;">${qText}</h2>
            <div class="spacer-lg"></div>
            ${generateOptionsHTML(opts)}
            <div style="margin-top:auto; width:100%;">
                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''} 
                        onclick="checkAnswer()">${getString('check_btn')}</button>
            </div>
        </div>`;
}

function renderBetBurn() {
    if (state.isWaitingForOthers) {
        return renderWaitingScreen();
    }

    const q = state.currentPlayList[state.currentIndex];
    if (!q) return navigate('MENU');
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    let content = '';
    if (state.currentPhase === 'BETTING') {
        const isValid = parseInt(state.userBetInput) > 0 && parseInt(state.userBetInput) <= state.energy;
        content = `
            <p class="bold">מאגר אנרגיה</p>
            <h1 class="color-indigo" style="font-size: 48px;"><i class="uil uil-bolt"></i> ${state.energy}</h1>
            <div class="spacer-lg"></div>
            <p>הזן את ההימור שלך (מקסימום ${state.energy}):</p>
            <input type="number" class="neo-input bet-input" value="${state.userBetInput}" oninput="updateBet(this.value)">
            <div class="spacer-md"></div>
            <button id="lockBetBtn" class="neo-button ${isValid ? 'bg-coral' : ''}" ${!isValid ? 'disabled' : ''} 
                    onclick="lockInBet()">נעל הימור</button>`;
    } else {
        content = `
            <p class="color-coral bold" style="font-size:18px;">הימור: <i class="uil uil-bolt"></i> ${state.userBetInput}</p>
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
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                ${content}
            </div>
        </div>`;
}

function buildMountainSVG(rank, animateClass, oppRank = -1, isMultiplayer = false, isHost = true) {
    function getClimberHtml(r, anim, side) {
        if (r < 0) return '';
        const t = r / 10;
        let newX, newY, oldX, oldY;

        if (side === 'left') {
            newX = 20 + 240 * t;
            newY = 220 - 192 * t;
            const oldRank = anim === 'climber-up' ? Math.max(isMultiplayer ? 0 : -1, r - 1) :
                (anim === 'climber-down' ? Math.min(10, r + 1) : r);
            const tOld = oldRank / 10;
            oldX = 20 + 240 * tOld;
            oldY = 220 - 192 * tOld;
        } else {
            newX = 500 - 240 * t;
            newY = 220 - 192 * t;
            const oldRank = anim === 'climber-up' ? Math.max(isMultiplayer ? 0 : -1, r - 1) :
                (anim === 'climber-down' ? Math.min(10, r + 1) : r);
            const tOld = oldRank / 10;
            oldX = 500 - 240 * tOld;
            oldY = 220 - 192 * tOld;
        }

        const prefix = side === 'left' ? 'L' : 'R';
        let dynamicAnim = '';
        let climberClass = '';
        if (anim === 'climber-up') {
            dynamicAnim = `
            <style>
                @keyframes climbUpAction${prefix} {
                    0% { transform: translate(${oldX.toFixed(1)}px, ${oldY.toFixed(1)}px) rotate(0deg); }
                    25% { transform: translate(${(oldX + (newX - oldX) * 0.25).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.25 - 12).toFixed(1)}px) rotate(${side === 'left' ? 15 : -15}deg); }
                    50% { transform: translate(${(oldX + (newX - oldX) * 0.50).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.50 - 4).toFixed(1)}px) rotate(${side === 'left' ? -10 : 10}deg); }
                    75% { transform: translate(${(oldX + (newX - oldX) * 0.75).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.75 - 12).toFixed(1)}px) rotate(${side === 'left' ? 10 : -10}deg); }
                    100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px) rotate(0deg); }
                }
                .dynamic-climber-${prefix} { animation: climbUpAction${prefix} 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            </style>`;
            climberClass = `dynamic-climber-${prefix}`;
        } else if (anim === 'climber-down') {
            dynamicAnim = `
            <style>
                @keyframes climbDownAction${prefix} {
                    0% { transform: translate(${oldX.toFixed(1)}px, ${oldY.toFixed(1)}px) rotate(0deg); }
                    25% { transform: translate(${(oldX + (newX - oldX) * 0.25).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.25 + 5).toFixed(1)}px) rotate(${side === 'left' ? -20 : 20}deg); }
                    50% { transform: translate(${(oldX + (newX - oldX) * 0.50).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.50 + 15).toFixed(1)}px) rotate(${side === 'left' ? -40 : 40}deg); }
                    75% { transform: translate(${(oldX + (newX - oldX) * 0.75).toFixed(1)}px, ${(oldY + (newY - oldY) * 0.75 + 5).toFixed(1)}px) rotate(${side === 'left' ? -20 : 20}deg); }
                    100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px) rotate(0deg); }
                }
                .dynamic-climber-${prefix} { animation: climbDownAction${prefix} 0.9s ease-in-out forwards; }
            </style>`;
            climberClass = `dynamic-climber-${prefix}`;
        } else {
            dynamicAnim = `
            <style>
                @keyframes climbIdle${prefix} {
                    0%, 100% { transform: translate(${newX.toFixed(1)}px, ${newY.toFixed(1)}px); }
                    50% { transform: translate(${newX.toFixed(1)}px, ${(newY - 3).toFixed(1)}px); }
                }
                .dynamic-climber-${prefix} { animation: climbIdle${prefix} 2s ease-in-out infinite; }
            </style>`;
            climberClass = `dynamic-climber-${prefix}`;
        }

        const bodyColor = side === 'left' ? '#21026e' : '#145c47';
        const headColor = side === 'left' ? '#f97b57' : '#34a883';
        const scaleStr = side === 'left' ? '' : 'scale(-1, 1)';

        return `
            ${dynamicAnim}
            <g class="${climberClass}" id="climber-avatar-${prefix}">
              <g transform="${scaleStr}">
                <line x1="0" y1="-16" x2="0" y2="-4" stroke="${bodyColor}" stroke-width="3" stroke-linecap="round"/>
                <circle cx="0" cy="-21" r="5" fill="${headColor}" stroke="${bodyColor}" stroke-width="2"/>
                <line x1="0" y1="-14" x2="-9" y2="-8" stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-14" x2="9" y2="-19" stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="9" y1="-19" x2="15" y2="-24" stroke="#888" stroke-width="2" stroke-linecap="round"/>
                <line x1="12" y1="-27" x2="18" y2="-21" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-4" x2="-6" y2="5" stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-4" x2="6" y2="3" stroke="${bodyColor}" stroke-width="2.5" stroke-linecap="round"/>
              </g>
            </g>`;
    }

    let leftRank, leftAnimate, rightRank, rightAnimate;
    if (isMultiplayer) {
        if (isHost) {
            leftRank = rank;
            leftAnimate = animateClass;
            rightRank = oppRank;
            rightAnimate = '';
        } else {
            rightRank = rank;
            rightAnimate = animateClass;
            leftRank = oppRank;
            leftAnimate = '';
        }
    } else {
        leftRank = rank;
        leftAnimate = animateClass;
        rightRank = -1;
        rightAnimate = '';
    }

    const stepMarkers = Array.from({ length: 11 }, (_, i) => {
        const mt = i / 10;
        const mx = 20 + 240 * mt;
        const my = 220 - 192 * mt;
        return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5"
            fill="${i <= leftRank ? '#21026e' : 'rgba(33,2,110,0.2)'}"
            stroke="white" stroke-width="1.5"/>`;
    }).join('');

    let stepMarkersRight = '';
    if (isMultiplayer) {
        stepMarkersRight = Array.from({ length: 11 }, (_, i) => {
            const mt = i / 10;
            const mx = 500 - 240 * mt;
            const my = 220 - 192 * mt;
            return `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5"
                fill="${i <= rightRank ? '#145c47' : 'rgba(20,92,71,0.2)'}"
                stroke="white" stroke-width="1.5"/>`;
        }).join('');
    }

    const climberLeft = getClimberHtml(leftRank, leftAnimate, 'left');
    const climberRight = getClimberHtml(rightRank, rightAnimate, 'right');

    const rankDisplay = isMultiplayer ?
        `רמה ${Math.max(0, isHost ? leftRank : rightRank)} / 10 (אתה) | רמה ${Math.max(0, isHost ? rightRank : leftRank)} / 10 (יריב)` :
        `רמה ${Math.max(0, leftRank)} / 10`;

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
        ${stepMarkersRight}

        <!-- Level label -->
        <text x="260" y="234" text-anchor="middle" font-size="12" font-weight="bold"
              fill="white" font-family="sans-serif">${rankDisplay}</text>

        <!-- Climbers -->
        ${climberLeft}
        ${climberRight}

        <!-- Victory flag -->
        ${rank >= 10 || oppRank >= 10 ? `
        <line x1="260" y1="28" x2="260" y2="4" stroke="#f97b57" stroke-width="2.5"/>
        <polygon points="260,4 280,12 260,20" fill="#f97b57"/>` : ''}
    </svg>`;
}

function renderClimb() {
    if (state.isWaitingForOthers) {
        return renderWaitingScreen();
    }

    // Cycle questions if we run out
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    if (!q) { navigate('MENU'); return ''; }
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    const screenAnimClass = !state.selectedOption ? 'climb-enter' : '';
    const panelAnimClass = !state.selectedOption ? 'climb-question-enter' : '';

    if (state.isMultiplayer && !state.isAnimatingResult && !state.timerInterval) {
        startQuestionTimer();
    }

    let oppRank = -1;
    if (state.isMultiplayer && state.multiplayerPlayers) {
        const players = Object.entries(state.multiplayerPlayers);
        const opp = players.find(([name]) => name !== state.myPlayerName);
        if (opp) oppRank = opp[1].score;
    }

    return `
        <div class="screen-wrapper ${screenAnimClass}" id="climb-screen">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <!-- Mountain SVG -->
            ${buildMountainSVG(state.rank, '', oppRank, state.isMultiplayer, state.isHost)}

            <div class="spacer-md"></div>
            ${state.isMultiplayer ? `<div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;"><i class="uit uit-hourglass"></i> ${state.questionTimer}s</div><div class="spacer-md"></div>` : ''}
            <div class="${panelAnimClass}">
                <h2 style="font-size: 20px; text-align:center;">${qText}</h2>
                <div class="spacer-lg"></div>

                ${generateOptionsHTML(opts)}
            </div>

            <div style="margin-top:auto; width:100%;">
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

    if (!state.climbResultTimeoutActive) {
        state.climbResultTimeoutActive = true;
        const isGameOver = state.rank >= 10 || state.rank < 0;

        // Auto-advance to next question only if single player or game over
        if (!state.isMultiplayer || isGameOver) {
            setTimeout(() => {
                state.climbResultTimeoutActive = false;
                const wrapper = document.querySelector('.screen-wrapper');
                if (wrapper) wrapper.classList.add('climb-exit');

                setTimeout(async () => {
                    if (isGameOver) {
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
                    } else {
                        state.selectedOption = null;
                        navigate('PLAYING_CLIMB');
                    }
                }, 300);
            }, 2500);
        }
    }

    let oppRank = -1;
    if (state.isMultiplayer && state.multiplayerPlayers) {
        const players = Object.entries(state.multiplayerPlayers);
        const opp = players.find(([name]) => name !== state.myPlayerName);
        if (opp) oppRank = opp[1].score;
    }

    return `
        <div class="screen-wrapper climb-enter" style="padding: 0; overflow: hidden; align-items:center; justify-content:center;">
            <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px 0;">
                
                <h1 style="font-size: 28px; color: var(--app-text); text-align: center; margin-bottom: 30px;">
                    ${label}
                </h1>
                
                <!-- Mountain SVG -->
                <div style="width: 100%; max-width: 600px; padding: 0 16px;">
                    ${buildMountainSVG(state.rank, animClass, oppRank, state.isMultiplayer, state.isHost)}
                </div>
                
                ${(state.isMultiplayer && !(state.rank >= 10 || state.rank < 0)) ? `
                <div style="margin-top: 30px; text-align: center; animation: resultPop 1.5s infinite;">
                    <p style="font-size: 20px; font-weight: bold; color: var(--app-text); opacity: 0.8;">ממתין שהיריב יסיים...</p>
                </div>` : ''}
                
            </div>
        </div>`;
}

function renderMatchPairs() {
    if (state.isWaitingForOthers) return renderWaitingScreen();

    const q = state.currentPlayList[state.currentIndex];
    if (!q) { navigate('GAME_OVER'); return ''; }

    const pairs = q.pairsMap[state.currentLang.code] || q.pairsMap["en"];

    if (!state.currentMatchPool || state.currentMatchPool.questionIndex !== state.currentIndex) {
        state.currentMatchPool = {
            questionIndex: state.currentIndex,
            lefts: shuffleArray(pairs.map((p, idx) => ({ text: p.left, id: idx, matched: false }))),
            rights: shuffleArray(pairs.map((p, idx) => ({ text: p.right, id: idx, matched: false })))
        };
        state.matchSelections = { left: null, right: null };
        state.matchedPairsCount = 0;
    }

    const pool = state.currentMatchPool;

    if (state.isMultiplayer && !state.timerInterval) {
        startQuestionTimer();
    }

    let leftColHtml = pool.lefts.map((item, i) => {
        let cls = 'match-item';
        if (item.matched) cls += ' matched';
        else if (state.matchSelections.left === i) cls += ' selected';
        if (state.matchErrorLeft === i) cls += ' error';

        return `<div class="${cls}" id="match-left-${i}" 
                onclick="${item.matched ? '' : `selectMatch('left', ${i})`}">${item.text}</div>`;
    }).join('');

    let rightColHtml = pool.rights.map((item, i) => {
        let cls = 'match-item';
        if (item.matched) cls += ' matched';
        else if (state.matchSelections.right === i) cls += ' selected';
        if (state.matchErrorRight === i) cls += ' error';

        return `<div class="${cls}" id="match-right-${i}" 
                onclick="${item.matched ? '' : `selectMatch('right', ${i})`}">${item.text}</div>`;
    }).join('');

    setTimeout(window.drawMatchLines, 50);

    return `
        <div class="screen-wrapper">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            ${state.isMultiplayer ? `<div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;"><i class="uit uit-hourglass"></i> ${state.questionTimer}s</div><div class="spacer-md"></div>` : ''}
            <h2 style="font-size: 20px; text-align: center;">התאם את הזוגות (נקודות: ${state.score} / 25)</h2>
            
            <div class="match-container" id="match-container">
                <svg class="match-svg-overlay" id="match-svg"></svg>
                <div class="match-column">${leftColHtml}</div>
                <div class="match-column">${rightColHtml}</div>
            </div>
        </div>
    `;
}

window.selectMatch = (side, idx) => {
    state.matchSelections[side] = idx;
    state.matchErrorLeft = null;
    state.matchErrorRight = null;
    render();

    if (state.matchSelections.left !== null && state.matchSelections.right !== null) {
        checkMatchPair();
    }
};

window.checkMatchPair = () => {
    const lIdx = state.matchSelections.left;
    const rIdx = state.matchSelections.right;
    const pool = state.currentMatchPool;

    const leftItem = pool.lefts[lIdx];
    const rightItem = pool.rights[rIdx];

    if (leftItem.id === rightItem.id) {
        leftItem.matched = true;
        rightItem.matched = true;
        state.matchedPairsCount++;
        state.score++;

        if (state.isMultiplayer) {
            window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                [`players.${state.myPlayerName}.score`]: state.score
            }).catch(e => console.error(e));
        }

        state.matchSelections = { left: null, right: null };
        render();

        setTimeout(() => {
            window.drawMatchLines();
            checkMatchWinCondition();
        }, 50);

    } else {
        state.matchErrorLeft = lIdx;
        state.matchErrorRight = rIdx;
        render();

        setTimeout(() => {
            state.matchErrorLeft = null;
            state.matchErrorRight = null;
            state.matchSelections = { left: null, right: null };
            render();
        }, 400);
    }
};

window.drawMatchLines = () => {
    const svg = document.getElementById('match-svg');
    const container = document.getElementById('match-container');
    if (!svg || !container) return;

    const rectContainer = container.getBoundingClientRect();
    const pool = state.currentMatchPool;
    if (!pool) return;

    let svgHtml = `
        <defs>
            <marker id="match-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
                <path d="M 1 1 L 9 5 L 1 9 z" fill="#036142" />
            </marker>
        </defs>
    `;

    pool.lefts.forEach((lItem, lIdx) => {
        if (lItem.matched) {
            const rIdx = pool.rights.findIndex(r => r.id === lItem.id);
            if (rIdx > -1) {
                const elLeft = document.getElementById(`match-left-${lIdx}`);
                const elRight = document.getElementById(`match-right-${rIdx}`);
                if (elLeft && elRight) {
                    const rL = elLeft.getBoundingClientRect();
                    const rR = elRight.getBoundingClientRect();

                    const x1 = state.currentLang.isRtl ? (rL.left - rectContainer.left) : (rL.right - rectContainer.left);
                    const y1 = rL.top - rectContainer.top + rL.height / 2;
                    const x2 = state.currentLang.isRtl ? (rR.right - rectContainer.left) : (rR.left - rectContainer.left);
                    const y2 = rR.top - rectContainer.top + rR.height / 2;

                    const mx = (x1 + x2) / 2;
                    svgHtml += `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="#036142" stroke-width="4" stroke-linecap="round" marker-start="url(#match-arrow)" marker-end="url(#match-arrow)"/>`;
                }
            }
        }
    });

    svg.innerHTML = svgHtml;
};

window.checkMatchWinCondition = () => {
    if (state.score >= 25) {
        if (state.isMultiplayer) {
            window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                [`players.${state.myPlayerName}.finished`]: true
            }).catch(e => console.error(e));
            navigate('MULTIPLAYER_WAIT');
        } else {
            navigate('GAME_OVER');
        }
        return;
    }

    const pool = state.currentMatchPool;
    if (state.matchedPairsCount >= pool.lefts.length) {
        if (state.currentIndex < state.currentPlayList.length - 1) {
            state.currentIndex++;
            render();
        } else {
            if (state.isMultiplayer) {
                window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                    [`players.${state.myPlayerName}.finished`]: true
                }).catch(e => console.error(e));
                navigate('MULTIPLAYER_WAIT');
            } else {
                navigate('GAME_OVER');
            }
        }
    }
};

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
        subline = '<i class="uil uil-bolt"></i> ' + state.energy;
        const savedName = localStorage.getItem('otakuPlayerName') || '';
        submitHtml = `
            <div style="margin-top: 24px; padding: 16px; background: rgba(33,2,110,0.05); border-radius: 16px;">
                <p class="bold" style="margin-bottom: 8px;">${getString('your_name')}</p>
                <input type="text" id="playerNameInput" class="neo-input" value="${savedName}" placeholder="${getString('your_name')}" style="text-align: center; margin-bottom: 12px;">
                <button class="neo-button bg-teal" id="submitScoreBtn" onclick="submitScore()">${getString('submit_score')}</button>
            </div>
        `;
    } else if (state.selectedMode === 'MATCH_PAIRS') {
        headline = getString('game_over');
        subline = state.score >= 25 ? '🏆 ניצחון!' : `<span dir="ltr">${state.score} / 25</span>`;
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
            <div class="leaderboard-score"><i class="uil uil-bolt"></i> ${entry.score}</div>
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

window.addPairRow = (afterRow = null) => {
    const container = document.getElementById('pairsContainer');
    if (!container) return;
    const currentCount = container.querySelectorAll('.pair-row').length;
    if (currentCount >= 10) {
        showToast("ניתן להוסיף עד 10 זוגות", 'info');
        return;
    }
    const row = document.createElement('div');
    row.className = 'pair-row';
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.style.alignItems = 'center';
    row.innerHTML = `
        <input type="text" class="neo-input match-left" placeholder="צד ימין (לדוגמה: לופי)" style="margin-bottom:0; flex: 1;">
        <input type="text" class="neo-input match-right" placeholder="צד שמאל (לדוגמה: וואן פיס)" style="margin-bottom:0; flex: 1;">
    `;
    if (afterRow && afterRow.nextSibling) {
        container.insertBefore(row, afterRow.nextSibling);
    } else {
        container.appendChild(row);
    }
    window.updatePairButtons();
};

window.removePairRow = (row) => {
    const container = document.getElementById('pairsContainer');
    const currentCount = container.querySelectorAll('.pair-row').length;
    if (currentCount <= 5) {
        showToast("חובה לפחות 5 זוגות", 'info');
        return;
    }
    row.remove();
    window.updatePairButtons();
};

window.updatePairButtons = () => {
    const container = document.getElementById('pairsContainer');
    if (!container) return;
    const rows = container.querySelectorAll('.pair-row');
    const total = rows.length;

    rows.forEach((row) => {
        let btnContainer = row.querySelector('.btn-container');
        if (!btnContainer) {
            btnContainer = document.createElement('div');
            btnContainer.className = 'btn-container';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '5px';
            row.appendChild(btnContainer);
        }

        let removeBtn = btnContainer.querySelector('.remove-pair-btn');
        let addBtn = btnContainer.querySelector('.add-pair-btn');

        if (addBtn) {
            addBtn.remove();
        }

        if (!removeBtn) {
            removeBtn = document.createElement('button');
            removeBtn.className = 'neo-button bg-coral remove-pair-btn';
            removeBtn.style.height = '58px';
            removeBtn.style.width = '58px';
            removeBtn.style.padding = '0';
            removeBtn.style.margin = '0';
            removeBtn.style.flexShrink = '0';
            removeBtn.style.alignItems = 'center';
            removeBtn.style.justifyContent = 'center';
            removeBtn.innerHTML = '<i class="uil uil-trash-alt" style="font-size: 24px; margin: 0; padding: 0;"></i>';
            removeBtn.onclick = () => { window.removePairRow(row); };
            btnContainer.appendChild(removeBtn);
        }

        removeBtn.style.display = total > 5 ? 'flex' : 'none';
    });

    const mainAddBtn = document.getElementById('mainAddPairBtn');
    if (mainAddBtn) {
        mainAddBtn.style.display = total < 10 ? 'block' : 'none';
    }
};

function renderAddQuestion() {
    // Generate radio buttons for categories
    const cats = categoryList.map(c =>
        `<label style="margin-right: 16px; font-weight: bold; cursor: pointer; color: var(--deep-indigo);">
            <input type="radio" name="newQCategory" value="${c}" ${c === 'Anime' ? 'checked' : ''}> ${c}
         </label>`
    ).join('');

    let initialPairs = '';
    for (let i = 0; i < 5; i++) {
        initialPairs += `
        <div class="pair-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="text" class="neo-input match-left" placeholder="צד ימין (לדוגמה: לופי)" style="margin-bottom:0; flex: 1;">
            <input type="text" class="neo-input match-right" placeholder="צד שמאל (לדוגמה: וואן פיס)" style="margin-bottom:0; flex: 1;">
        </div>`;
    }

    setTimeout(window.updatePairButtons, 0);

    return `
        <div class="screen-wrapper" style="align-items: center; padding-bottom: 40px;">
            <h2 class="main-title" style="margin-top: 0;">הוסף שאלה חדשה</h2>
            
            <div style="width: 100%; max-width: 400px; text-align: right;">
                <label class="bold">סוג שאלה</label>
                <select id="newQType" class="neo-input" style="height: 58px; font-weight: bold; background-color: var(--white);" onchange="
                    document.getElementById('triviaFields').style.display = this.value === 'trivia' ? 'block' : 'none';
                    document.getElementById('matchFields').style.display = this.value === 'match_pair' ? 'block' : 'none';
                    document.getElementById('hangmanFields').style.display = this.value === 'hangman' ? 'block' : 'none';
                ">
                    <option value="trivia">שאלת טריוויה (4 אפשרויות)</option>
                    <option value="match_pair">התאמת זוגות (5-10 זוגות)</option>
                    <option value="hangman">משחק הגמן (מילה או ביטוי)</option>
                </select>

                <div id="triviaFields">
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

                <div id="matchFields" style="display: none;">
                    <label class="bold">זוגות להתאמה (מינימום 5)</label>
                    <div id="pairsContainer">
                        ${initialPairs}
                    </div>
                    <button class="neo-button bg-multiplayer" id="mainAddPairBtn" style="height: 40px; padding: 0; margin-top: 10px;" onclick="window.addPairRow()">+ הוסף זוג</button>
                </div>

                <div id="hangmanFields" style="display: none;">
                    <label class="bold">מילה או ביטוי להגמן (עד 20 תווים)</label>
                    <input type="text" id="newHangmanWord" class="neo-input" placeholder="לדוגמא, ONE PIECE או וואן פיס" style="text-transform: uppercase;" maxlength="20">
                </div>
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
    const category = document.querySelector('input[name="newQCategory"]:checked').value;
    const qType = document.getElementById('newQType').value;
    const src = state.currentLang.code;

    // UI Feedback
    const btn = document.getElementById('saveQBtn');
    btn.innerText = "מתרגם ושומר...";
    btn.disabled = true;

    try {
        let newQuestion = { category, type: qType };

        if (qType === 'trivia') {
            const qText = document.getElementById('newQText').value.trim();
            const opts = [
                document.getElementById('newQOpt1').value.trim(),
                document.getElementById('newQOpt2').value.trim(),
                document.getElementById('newQOpt3').value.trim(),
                document.getElementById('newQOpt4').value.trim()
            ];
            const correct = document.getElementById('newQCorrect').value;

            if (!qText || opts.some(o => !o) || !correct) {
                showToast("נא למלא את כל השדות!", 'error');
                btn.innerText = "שמור שאלה"; btn.disabled = false;
                return;
            }

            const tQ = await translateToAllLangs(qText, src);
            const translatedOpts = await Promise.all(opts.map(o => translateToAllLangs(o, src)));
            const tO = {
                en: translatedOpts.map(t => t.en), he: translatedOpts.map(t => t.he),
                ar: translatedOpts.map(t => t.ar), ru: translatedOpts.map(t => t.ru)
            };
            const tA = await translateToAllLangs(correct, src);

            newQuestion.textMap = tQ;
            newQuestion.optionsMap = tO;
            newQuestion.correctMap = tA;

        } else if (qType === 'hangman') {
            // Remove multiple consecutive spaces and trim
            const word = document.getElementById('newHangmanWord').value.trim().replace(/\s+/g, ' ').toUpperCase();
            if (!word || word.replace(/\s+/g, '').length < 2) {
                showToast("יש להזין ביטוי חוקי (לפחות 2 אותיות)!", 'error');
                btn.innerText = "שמור שאלה"; btn.disabled = false;
                return;
            }
            if (word.length > 20) {
                showToast("הביטוי חייב להכיל עד 20 תווים!", 'error');
                btn.innerText = "שמור שאלה"; btn.disabled = false;
                return;
            }

            await window.addDoc(window.collection(window.db, "hangmanWords"), {
                word: word,
                category: category,
                lang: state.currentLang.code,
                addedAt: window.serverTimestamp()
            });
            showToast("✅ מילת ההגמן נשמרה בהצלחה!", 'success', 3500);
            navigate('MENU');
            return;

        } else if (qType === 'match_pair') {
            const leftInputs = Array.from(document.querySelectorAll('.match-left')).map(i => i.value.trim());
            const rightInputs = Array.from(document.querySelectorAll('.match-right')).map(i => i.value.trim());

            const pairs = [];
            for (let i = 0; i < leftInputs.length; i++) {
                if (leftInputs[i] && rightInputs[i]) {
                    pairs.push({ left: leftInputs[i], right: rightInputs[i] });
                }
            }

            if (pairs.length < 5) {
                showToast("יש להזין לפחות 5 זוגות מלאים!", 'error');
                btn.innerText = "שמור שאלה"; btn.disabled = false;
                return;
            }

            // Translate all pairs
            const translatedPairs = await Promise.all(pairs.map(async p => {
                const tLeft = await translateToAllLangs(p.left, src);
                const tRight = await translateToAllLangs(p.right, src);
                return { leftMap: tLeft, rightMap: tRight };
            }));

            // Structure pairs for easy retrieval: pairsMap: { en: [{left, right}], he: [{left, right}]... }
            const pairsMap = { en: [], he: [], ar: [], ru: [] };
            translatedPairs.forEach(tp => {
                ['en', 'he', 'ar', 'ru'].forEach(lang => {
                    pairsMap[lang].push({ left: tp.leftMap[lang], right: tp.rightMap[lang] });
                });
            });

            newQuestion.pairsMap = pairsMap;
        }

        // Save to Firebase Firestore
        await window.addDoc(window.collection(window.db, "questions"), newQuestion);
        showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", 'success', 3500);
        navigate('MENU');

    } catch (error) {
        console.error("Error saving question:", error);
        showToast("שגיאה בשמירת השאלה: " + error.message, 'error', 5000);
        btn.innerText = "שמור שאלה"; btn.disabled = false;
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

    // Listen to hangman words collection
    window.onSnapshot(window.collection(window.db, "hangmanWords"), (snapshot) => {
        state.hangmanWordBank = [];
        snapshot.forEach((doc) => {
            state.hangmanWordBank.push(doc.data());
        });
        console.log("Loaded hangman words from Firebase:", state.hangmanWordBank.length);
    }, (error) => {
        console.error("Firebase hangmanWords error:", error);
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

window.leaveRoom = async () => {
    if (!state.roomId) return;
    try {
        const roomRef = window.doc(window.db, "rooms", state.roomId);
        const docSnap = await window.getDoc(roomRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const newPlayers = { ...data.players };
            delete newPlayers[state.myPlayerName];

            let updates = { players: newPlayers };

            const allFinished = Object.keys(data.players || {}).length > 0 && Object.values(data.players || {}).every(p => p.finished);

            if (!allFinished) {
                if (state.isHost) {
                    updates['status'] = 'killed';
                } else if ((data.status === 'playing' || data.status === 'starting') && Object.keys(newPlayers).length <= 1) {
                    updates['status'] = 'killed';
                }
            }

            await window.updateDoc(roomRef, updates);
        }
    } catch (e) { console.error("Error leaving room:", e); }

    if (unsubscribeMultiplayer) {
        unsubscribeMultiplayer();
        unsubscribeMultiplayer = null;
    }
    state.roomId = null;
    state.isMultiplayer = false;
};

window.setLang = (code) => { state.currentLang = Object.values(Lang).find(l => l.code === code); render(); };
window.navigate = (screen) => {
    if (window.clearQuestionTimer) window.clearQuestionTimer();

    // Prevent race condition: if everyone is already finished, go straight to results
    if (screen === 'MULTIPLAYER_WAIT' && state.multiplayerPlayers) {
        const allFinished = Object.values(state.multiplayerPlayers).every(p => p && p.finished);
        if (allFinished) {
            screen = 'MULTIPLAYER_RESULTS';
        }
    }

    if (screen === 'MENU' && state.roomId) {
        window.leaveRoom();
    }

    state.currentScreen = screen;
    render();
};
window.setMode = (mode, isMulti) => {
    state.selectedMode = mode;
    state.isMultiplayer = isMulti;
    if (isMulti) {
        navigate('MULTIPLAYER_MENU');
    } else if (mode === 'BET_BURN') {
        navigate('BET_MENU');
    } else if (mode === 'HANGMAN') {
        startHangmanSingle();
    } else {
        navigate('SUBJECTS');
    }
};
window.startPlay = (cat) => {
    state.activeCategory = cat;

    let playlist = state.questionBank.filter(q => q.category === cat);

    if (state.selectedMode === 'MATCH_PAIRS') {
        playlist = playlist.filter(q => q.type === 'match_pair');
        state.currentPlayList = shuffleArray(playlist);
    } else {
        playlist = playlist.filter(q => q.type !== 'match_pair');
        playlist = playlist.map(q => {
            const clonedQ = { ...q, optionsMap: {} };
            for (let lang in q.optionsMap) {
                clonedQ.optionsMap[lang] = shuffleArray(q.optionsMap[lang]);
            }
            return clonedQ;
        });
        state.currentPlayList = shuffleArray(playlist);
    }

    state.currentIndex = 0; state.score = 0;

    // Persist energy across subjects
    const savedEnergy = parseInt(localStorage.getItem('otakuBetBurnEnergy'));
    state.energy = (savedEnergy && savedEnergy > 0) ? savedEnergy : 100;
    localStorage.setItem('otakuBetBurnEnergy', state.energy);

    state.rank = 0; state.climbLastResult = null;
    state.currentPhase = 'BETTING'; state.userBetInput = '';
    state.selectedOption = null;
    state.isWaitingForOthers = false;

    // Match Pairs State
    state.matchSelections = { left: null, right: null };
    state.matchedPairsCount = 0; // within the current question
    state.currentMatchPool = null;

    if (state.currentPlayList.length > 0) {
        navigate(state.selectedMode === 'BET_BURN' ? 'PLAYING_BET' : state.selectedMode === 'CLIMB' ? 'PLAYING_CLIMB' : state.selectedMode === 'MATCH_PAIRS' ? 'PLAYING_MATCH_PAIRS' : 'PLAYING_CLASSIC');
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

        if (state.isMultiplayer && state.selectedMode === 'CLASSIC') {
            try {
                await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                    [`answers.${state.myPlayerName}`]: { isCorrect, time: Date.now() }
                });
                state.isWaitingForOthers = true;
                render();
            } catch (e) { console.error("Error submitting answer:", e); }
        } else {
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

            if (state.currentIndex < state.currentPlayList.length - 1) {
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
            if (state.selectedMode === 'CLIMB') {
                window.checkClimbAnswer();
            } else {
                window.checkAnswer();
            }
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
    clearQuestionTimer();
    const qIdx = state.currentIndex % state.currentPlayList.length;
    const q = state.currentPlayList[qIdx];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    render();

    setTimeout(() => {
        const finalizeAndNavigate = async () => {
            state.isAnimatingResult = false;
            state.climbResultTimeoutActive = false;
            if (isCorrect) {
                state.rank = Math.min(10, state.rank + 1);
                state.climbLastResult = 'up';
            } else {
                state.rank = Math.max(-1, state.rank - 1);
                state.climbLastResult = 'down';
            }

            if (state.isMultiplayer) {
                try {
                    const updatePath = `players.${state.myPlayerName}.score`;
                    await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                        [updatePath]: state.rank,
                        [`answers.${state.myPlayerName}`]: { isCorrect, time: Date.now() }
                    });
                    state.isWaitingForOthers = true;
                    navigate('CLIMB_RESULT');
                } catch (e) { console.error("Error syncing score:", e); }
            } else {
                state.currentIndex++;
                navigate('CLIMB_RESULT');
            }
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

    setTimeout(async () => {
        state.isAnimatingResult = false;

        if (isCorrect) {
            state.energy += bet;
        } else {
            state.energy -= bet;
        }

        localStorage.setItem('otakuBetBurnEnergy', state.energy);

        if (state.isMultiplayer) {
            try {
                const updatePath = `players.${state.myPlayerName}.score`;
                let payload = {
                    [updatePath]: state.energy,
                    [`answers.${state.myPlayerName}`]: { isCorrect, time: Date.now() }
                };
                if (state.energy <= 0) {
                    payload[`players.${state.myPlayerName}.finished`] = true;
                }
                await window.updateDoc(window.doc(window.db, "rooms", state.roomId), payload);

                if (state.energy <= 0) {
                    navigate('MULTIPLAYER_WAIT');
                } else {
                    state.isWaitingForOthers = true;
                    render();
                }
            } catch (e) { console.error("Error syncing score:", e); }
        } else {
            if (state.energy <= 0 || state.currentIndex >= Math.min(state.currentPlayList.length - 1, 9)) {
                navigate('GAME_OVER');
            } else {
                state.userBetInput = '';
                state.selectedOption = null;
                state.currentPhase = 'BETTING';
                state.currentIndex++;
                render();
            }
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
                ${(state.selectedMode === 'CLIMB' || state.selectedMode === 'HANGMAN') ?
            `<p class="bold color-indigo" style="font-size:18px; margin-bottom:20px;">מצב זה מוגבל ל-2 שחקנים</p>` :
            `<label class="bold color-indigo" style="font-size:18px;">מספר שחקנים מקסימלי:</label>
                   <select id="maxPlayersInput" class="neo-input" style="margin-bottom: 15px; font-weight: bold; background-color: var(--white); font-size:18px; text-align:center;">
                       <option value="2">2 שחקנים</option>
                       <option value="3">3 שחקנים</option>
                       <option value="4">4 שחקנים</option>
                       <option value="5">5 שחקנים</option>
                   </select>`
        }
                <button class="neo-button bg-coral" style="height:60px;" onclick="createMultiplayerRoom()">צור חדר (מארח)</button>
                <div class="spacer-lg"></div>
                <input type="text" id="joinCodeInput" class="neo-input" placeholder="הכנס קוד חדר" style="text-align: center; font-size: 24px; text-transform: uppercase; margin-bottom: 12px;">
                <button class="neo-button bg-teal" style="height:60px;" onclick="joinMultiplayerRoom()">הצטרף לחדר</button>
                <div class="spacer-lg"></div>
                <button class="neo-button bg-Back" style="max-width: 100px;" onclick="navigate('MODE_SELECT_MULTI')">${getString('back')}</button>
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

    const maxPlayers = (state.selectedMode === 'CLIMB' || state.selectedMode === 'HANGMAN') ? 2 : (parseInt(document.getElementById('maxPlayersInput')?.value) || 2);
    state.maxPlayers = maxPlayers;

    // Generate 4-char code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    state.roomId = code;
    state.isHost = true;
    state.myPlayerName = name;
    state.multiplayerStatus = 'waiting';
    state.multiplayerPlayers = {
        [name]: { score: 0, finished: false, isHost: true, isReady: false }
    };

    // Shuffle questions - pull 10 random questions from the entire bank (not used for HANGMAN)
    if (state.selectedMode === 'HANGMAN' && state.hangmanWordBank.length === 0) {
        showToast("אין מילים להגמן! הוסף מילים תחילה.", 'error', 4000);
        return;
    }
    let playlist = [...state.questionBank];
    if (state.selectedMode === 'MATCH_PAIRS') {
        playlist = playlist.filter(q => q.type === 'match_pair');
    } else {
        playlist = playlist.filter(q => q.type !== 'match_pair');
    }

    const shuffled = state.selectedMode === 'HANGMAN' ? [] : playlist.sort(() => Math.random() - 0.5).slice(0, 10).map(q => {
        if (state.selectedMode === 'MATCH_PAIRS') return q;
        const clonedQ = { ...q, optionsMap: {} };
        if (q.optionsMap) {
            for (let lang in q.optionsMap) {
                clonedQ.optionsMap[lang] = shuffleArray(q.optionsMap[lang]);
            }
        }
        return clonedQ;
    });

    try {
        await window.setDoc(window.doc(window.db, "rooms", code), {
            status: 'waiting',
            maxPlayers: maxPlayers,
            hostName: name,
            players: state.multiplayerPlayers,
            playlist: shuffled,
            gameMode: state.selectedMode,
            currentQuestionIndex: 0,
            answers: {},
            hangmanState: {}
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
        state.selectedMode = data.gameMode || 'CLASSIC';

        const newPlayers = { ...data.players, [finalName]: { score: 0, finished: false, isHost: false, isReady: false } };

        await window.updateDoc(roomRef, {
            players: newPlayers,
            status: 'waiting'
        });

        listenToRoom(code);

        navigate('MULTIPLAYER_LOBBY');
    } catch (e) {
        console.error(e);
        showToast("שגיאה בהצטרפות", 'error');
    }
};

window.toggleReady = async () => {
    const currentState = state.multiplayerPlayers[state.myPlayerName]?.isReady || false;
    try {
        await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
            [`players.${state.myPlayerName}.isReady`]: !currentState
        });
    } catch (e) { console.error(e); }
};

function listenToRoom(code) {
    if (unsubscribeMultiplayer) unsubscribeMultiplayer();

    unsubscribeMultiplayer = window.onSnapshot(window.doc(window.db, "rooms", code), (doc) => {
        if (!doc.exists()) return;
        const data = doc.data();

        if (data.status === 'killed') {
            if (unsubscribeMultiplayer) {
                unsubscribeMultiplayer();
                unsubscribeMultiplayer = null;
            }
            state.roomId = null;
            state.isMultiplayer = false;
            showToast("המשחק בוטל מכיוון ששחקנים עזבו את החדר", "error", 4000);
            if (state.currentScreen !== 'MENU') {
                state.currentScreen = 'MENU';
                render();
            }
            return;
        }

        state.multiplayerStatus = data.status;
        state.multiplayerPlayers = data.players || {};

        if (data.status === 'starting' && state.currentScreen === 'MULTIPLAYER_LOBBY') {
            state.multiplayerStartTimer = 4; // 4 seconds local countdown
            navigate('MULTIPLAYER_STARTING');

            if (window.multiplayerStartInterval) clearInterval(window.multiplayerStartInterval);
            window.multiplayerStartInterval = setInterval(() => {
                state.multiplayerStartTimer--;
                if (state.multiplayerStartTimer <= 0) {
                    clearInterval(window.multiplayerStartInterval);

                    state.currentPlayList = data.playlist;
                    state.selectedMode = data.gameMode || 'CLASSIC';
                    state.currentIndex = 0;
                    state.score = 0;
                    state.rank = 0;
                    state.energy = 100;
                    state.climbLastResult = null;
                    state.currentPhase = 'BETTING';
                    state.userBetInput = '';
                    state.isWaitingForOthers = false;

                    if (state.selectedMode === 'BET_BURN') {
                        navigate('PLAYING_BET');
                    } else if (state.selectedMode === 'CLIMB') {
                        navigate('PLAYING_CLIMB');
                    } else if (state.selectedMode === 'HANGMAN') {
                        initHangmanState(state.hangmanWordBank);
                        window.updateDoc(window.doc(window.db, "rooms", code), {
                            [`hangmanState.${state.myPlayerName}`]: { wrongCount: 0, done: false }
                        }).catch(e => console.error(e));
                        navigate('PLAYING_HANGMAN');
                    } else if (state.selectedMode === 'MATCH_PAIRS') {
                        navigate('PLAYING_MATCH_PAIRS');
                    } else {
                        navigate('PLAYING_CLASSIC');
                    }
                } else {
                    render();
                }
            }, 1000);
        }

        if (data.status === 'playing') {
            if (state.multiplayerPlayers[state.myPlayerName]) {
                const s = state.multiplayerPlayers[state.myPlayerName].score || 0;
                if (state.selectedMode === 'CLASSIC') state.score = s;
                else if (state.selectedMode === 'CLIMB') state.rank = s;
                else if (state.selectedMode === 'BET_BURN') state.energy = s;
            }

            if (data.currentQuestionIndex > state.currentIndex) {
                state.currentIndex = data.currentQuestionIndex;
                state.isWaitingForOthers = false;
                state.selectedOption = null;
                if (state.selectedMode === 'BET_BURN') state.currentPhase = 'BETTING';
                
                if (state.selectedMode === 'CLIMB' && state.currentScreen === 'CLIMB_RESULT') {
                    state.climbResultTimeoutActive = false;
                    const wrapper = document.querySelector('.screen-wrapper');
                    if (wrapper) wrapper.classList.add('climb-exit');
                    setTimeout(() => {
                        if (state.timerInterval) {
                            clearQuestionTimer();
                            startQuestionTimer();
                        }
                        navigate('PLAYING_CLIMB');
                    }, 300);
                } else {
                    if (state.timerInterval) {
                        clearQuestionTimer();
                        startQuestionTimer();
                    }
                    render();
                }
            }

            if (state.isHost) {
                const answers = data.answers || {};
                const activePlayers = Object.entries(data.players).filter(([_, p]) => !p.finished);
                const activePlayerNames = activePlayers.map(([name, _]) => name);
                const validAnswersCount = activePlayerNames.filter(name => answers[name]).length;

                if (validAnswersCount === activePlayerNames.length && activePlayerNames.length > 0) {
                    let updates = {};

                    if (state.selectedMode === 'CLASSIC') {
                        let sortedAnswers = Object.entries(answers).map(([name, ans]) => ({ name, ...ans }));
                        sortedAnswers.sort((a, b) => a.time - b.time);

                        let pPoints = Object.keys(data.players).length;

                        sortedAnswers.forEach(ans => {
                            let currentScore = data.players[ans.name].score || 0;
                            if (ans.isCorrect) {
                                updates[`players.${ans.name}.score`] = currentScore + pPoints;
                                pPoints--;
                            }
                        });
                    }

                    updates[`answers`] = {};

                    if (data.currentQuestionIndex >= data.playlist.length - 1) {
                        Object.keys(data.players).forEach(p => {
                            updates[`players.${p}.finished`] = true;
                        });
                    } else {
                        updates[`currentQuestionIndex`] = data.currentQuestionIndex + 1;
                    }
                    window.updateDoc(window.doc(window.db, "rooms", code), updates);
                }
            }
        }

        const activeScreens = ['MULTIPLAYER_WAIT', 'PLAYING_CLASSIC', 'PLAYING_CLIMB', 'PLAYING_BET', 'CLIMB_RESULT', 'PLAYING_HANGMAN'];
        if (activeScreens.includes(state.currentScreen)) {
            if (state.selectedMode === 'HANGMAN') {
                // Sync opponent hangman state from Firestore
                const hangmanState = data.hangmanState || {};
                const oppName = Object.keys(data.players || {}).find(n => n !== state.myPlayerName);
                if (oppName && hangmanState[oppName]) {
                    const opp = hangmanState[oppName];
                    state.hangmanOpponentWrongCount = opp.wrongCount || 0;
                    state.hangmanOpponentDone = opp.done || false;
                    state.hangmanOpponentWon = opp.won || false;
                    if (opp.done) {
                        state.hangmanOpponentWord = opp.word || '';
                        state.hangmanOpponentWrong = opp.wrong || [];
                        state.hangmanOpponentGuessed = opp.guessed || [];
                    }
                }
                // Both done → reveal screen
                if (state.hangmanDone && state.hangmanOpponentDone && state.currentScreen === 'PLAYING_HANGMAN') {
                    navigate('HANGMAN_RESULTS');
                } else if (state.currentScreen === 'PLAYING_HANGMAN') {
                    render();
                }
            } else {
                const allFinished = Object.keys(state.multiplayerPlayers).length > 0 && Object.values(state.multiplayerPlayers).every(p => p.finished);
                if (allFinished) {
                    if (state.currentScreen !== 'MULTIPLAYER_RESULTS') {
                        navigate('MULTIPLAYER_RESULTS');
                    }
                } else if (state.currentScreen === 'MULTIPLAYER_WAIT') {
                    render(); // update leaderboard live
                }
            }
        }

        if (state.currentScreen === 'MULTIPLAYER_LOBBY') {
            render(); // update player list live
        }
    });
}

window.startMultiplayerGame = async () => {
    if (!state.isHost) return;
    const playersData = Object.values(state.multiplayerPlayers);
    if (playersData.length <= 1) {
        showToast("צריך לפחות 2 שחקנים כדי להתחיל!", 'error');
        return;
    }
    if (!playersData.every(p => p.isReady)) {
        showToast("לא כל השחקנים מוכנים!", 'error');
        return;
    }
    try {
        await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
            status: 'starting'
        });

        // Host sets status to playing once the game actually starts
        setTimeout(() => {
            window.updateDoc(window.doc(window.db, "rooms", state.roomId), { status: 'playing' }).catch(e => console.error(e));
        }, 4000);
    } catch (e) {
        console.error(e);
    }
};

function renderMultiplayerLobby() {
    const playersArr = Object.keys(state.multiplayerPlayers);
    const playersListHtml = playersArr.map(pName => {
        const pData = state.multiplayerPlayers[pName];
        return `
        <tr style="background:var(--white); border-bottom: 1px solid rgba(0,0,0,0.1);">
            <td style="padding: 12px 15px; font-weight:bold; font-size:18px;">${pName}</td>
            <td style="padding: 12px 15px; text-align:left; font-size:20px;">${pData.isReady ? '✅' : '❌'}</td>
        </tr>`;
    }).join('');

    const isReady = state.multiplayerPlayers[state.myPlayerName]?.isReady || false;

    // Check if everyone is ready
    const playersData = Object.values(state.multiplayerPlayers);
    const allReady = playersData.length > 1 && playersData.every(p => p.isReady);

    let hostControls = '';
    if (state.isHost) {
        hostControls = `
            <div class="spacer-md"></div>
            <button class="neo-button ${allReady ? 'bg-coral' : ''}" style="max-width:200px;" ${allReady ? '' : 'disabled'} onclick="startMultiplayerGame()">
                התחל משחק
            </button>
            <p style="opacity:0.7; text-align:center; max-width: 300px; font-size: 14px; margin-top: 8px;">
                ${allReady ? 'כולם מוכנים! אפשר להתחיל.' : 'ממתין שכולם יאשרו מוכנות (✅)'}
            </p>
        `;
    } else {
        hostControls = `
            <div class="spacer-md"></div>
            <p style="opacity:0.7; text-align:center; max-width: 300px; font-size: 14px;">
                ממתין למארח שיתחיל את המשחק...
            </p>
        `;
    }

    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <h2 class="main-title">חדר המתנה</h2>
            <p>קוד החדר שלך:</p>
            <h1 class="color-coral" style="font-size: 64px; letter-spacing: 4px; background: var(--white); padding: 10px 20px; border-radius: 12px; border: 4px solid var(--app-text);">${state.roomId}</h1>
            <div class="spacer-md"></div>
            
            <p class="bold" style="font-size: 20px;">שחקנים בחדר (${playersArr.length}/${state.maxPlayers}):</p>
            <table style="width: 100%; max-width: 350px; margin-bottom: 20px; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 2px solid var(--app-text);">
                <thead style="background: var(--app-text); color: var(--white);">
                    <tr>
                        <th style="padding: 10px 15px; text-align: right;">שם שחקן</th>
                        <th style="padding: 10px 15px; text-align: left;">סטטוס</th>
                    </tr>
                </thead>
                <tbody>
                    ${playersListHtml}
                </tbody>
            </table>
            
            <button class="neo-button ${isReady ? 'bg-periwinkle' : 'bg-teal'}" style="max-width:200px;" onclick="toggleReady()">
                ${isReady ? '❌ אני לא מוכן' : '✅ אני מוכן!'}
            </button>
            
            ${hostControls}
        </div>
    `;
}

function renderMultiplayerStarting() {
    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <h2 class="main-title" style="font-size: 32px; margin-bottom: 24px;">המשחק מתחיל בעוד...</h2>
            <div style="font-size: 96px; font-weight: 800; color: var(--accent-teal); animation: resultPop 1s infinite;">${state.multiplayerStartTimer}</div>
        </div>
    `;
}

function renderMultiplayerWaitScreen() {
    const playersArr = Object.entries(state.multiplayerPlayers).sort((a, b) => b[1].score - a[1].score);

    const leaderboardHtml = playersArr.map(([pName, pData], idx) => {
        const isMe = pName === state.myPlayerName;
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-bolt"></i> ${pData.score}` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : state.selectedMode === 'MATCH_PAIRS' ? `${pData.score} / 25` : `${pData.score} / 10`;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:10px 15px; margin:5px 0; border-radius:8px; border: 2px solid var(--app-text); font-weight:bold;">
            <div>#${idx + 1} &nbsp; ${pName} ${pData.finished ? '✅' : '<i class="uit uit-hourglass"></i>'}</div>
            <div dir="ltr">${scoreDisplay}</div>
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
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-bolt"></i> ${pData.score}` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : state.selectedMode === 'MATCH_PAIRS' ? `${pData.score} / 25` : `${pData.score} / 10`;
        let medal = '';
        if (idx === 0) medal = '🥇';
        else if (idx === 1) medal = '🥈';
        else if (idx === 2) medal = '🥉';
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:15px; margin:5px 0; border-radius:8px; border: 3px solid var(--app-text); font-weight:bold; font-size:20px;">
            <div>${medal} #${idx + 1} &nbsp; ${pName}</div>
            <div dir="ltr">${scoreDisplay}</div>
        </div>`;
    }).join('');

    return `
        <div class="screen-wrapper" style="align-items:center;">
            <h1 style="font-size:48px; color:${resultColor};">${resultTitle}</h1>
            <div class="spacer-md"></div>
            
            <p class="bold" style="font-size:24px;">טבלת מובילים סופית:</p>
            <div style="width:100%; max-width: 400px; margin-bottom: 20px;">
                ${podiumHtml}
            </div>
            
            <div class="spacer-lg"></div>
            <button class="neo-button bg-Back" style="height:60px; max-width:200px;" onclick="navigate('MENU')">${getString('continue_btn')}</button>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════
// --- HANGMAN GAME MODE ---
// ══════════════════════════════════════════════════════════════

function buildHangmanSVG(wrongCount, small = false) {
    const maxW = small ? '130px' : '190px';
    const parts = {
        head: wrongCount >= 1,
        body: wrongCount >= 2,
        leftArm: wrongCount >= 3,
        rightArm: wrongCount >= 4,
        leftLeg: wrongCount >= 5,
        rightLeg: wrongCount >= 6,
    };
    return `
    <svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg"
         style="width:100%; max-width:${maxW}; display:block; margin:0 auto; filter:drop-shadow(0 4px 8px rgba(33,2,110,0.12));">
        <!-- Gallows base -->
        <line x1="10" y1="190" x2="150" y2="190" stroke="var(--app-text)" stroke-width="5" stroke-linecap="round"/>
        <line x1="40" y1="190" x2="40" y2="10"   stroke="var(--app-text)" stroke-width="5" stroke-linecap="round"/>
        <line x1="40" y1="10"  x2="112" y2="10"  stroke="var(--app-text)" stroke-width="5" stroke-linecap="round"/>
        <line x1="112" y1="10" x2="112" y2="32"  stroke="var(--app-text)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 3"/>
        <!-- Head -->
        ${parts.head ? `<circle cx="112" cy="48" r="16" fill="none" stroke="#e53935" stroke-width="3.5" style="animation:hangmanPop .25s ease"/>` : ''}
        <!-- Body -->
        ${parts.body ? `<line x1="112" y1="64" x2="112" y2="118" stroke="#e53935" stroke-width="3.5" stroke-linecap="round"/>` : ''}
        <!-- Left Arm -->
        ${parts.leftArm ? `<line x1="112" y1="80" x2="82" y2="104" stroke="#e53935" stroke-width="3.5" stroke-linecap="round"/>` : ''}
        <!-- Right Arm -->
        ${parts.rightArm ? `<line x1="112" y1="80" x2="142" y2="104" stroke="#e53935" stroke-width="3.5" stroke-linecap="round"/>` : ''}
        <!-- Left Leg -->
        ${parts.leftLeg ? `<line x1="112" y1="118" x2="84" y2="152" stroke="#e53935" stroke-width="3.5" stroke-linecap="round"/>` : ''}
        <!-- Right Leg -->
        ${parts.rightLeg ? `<line x1="112" y1="118" x2="140" y2="152" stroke="#e53935" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    </svg>`;
}

function getHangmanKeyboard() {
    switch (state.currentLang.code) {
        case 'he': return ['\u05d0', '\u05d1', '\u05d2', '\u05d3', '\u05d4', '\u05d5', '\u05d6', '\u05d7', '\u05d8', '\u05d9', '\u05db', '\u05dc', '\u05de', '\u05e0', '\u05e1', '\u05e2', '\u05e4', '\u05e6', '\u05e7', '\u05e8', '\u05e9', '\u05ea', '\u05da', '\u05dd', '\u05df', '\u05e3', '\u05e5'];
        case 'en': return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        case 'ar': return ['\u0627', '\u0628', '\u062a', '\u062b', '\u062c', '\u062d', '\u062e', '\u062f', '\u0630', '\u0631', '\u0632', '\u0633', '\u0634', '\u0635', '\u0636', '\u0637', '\u0638', '\u0639', '\u063a', '\u0641', '\u0642', '\u0643', '\u0644', '\u0645', '\u0646', '\u0647', '\u0648', '\u064a'];
        case 'ru': return '\u0410\u0411\u0412\u0413\u0414\u0415\u0401\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f'.split('');
        default: return ['\u05d0', '\u05d1', '\u05d2', '\u05d3', '\u05d4', '\u05d5', '\u05d6', '\u05d7', '\u05d8', '\u05d9', '\u05db', '\u05dc', '\u05de', '\u05e0', '\u05e1', '\u05e2', '\u05e4', '\u05e6', '\u05e7', '\u05e8', '\u05e9', '\u05ea', '\u05da', '\u05dd', '\u05df', '\u05e3', '\u05e5'];
    }
}

function renderHangmanKeyboard() {
    const letters = getHangmanKeyboard();
    return letters.map(letter => {
        const guessed = state.hangmanGuessed.includes(letter);
        const wrong = state.hangmanWrong.includes(letter);
        let cls = 'hangman-key';
        if (guessed) cls += ' correct';
        else if (wrong) cls += ' wrong';
        const disabled = (guessed || wrong || state.hangmanDone) ? 'disabled' : '';
        return `<button class="${cls}" ${disabled} onclick="guessLetter('${letter}')">${letter}</button>`;
    }).join('');
}

function renderHangman() {
    const word = state.hangmanWord;
    const maxWrong = 6;
    const wrongCount = state.hangmanWrong.length;

    const wordDisplay = word.map(ch => {
        if (ch === ' ') return `<span class="hangman-letter-box space">&nbsp;</span>`;
        const revealed = state.hangmanGuessed.includes(ch) || state.hangmanDone;
        return `<span class="hangman-letter-box${revealed ? ' revealed' : ''}">${revealed ? ch : ''}</span>`;
    }).join('');

    if (state.isMultiplayer) return renderHangmanMultiplayer(wordDisplay, wrongCount);

    let overlayHtml = '';
    if (state.hangmanDone) {
        const emoji = state.hangmanWon ? '🎉' : '💀';
        const msg = state.hangmanWon ? 'ניצחת!' : 'הפסדת!';
        const wordReveal = state.hangmanWon ? '' :
            `<p style="font-size:19px; margin:10px 0; font-weight:700;">המילה הייתה: <span style="color:var(--accent-teal); letter-spacing:2px;">${word.join('')}</span></p>`;
        overlayHtml = `
        <div class="hangman-overlay">
            <div class="hangman-overlay-box">
                <div style="font-size:60px; margin-bottom:8px;">${emoji}</div>
                <h2 style="font-size:30px; margin-bottom:10px; color:var(--app-text);">${msg}</h2>
                ${wordReveal}
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px; width:100%;">
                    <button class="neo-button bg-coral" style="max-width:100%;" onclick="startHangmanSingle()">שחק שוב</button>
                    <button class="neo-button bg-Back" style="max-width:100%;" onclick="navigate('MENU')">תפריט ראשי</button>
                </div>
            </div>
        </div>`;
    }

    return `
        <div class="screen-wrapper" style="position:relative; padding-bottom:20px;">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <div style="display:flex; justify-content:center; align-items:center; margin-bottom:12px;">
                <div style="display:flex; gap:6px;">
                    ${Array.from({ length: maxWrong }, (_, i) =>
        `<span style="width:14px;height:14px;border-radius:50%;background:${i < wrongCount ? '#e53935' : 'rgba(33,2,110,0.15)'};display:inline-block;"></span>`
    ).join('')}
                </div>
            </div>

            <div style="display:flex; justify-content:center; margin-bottom:8px;">
                ${buildHangmanSVG(wrongCount)}
            </div>

            <div class="hangman-word">${wordDisplay}</div>

            ${state.hangmanWrong.length > 0 ? `
            <div class="hangman-wrong-list">
                <span class="bold" style="margin-inline-end:8px; font-size:13px;">שגויים:</span>
                ${state.hangmanWrong.map(l => `<span class="hangman-wrong-letter">${l}</span>`).join('')}
            </div>` : '<div style="height:42px;"></div>'}

            <div class="hangman-keyboard">${renderHangmanKeyboard()}</div>

            ${overlayHtml}
        </div>
    `;
}

function renderHangmanMultiplayer(myWordDisplay, myWrongCount) {
    const maxWrong = 6;
    const oppWrong = state.hangmanOpponentWrongCount || 0;
    const oppDone = state.hangmanOpponentDone;

    const myPanel = `
        <div class="hangman-panel">
            <div class="hangman-panel-title">אתה ${state.hangmanDone ? (state.hangmanWon ? '✅' : '❌') : '<i class="uit uit-hourglass"></i>'}</div>
            ${buildHangmanSVG(myWrongCount, true)}
            <div class="hangman-word small">${myWordDisplay}</div>
            ${state.hangmanWrong.length > 0 ? `
            <div class="hangman-wrong-list small">
                ${state.hangmanWrong.map(l => `<span class="hangman-wrong-letter">${l}</span>`).join('')}
            </div>` : ''}
            ${state.hangmanDone ?
            `<div style="text-align:center; font-weight:800; font-size:12px; color:${state.hangmanWon ? 'var(--accent-teal)' : '#e53935'}; margin-top:6px; line-height:1.4;">
                    ${state.hangmanWon ? '✅ ניצחת!<br>ממתין ליריב...' : '❌ הפסדת.<br>ממתין ליריב...'}
                </div>` :
            `<div class="hangman-keyboard small">${renderHangmanKeyboard()}</div>`
        }
        </div>`;

    const oppPanel = `
        <div class="hangman-panel opponent">
            <div class="hangman-panel-title">יריב ${oppDone ? (state.hangmanOpponentWon ? '✅' : '❌') : '<i class="uit uit-hourglass"></i>'}</div>
            ${buildHangmanSVG(oppWrong, true)}
            <div style="text-align:center; margin-top:10px; padding:0 4px;">
                <div style="font-size:11px; opacity:0.5; margin-bottom:6px;">מילה מוסתרת</div>
                <div style="letter-spacing:5px; font-size:15px; font-weight:800; color:var(--app-text); opacity:0.4;">? ? ?</div>
                <div style="font-size:12px; font-weight:700; margin-top:10px; color:var(--app-text);">שגיאות: ${oppWrong}/${maxWrong}</div>
                ${oppDone ? `<div style="font-size:12px; color:${state.hangmanOpponentWon ? 'var(--accent-teal)' : '#e53935'}; font-weight:800; margin-top:4px;">${state.hangmanOpponentWon ? '✅ ניצח' : '❌ הפסיד'}</div>` : ''}
            </div>
        </div>`;

    return `
        <div class="screen-wrapper" style="padding:12px 8px; overflow:hidden;">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <div style="display:flex; justify-content:center; align-items:center; margin-bottom:10px;">
                <span style="font-weight:800; font-size:12px; opacity:0.7;">שגיאות שלי: ${myWrongCount}/${maxWrong} | יריב: ${oppWrong}/${maxWrong}</span>
            </div>
            <div class="hangman-split">
                ${myPanel}
                <div class="hangman-divider"></div>
                ${oppPanel}
            </div>
        </div>
    `;
}

function renderHangmanResults() {
    const myWord = state.hangmanWord.join('');
    const oppWord = state.hangmanOpponentWord || '';
    const myWon = state.hangmanWon;
    const oppWon = state.hangmanOpponentWon;
    const myWrong = state.hangmanWrong.length;
    const oppWrong = state.hangmanOpponentWrongCount;

    let resultTitle = '', resultColor = '';
    if (myWon && !oppWon) { resultTitle = '🏆 ניצחת!'; resultColor = 'var(--accent-teal)'; }
    else if (!myWon && oppWon) { resultTitle = '💀 הפסדת!'; resultColor = '#e53935'; }
    else if (myWon && oppWon) {
        if (myWrong < oppWrong) { resultTitle = '🏆 ניצחת! (פחות שגיאות)'; resultColor = 'var(--accent-teal)'; }
        else if (myWrong > oppWrong) { resultTitle = '😅 הפסדת! (יותר שגיאות)'; resultColor = '#e53935'; }
        else { resultTitle = '🤝 תיקו!'; resultColor = 'var(--app-text)'; }
    }
    else { resultTitle = '💀 שניכם הפסדתם!'; resultColor = 'var(--app-text)'; }

    const myWrongLetters = state.hangmanWrong.join(', ') || '-';
    const oppWrongLetters = (state.hangmanOpponentWrong || []).join(', ') || '-';

    return `
        <div class="screen-wrapper" style="align-items:center; padding-bottom:40px;">
            <h1 style="font-size:34px; color:${resultColor}; text-align:center; margin-bottom:20px; font-weight:800;">${resultTitle}</h1>

            <div class="hangman-split" style="width:100%; max-width:560px; margin-bottom:28px; gap:8px;">
                <div class="hangman-result-panel">
                    <div class="hangman-panel-title">אתה</div>
                    ${buildHangmanSVG(myWrong, true)}
                    <div style="margin-top:10px; text-align:center;">
                        <div style="font-size:12px; opacity:0.6;">המילה שלך</div>
                        <div style="font-size:22px; font-weight:800; letter-spacing:3px; margin:6px 0; color:var(--app-text);">${myWord}</div>
                        <div style="font-size:13px; color:${myWon ? 'var(--accent-teal)' : '#e53935'}; font-weight:700;">${myWon ? '✅ ניצחת' : '❌ הפסדת'}</div>
                        <div style="font-size:12px; opacity:0.65; margin-top:5px;">שגיאות: ${myWrong}/6</div>
                        <div style="font-size:11px; opacity:0.55; word-break:break-all;">שגויים: ${myWrongLetters}</div>
                    </div>
                </div>

                <div class="hangman-divider" style="align-self:stretch;"></div>

                <div class="hangman-result-panel">
                    <div class="hangman-panel-title">יריב</div>
                    ${buildHangmanSVG(oppWrong, true)}
                    <div style="margin-top:10px; text-align:center;">
                        <div style="font-size:12px; opacity:0.6;">המילה של היריב</div>
                        <div style="font-size:22px; font-weight:800; letter-spacing:3px; margin:6px 0; color:var(--app-text);">${oppWord || '?'}</div>
                        <div style="font-size:13px; color:${oppWon ? 'var(--accent-teal)' : '#e53935'}; font-weight:700;">${oppWon ? '✅ ניצח' : '❌ הפסיד'}</div>
                        <div style="font-size:12px; opacity:0.65; margin-top:5px;">שגיאות: ${oppWrong}/6</div>
                        <div style="font-size:11px; opacity:0.55; word-break:break-all;">שגויים: ${oppWrongLetters}</div>
                    </div>
                </div>
            </div>

            <button class="neo-button bg-Back" style="height:56px; max-width:220px;" onclick="navigate('MENU')">תפריט ראשי</button>
        </div>
    `;
}

function renderAddHangmanWord() {
    return `
        <div class="screen-wrapper" style="align-items:center; padding-bottom:40px;">
            <h2 class="main-title" style="margin-top:0; font-size:32px;">🎯 מילות הגמן</h2>

            <div style="width:100%; max-width:420px;">
                <label class="bold" style="display:block; margin-bottom:8px; font-size:16px;">הוסף מילה חדשה</label>
                <input type="text" id="hangmanWordInput" class="neo-input"
                       placeholder="לדוגמה: נארוטו"
                       style="text-align:center; font-size:26px; font-weight:800; letter-spacing:4px;"
                       oninput="this.value=this.value.toUpperCase()">

                <label class="bold" style="display:block; margin-bottom:8px; font-size:15px;">קטגוריה (אופציונלי)</label>
                <input type="text" id="hangmanCategoryInput" class="neo-input" placeholder="לדוגמה: דמויות אנימה">

                <button class="neo-button bg-teal" id="saveHangmanWordBtn" onclick="saveHangmanWord()" style="height:56px; font-size:17px;">
                    ✅ שמור מילה
                </button>
            </div>

            <div class="spacer-lg"></div>
            <button class="neo-button bg-Back" style="max-width:120px;" onclick="navigate('MENU')">חזור</button>
        </div>
    `;
}

window.saveHangmanWord = async () => {
    const wordInput = document.getElementById('hangmanWordInput');
    const categoryInput = document.getElementById('hangmanCategoryInput');
    const btn = document.getElementById('saveHangmanWordBtn');

    const word = wordInput?.value.trim().toUpperCase();
    const category = categoryInput?.value.trim() || 'כללי';

    if (!word || word.length < 2) {
        showToast('אנא הזן מילה של לפחות 2 אותיות!', 'error');
        return;
    }
    if (word.includes(' ') && word.replace(/ /g, '').length < 2) {
        showToast('המילה קצרה מדי!', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'שומר...';

    try {
        await window.addDoc(window.collection(window.db, 'hangmanWords'), {
            word,
            category,
            lang: state.currentLang.code,
            addedAt: window.serverTimestamp()
        });
        showToast('✅ המילה נשמרה בהצלחה!', 'success');
        if (wordInput) wordInput.value = '';
        if (categoryInput) categoryInput.value = '';
        render(); // refresh chip list
    } catch (e) {
        console.error(e);
        showToast('שגיאה בשמירת המילה', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = '✅ שמור מילה';
    }
};

function startHangmanSingle() {
    const wordList = state.hangmanWordBank || [];
    if (wordList.length === 0) {
        showToast('אין מילים להגמן! הוסף מילים תחילה.', 'error', 4000);
        navigate('ADD_HANGMAN_WORD');
        return;
    }
    initHangmanState(wordList);
    navigate('PLAYING_HANGMAN');
}

function initHangmanState(wordList) {
    const entry = wordList[Math.floor(Math.random() * wordList.length)];
    const word = (entry.word || '').toUpperCase();
    state.hangmanWord = word.split('');
    state.hangmanGuessed = [];
    state.hangmanWrong = [];
    state.hangmanDone = false;
    state.hangmanWon = false;
    state.hangmanOpponentWrongCount = 0;
    state.hangmanOpponentDone = false;
    state.hangmanOpponentWon = false;
    state.hangmanOpponentWord = '';
    state.hangmanOpponentWrong = [];
    state.hangmanOpponentGuessed = [];
}

function guessLetter(letter) {
    if (state.hangmanDone) return;
    if (state.hangmanGuessed.includes(letter) || state.hangmanWrong.includes(letter)) return;

    if (state.hangmanWord.includes(letter)) {
        state.hangmanGuessed.push(letter);
    } else {
        state.hangmanWrong.push(letter);
    }

    const won = state.hangmanWord.length > 0 &&
        state.hangmanWord.every(ch => ch === ' ' || state.hangmanGuessed.includes(ch));
    const lost = state.hangmanWrong.length >= 6;

    if (won || lost) {
        state.hangmanDone = true;
        state.hangmanWon = won;

        if (state.isMultiplayer) {
            window.updateDoc(window.doc(window.db, 'rooms', state.roomId), {
                [`hangmanState.${state.myPlayerName}`]: {
                    wrongCount: state.hangmanWrong.length,
                    done: true,
                    won: state.hangmanWon,
                    word: state.hangmanWord.join(''),
                    guessed: state.hangmanGuessed,
                    wrong: state.hangmanWrong
                },
                [`players.${state.myPlayerName}.finished`]: true
            }).catch(e => console.error(e));
        }
    } else if (state.isMultiplayer) {
        // Sync only wrong count during game (word stays private)
        window.updateDoc(window.doc(window.db, 'rooms', state.roomId), {
            [`hangmanState.${state.myPlayerName}.wrongCount`]: state.hangmanWrong.length
        }).catch(e => console.error(e));
    }

    render();
}