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
    energy: 200,
    rank: 0,           // Climb: current level 0-10
    climbLastResult: null, // 'up' | 'down' | null
    selectedOption: null,
    isAnimating: false,
    currentPhase: 'ANTE', // For Bet & Burn
    userBetInput: '',

    // Multiplayer Data
    roomId: null,
    isHost: false,
    myPlayerName: '',
    multiplayerPlayers: {}, // { name: { score, finished, isHost } }
    maxPlayers: 2,
    multiplayerStatus: null,
    isMultiplayer: false,

    // Multiplayer Bet Data
    roomPot: 0,
    roomPhase: 'ANTE', // 'ANTE', 'BETTING', 'ANSWERING'
    playerFolded: false,
    isLockedOut: false,
    roomCurrentBet: 0,
    playerBets: {},
    bettingOrder: [],        // player names in turn order
    currentBettorIndex: 0,  // whose turn it is
    bettingActed: [],        // who has acted since last raise

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
    hangmanWordImage: null,
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

// ══════════════════════════════════════════════════════════════
// --- IMAGE UTILITIES ---
// ══════════════════════════════════════════════════════════════

/**
 * Compresses an image File to a JPEG Data URL using canvas.
 * Max dimension: 800px. Quality: 0.72 (good balance size/clarity).
 * Typical output: 40–80 KB from a 5MB photo.
 */
function compressImage(file) {
    return _compressImageInternal(file, 800, 0.72);
}

/**
 * Tighter compression for matching-pair images.
 * Max dimension: 600px. Quality: 0.55.
 * Typical output: 20–30 KB — keeps 10-pair×2-side documents well under Firestore's 1MB limit.
 */
function compressImageSmall(file) {
    return _compressImageInternal(file, 600, 0.55);
}

