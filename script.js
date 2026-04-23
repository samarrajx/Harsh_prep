/**
 * Harsh Raj — Workout Plan
 * Core Logic & Interactivity
 */

const CONFIG = {
    prefix: 'harsh_',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    themes: {
        'Monday': 'day-blue',
        'Tuesday': 'day-red',
        'Wednesday': 'day-gold',
        'Thursday': 'day-green',
        'Friday': 'day-blue',
        'Saturday': 'day-red',
        'Sunday': 'day-dim'
    }
};

let state = {
    currentDayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, // Mon=0, Sun=6
    sets: JSON.parse(localStorage.getItem(CONFIG.prefix + 'sets') || '{}'),
    completedDays: JSON.parse(localStorage.getItem(CONFIG.prefix + 'completed_days') || '[]'),
    lastUpdated: localStorage.getItem(CONFIG.prefix + 'last_updated') || null
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initDayNavigation();
    initExerciseToggles();
    initSetTracker();
    initWeeklyTracker();
    initPWA();
    initGestures();
    
    // Check for Sunday Reset
    checkSundayReset();
    
    // Restore state
    const savedDay = localStorage.getItem(CONFIG.prefix + 'current_day');
    if (savedDay !== null) {
        switchDay(parseInt(savedDay));
    } else {
        switchDay(state.currentDayIndex);
    }
});

// --- Navigation ---
function initDayNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchDay(index);
        });
    });
}

function switchDay(index) {
    state.currentDayIndex = index;
    const dayName = CONFIG.days[index];
    
    // Update UI Classes
    document.body.className = CONFIG.themes[dayName] || '';
    
    // Update Nav Items
    document.querySelectorAll('.nav-item').forEach((nav, i) => {
        nav.classList.toggle('active', i === index);
    });
    
    // Update Sections
    document.querySelectorAll('.exercise-section').forEach((sec, i) => {
        sec.classList.toggle('active', i === index);
    });
    
    // Persist
    localStorage.setItem(CONFIG.prefix + 'current_day', index);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Exercise Logic ---
function initExerciseToggles() {
    document.addEventListener('click', (e) => {
        const header = e.target.closest('.exercise-header');
        if (header) {
            const card = header.closest('.exercise-card');
            card.classList.toggle('open');
        }
    });
}

function initSetTracker() {
    // Dynamically inject set checkboxes based on badge text (e.g., "3 x 12")
    document.querySelectorAll('.exercise-card').forEach(card => {
        const badgeText = card.querySelector('.ex-badge').innerText;
        const setMatch = badgeText.match(/^(\d+)/);
        
        if (setMatch) {
            const setCount = parseInt(setMatch[1]);
            const tracker = document.createElement('div');
            tracker.className = 'sets-tracker';
            
            const exId = card.dataset.id;
            
            for (let i = 1; i <= setCount; i++) {
                const dot = document.createElement('div');
                dot.className = 'set-check';
                dot.innerText = i;
                
                const setKey = `${exId}_${i}`;
                if (state.sets[setKey]) dot.classList.add('done');
                
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dot.classList.toggle('done');
                    state.sets[setKey] = dot.classList.contains('done');
                    saveSets();
                    checkExerciseCompletion(card);
                });
                
                tracker.appendChild(dot);
            }
            
            card.querySelector('.details-content').appendChild(tracker);
            checkExerciseCompletion(card);
        }
    });
}

function saveSets() {
    localStorage.setItem(CONFIG.prefix + 'sets', JSON.stringify(state.sets));
    localStorage.setItem(CONFIG.prefix + 'last_updated', new Date().toISOString());
}

function checkExerciseCompletion(card) {
    const checks = card.querySelectorAll('.set-check');
    const done = card.querySelectorAll('.set-check.done');
    const isCompleted = checks.length > 0 && checks.length === done.length;
    
    card.classList.toggle('completed', isCompleted);
    
    // Debug log
    console.log(`Exercise ${card.dataset.id}: ${done.length}/${checks.length} sets done. Completed: ${isCompleted}`);
}

// --- Weekly Tracker ---
function initWeeklyTracker() {
    updateTrackerUI();
}

function updateTrackerUI() {
    const grid = document.getElementById('weekly-tracker-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    CONFIG.days.forEach((day, i) => {
        const el = document.createElement('div');
        el.className = `tracker-day ${state.completedDays.includes(i) ? 'done' : ''}`;
        el.innerHTML = `<span>${day.substring(0, 3)}</span>`;
        el.addEventListener('click', () => {
            toggleDayComplete(i);
        });
        grid.appendChild(el);
    });
}

function toggleDayComplete(index) {
    const pos = state.completedDays.indexOf(index);
    if (pos === -1) {
        state.completedDays.push(index);
    } else {
        state.completedDays.splice(pos, 1);
    }
    localStorage.setItem(CONFIG.prefix + 'completed_days', JSON.stringify(state.completedDays));
    updateTrackerUI();
}

// --- PWA & Gestures ---
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    }
}

function initGestures() {
    let touchstartX = 0;
    let touchendX = 0;
    
    document.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const threshold = 100;
        if (touchendX < touchstartX - threshold) {
            // Swipe Left -> Next Day
            if (state.currentDayIndex < 6) switchDay(state.currentDayIndex + 1);
        }
        if (touchendX > touchstartX + threshold) {
            // Swipe Right -> Prev Day
            if (state.currentDayIndex > 0) switchDay(state.currentDayIndex - 1);
        }
    }
}

function checkSundayReset() {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const lastReset = localStorage.getItem(CONFIG.prefix + 'last_reset');
    const todayStr = now.toDateString();

    if (isSunday && lastReset !== todayStr) {
        state.sets = {};
        state.completedDays = [];
        saveSets();
        localStorage.setItem(CONFIG.prefix + 'completed_days', JSON.stringify([]));
        localStorage.setItem(CONFIG.prefix + 'last_reset', todayStr);
        updateTrackerUI();
        console.log('Sunday Reset Performed');
    }
}

// Focus Mode Toggle
window.toggleFocusMode = function() {
    document.body.classList.toggle('focus-mode');
};
