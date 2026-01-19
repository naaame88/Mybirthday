/* --- 전역 변수 설정 --- */
let chances;
let winIndex = Math.floor(Math.random() * 6);

/* --- 앱 초기화 --- */
function initApp() {
    const { db, fbUtils } = window;
    
    // Firebase 연결 대기
    if (!db || !fbUtils) {
        setTimeout(initApp, 100);
        return;
    }

    const guestbookCol = fbUtils.collection(db, "guestbook");

    // 1. 커서 추적
    const cursor = document.getElementById('feather-cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    }

    // 2. 타이머 및 디데이 (즉시 실행 후 인터벌)
    updateCountdown();
    updateLuckyTimer();
    setInterval(updateCountdown, 1000);
    setInterval(updateLuckyTimer, 1000);

    // 3. 방명록 로직
    const q = fbUtils.query(guestbookCol, fbUtils.orderBy("timestamp", "desc"));
    fbUtils.onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('guestbook-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        if (snapshot.empty) {
            listContainer.innerHTML = '<div class="empty-msg">Please leave a warm message of celebration...</div>';
            return;
        }
        snapshot.forEach((doc) => {
            const data = doc.data();
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `<span class="msg-name">${data.name}</span><p class="msg-text">${data.message.replace(/\n/g, '<br>')}</p>`;
            listContainer.appendChild(messageItem);
        });
    });

    window.addMessage = async function() {
        const nameInput = document.getElementById('visitor-name');
        const msgInput = document.getElementById('guest-input');
        if (!nameInput.value.trim() || !msgInput.value.trim()) return;
        try {
            await fbUtils.addDoc(guestbookCol, {
                name: nameInput.value,
                message: msgInput.value,
                timestamp: fbUtils.serverTimestamp()
            });
            nameInput.value = ''; msgInput.value = '';
        } catch (e) { console.error("Error: ", e); }
    };

    // 4. 매일 기회 초기화 및 상자 생성
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('lastVisitDate');
    
    if (lastVisit !== today) {
        chances = 2;
        localStorage.setItem('museChances', chances);
        localStorage.setItem('lastVisitDate', today);
    } else {
        const savedChances = localStorage.getItem('museChances');
        chances = (savedChances !== null) ? parseInt(savedChances) : 2;
    }
    
    createBoxGrid();
}

/* --- 상자 게임 관련 함수 --- */
function createBoxGrid() {
    const grid = document.getElementById('box-grid');
    const chanceDisplay = document.getElementById('chance-count');
    if (chanceDisplay) chanceDisplay.innerText = chances;
    
    if (grid) {
        grid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const box = document.createElement('div');
            box.className = 'box-item';
            box.innerHTML = `<img src="box.png" alt="Box"><span class="result-text">${i === winIndex ? 'WIN!' : 'EMPTY'}</span>`;
            box.onclick = () => openBox(box, i);
            grid.appendChild(box);
        }
    }
}

function openBox(element, index) {
    if (chances <= 0 || element.classList.contains('opened')) return;
    chances--;
    localStorage.setItem('museChances', chances);
    document.getElementById('chance-count').innerText = chances;
    element.classList.add('opened');
    if (index === winIndex) setTimeout(showWinModal, 600);
}

/* --- 디데이 및 타이머 함수 --- */
function updateCountdown() {
    const now = new Date();
    let target = new Date(now.getFullYear(), 0, 28); // 1월 28일
    if (now > target) target.setFullYear(now.getFullYear() + 1);
    const diff = target - now;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        countdownEl.innerText = `D-${d} : ${String(h).padStart(2,'0')} : ${String(m).padStart(2,'0')} : ${String(s).padStart(2,'0')}`;
    }
}

function updateLuckyTimer() {
    const now = new Date();
    const amTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 28, 0);
    const pmTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 28, 0);
    let nextMagic;
    if (now < amTarget) nextMagic = amTarget;
    else if (now < pmTarget) nextMagic = pmTarget;
    else nextMagic = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 28, 0);
    const diff = nextMagic - now;
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const timerMsg = document.getElementById('lucky-timer-msg');
    if (timerMsg) {
        timerMsg.innerText = `Next Secret Box in ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
}

/* --- 팝업 제어 함수 --- */
function tryLuckyDraw() {
    const lockModal = document.getElementById('lock-modal');
    const lockTitle = document.getElementById('lock-title');
    const lockMsg = document.getElementById('lock-msg');
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    if ((h === 1 || h === 13) && m === 28) {
        if (Math.random() < 0.01) { showWinModal(); } 
        else {
            lockTitle.innerText = "Oops!";
            lockMsg.innerHTML = "The muse is shy.<br>Try again!"; 
            lockModal.style.display = 'flex';
        }
    } else {
        lockTitle.innerText = "Locked";
        lockMsg.innerHTML = "The magic box is locked.<br>Please wait for the countdown!"; 
        lockModal.style.display = 'flex';
    }
}

function showWinModal() {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const display = document.getElementById('win-time-display');
    if (display) display.innerText = `당첨 시각: ${timeStr}`;
    document.getElementById('win-modal').style.display = 'flex';
}

function showMuseMessage() { document.getElementById('muse-message-modal').style.display = 'flex'; }
function closeMuseModal() { document.getElementById('muse-message-modal').style.display = 'none'; }
function closeModal() { document.getElementById('win-modal').style.display = 'none'; }
function closeLockModal() { document.getElementById('lock-modal').style.display = 'none'; }

// 앱 실행
initApp();