function _compressImageInternal(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
                    else { width = Math.round(width * maxDim / height); height = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Called when a file is selected in an image file input.
 * Compresses and stores result in a hidden data field, updates preview.
 * preset='small' uses the tighter 600px/0.55 compressor (for pair images).
 */
window.handleImageFile = async (input, dataFieldId, previewId, preset) => {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('אנא בחר קובץ תמונה תקין', 'error'); return; }
    try {
        const dataUrl = preset === 'small'
            ? await compressImageSmall(file)
            : await compressImage(file);
        const dataField = document.getElementById(dataFieldId);
        if (dataField) dataField.value = dataUrl;
        const preview = document.getElementById(previewId);
        if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
        // clear URL field if exists
        const urlField = document.getElementById(dataFieldId + '_url');
        if (urlField) urlField.value = '';
    } catch (e) {
        console.error(e);
        showToast('שגיאה בעיבוד התמונה', 'error');
    }
};

/**
 * Called when a URL is typed in image URL input.
 * Downloads the image via proxy, converts to Base64 to bypass hotlinking, and stores it.
 */
const _urlDebounceTimers = {};
window.handleImageUrl = (urlFieldId, dataFieldId, previewId, preset) => {
    clearTimeout(_urlDebounceTimers[urlFieldId]);
    _urlDebounceTimers[urlFieldId] = setTimeout(async () => {
        const urlField = document.getElementById(urlFieldId);
        if (!urlField) return;
        const url = urlField.value.trim();
        const dataField = document.getElementById(dataFieldId);
        const preview = document.getElementById(previewId);

        if (!url) {
            if (dataField) dataField.value = '';
            if (preview) { preview.src = ''; preview.style.display = 'none'; }
            return;
        }

        if (!url.startsWith('http') && !url.startsWith('data:')) {
            return;
        }

        if (preview) { preview.style.opacity = '0.5'; }

        try {
            // First try loading via a CORS proxy to bypass restrictive servers (like wikis)
            let proxyUrl = url.startsWith('data:') ? url : `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const dataUrl = await fetchImageUrlAsBase64(proxyUrl, preset);

            if (dataField) dataField.value = dataUrl;
            if (preview) {
                preview.src = dataUrl;
                preview.style.display = 'block';
                preview.style.opacity = '1';
            }
            showToast('התמונה נטענה והומרה בהצלחה!', 'success');
        } catch (e) {
            console.error("URL Image fetch error:", e);
            showToast('שגיאה: הקישור חסום או לא תקין. נסה להוריד את התמונה ולהעלות אותה.', 'error', 5000);
            if (dataField) dataField.value = '';
            if (preview) { preview.src = ''; preview.style.display = 'none'; preview.style.opacity = '1'; }
        }
    }, 800);
};

async function fetchImageUrlAsBase64(url, preset) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const maxDim = preset === 'small' ? 600 : 800;
            const quality = preset === 'small' ? 0.55 : 0.72;
            let { width, height } = img;

            if (width > maxDim || height > maxDim) {
                if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
                else { width = Math.round(width * maxDim / height); height = maxDim; }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            try {
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new Error("Image load failed or blocked by CORS"));
        img.src = url;
    });
}

/**
 * Reads the final image value (Data URL or URL) from a data field.
 * Returns '' if empty.
 */
function getImageValue(dataFieldId) {
    const el = document.getElementById(dataFieldId);
    return el ? el.value.trim() : '';
}

/**
 * Toggles between Text and Image mode for a pair side.
 * prefix is like 'left-0' or 'right-2'.
 */
window.updateAllPairModes = () => {
    const rMode = document.getElementById('globalRightMode')?.value || 'text';
    const lMode = document.getElementById('globalLeftMode')?.value || 'text';

    const container = document.getElementById('pairsContainer');
    if (!container) return;
    const rows = container.querySelectorAll('.pair-row');
    rows.forEach(row => {
        const leftTextArea = row.querySelector('[id^="pair-text-area-left-"]');
        const leftImgArea = row.querySelector('[id^="pair-img-area-left-"]');
        if (leftTextArea && leftImgArea) {
            leftTextArea.style.display = rMode === 'text' ? 'block' : 'none';
            leftImgArea.style.display = rMode === 'text' ? 'none' : 'block';
        }

        const rightTextArea = row.querySelector('[id^="pair-text-area-right-"]');
        const rightImgArea = row.querySelector('[id^="pair-img-area-right-"]');
        if (rightTextArea && rightImgArea) {
            rightTextArea.style.display = lMode === 'text' ? 'block' : 'none';
            rightImgArea.style.display = lMode === 'text' ? 'none' : 'block';
        }
    });
};

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
        case 'ADMIN_LOGIN': html = renderAdminLogin(); break;
        case 'ADMIN_PANEL': html = renderAdminPanel(); break;
    }
    appContainer.innerHTML = html;
}

// --- SCREEN COMPONENTS ---
function renderWaitingScreen() {
    const playersArr = Object.entries(state.multiplayerPlayers).sort((a, b) => b[1].score - a[1].score);
    const leaderboardHtml = playersArr.map(([pName, pData], idx) => {
        const isMe = pName === state.myPlayerName;
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-coins"></i> ${pData.score} נק'` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : `${pData.score} נק'`;
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
            <b>חוקי הימור (פוקר):</b> כולם מתחילים עם 500 נק'. שלם 50 נק' כניסה (Ante), לאחר מכן תוכל להרים (Raise) או להתקפל (Fold). הראשון להגיע ל-1000 נק' מנצח! מי שענה נכון מחלק את הקופה שווה בשווה.
        </p>`;
    }

    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <h2 class="main-title" style="font-size: 26px; margin-top: 0; margin-bottom: 8px; text-align: center;">ממתין לשאר השחקנים...</h2>
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
                <button class="neo-button" style="height:60px; margin-top: 12px; background: #666; color: white;" onclick="navigate('ADMIN_LOGIN')">פאנל מנהל</button>
            </div>
        </div>`;
}

function renderModeSelect() {
    return `
        <div class="screen-wrapper">
            <h2 class="main-title">${getString('mode_title')}</h2>
            <div class="button-group">
                <button class="neo-button bg-indigo" style="height:60px;" onclick="setMode('CLASSIC', false)"><i class="uil uil-question mobile-cycle-1" style="font-size: 1.5em; vertical-align: middle;"></i> ${getString('mode_classic')}</button>
                <button class="neo-button bg-coral" style="height:60px; margin-top:12px;" onclick="setMode('CLIMB', false)"><i class="uil uil-mountains-sun mobile-cycle-2"></i> ${getString('mode_climb')}</button>
                <button class="neo-button bg-teal" style="height:60px; margin-top:12px; display:none;" onclick="setMode('BET_BURN', false)"><i class="uil uil-dollar-alt mobile-cycle-3"></i> ${getString('mode_bet')}</button>
                <button class="neo-button bg-multiplayer" style="height:60px; margin-top:12px;" onclick="setMode('MATCH_PAIRS', false)"><i class="uil uil-puzzle-piece mobile-cycle-4"></i> התאמת זוגות</button>
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
                <button class="neo-button bg-coral" style="height:60px; margin-top:12px;" onclick="setMode('CLIMB', true)"><i class="uil uil-mountains-sun mobile-cycle-2"></i> ${getString('mode_climb')}</button>
                <button class="neo-button bg-teal" style="height:60px; margin-top:12px;" onclick="setMode('BET_BURN', true)"><i class="uil uil-dollar-alt mobile-cycle-3"></i> ${getString('mode_bet')}</button>
                <button class="neo-button bg-multiplayer" style="height:60px; margin-top:12px;" onclick="setMode('MATCH_PAIRS', true)"><i class="uil uil-puzzle-piece mobile-cycle-4"></i> התאמת זוגות</button>
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
            <div class="question-layout-container ${q.mediaUrl ? 'has-image' : ''}">
                <h2 class="question-text" style="font-size: 24px; text-align: center; margin-bottom: 20px;">${qText}</h2>
                ${q.mediaUrl ? `
                <div class="question-layout-image">
                    <img class="trivia-question-image" src="${q.mediaUrl}" alt="תמונת שאלה" />
                </div>` : ''}
                <div class="question-layout-content">
                    ${generateOptionsHTML(opts)}
                    <div class="check-btn-wrapper">
                        <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''} 
                                onclick="checkAnswer()">${getString('check_btn')}</button>
                    </div>
                </div>
            </div>
        </div>`;
}

const BET_ANTE = 50;
const BET_WIN_TARGET = 1000;
const BET_START_SCORE = 500;

function renderBetBurn() {
    if (state.isWaitingForOthers) {
        return renderWaitingScreen();
    }

    if (state.playerFolded && state.roomPhase !== 'ANTE') {
        // Any player who folded during BETTING can re-enter if the other player places a bet
        const foldedList = state.roomFoldedPlayers || [];
        const iAmFolded = foldedList.includes(state.myPlayerName);
        const currentBet = state.roomCurrentBet || 0;
        const canReenter = iAmFolded
            && state.roomPhase === 'BETTING'
            && currentBet > 0
            && state.energy >= currentBet
            && !state.isLockedOut;

        return `
            <div class="screen-wrapper">
                <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:16px;">
                    <h2 class="main-title" style="text-align:center; margin-top:0;">התקפלת (Fold)</h2>
                    <div style="background:rgba(33,2,110,0.08); border-radius:16px; padding:16px 30px; font-size:20px; font-weight:bold; border:2px solid var(--vibrant-indigo); text-align:center;">
                        <i class="uil uil-coins" style="color:var(--vibrant-teal);"></i> הניקוד שלך: ${state.energy} נק'
                    </div>
                    ${canReenter ? `
                    <div style="background:linear-gradient(135deg,rgba(0,180,140,0.12),rgba(33,2,110,0.12)); border-radius:20px; padding:20px; width:100%; max-width:320px; border:2px solid var(--vibrant-teal); text-align:center;">
                        <div style="font-size:32px; margin-bottom:8px;">🔄</div>
                        <h3 style="margin:0 0 8px 0; font-size:20px;">הצטרף מחדש לסיבוב!</h3>
                        <p style="opacity:0.8; font-size:14px; margin-bottom:16px;">שחקן אחר הציב הימור. תוכל להשתוות ולהיכנס לסיבוב.</p>
                        <div style="background:rgba(0,0,0,0.07); border-radius:10px; padding:10px; margin-bottom:16px; font-size:18px; font-weight:bold;">
                            💰 עלות כניסה: <span style="color:var(--vibrant-coral);">${currentBet} נק'</span>
                        </div>
                        <button class="neo-button bg-teal" onclick="submitBettingAction('reenter', ${currentBet})">
                            ✅ הצטרף – שלם ${currentBet} נק'
                        </button>
                    </div>` : `
                    <p class="bold color-indigo" style="text-align:center; font-size:18px;">ממתין לסיום הסיבוב...</p>
                    <div class="loader"></div>`}
                </div>
            </div>`;
    }


    const q = state.currentPlayList[state.currentIndex];
    if (!q) return navigate('MENU');
    const qText = q.textMap[state.currentLang.code] || q.textMap["en"];
    const opts = q.optionsMap[state.currentLang.code] || q.optionsMap["en"];

    const playersArr = Object.entries(state.multiplayerPlayers || {});
    const playerStatusBar = `
        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:10px;">
            ${playersArr.map(([pName, pData]) => {
        const isMe = pName === state.myPlayerName;
        const folded = (state.roomFoldedPlayers || []).includes(pName);
        const committed = (state.playerBets || {})[pName] || 0;
        return `<div style="padding:4px 12px; border-radius:20px; font-size:13px; font-weight:bold;
                    background:${folded ? '#888' : isMe ? 'var(--vibrant-indigo)' : 'var(--vibrant-teal)'}; color:white;">
                    ${folded ? '❌' : '✅'} ${pName}: ${pData.score ?? 0} נק'${committed > 0 ? ` (+${committed})` : ''}
                </div>`;
    }).join('')}
        </div>`;

    let content = '';
    const headerBar = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center;
                    padding:8px 16px; background:rgba(33,2,110,0.08); border-radius:14px;
                    margin-bottom:10px; border:2px solid var(--vibrant-teal); box-sizing:border-box;">
            <div style="font-weight:bold; font-size:15px; color:var(--app-text);">
                <i class="uil uil-money-stack" style="color:var(--vibrant-teal);"></i> קופה: <b style="color:var(--vibrant-teal);">${state.roomPot}</b>
            </div>
            <div style="font-weight:bold; font-size:15px; color:var(--app-text);">
                <i class="uil uil-coins" style="color:var(--vibrant-coral);"></i> הניקוד שלך: <b style="color:var(--vibrant-coral);">${state.energy}</b>
            </div>
        </div>`;

    if (state.roomPhase === 'ANTE') {
        const hasEnough = state.energy >= BET_ANTE;
        content = `
            ${headerBar}
            ${playerStatusBar}
            <div style="background:linear-gradient(135deg,rgba(33,2,110,0.07),rgba(0,180,140,0.07)); border-radius:20px; padding:24px 20px; width:100%; max-width:340px; margin:0 auto; border:2px solid var(--app-text); text-align:center;">
                <div style="font-size:48px; margin-bottom:8px;">🎲</div>
                <h2 style="font-size:26px; margin:0 0 8px 0;">שלב הפתיחה (Ante)</h2>
                <p style="opacity:0.8; font-size:15px; margin-bottom:20px;">שלם ${BET_ANTE} נק' כדי להיכנס לסיבוב הבא, או התקפל וחסוך אותם.</p>
                <div style="background:rgba(33,2,110,0.1); border-radius:12px; padding:12px; margin-bottom:20px; font-size:18px; font-weight:bold;">
                    💰 עלות כניסה: <span style="color:var(--vibrant-coral);">${BET_ANTE} נק'</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <button class="neo-button ${hasEnough ? 'bg-coral' : ''}" ${!hasEnough ? 'disabled' : ''} onclick="submitAnte(true)">
                        ✅ שלם ${BET_ANTE} נק' והמשך
                    </button>
                    <button class="neo-button" style="background:#555; color:white;" onclick="submitAnte(false)">
                        ❌ התקפל (Fold)
                    </button>
                </div>
            </div>`;

    } else if (state.roomPhase === 'BETTING') {
        const foldedList = state.roomFoldedPlayers || [];
        const activePlayers = playersArr.filter(([n]) => !foldedList.includes(n));
        const minBalance = activePlayers.length > 0
            ? Math.min(...activePlayers.map(([, p]) => p.score ?? 0))
            : state.energy;
        const currentBettor = state.bettingOrder[state.currentBettorIndex] || '';
        const isMyTurn = currentBettor === state.myPlayerName;
        const myCommitted = (state.playerBets || {})[state.myPlayerName] || 0;
        const currentBet = state.roomCurrentBet || 0;
        const toCall = Math.max(0, currentBet - myCommitted);
        const maxAdd = Math.max(0, minBalance - currentBet); // max raise above current bet
        const betInput = parseInt(state.userBetInput);
        const isOpeningBet = currentBet === 0; // no one has bet yet

        // Player status row — show everyone's commitment
        const fullStatusBar = `
            <div style="display:flex; flex-wrap:wrap; gap:5px; justify-content:center; margin-bottom:10px;">
                ${playersArr.map(([pName, pData]) => {
            const isTurn = pName === currentBettor;
            const fld = foldedList.includes(pName);
            const committed = (state.playerBets || {})[pName] || 0;
            const acted = (state.bettingActed || []).includes(pName);
            return `<div style="padding:5px 10px; border-radius:20px; font-size:12px; font-weight:bold; border:2px solid ${isTurn ? 'var(--vibrant-coral)' : 'transparent'};
                        background:${fld ? '#888' : isTurn ? 'var(--vibrant-coral)' : acted ? 'var(--vibrant-teal)' : 'var(--vibrant-indigo)'}; color:white;">
                        ${fld ? '\u274c' : isTurn ? '\u23f3' : '\u2705'} ${pName}<br/>
                        <span style="font-size:11px; opacity:0.85;">${pData.score ?? 0} נק' | הימור: ${committed}</span>
                    </div>`;
        }).join('')}
            </div>`;

        if (!isMyTurn) {
            // Waiting for another player to act
            content = `
                ${headerBar}
                ${fullStatusBar}
                <div style="background:rgba(33,2,110,0.07); border-radius:20px; padding:24px; width:100%; max-width:340px; margin:0 auto; border:2px solid var(--vibrant-indigo); text-align:center;">
                    <h2 style="font-size:20px; margin:0 0 8px 0;">${qText}</h2>
                    ${q.mediaUrl ? `<img class="trivia-question-image" src="${q.mediaUrl}" alt="" style="margin-bottom:12px;" />` : ''}
                    <div style="font-size:36px; margin:12px 0;">\u23f3</div>
                    <p style="font-weight:bold; font-size:18px; margin:0 0 6px 0;">ממתין ל-<span style="color:var(--vibrant-coral);">${currentBettor}</span>...</p>
                    <p style="opacity:0.7; font-size:14px;">הימור נוכחי: <b>${currentBet} נק'</b></p>
                </div>`;
        } else {
            // It's my turn to act
            const isValidBetInput = !isNaN(betInput) && betInput > 0 && betInput <= maxAdd;
            const canCall = toCall <= state.energy && toCall > 0;

            content = `
                ${headerBar}
                ${fullStatusBar}
                <div style="background:rgba(0,0,0,0.03); border-radius:20px; padding:18px; width:100%; max-width:340px; margin:0 auto; border:3px solid var(--vibrant-coral);">
                    <div style="background:var(--vibrant-coral); color:white; border-radius:10px; padding:6px 12px; font-size:13px; font-weight:bold; text-align:center; margin-bottom:12px;">\u23f0 התור שלך לפעול!</div>
                    <h2 style="font-size:19px; margin:0 0 6px 0; text-align:center;">${qText}</h2>
                    ${q.mediaUrl ? `<img class="trivia-question-image" src="${q.mediaUrl}" alt="" style="margin-bottom:10px;" />` : ''}
                    <div style="font-size:13px; background:rgba(33,2,110,0.07); border-radius:8px; padding:8px 12px; margin-bottom:12px; display:flex; justify-content:space-between;">
                        <span>הימור כולל: <b>${currentBet}</b></span>
                        <span>שלמת: <b>${myCommitted}</b></span>
                        <span>היתרה: <b>${state.energy}</b></span>
                    </div>

                    ${isOpeningBet ? `
                    <!-- No bet yet: Check or Bet -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="neo-button bg-teal" onclick="submitBettingAction('check', 0)">\u2714\ufe0f צ'ק (המשך בלי הימור)</button>
                        <div style="border-top:1px solid rgba(0,0,0,0.1); padding-top:10px;">
                            <p style="font-size:13px; opacity:0.7; margin:0 0 6px 0;">פתח הימור (מקסימום ${maxAdd} נק'):</p>
                            <input type="number" class="neo-input bet-input" min="1" max="${maxAdd}"
                                   value="${state.userBetInput}" oninput="updateBet(this.value)"
                                   placeholder="סכום" style="text-align:center; font-size:26px; font-weight:bold; margin-bottom:8px;">
                            <div style="display:flex; gap:6px; margin-bottom:8px;">
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${Math.floor(maxAdd * 0.25)}')">25%</button>
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${Math.floor(maxAdd * 0.5)}')">50%</button>
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${Math.floor(maxAdd * 0.75)}')">75%</button>
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${maxAdd}')">MAX</button>
                            </div>
                            <button class="neo-button ${isValidBetInput ? 'bg-indigo' : ''}" ${!isValidBetInput ? 'disabled' : ''}
                                    onclick="submitBettingAction('bet', ${!isNaN(betInput) ? betInput : 0})">
                                \ud83d\udcc8 הימור ${!isNaN(betInput) && betInput > 0 ? betInput : '?'} נק'
                            </button>
                        </div>
                    </div>` : `
                    <!-- Someone bet: Call / Raise / Fold -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="neo-button bg-teal" ${!canCall ? 'disabled' : ''} onclick="submitBettingAction('call', ${toCall})">
                            \ud83d\udcde Call – שלם ${toCall} נק' (סה"כ ${currentBet})
                        </button>
                        ${maxAdd > 0 ? `
                        <div style="border-top:1px solid rgba(0,0,0,0.1); padding-top:10px;">
                            <p style="font-size:13px; opacity:0.7; margin:0 0 6px 0;">הרם מעל ${currentBet} (עד ${currentBet + maxAdd} נק'):</p>
                            <input type="number" class="neo-input bet-input" min="1" max="${maxAdd}"
                                   value="${state.userBetInput}" oninput="updateBet(this.value)"
                                   placeholder="סכום להרמה" style="text-align:center; font-size:24px; font-weight:bold; margin-bottom:8px;">
                            <div style="display:flex; gap:6px; margin-bottom:8px;">
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${Math.floor(maxAdd * 0.25)}')">+25%</button>
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${Math.floor(maxAdd * 0.5)}')">+50%</button>
                                <button class="neo-button" style="flex:1; padding:6px 2px; font-size:12px;" onclick="updateBet('${maxAdd}')">MAX</button>
                            </div>
                            <button class="neo-button ${isValidBetInput ? 'bg-indigo' : ''}" ${!isValidBetInput ? 'disabled' : ''}
                                    onclick="submitBettingAction('raise', ${!isNaN(betInput) ? betInput : 0})">
                                \ud83d\udcc8 Raise +${!isNaN(betInput) && betInput > 0 ? betInput : '?'} נק'
                            </button>
                        </div>` : ''}
                        <div style="border-top:1px solid rgba(0,0,0,0.1); padding-top:10px;">
                            <button class="neo-button" style="background:#555; color:white;" onclick="submitBettingAction('fold', 0)">\u274c Fold – התקפל</button>
                        </div>
                    </div>`}
                </div>`;
        }

    } else if (state.roomPhase === 'ANSWERING') {
        if (state.isLockedOut) {
            content = `
                ${headerBar}
                ${playerStatusBar}
                <div style="margin-top:20px; display:flex; flex-direction:column; align-items:center;">
                    <h2 style="font-size: 22px; text-align:center; margin-bottom: 20px;">${qText}</h2>
                    <div style="background:var(--wrong-color); color:white; padding:20px; border-radius:16px; text-align:center; max-width:300px;">
                        <i class="uil uil-times-circle" style="font-size:48px;"></i>
                        <h3 style="margin-top:10px;">תשובה שגויה!</h3>
                        <p style="opacity:0.9;">ממתין לסיום הסיבוב...</p>
                    </div>
                </div>
            `;
        } else {
            if (state.isMultiplayer && !state.isAnimatingResult && !state.timerInterval) {
                startQuestionTimer();
            }

            content = `
                ${headerBar}
                ${playerStatusBar}
                <div style="width:100%; display: flex; flex-direction: column; flex: 1;">
                    <div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;"><i class="uit uit-hourglass"></i> ${state.questionTimer}s</div>
                    <div class="spacer-sm"></div>
                    <div class="question-layout-container ${q.mediaUrl ? 'has-image' : ''}" style="margin-top:10px; flex: 1;">
                        <h2 class="question-text" style="font-size: 24px; text-align:center; margin-bottom: 20px;">${qText}</h2>
                        ${q.mediaUrl ? `
                        <div class="question-layout-image">
                            <img class="trivia-question-image" src="${q.mediaUrl}" alt="תמונת שאלה" />
                        </div>` : ''}
                        <div class="question-layout-content">
                            ${generateOptionsHTML(opts)}
                            <div class="check-btn-wrapper">
                                <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''} 
                                        onclick="checkBetAnswerMultiplayer()">${getString('check_btn')}</button>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
    }

    return `
        <div class="screen-wrapper">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
            <div style="flex:1; display:flex; flex-direction:column; align-items:flex-start; padding:8px; position:relative; width:100%; box-sizing:border-box; overflow-y:auto;">
                ${content}
            </div>
        </div>`;
}

function buildMountainSVG(rank, oldRank, animateClass, oppRank = -1, oldOppRank = -1, oppAnimateClass = '', isMultiplayer = false, isHost = true) {
    function getClimberHtml(r, oldR, anim, side) {
        if (r < 0 && oldR < 0) return '';
        const t = Math.max(0, r) / 10;
        let newX, newY, oldX, oldY;

        const actualOldR = oldR !== undefined ? oldR : r;
        const tOld = Math.max(0, actualOldR) / 10;

        if (side === 'left') {
            newX = 20 + 240 * t;
            newY = 220 - 192 * t;
            oldX = 20 + 240 * tOld;
            oldY = 220 - 192 * tOld;
        } else {
            newX = 500 - 240 * t;
            newY = 220 - 192 * t;
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

    let leftRank, leftOldRank, leftAnimate, rightRank, rightOldRank, rightAnimate;
    if (isMultiplayer) {
        if (isHost) {
            leftRank = rank;
            leftOldRank = oldRank;
            leftAnimate = animateClass;
            rightRank = oppRank;
            rightOldRank = oldOppRank;
            rightAnimate = oppAnimateClass;
        } else {
            rightRank = rank;
            rightOldRank = oldRank;
            rightAnimate = animateClass;
            leftRank = oppRank;
            leftOldRank = oldOppRank;
            leftAnimate = oppAnimateClass;
        }
    } else {
        leftRank = rank;
        leftOldRank = oldRank;
        leftAnimate = animateClass;
        rightRank = -1;
        rightOldRank = -1;
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

    const climberLeft = getClimberHtml(leftRank, leftOldRank, leftAnimate, 'left');
    const climberRight = getClimberHtml(rightRank, rightOldRank, rightAnimate, 'right');

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
            ${buildMountainSVG(state.rank, state.rank, '', oppRank, oppRank, '', state.isMultiplayer, state.isHost)}

            <div class="spacer-md"></div>
            ${state.isMultiplayer ? `<div class="timer" style="font-size:32px; font-weight:bold; color:var(--vibrant-coral); text-align:center;"><i class="uit uit-hourglass"></i> ${state.questionTimer}s</div><div class="spacer-md"></div>` : ''}
            <div class="${panelAnimClass} question-layout-container ${q.mediaUrl ? 'has-image' : ''}">
                <h2 class="question-text" style="font-size: 24px; text-align:center; margin-bottom: 20px;">${qText}</h2>
                ${q.mediaUrl ? `
                <div class="question-layout-image">
                    <img class="trivia-question-image" src="${q.mediaUrl}" alt="תמונת שאלה" />
                </div>` : ''}
                <div class="question-layout-content">
                    ${generateOptionsHTML(opts)}
                    <div class="check-btn-wrapper">
                        <button class="neo-button bg-coral" ${!state.selectedOption || state.isAnimatingResult ? 'disabled' : ''}
                                onclick="checkClimbAnswer()">${getString('check_btn')}</button>
                    </div>
                </div>
            </div>
        </div>`;
}


function renderClimbResult() {
    let oppRank = -1;
    let oppOldRank = -1;
    let oppAnimClass = '';

    if (state.isMultiplayer && state.multiplayerPlayers) {
        const players = Object.entries(state.multiplayerPlayers);
        const opp = players.find(([name]) => name !== state.myPlayerName);
        if (opp) {
            oppRank = opp[1].score;
            oppOldRank = state.oldOppRank !== undefined ? state.oldOppRank : oppRank;
            oppAnimClass = oppRank > oppOldRank ? 'climber-up' : (oppRank < oppOldRank ? 'climber-down' : '');
        }
    }

    const won = state.isMultiplayer ? (state.rank > state.oldRank) : (state.climbLastResult === 'up');
    let label = won ? 'נכון! הצלחת לעלות רמה!' : 'לא נכון. ירדת רמה';
    if (state.isMultiplayer && (state.rank - state.oldRank === 2)) {
        label = '⚡ היית מהיר! עלית 2 רמות!';
    }
    const animClass = state.isMultiplayer ? (state.rank > state.oldRank ? 'climber-up' : (state.rank < state.oldRank ? 'climber-down' : '')) : (won ? 'climber-up' : 'climber-down');

    if (!state.climbResultTimeoutActive) {
        state.climbResultTimeoutActive = true;
        const isGameOver = (!state.isMultiplayer && (state.rank >= 10 || state.rank < 0)) || (state.isMultiplayer && state.pendingClimbFinished);

        setTimeout(() => {
            state.climbResultTimeoutActive = false;
            const wrapper = document.querySelector('.screen-wrapper');
            if (wrapper) wrapper.classList.add('climb-exit');

            setTimeout(async () => {
                if (state.pendingQuestionIndex !== undefined) {
                    state.currentIndex = state.pendingQuestionIndex;
                    state.pendingQuestionIndex = undefined;
                }

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
                    if (state.timerInterval && state.isMultiplayer) { clearQuestionTimer(); startQuestionTimer(); }
                    navigate('PLAYING_CLIMB');
                }
            }, 300);
        }, 2500);
    }

    return `
        <div class="screen-wrapper climb-enter" style="padding: 0; overflow: hidden; align-items:center; justify-content:center;">
            <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px 0;">
                
                <h1 style="font-size: 28px; color: var(--app-text); text-align: center; margin-bottom: 30px;">
                    ${label}
                </h1>
                
                <!-- Mountain SVG -->
                <div style="width: 100%; max-width: 600px; padding: 0 16px;">
                    ${buildMountainSVG(state.rank, state.oldRank, animClass, oppRank, oppOldRank, oppAnimClass, state.isMultiplayer, state.isHost)}
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
            lefts: shuffleArray(pairs.map((p, idx) => ({ text: p.left || null, img: p.leftImg || null, id: idx, matched: false }))),
            rights: shuffleArray(pairs.map((p, idx) => ({ text: p.right || null, img: p.rightImg || null, id: idx, matched: false })))
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
        const content = item.img
            ? `<img class="match-item-img" src="${item.img}" alt="" />`
            : (item.text || '');
        return `<div class="${cls}" id="match-left-${i}" 
                onclick="${item.matched ? '' : `selectMatch('left', ${i})`}">${content}</div>`;
    }).join('');

    let rightColHtml = pool.rights.map((item, i) => {
        let cls = 'match-item';
        if (item.matched) cls += ' matched';
        else if (state.matchSelections.right === i) cls += ' selected';
        if (state.matchErrorRight === i) cls += ' error';
        const content = item.img
            ? `<img class="match-item-img" src="${item.img}" alt="" />`
            : (item.text || '');
        return `<div class="${cls}" id="match-right-${i}" 
                onclick="${item.matched ? '' : `selectMatch('right', ${i})`}">${content}</div>`;
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
        if (typeof playSfx !== 'undefined') playSfx('correct');
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
        if (typeof playSfx !== 'undefined') playSfx('wrong');
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
        headline = state.energy >= 1000 ? '🏆 הגעת ל-1000!' : getString('game_over');
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
    if (window._pairRowCounter === undefined) window._pairRowCounter = 0;
    const idx = window._pairRowCounter++;
    const row = document.createElement('div');
    row.innerHTML = buildPairRowHtml(idx);
    const actualRow = row.firstElementChild;
    if (afterRow && afterRow.nextSibling) {
        container.insertBefore(actualRow, afterRow.nextSibling);
    } else {
        container.appendChild(actualRow);
    }
    window.updatePairButtons();
    window.updateAllPairModes();
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

function buildPairRowHtml(idx) {
    return `
    <div class="pair-row" style="display:flex; gap:8px; margin-bottom:12px; align-items:flex-start;">
        <!-- LEFT SIDE -->
        <div style="flex:1; display:flex; flex-direction:column;">
            <div id="pair-text-area-left-${idx}">
                <input type="text" class="neo-input match-left" placeholder="צד ימין" style="margin-bottom:0;">
            </div>
            <div id="pair-img-area-left-${idx}" style="display:none;">
                <input type="hidden" class="match-left-img" id="pair-img-data-left-${idx}">
                <label class="img-file-label">
                    <input type="file" accept="image/*" onchange="window.handleImageFile(this,'pair-img-data-left-${idx}','pair-img-prev-left-${idx}','small')">
                    📷 בחר תמונה
                </label>
                <input type="text" id="pair-img-data-left-${idx}_url" class="neo-input" placeholder="או הכנס URL תמונה" style="margin-top:4px; margin-bottom:0; font-size:13px;" oninput="window.handleImageUrl('pair-img-data-left-${idx}_url','pair-img-data-left-${idx}','pair-img-prev-left-${idx}')">
                <img id="pair-img-prev-left-${idx}" class="img-preview-thumb" alt="תצוגה מקדימה">
            </div>
        </div>
        <!-- RIGHT SIDE -->
        <div style="flex:1; display:flex; flex-direction:column;">
            <div id="pair-text-area-right-${idx}">
                <input type="text" class="neo-input match-right" placeholder="צד שמאל" style="margin-bottom:0;">
            </div>
            <div id="pair-img-area-right-${idx}" style="display:none;">
                <input type="hidden" class="match-right-img" id="pair-img-data-right-${idx}">
                <label class="img-file-label">
                    <input type="file" accept="image/*" onchange="window.handleImageFile(this,'pair-img-data-right-${idx}','pair-img-prev-right-${idx}','small')">
                    📷 בחר תמונה
                </label>
                <input type="text" id="pair-img-data-right-${idx}_url" class="neo-input" placeholder="או הכנס URL תמונה" style="margin-top:4px; margin-bottom:0; font-size:13px;" oninput="window.handleImageUrl('pair-img-data-right-${idx}_url','pair-img-data-right-${idx}','pair-img-prev-right-${idx}')">
                <img id="pair-img-prev-right-${idx}" class="img-preview-thumb" alt="תצוגה מקדימה">
            </div>
        </div>
    </div>`;
}

function renderAddQuestion() {
    // Generate radio buttons for categories
    const cats = categoryList.map(c =>
        `<label style="margin-right: 16px; font-weight: bold; cursor: pointer; color: var(--deep-indigo);">
            <input type="radio" name="newQCategory" value="${c}" ${c === 'Anime' ? 'checked' : ''}> ${c}
         </label>`
    ).join('');

    let initialPairs = '';
    for (let i = 0; i < 5; i++) {
        initialPairs += buildPairRowHtml(i);
    }

    // Track next pair index for dynamic adds
    window._pairRowCounter = 5;

    setTimeout(window.updatePairButtons, 0);

    return `
        <div class="screen-wrapper" style="align-items: center; padding-bottom: 40px;">
            <h2 class="main-title" style="margin-top: 0;">הוסף שאלה חדשה</h2>
            
            <div style="width: 100%; max-width: 440px; text-align: right;">
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

                <!-- ══ TRIVIA FIELDS ══ -->
                <div id="triviaFields">
                    <label class="bold">טקסט השאלה</label>
                    <input type="text" id="newQText" class="neo-input" placeholder="לדוגמא, מי היוצר של וואן פיס?">
                    
                    <label class="bold">תמונה לשאלה (לא חובה)</label>
                    <input type="hidden" id="triviaImgData">
                    <label class="img-file-label">
                        <input type="file" accept="image/*" onchange="window.handleImageFile(this,'triviaImgData','triviaImgPreview')">
                        📷 בחר תמונה מהמכשיר
                    </label>
                    <input type="text" id="triviaImgData_url" class="neo-input" placeholder="או הכנס URL של תמונה" style="font-size:13px; margin-top:4px;" oninput="window.handleImageUrl('triviaImgData_url','triviaImgData','triviaImgPreview')">
                    <img id="triviaImgPreview" class="img-preview-thumb" alt="תצוגה מקדימה">
                    
                    <label class="bold" style="margin-top:8px;">אפשרויות (4)</label>
                    <input type="text" id="newQOpt1" class="neo-input" placeholder="אפשרות 1" oninput="updateCorrectDropdown()">
                    <input type="text" id="newQOpt2" class="neo-input" placeholder="אפשרות 2" oninput="updateCorrectDropdown()">
                    <input type="text" id="newQOpt3" class="neo-input" placeholder="אפשרות 3" oninput="updateCorrectDropdown()">
                    <input type="text" id="newQOpt4" class="neo-input" placeholder="אפשרות 4" oninput="updateCorrectDropdown()">
                    
                    <label class="bold">תשובה נכונה</label>
                    <select id="newQCorrect" class="neo-input" style="height: 58px; font-weight: bold; background-color: var(--white); -webkit-appearance: listbox;">
                        <option value="">-- בחר את התשובה הנכונה --</option>
                    </select>
                </div>

                <!-- ══ MATCH PAIR FIELDS ══ -->
                <div id="matchFields" style="display: none;">
                    <label class="bold">זוגות להתאמה (מינימום 5)</label>
                    <p style="font-size:13px; opacity:0.7; margin-bottom:10px;">בחר האם הצדדים הם טקסט או תמונה עבור כל השאלה:</p>
                    
                    <div style="display:flex; gap: 12px; margin-bottom: 16px;">
                        <div style="flex:1;">
                            <label class="bold">סוג צד ימין</label>
                            <select id="globalRightMode" class="neo-input" onchange="window.updateAllPairModes()" style="margin-bottom:0; background:var(--white);">
                                <option value="text">טקסט</option>
                                <option value="image">תמונה</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label class="bold">סוג צד שמאל</label>
                            <select id="globalLeftMode" class="neo-input" onchange="window.updateAllPairModes()" style="margin-bottom:0; background:var(--white);">
                                <option value="text">טקסט</option>
                                <option value="image">תמונה</option>
                            </select>
                        </div>
                    </div>

                    <div id="pairsContainer">
                        ${initialPairs}
                    </div>
                    <button class="neo-button bg-multiplayer" id="mainAddPairBtn" style="height: 40px; padding: 0; margin-top: 10px;" onclick="window.addPairRow()">+ הוסף זוג</button>
                </div>

                <!-- ══ HANGMAN FIELDS ══ -->
                <div id="hangmanFields" style="display: none;">
                    <label class="bold">מילה או ביטוי להגמן (עד 20 תווים)</label>
                    <input type="text" id="newHangmanWord" class="neo-input" placeholder="לדוגמא, ONE PIECE או וואן פיס" style="text-transform: uppercase;" maxlength="20">
                    
                    <label class="bold">תמונת רמז (לא חובה)</label>
                    <input type="hidden" id="hangmanImgData">
                    <label class="img-file-label">
                        <input type="file" accept="image/*" onchange="window.handleImageFile(this,'hangmanImgData','hangmanImgPreview')">
                        📷 בחר תמונה מהמכשיר
                    </label>
                    <input type="text" id="hangmanImgData_url" class="neo-input" placeholder="או הכנס URL של תמונה" style="font-size:13px; margin-top:4px;" oninput="window.handleImageUrl('hangmanImgData_url','hangmanImgData','hangmanImgPreview')">
                    <img id="hangmanImgPreview" class="img-preview-thumb" alt="תצוגה מקדימה">
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

async function filterContentWithAgent(contentData) {
    if (!window.functions || !window.httpsCallable) {
        console.warn("Firebase Functions not initialized");
        return "REJECT";
    }
    try {
        const checkQuestion = window.httpsCallable(window.functions, 'checkQuestionWithAgent');
        const result = await checkQuestion(contentData);
        return result.data.status || "REJECT";
    } catch (e) {
        console.error("Cloud function error:", e);
        return "REJECT"; // Fail closed
    }
}

async function saveNewQuestion() {
    const category = document.querySelector('input[name="newQCategory"]:checked').value;
    const qType = document.getElementById('newQType').value;
    const src = state.currentLang.code;
    const mode = state.verificationMode || 'AI_ONLY';
    const needsAI = mode === 'AI_ONLY' || mode === 'BOTH';
    const needsManual = mode === 'MANUAL_ONLY' || mode === 'BOTH';

    // UI Feedback
    const btn = document.getElementById('saveQBtn');
    btn.innerText = "מתרגם ושומר...";
    btn.disabled = true;

    try {
        let newQuestion = { category, type: qType };

        if (qType === 'trivia') {
            const qText = document.getElementById('newQText').value.trim();
            const qMediaUrl = getImageValue('triviaImgData');
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

            if (needsAI) {
                btn.innerText = "בודק תוכן בענן...";
                const agentStatus = await filterContentWithAgent({
                    type: 'trivia', text: qText, options: opts, mediaUrl: qMediaUrl
                });
                if (agentStatus === "REJECT") {
                    showToast("השאלה נחסמה: זוהה תוכן לא הולם (מילים פוגעניות או תמונות)", "error", 5000);
                    btn.innerText = "שמור שאלה"; btn.disabled = false;
                    return;
                }
            }
            btn.innerText = "מתרגם ושומר...";

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
            if (qMediaUrl) newQuestion.mediaUrl = qMediaUrl;

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

            if (needsAI) {
                btn.innerText = "בודק תוכן בענן...";
                const hangmanImgUrlForCheck = getImageValue('hangmanImgData');
                const agentStatus = await filterContentWithAgent({
                    type: 'hangman', word: word, mediaUrl: hangmanImgUrlForCheck
                });
                if (agentStatus === "REJECT") {
                    showToast("הביטוי נחסם: זוהה תוכן לא הולם", "error", 5000);
                    btn.innerText = "שמור שאלה"; btn.disabled = false;
                    return;
                }
            }
            btn.innerText = "מתרגם ושומר...";

            const hangmanImgUrl = getImageValue('hangmanImgData');
            const docData = {
                word: word,
                category: category,
                lang: state.currentLang.code,
                addedAt: window.serverTimestamp()
            };
            if (hangmanImgUrl) docData.imageUrl = hangmanImgUrl;
            if (needsManual) {
                await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...docData, targetCollection: "hangmanWords" });
                showToast("✅ נשלח לאישור מנהל!", 'success', 3500);
            } else {
                await window.addDoc(window.collection(window.db, "hangmanWords"), docData);
                showToast("✅ מילת ההגמן נשמרה בהצלחה!", 'success', 3500);
            }
            navigate('MENU');
            return;

        } else if (qType === 'match_pair') {
            // Collect pairs: each row has either text or image per side
            const rows = document.querySelectorAll('.pair-row');
            const rawPairs = [];
            rows.forEach(row => {
                const leftText = row.querySelector('.match-left')?.value.trim() || '';
                const leftImg = row.querySelector('.match-left-img')?.value.trim() || '';
                const rightText = row.querySelector('.match-right')?.value.trim() || '';
                const rightImg = row.querySelector('.match-right-img')?.value.trim() || '';

                const leftVal = leftImg || leftText;
                const rightVal = rightImg || rightText;
                const leftIsImg = !!leftImg;
                const rightIsImg = !!rightImg;

                if (leftVal && rightVal) {
                    rawPairs.push({
                        left: leftIsImg ? null : leftVal, leftImg: leftIsImg ? leftVal : null,
                        right: rightIsImg ? null : rightVal, rightImg: rightIsImg ? rightVal : null
                    });
                }
            });

            if (rawPairs.length < 5) {
                showToast("יש להזין לפחות 5 זוגות מלאים!", 'error');
                btn.innerText = "שמור שאלה"; btn.disabled = false;
                return;
            }

            // Build pairs list for AI moderation including images
            const pairsForAI = rawPairs.map(p => ({
                left: p.left || null, leftImg: p.leftImg || null,
                right: p.right || null, rightImg: p.rightImg || null
            }));

            if (needsAI) {
                btn.innerText = "בודק תוכן בענן...";
                const agentStatus = await filterContentWithAgent({
                    type: 'match_pair', pairs: pairsForAI
                });
                if (agentStatus === "REJECT") {
                    showToast("הזוגות נחסמו: זוהה תוכן לא הולם", "error", 5000);
                    btn.innerText = "שמור שאלה"; btn.disabled = false;
                    return;
                }
            }
            btn.innerText = "מתרגם ושומר...";

            // Translate text sides only; image sides stay as-is
            const translatedPairs = await Promise.all(rawPairs.map(async p => {
                const tLeft = p.left ? await translateToAllLangs(p.left, src) : null;
                const tRight = p.right ? await translateToAllLangs(p.right, src) : null;
                return { leftMap: tLeft, leftImg: p.leftImg, rightMap: tRight, rightImg: p.rightImg };
            }));

            // pairsMap: { en: [{left, leftImg, right, rightImg}], he: [...], ... }
            const pairsMap = { en: [], he: [], ar: [], ru: [] };
            translatedPairs.forEach(tp => {
                ['en', 'he', 'ar', 'ru'].forEach(lang => {
                    pairsMap[lang].push({
                        left: tp.leftMap ? tp.leftMap[lang] : null,
                        leftImg: tp.leftImg || null,
                        right: tp.rightMap ? tp.rightMap[lang] : null,
                        rightImg: tp.rightImg || null
                    });
                });
            });

            newQuestion.pairsMap = pairsMap;
        }

        // Save to Firebase Firestore
        if (needsManual) {
            await window.addDoc(window.collection(window.db, "pendingQuestions"), { ...newQuestion, targetCollection: "questions" });
            showToast("✅ נשלח לאישור מנהל!", 'success', 3500);
        } else {
            await window.addDoc(window.collection(window.db, "questions"), newQuestion);
            showToast("✅ השאלה תורגמה ונשמרה בהצלחה!", 'success', 3500);
        }
        navigate('MENU');

    } catch (error) {
        console.error("Error saving question:", error);
        showToast("שגיאה בשמירת השאלה: " + error.message, 'error', 5000);
        btn.innerText = "שמור שאלה"; btn.disabled = false;
    }
}

function initDB() {
    if (!window.db) return;
    window.onSnapshot(window.doc(window.db, "system", "config"), (docSnap) => {
        if (docSnap.exists()) {
            state.verificationMode = docSnap.data().verificationMode || "AI_ONLY";
        } else {
            state.verificationMode = "AI_ONLY";
        }
    });
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
    state.energy = (savedEnergy && savedEnergy > 0) ? savedEnergy : 200;
    localStorage.setItem('otakuBetBurnEnergy', state.energy);

    state.rank = 0; state.climbLastResult = null;
    state.currentPhase = 'BETTING'; state.userBetInput = '';
    state.selectedOption = null;
    state.isWaitingForOthers = false;

    // Poker states
    state.roomPot = 0;
    state.roomPhase = 'ANTE';
    state.playerFolded = false;
    state.isLockedOut = false;

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
    state.userBetInput = String(val);
    render(); // re-render so lock button reacts to new value
};
window.lockInBet = () => { state.currentPhase = 'ANSWERING'; render(); };

window.checkAnswer = () => {
    clearQuestionTimer();

    const q = state.currentPlayList[state.currentIndex];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    if (typeof playSfx !== 'undefined') {
        if (isCorrect) playSfx('correct'); else playSfx('wrong');
    }
    render();

    setTimeout(async () => {
        state.isAnimatingResult = false;

        if (state.isMultiplayer && state.selectedMode === 'CLASSIC') {
            try {
                state.isWaitingForOthers = true;
                render();
                await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                    [`answers.${state.myPlayerName}`]: { isCorrect, time: Date.now() }
                });
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
            const timerEl = document.querySelector('.timer');
            if (timerEl) {
                timerEl.innerHTML = `<i class="uit uit-hourglass"></i> ${state.questionTimer}s`;
            }
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
    if (typeof playSfx !== 'undefined') {
        if (isCorrect) playSfx('correct'); else playSfx('wrong');
    }
    render();

    setTimeout(() => {
        const finalizeAndNavigate = async () => {
            state.isAnimatingResult = false;
            state.climbResultTimeoutActive = false;
            state.oldRank = state.rank;
            if (state.isMultiplayer && state.multiplayerPlayers) {
                const oppName = Object.keys(state.multiplayerPlayers).find(n => n !== state.myPlayerName);
                if (oppName) {
                    state.oldOppRank = state.multiplayerPlayers[oppName].score || 0;
                }
            }

            if (!state.isMultiplayer) {
                if (isCorrect) {
                    state.rank = Math.min(10, state.rank + 1);
                    state.climbLastResult = 'up';
                } else {
                    state.rank = Math.max(-1, state.rank - 1);
                    state.climbLastResult = 'down';
                }
                state.currentIndex++;
                navigate('CLIMB_RESULT');
            } else {
                if (isCorrect) {
                    state.climbLastResult = 'up';
                } else {
                    state.climbLastResult = 'down';
                }
                try {
                    state.isWaitingForOthers = true;
                    render();
                    let payload = {
                        [`answers.${state.myPlayerName}`]: { isCorrect, time: Date.now() }
                    };
                    await window.updateDoc(window.doc(window.db, "rooms", state.roomId), payload);
                } catch (e) { console.error("Error syncing answer:", e); }
            }
        };

        const wrapper = document.querySelector('.screen-wrapper');
        if (wrapper && !state.isMultiplayer) {
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
    if (typeof playSfx !== 'undefined') {
        if (isCorrect) playSfx('correct'); else playSfx('wrong');
    }
    render();

    setTimeout(async () => {
        state.isAnimatingResult = false;

        if (isCorrect) {
            state.energy += bet;
        } else {
            state.energy -= bet;
        }

        localStorage.setItem('otakuBetBurnEnergy', state.energy);

        if (state.energy <= 0 || state.energy >= 1000) {
            navigate('GAME_OVER');
        } else {
            state.userBetInput = '';
            state.selectedOption = null;
            state.currentPhase = 'BETTING';
            state.currentIndex = (state.currentIndex + 1) % state.currentPlayList.length;
            render();
        }
    }, 1200);
};

window.submitAnte = async (accepted) => {
    state.playerFolded = !accepted;
    if (accepted) {
        state.energy -= BET_ANTE;
        localStorage.setItem('otakuBetBurnEnergy', state.energy);
    }

    try {
        state.isWaitingForOthers = true;
        render();
        await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
            [`answers.${state.myPlayerName}`]: {
                action: 'ante',
                accepted: accepted,
                amount: accepted ? BET_ANTE : 0
            }
        });

        // After 30 seconds, if still waiting for others during ANTE, the host will
        // auto-fold non-responders. We nudge Firestore so the host snapshot re-evaluates.
        if (state.anteTimeoutHandle) clearTimeout(state.anteTimeoutHandle);
        state.anteTimeoutHandle = setTimeout(async () => {
            // Only act if still waiting in ANTE phase
            if (state.isWaitingForOthers && state.roomPhase === 'ANTE' && state.roomId) {
                try {
                    // Touch the document to wake up the host's onSnapshot listener
                    await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                        _antePing: Date.now()
                    });
                } catch (e) { /* ignore */ }
            }
        }, 30000);
    } catch (e) { console.error("Error submitting ante:", e); }
};

window.submitBettingAction = async (action, amount) => {
    amount = parseInt(amount) || 0;
    if (state.isLockedOut) return;
    state.isLockedOut = true; // prevent double-submit
    state.userBetInput = '';

    // Optimistic local energy update
    if (action === 'call' || action === 'bet' || action === 'raise') {
        state.energy = Math.max(0, state.energy - amount);
        localStorage.setItem('otakuBetBurnEnergy', state.energy);
    } else if (action === 'fold') {
        state.playerFolded = true;
    }

    try {
        render();
        await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
            [`answers.${state.myPlayerName}`]: { action, amount }
        });
    } catch (e) {
        console.error("Error submitting betting action:", e);
        state.isLockedOut = false;
    }
};

// Legacy alias
window.lockInBetMultiplayer = async () => {
    const bet = parseInt(state.userBetInput);
    if (!isNaN(bet) && bet >= 0) await submitBettingAction('bet', bet);
};

window.checkBetAnswerMultiplayer = async () => {
    clearQuestionTimer();
    const q = state.currentPlayList[state.currentIndex];
    const correct = q.correctMap[state.currentLang.code] || q.correctMap["en"];
    const isCorrect = state.selectedOption === correct;

    state.isAnimatingResult = true;
    state.lastResultIsCorrect = isCorrect;
    if (typeof playSfx !== 'undefined') {
        if (isCorrect) playSfx('correct'); else playSfx('wrong');
    }
    render();

    setTimeout(async () => {
        state.isAnimatingResult = false;

        if (!isCorrect) {
            state.isLockedOut = true;
            render();
        } else {
            state.isWaitingForOthers = true;
            render();
        }

        try {
            await window.updateDoc(window.doc(window.db, "rooms", state.roomId), {
                [`answers.${state.myPlayerName}`]: {
                    action: 'answer',
                    isCorrect: isCorrect,
                    time: Date.now()
                }
            });
        } catch (e) { console.error("Error submitting answer:", e); }

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
                ${state.selectedMode !== 'HANGMAN' ? `<label class="bold color-indigo" style="font-size:18px;">בחר נושא:</label>
                <select id="multiCategoryInput" class="neo-input" style="margin-bottom: 20px; font-weight: bold; background-color: var(--white); font-size:18px; text-align:center;">
                    <option value="all">הכל (מעורבב)</option>
                    ${categoryList.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>` : ''}
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
    const catInput = document.getElementById('multiCategoryInput')?.value || 'all';
    if (catInput !== 'all') {
        playlist = playlist.filter(q => q.category === catInput);
    }

    if (playlist.length === 0 && state.selectedMode !== 'HANGMAN') {
        showToast("אין מספיק שאלות בנושא זה!", "error");
        return;
    }

    if (state.selectedMode === 'MATCH_PAIRS') {
        playlist = playlist.filter(q => q.type === 'match_pair');
    } else {
        playlist = playlist.filter(q => q.type !== 'match_pair');
    }

    const numQuestions = state.selectedMode === 'CLIMB' ? playlist.length : 10;
    const shuffled = state.selectedMode === 'HANGMAN' ? [] : playlist.sort(() => Math.random() - 0.5).slice(0, numQuestions).map(q => {
        if (state.selectedMode === 'MATCH_PAIRS') return q;
        const clonedQ = { ...q, optionsMap: {} };
        if (q.optionsMap) {
            for (let lang in q.optionsMap) {
                clonedQ.optionsMap[lang] = shuffleArray(q.optionsMap[lang]);
            }
        }
        return clonedQ;
    });

    // For BET_BURN: start every player at 500
    if (state.selectedMode === 'BET_BURN') {
        state.multiplayerPlayers[name].score = BET_START_SCORE;
        state.energy = BET_START_SCORE;
    }

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
            hangmanState: {},
            roomPhase: 'ANTE',
            roomPot: 0,
            roomCurrentBet: 0,
            playerBets: {},
            foldedPlayers: []
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

        const roomGameMode = data.gameMode || 'CLASSIC';
        if (roomGameMode !== state.selectedMode) {
            return showToast("קוד זה שייך לחדר במצב משחק אחר!", 'error');
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
        state.isMultiplayer = true;
        state.myPlayerName = finalName;
        state.currentPlayList = data.playlist;
        state.maxPlayers = data.maxPlayers;
        state.selectedMode = data.gameMode || 'CLASSIC';
        state.multiplayerPlayers = data.players || {};

        const joinScore = (data.gameMode === 'BET_BURN') ? BET_START_SCORE : 0;
        const newPlayers = { ...data.players, [finalName]: { score: joinScore, finished: false, isHost: false, isReady: false } };

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
                    state.energy = BET_START_SCORE;
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
                else if (state.selectedMode === 'BET_BURN') {
                    state.energy = s;
                    localStorage.setItem('otakuBetBurnEnergy', state.energy);
                }
            }


            if (state.selectedMode === 'BET_BURN') {
                // Always sync all bet-related fields
                const prevPhase = state.roomPhase;
                state.roomPhase = data.roomPhase || 'ANTE';
                state.roomPot = data.roomPot || 0;
                state.roomCurrentBet = data.roomCurrentBet || 0;
                state.playerBets = data.playerBets || {};
                state.roomFoldedPlayers = data.foldedPlayers || [];
                state.bettingOrder = data.bettingOrder || [];
                state.currentBettorIndex = data.currentBettorIndex ?? 0;
                state.bettingActed = data.bettingActed || [];

                // If this player was folded but is no longer in foldedPlayers (re-entered),
                // clear the local fold flag so they see the active BETTING UI
                if (state.playerFolded && !state.roomFoldedPlayers.includes(state.myPlayerName)) {
                    state.playerFolded = false;
                    state.isLockedOut = false;
                }

                // Reset turn-lock when it's a new phase or when currentBettorIndex moves
                const newBettor = state.bettingOrder[state.currentBettorIndex];
                if (prevPhase !== state.roomPhase || newBettor !== state.myPlayerName) {
                    state.isLockedOut = false;
                }

                // Reset waiting flag whenever the phase advances (unblocks the waiting screen)
                if (prevPhase !== state.roomPhase) {
                    state.isWaitingForOthers = false;
                    // Cancel any pending ante timeout ping
                    if (state.anteTimeoutHandle) {
                        clearTimeout(state.anteTimeoutHandle);
                        state.anteTimeoutHandle = null;
                    }
                }

                if (data.currentQuestionIndex > state.currentIndex) {
                    state.currentIndex = data.currentQuestionIndex;
                    state.selectedOption = null;
                    state.playerFolded = false;
                    state.isLockedOut = false;
                    state.isWaitingForOthers = false;
                    state.userBetInput = '';
                    // Cancel any pending ante timeout ping
                    if (state.anteTimeoutHandle) {
                        clearTimeout(state.anteTimeoutHandle);
                        state.anteTimeoutHandle = null;
                    }
                }

                if (state.roomPhase === 'ANSWERING' && prevPhase !== 'ANSWERING') {
                    if (state.timerInterval) clearQuestionTimer();
                    startQuestionTimer();
                }

                render();
            } else if (data.currentQuestionIndex > state.currentIndex || (data.climbFinished && state.isWaitingForOthers)) {
                const wasWaiting = state.isWaitingForOthers;
                state.isWaitingForOthers = false;
                state.selectedOption = null;

                if (state.selectedMode === 'CLIMB') {
                    if (wasWaiting && state.currentScreen === 'PLAYING_CLIMB') {
                        state.pendingQuestionIndex = data.climbFinished ? state.currentIndex : data.currentQuestionIndex;
                        state.pendingClimbFinished = data.climbFinished;
                        navigate('CLIMB_RESULT');
                    } else if (!wasWaiting) {
                        // Joiner just entered - render the climb screen
                        render();
                    }
                } else {
                    state.currentIndex = data.currentQuestionIndex;
                    if (state.timerInterval) {
                        clearQuestionTimer();
                        startQuestionTimer();
                    }
                    render();
                }
            } else if (state.selectedMode === 'CLIMB' && state.currentScreen === 'PLAYING_CLIMB' && !state.isWaitingForOthers) {
                // Joiner arrived at PLAYING_CLIMB before any question index change — render the screen
                render();
            }

            if (state.isHost) {
                const answers = data.answers || {};
                const activePlayers = Object.entries(data.players).filter(([_, p]) => !p.finished);
                const activePlayerNames = activePlayers.map(([name, _]) => name);

                let updates = {};

                if (state.selectedMode === 'BET_BURN') {
                    const currentPhase = data.roomPhase || 'ANTE';
                    const playerBets = data.playerBets || {};

                    if (currentPhase === 'ANTE') {
                        const anteCount = activePlayerNames.filter(name => answers[name] && answers[name].action === 'ante').length;

                        // Auto-fold players who haven't submitted the ante yet if:
                        // - at least one player already submitted AND accepted
                        // - the remaining non-responders have been idle for >= 30 seconds
                        const respondedNames = activePlayerNames.filter(name => answers[name] && answers[name].action === 'ante');
                        const acceptedNames = respondedNames.filter(name => answers[name].accepted);
                        const pendingNames = activePlayerNames.filter(name => !answers[name] || answers[name].action !== 'ante');

                        // Check if we should auto-fold pending players (ante timeout)
                        // We track the timestamp when the first player submitted their ante
                        const anteTimestamp = data.anteTimestamp || 0;
                        const anteTimeoutMs = 30000; // 30 seconds
                        const now = Date.now();
                        const anteTimedOut = anteTimestamp > 0 && (now - anteTimestamp) >= anteTimeoutMs;

                        // If this player just submitted ante, record a timestamp (host only, once)
                        if (anteCount > 0 && !data.anteTimestamp) {
                            window.updateDoc(window.doc(window.db, "rooms", code), { anteTimestamp: now });
                        }

                        // Resolve ANTE when: all answered, OR timeout fired with at least 1 accepted
                        const shouldResolve = (anteCount === activePlayerNames.length && activePlayerNames.length > 0)
                            || (anteTimedOut && acceptedNames.length > 0 && pendingNames.length > 0);

                        if (shouldResolve) {
                            let pot = data.roomPot || 0;
                            let folded = [];

                            // Process those who responded
                            Object.entries(answers).forEach(([name, ans]) => {
                                if (ans.action === 'ante') {
                                    if (ans.accepted) {
                                        pot += ans.amount;
                                        updates[`players.${name}.score`] = Math.max(0, (data.players[name].score || 0) - ans.amount);
                                    } else {
                                        folded.push(name);
                                    }
                                }
                            });

                            // Treat all non-responding players as folded
                            pendingNames.forEach(name => {
                                if (!folded.includes(name)) folded.push(name);
                            });

                            // Build turn order: host first, then others in player-map key order
                            const activeBettors = activePlayerNames.filter(n => !folded.includes(n));
                            const hostName = data.hostName;
                            const betOrder = [
                                ...activeBettors.filter(n => n === hostName),
                                ...activeBettors.filter(n => n !== hostName)
                            ];

                            updates['roomPot'] = pot;
                            updates['answers'] = {};
                            updates['anteTimestamp'] = 0; // reset for next round

                            if (folded.length === activePlayerNames.length || betOrder.length === 0) {
                                // Everyone folded (or timed out) → refund pot to those who paid and skip round
                                // Refund anyone who accepted the ante
                                acceptedNames.forEach(name => {
                                    const refundAmount = answers[name]?.amount || 0;
                                    const currentScore = (updates[`players.${name}.score`] !== undefined)
                                        ? updates[`players.${name}.score`]
                                        : (data.players[name]?.score || 0);
                                    updates[`players.${name}.score`] = currentScore + refundAmount;
                                });
                                const nextIdx = (data.currentQuestionIndex || 0) + 1;
                                updates['roomPhase'] = 'ANTE';
                                updates['currentQuestionIndex'] = nextIdx;
                                updates['roomPot'] = 0;
                                updates['foldedPlayers'] = [];
                                updates['playerBets'] = {};
                                updates['roomCurrentBet'] = 0;
                                updates['bettingOrder'] = [];
                                updates['currentBettorIndex'] = 0;
                                updates['bettingActed'] = [];
                                if (nextIdx >= (data.playlist || []).length) {
                                    Object.keys(data.players).forEach(p => updates[`players.${p}.finished`] = true);
                                }
                            } else if (betOrder.length === 1) {
                                // Only 1 player accepted → refund their ante and skip round (no one to play against)
                                const soloPlayer = betOrder[0];
                                const paidAmount = answers[soloPlayer]?.amount || 0;
                                const currentScore = (updates[`players.${soloPlayer}.score`] !== undefined)
                                    ? updates[`players.${soloPlayer}.score`]
                                    : (data.players[soloPlayer]?.score || 0);
                                updates[`players.${soloPlayer}.score`] = currentScore + paidAmount;
                                const nextIdx = (data.currentQuestionIndex || 0) + 1;
                                updates['roomPhase'] = 'ANTE';
                                updates['currentQuestionIndex'] = nextIdx;
                                updates['roomPot'] = 0;
                                updates['foldedPlayers'] = [];
                                updates['playerBets'] = {};
                                updates['roomCurrentBet'] = 0;
                                updates['bettingOrder'] = [];
                                updates['currentBettorIndex'] = 0;
                                updates['bettingActed'] = [];
                                if (nextIdx >= (data.playlist || []).length) {
                                    Object.keys(data.players).forEach(p => updates[`players.${p}.finished`] = true);
                                }
                            } else {
                                // Normal: circular betting starts with first player in betOrder
                                updates['roomPhase'] = 'BETTING';
                                updates['foldedPlayers'] = folded;
                                updates['playerBets'] = {};
                                updates['roomCurrentBet'] = 0;
                                updates['bettingOrder'] = betOrder;
                                updates['currentBettorIndex'] = 0;
                                updates['bettingActed'] = [];
                            }
                            window.updateDoc(window.doc(window.db, "rooms", code), updates);
                        }

                    } else if (currentPhase === 'BETTING') {
                        // Turn-by-turn circular betting
                        const bettingOrder = data.bettingOrder || [];
                        const currentBettorIndex = data.currentBettorIndex ?? 0;
                        const currentBettor = bettingOrder[currentBettorIndex];
                        const playerBets = data.playerBets || {};
                        const folded = data.foldedPlayers || [];
                        const roomCurrentBet = data.roomCurrentBet || 0;
                        const bettingActed = data.bettingActed || [];

                        // Check if any folded player submitted a reenter action
                        // Any player who folded during BETTING can re-enter by calling the current bet
                        const reenterPlayer = folded.find(n => answers[n]?.action === 'reenter');

                        if (reenterPlayer) {
                            // Process re-entry: player pays current bet and rejoins
                            const reenterAmount = Math.max(0, roomCurrentBet - (playerBets[reenterPlayer] || 0));
                            const newBets = { ...playerBets };
                            const newFolded = folded.filter(n => n !== reenterPlayer);

                            newBets[reenterPlayer] = roomCurrentBet;
                            // Add them to bettingOrder right after the current bettor
                            const newBettingOrder = [...bettingOrder];
                            const insertIdx = (currentBettorIndex + 1) % (newBettingOrder.length + 1);
                            newBettingOrder.splice(insertIdx, 0, reenterPlayer);
                            // Mark them as acted (they called the current bet)
                            const newActed = [...bettingActed, reenterPlayer];

                            const reenterUpdates = {
                                'foldedPlayers': newFolded,
                                'playerBets': newBets,
                                'bettingOrder': newBettingOrder,
                                'bettingActed': newActed,
                                'answers': {},
                                [`players.${reenterPlayer}.score`]: Math.max(0, (data.players[reenterPlayer]?.score || 0) - reenterAmount),
                                'roomPot': (data.roomPot || 0) + reenterAmount
                            };
                            window.updateDoc(window.doc(window.db, "rooms", code), reenterUpdates);
                            return;
                        }

                        if (!currentBettor || !answers[currentBettor]) return; // not yet acted

                        const ans = answers[currentBettor];
                        const newBets = { ...playerBets };
                        const newFolded = [...folded];
                        let newBet = roomCurrentBet;
                        let newActed = [...bettingActed];
                        let deducted = 0;

                        if (ans.action === 'check') {
                            // No change to bet
                        } else if (ans.action === 'bet') {
                            deducted = ans.amount || 0;
                            newBets[currentBettor] = (newBets[currentBettor] || 0) + deducted;
                            newBet = newBets[currentBettor];
                            newActed = [currentBettor]; // reset: others need to respond to the new bet
                        } else if (ans.action === 'raise') {
                            deducted = (ans.amount || 0) + Math.max(0, roomCurrentBet - (playerBets[currentBettor] || 0));
                            newBets[currentBettor] = (playerBets[currentBettor] || 0) + deducted;
                            newBet = newBets[currentBettor];
                            newActed = [currentBettor]; // reset: others need to respond to raise
                        } else if (ans.action === 'call') {
                            deducted = Math.max(0, roomCurrentBet - (playerBets[currentBettor] || 0));
                            newBets[currentBettor] = roomCurrentBet;
                        } else if (ans.action === 'fold') {
                            newFolded.push(currentBettor);
                        }

                        if (!newActed.includes(currentBettor)) {
                            newActed.push(currentBettor);
                        }

                        if (deducted > 0) {
                            updates[`players.${currentBettor}.score`] = Math.max(0, (data.players[currentBettor]?.score || 0) - deducted);
                            updates['roomPot'] = (data.roomPot || 0) + deducted;
                        }

                        // Find next non-folded player in the order
                        const stillActive = bettingOrder.filter(n => !newFolded.includes(n));
                        let nextIndex = currentBettorIndex;
                        for (let i = 1; i <= bettingOrder.length; i++) {
                            const idx = (currentBettorIndex + i) % bettingOrder.length;
                            if (!newFolded.includes(bettingOrder[idx])) {
                                nextIndex = idx;
                                break;
                            }
                        }

                        // Check if the betting round is complete:
                        // All still-active players have acted AND all have matched the current bet
                        const allActed = stillActive.length > 0 && stillActive.every(n => newActed.includes(n));
                        const allMatched = stillActive.every(n => (newBets[n] || 0) >= newBet);
                        const roundDone = stillActive.length <= 1 || (allActed && allMatched);

                        updates['playerBets'] = newBets;
                        updates['foldedPlayers'] = newFolded;
                        updates['roomCurrentBet'] = newBet;
                        updates['bettingActed'] = newActed;
                        updates['answers'] = {};

                        if (roundDone) {
                            if (stillActive.length === 1) {
                                // Only 1 player left after folds → award pot immediately, no question needed
                                const winner = stillActive[0];
                                const pot = (updates['roomPot'] !== undefined ? updates['roomPot'] : data.roomPot) || 0;
                                const prevScore = (updates[`players.${winner}.score`] !== undefined)
                                    ? updates[`players.${winner}.score`]
                                    : (data.players[winner]?.score || 0);
                                updates[`players.${winner}.score`] = prevScore + pot;
                                updates['roomPot'] = 0;
                                updates['roomPhase'] = 'ANTE';
                                updates['foldedPlayers'] = [];
                                updates['playerBets'] = {};
                                updates['roomCurrentBet'] = 0;
                                updates['bettingOrder'] = [];
                                updates['currentBettorIndex'] = 0;
                                updates['bettingActed'] = [];
                                updates['answers'] = {};

                                showToast(`🏆 ${winner} זכה ב-${pot} נק' כי כולם התקפלו!`, 'success', 3000);

                                // Check win/elimination conditions
                                Object.entries(data.players).forEach(([pName, pData]) => {
                                    const finalScore = (updates[`players.${pName}.score`] !== undefined)
                                        ? updates[`players.${pName}.score`]
                                        : pData.score;
                                    if (finalScore <= 0) updates[`players.${pName}.finished`] = true;
                                });

                                let someoneWon = false;
                                Object.entries(data.players).forEach(([pName, pData]) => {
                                    const finalScore = (updates[`players.${pName}.score`] !== undefined)
                                        ? updates[`players.${pName}.score`]
                                        : pData.score;
                                    if (finalScore >= BET_WIN_TARGET) someoneWon = true;
                                });

                                if (someoneWon || data.currentQuestionIndex >= data.playlist.length - 1) {
                                    Object.keys(data.players).forEach(p => updates[`players.${p}.finished`] = true);
                                } else {
                                    updates['currentQuestionIndex'] = data.currentQuestionIndex + 1;
                                }
                            } else {
                                // 2+ players remain → proceed to question (folded player's pot stays as prize)
                                updates['roomPhase'] = 'ANSWERING';
                                updates['bettingOrder'] = [];
                                updates['currentBettorIndex'] = 0;
                            }
                        } else {
                            updates['currentBettorIndex'] = nextIndex;
                        }

                        window.updateDoc(window.doc(window.db, "rooms", code), updates);

                    } else if (currentPhase === 'ANSWERING') {
                        const folded = data.foldedPlayers || [];
                        const answeringPlayers = activePlayerNames.filter(name => !folded.includes(name));

                        // Wait for all answering players to submit
                        const answeredCount = answeringPlayers.filter(name =>
                            answers[name] && answers[name].action === 'answer').length;
                        const timedOutCount = answeringPlayers.filter(name =>
                            answers[name] && answers[name].action === 'answer' && answers[name].isCorrect === false &&
                            answers[name].timeout).length;

                        const allAnswered = answeredCount === answeringPlayers.length && answeringPlayers.length > 0;

                        if (allAnswered) {
                            // Find all correct answerers → split pot equally
                            const winners = answeringPlayers.filter(name =>
                                answers[name] && answers[name].action === 'answer' && answers[name].isCorrect);

                            const pot = data.roomPot || 0;

                            if (winners.length > 0) {
                                const share = Math.floor(pot / winners.length);
                                winners.forEach(w => {
                                    const prev = (updates[`players.${w}.score`] !== undefined)
                                        ? updates[`players.${w}.score`]
                                        : (data.players[w].score || 0);
                                    updates[`players.${w}.score`] = prev + share;
                                });
                                showToast(`🎉 ${winners.length > 1 ? `${winners.length} שחקנים זכו ב-${share} נק' כל אחד!` : `${winners[0]} זכה ב-${pot} נק'!`}`, 'success', 3000);
                            }
                            // else nobody correct → pot is burned

                            updates['roomPot'] = 0;
                            updates['roomPhase'] = 'ANTE';
                            updates['foldedPlayers'] = [];
                            updates['playerBets'] = {};
                            updates['roomCurrentBet'] = 0;
                            updates['answers'] = {};

                            // Eliminate players at 0 points
                            Object.entries(data.players).forEach(([pName, pData]) => {
                                const finalScore = (updates[`players.${pName}.score`] !== undefined)
                                    ? updates[`players.${pName}.score`]
                                    : pData.score;
                                if (finalScore <= 0) {
                                    updates[`players.${pName}.finished`] = true;
                                }
                            });

                            // Check win condition (≥1000) at end of round
                            let someoneWon = false;
                            Object.entries(data.players).forEach(([pName, pData]) => {
                                const finalScore = (updates[`players.${pName}.score`] !== undefined)
                                    ? updates[`players.${pName}.score`]
                                    : pData.score;
                                if (finalScore >= BET_WIN_TARGET) someoneWon = true;
                            });

                            if (someoneWon || data.currentQuestionIndex >= data.playlist.length - 1) {
                                Object.keys(data.players).forEach(p => updates[`players.${p}.finished`] = true);
                            } else {
                                updates['currentQuestionIndex'] = data.currentQuestionIndex + 1;
                            }

                            window.updateDoc(window.doc(window.db, "rooms", code), updates);
                        }
                    }
                } else {
                    const validAnswersCount = activePlayerNames.filter(name => answers[name]).length;
                    if (validAnswersCount === activePlayerNames.length && activePlayerNames.length > 0) {
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
                        } else if (state.selectedMode === 'CLIMB') {
                            let sortedAnswers = Object.entries(answers).map(([name, ans]) => ({ name, ...ans }));
                            sortedAnswers.sort((a, b) => a.time - b.time);

                            let pPoints = 2; // Fastest gets 2, slower gets 1

                            sortedAnswers.forEach(ans => {
                                let currentScore = data.players[ans.name].score || 0;
                                if (ans.isCorrect) {
                                    updates[`players.${ans.name}.score`] = Math.min(10, currentScore + pPoints);
                                    pPoints--;
                                } else {
                                    updates[`players.${ans.name}.score`] = Math.max(0, currentScore - 1);
                                }
                            });
                        }

                        updates[`answers`] = {};

                        if (state.selectedMode === 'CLIMB') {
                            let someoneWon = false;
                            for (const p of Object.keys(data.players)) {
                                const newScore = updates[`players.${p}.score`] !== undefined ? updates[`players.${p}.score`] : (data.players[p].score || 0);
                                if (newScore >= 10) someoneWon = true;
                            }

                            if (someoneWon || data.currentQuestionIndex >= data.playlist.length - 1) {
                                updates[`climbFinished`] = true;
                            } else {
                                updates[`currentQuestionIndex`] = data.currentQuestionIndex + 1;
                            }
                        } else if (data.currentQuestionIndex >= data.playlist.length - 1) {
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
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
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
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-coins"></i> ${pData.score} נק'` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : state.selectedMode === 'MATCH_PAIRS' ? `${pData.score} / 25` : `${pData.score} / 10`;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:${isMe ? 'var(--vibrant-indigo)' : 'var(--white)'}; color:${isMe ? 'var(--white)' : 'var(--app-text)'}; padding:10px 15px; margin:5px 0; border-radius:8px; border: 2px solid var(--app-text); font-weight:bold;">
            <div>#${idx + 1} &nbsp; ${pName} ${pData.finished ? '✅' : '<i class="uit uit-hourglass"></i>'}</div>
            <div dir="ltr">${scoreDisplay}</div>
        </div>`;
    }).join('');

    return `
        <div class="screen-wrapper" style="align-items:center;">
            <button class="top-back-btn" onclick="navigate('MENU')"><i class="uil uil-times"></i></button>
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
        const scoreDisplay = state.selectedMode === 'BET_BURN' ? `<i class="uil uil-coins"></i> ${pData.score} נק'` : state.selectedMode === 'CLIMB' ? `רמה ${pData.score}` : state.selectedMode === 'MATCH_PAIRS' ? `${pData.score} / 25` : `${pData.score} / 10`;
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

            ${state.hangmanWordImage ? `<img class="hangman-hint-image" src="${state.hangmanWordImage}" alt="רמז" />` : ''}

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
            ${state.hangmanWordImage ? `<img class="hangman-hint-image small" src="${state.hangmanWordImage}" alt="רמז" />` : ''}
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
    state.hangmanWordImage = entry.imageUrl || null; // carry hint image
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
        if (typeof playSfx !== 'undefined') playSfx('correct');
        state.hangmanGuessed.push(letter);
    } else {
        if (typeof playSfx !== 'undefined') playSfx('wrong');
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

// --- AUDIO SYSTEM ---
// SFX and BGM both use simple HTML5 Audio elements for maximum compatibility
const sfxElements = {};
let sfxVolume = 1.0;

function loadSfx(name, url) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    sfxElements[name] = audio;
}

loadSfx('correct', 'sound/sfx_correct.wav');
loadSfx('wrong', 'sound/sfx_error.wav');
loadSfx('click', 'sound/sfx_click.wav');

// BGM files
const bgmFiles = [
    'sound/bgm_calm.wav',
    'sound/bgm_rhythmic_2.wav',
    'sound/bgm_rhythmic.wav'
];

let currentBgm = null;

function playRandomBgm() {
    if (currentBgm) {
        currentBgm.pause();
    }
    const randomFile = bgmFiles[Math.floor(Math.random() * bgmFiles.length)];
    currentBgm = new Audio(randomFile);
    currentBgm.loop = true;
    const bgmSlider = document.getElementById('bgm-vol');
    if (bgmSlider) {
        currentBgm.volume = bgmSlider.value / 100;
    }
    const p = currentBgm.play();
    if (p !== undefined) {
        p.catch(e => {
            // Autoplay policy fallback: wait for user gesture
            const playBgmOnInteract = () => {
                if (currentBgm && currentBgm.paused) currentBgm.play().catch(err => console.log(err));
                document.removeEventListener('click', playBgmOnInteract);
                document.removeEventListener('touchstart', playBgmOnInteract);
            };
            document.addEventListener('click', playBgmOnInteract);
            document.addEventListener('touchstart', playBgmOnInteract);
        });
    }
}

window.updateSFXVol = (val) => {
    sfxVolume = val / 100;
};

window.updateBGMVol = (val) => {
    if (currentBgm) {
        currentBgm.volume = val / 100;
    }
};

window.playSfx = (type) => {
    const baseAudio = sfxElements[type];
    if (baseAudio) {
        // Clone the audio node so overlapping sounds don't cut each other off
        const clone = baseAudio.cloneNode();
        clone.volume = sfxVolume;
        const p = clone.play();
        if (p !== undefined) {
            p.catch(e => console.warn('SFX autoplay prevented:', e));
        }
    }
};

// Global click sound
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.match-item') || e.target.closest('#audio-icon')) {
        playSfx('click');
    }
});

let audioPanelTimeout;

window.toggleAudioPanel = () => {
    const panel = document.getElementById('audio-panel');
    if (panel.classList.contains('show')) {
        panel.classList.remove('show');
    } else {
        panel.classList.add('show');
        window.startAudioPanelTimeout();
    }
};

window.startAudioPanelTimeout = () => {
    clearTimeout(audioPanelTimeout);
    audioPanelTimeout = setTimeout(() => {
        const panel = document.getElementById('audio-panel');
        if (panel) panel.classList.remove('show');
    }, 3000);
};

window.clearAudioPanelTimeout = () => {
    clearTimeout(audioPanelTimeout);
};

// Start BGM on load or first interaction
document.addEventListener('DOMContentLoaded', () => {
    playRandomBgm();
});
// Fallback if DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(playRandomBgm, 1000);
}

// Automatically clear localStorage and sessionStorage when the tab is closed
window.addEventListener('beforeunload', () => {
    localStorage.clear();
    sessionStorage.clear();
});


// --- ADMIN UI ---
function renderAdminLogin() {
    return `
        <div class="screen-wrapper" style="align-items:center; justify-content:center;">
            <h1 class="main-title">כניסת מנהל</h1>
            <div class="button-group" style="display:flex; flex-direction:column; align-items:center; width: 100%;">
                <div style="background: var(--white); padding: 20px; border-radius: 12px; max-width: 400px; width: 100%; border: 3px solid var(--app-text); margin-bottom: 20px;">
                    <label class="bold color-indigo">סיסמה:</label>
                    <input type="password" id="adminPasswordInput" class="neo-input" placeholder="הכנס סיסמה...">
                    <button class="neo-button bg-indigo" style="margin-top: 15px;" onclick="verifyAdminLogin()">כניסה</button>
                </div>
                <button class="neo-button bg-coral" style="max-width: 150px;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
        </div>
    `;
}

window.verifyAdminLogin = async () => {
    const pwd = document.getElementById('adminPasswordInput').value;
    if (!pwd) return;

    if (!window.functions) {
        showToast("Firebase Functions לא מאותחל", "error");
        return;
    }

    document.getElementById('adminPasswordInput').disabled = true;
    showToast("מאמת...", "info");

    try {
        const verifyFn = window.httpsCallable(window.functions, 'verifyAdminPassword');
        const res = await verifyFn({ password: pwd });
        if (res.data.success) {
            state.isAdmin = true;
            navigate('ADMIN_PANEL');
        } else {
            showToast("סיסמה שגויה!", "error");
            document.getElementById('adminPasswordInput').disabled = false;
        }
    } catch (e) {
        console.error(e);
        showToast("שגיאה באימות הסיסמה", "error");
        document.getElementById('adminPasswordInput').disabled = false;
    }
};

function renderAdminPanel() {
    if (!state.isAdmin) {
        return renderAdminLogin(); // fallback
    }

    const m = state.verificationMode || "AI_ONLY";

    let html = `
        <div class="screen-wrapper" style="align-items:center; justify-content:center; overflow-y: auto; padding-top: 20px;">
            <h1 class="main-title">לוח בקרה - מנהל</h1>
            <div class="button-group" style="display:flex; flex-direction:column; align-items:center; width: 100%;">
                
                <div style="background: var(--white); padding: 20px; border-radius: 12px; width: 100%; max-width: 600px; margin-bottom: 20px; border: 3px solid var(--app-text);">
                    <h3 class="color-indigo">הגדרות אימות שאלות</h3>
                    <p style="font-size: 14px; opacity: 0.8; margin-bottom: 15px;">בחר כיצד שאלות שנשלחו על ידי משתמשים יאומתו.</p>
                    
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label><input type="radio" name="vMode" value="AI_ONLY" ${m === 'AI_ONLY' ? 'checked' : ''}> אימות בינה מלאכותית בלבד</label>
                        <label><input type="radio" name="vMode" value="MANUAL_ONLY" ${m === 'MANUAL_ONLY' ? 'checked' : ''}> אימות ידני בלבד</label>
                        <label><input type="radio" name="vMode" value="BOTH" ${m === 'BOTH' ? 'checked' : ''}> שניהם (בינה מלאכותית + ידני)</label>
                        <label><input type="radio" name="vMode" value="NONE" ${m === 'NONE' ? 'checked' : ''}> ללא אימות (אישור אוטומטי)</label>
                    </div>
                    <button class="neo-button bg-indigo" style="margin-top: 15px; max-width: 200px; padding: 10px;" onclick="saveAdminSettings()">שמור הגדרות</button>
                </div>
                
                <div style="background: var(--white); padding: 20px; border-radius: 12px; width: 100%; max-width: 600px; margin-bottom: 20px; border: 3px solid var(--app-text);">
                    <h3 class="color-indigo">ממתינות לאישור</h3>
                    <div id="pendingQuestionsContainer">טוען...</div>
                </div>
                
                <button class="neo-button bg-coral" style="max-width: 150px;" onclick="navigate('MENU')">${getString('back')}</button>
            </div>
        </div>
    `;

    // Load pending immediately
    loadPendingQuestions();

    return html;
}

window.saveAdminSettings = async () => {
    const val = document.querySelector('input[name="vMode"]:checked').value;
    try {
        await window.setDoc(window.doc(window.db, "system", "config"), { verificationMode: val }, { merge: true });
        showToast("ההגדרות נשמרו!", "success");
    } catch (e) {
        console.error(e);
        showToast("שגיאה בשמירת ההגדרות", "error");
    }
};

window.loadPendingQuestions = async () => {
    try {
        const q = window.query(window.collection(window.db, "pendingQuestions"));
        const snap = await window.getDocs(q);
        let listHtml = "";

        if (snap.empty) {
            listHtml = "<p>אין שאלות הממתינות לאישור.</p>";
        } else {
            snap.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                let preview = "שאלה: ";
                if (data.type === 'hangman') preview = "איש תלוי: " + data.word;
                else if (data.type === 'match_pair') preview = "התאמת זוגות: " + data.pairsMap?.en?.length + " זוגות";
                else preview = "טריוויה: " + (data.textMap?.he || data.textMap?.en || "?");

                listHtml += `
                    <div style="border: 2px solid var(--app-text); border-radius: 8px; padding: 10px; margin-bottom: 10px; background: #f9f9f9;">
                        <strong>סוג:</strong> ${data.type} <br>
                        <strong>תצוגה מקדימה:</strong> ${preview} <br>
                        <strong>יעד:</strong> ${data.targetCollection} <br>
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button class="neo-button bg-indigo" style="padding: 5px 10px; font-size:14px;" onclick="approvePending('${id}', '${data.targetCollection}')">אשר</button>
                            <button class="neo-button bg-coral" style="padding: 5px 10px; font-size:14px;" onclick="rejectPending('${id}')">דחה</button>
                        </div>
                    </div>
                `;
            });
        }
        document.getElementById('pendingQuestionsContainer').innerHTML = listHtml;
    } catch (e) {
        console.error(e);
        document.getElementById('pendingQuestionsContainer').innerHTML = "<p>שגיאה בטעינת השאלות הממתינות.</p>";
    }
};

window.approvePending = async (id, targetCollection) => {
    if (!confirm("לאשר את השאלה?")) return;
    try {
        const docRef = window.doc(window.db, "pendingQuestions", id);
        const snap = await window.getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        delete data.targetCollection; // clean up before inserting

        await window.addDoc(window.collection(window.db, targetCollection), data);
        await window.deleteDoc(docRef); // delete from pending

        showToast("השאלה אושרה ועברה לפעיל!", "success");
        loadPendingQuestions(); // refresh
    } catch (e) {
        console.error(e);
        showToast("שגיאה באישור השאלה", "error");
    }
};

window.rejectPending = async (id) => {
    if (!confirm("לדחות ולמחוק את השאלה לצמיתות?")) return;
    try {
        const docRef = window.doc(window.db, "pendingQuestions", id);
        await window.deleteDoc(docRef);
        showToast("השאלה נדחתה ונמחקה", "success");
        loadPendingQuestions(); // refresh
    } catch (e) {
        console.error(e);
        showToast("שגיאה בדחיית השאלה", "error");
    }
};
