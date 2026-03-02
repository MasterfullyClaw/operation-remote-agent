// src/app.js — Application init: OS selector → briefing → HUD

import { QUESTS } from './data/quests.js';
import { QUESTS_WINDOWS } from './data/quests-windows.js';
import { GameState } from './state.js';
import { Renderer } from './renderer.js';

// ─── Initialize ─────────────────────────────────────────────────
let state = null;
let renderer = null;

function getQuests() {
  return state.os === 'windows' ? QUESTS_WINDOWS : QUESTS;
}

function boot() {
  // Create state first — reads OS from localStorage internally
  state = new GameState(QUESTS.length);
  // Now correct the quest count based on the stored OS
  state.totalQuests = getQuests().length;

  renderer = new Renderer(state);

  route();
  wireButtons();

  // Re-route when OS is selected
  state.events.on('osSelected', () => {
    // Rebuild state with correct quest count for the chosen OS
    const newQuests = getQuests();
    state.totalQuests = newQuests.length;
    renderer.renderBriefing();
    renderer.showScreen('briefingScreen');
  });

  state.events.on('reset', () => {
    renderer.showScreen('osSelectorScreen');
    renderer.renderOSSelector();
  });
}

function route() {
  if (!state.os) {
    renderer.showScreen('osSelectorScreen');
    renderer.renderOSSelector();
  } else if (state.isGameComplete()) {
    renderer.renderVictory();
    renderer.showScreen('victoryScreen');
  } else if (!state.briefingSeen) {
    renderer.showScreen('briefingScreen');
    renderer.renderBriefing();
  } else {
    renderer.showScreen('hudScreen');
    renderer.renderHUD();
  }
}

function wireButtons() {
  document.getElementById('beginBtn')?.addEventListener('click', () => {
    state.markBriefingSeen();
    renderer.showScreen('hudScreen');
    renderer.renderHUD();
  });

  document.getElementById('restartBtn')?.addEventListener('click', () => {
    state.reset();
  });

  document.getElementById('resetLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Reset all progress and OS selection? This cannot be undone.')) {
      state.reset();
    }
  });
}

// ─── Tmux Cheatsheet ────────────────────────────────────────────
const TMUX_SECTIONS = [
  {
    title: 'Sessions',
    shortcuts: [
      { keys: ['Ctrl+B', 'S'], desc: 'List all sessions' },
      { keys: ['Ctrl+B', '$'], desc: 'Rename session' },
      { keys: ['Ctrl+B', 'D'], desc: 'Detach from session' },
      { keys: ['Ctrl+B', '('], desc: 'Previous session' },
      { keys: ['Ctrl+B', ')'], desc: 'Next session' },
    ]
  },
  {
    title: 'Windows (Tabs)',
    shortcuts: [
      { keys: ['Ctrl+B', 'C'], desc: 'Create new window' },
      { keys: ['Ctrl+B', 'W'], desc: 'List all windows' },
      { keys: ['Ctrl+B', 'N'], desc: 'Next window' },
      { keys: ['Ctrl+B', 'P'], desc: 'Previous window' },
      { keys: ['Ctrl+B', '0–9'], desc: 'Jump to window by number' },
      { keys: ['Ctrl+B', ','], desc: 'Rename window' },
      { keys: ['Ctrl+B', '&'], desc: 'Kill window' },
    ]
  },
  {
    title: 'Panes (Split Screen)',
    shortcuts: [
      { keys: ['Ctrl+B', '%'], desc: 'Split vertical (left/right)' },
      { keys: ['Ctrl+B', '"'], desc: 'Split horizontal (top/bottom)' },
      { keys: ['Ctrl+B', '↑ ↓ ← →'], desc: 'Switch between panes' },
      { keys: ['Ctrl+B', 'X'], desc: 'Kill current pane' },
      { keys: ['Ctrl+B', 'Z'], desc: 'Zoom pane (fullscreen toggle)' },
      { keys: ['Ctrl+B', 'Space'], desc: 'Cycle pane layouts' },
      { keys: ['Ctrl+B', '{'], desc: 'Move pane left' },
      { keys: ['Ctrl+B', '}'], desc: 'Move pane right' },
      { keys: ['Ctrl+B', 'Q'], desc: 'Show pane numbers' },
    ]
  },
  {
    title: 'Scrolling / Copy',
    shortcuts: [
      { keys: ['Ctrl+B', '['], desc: 'Scroll mode (arrows/PgUp/PgDn, Q to exit)' },
      { keys: ['Ctrl+B', ']'], desc: 'Paste buffer' },
    ]
  },
  {
    title: 'Resize Panes',
    shortcuts: [
      { keys: ['Ctrl+B', 'Ctrl+↑↓←→'], desc: 'Resize pane in that direction' },
    ]
  },
  {
    title: 'Commands',
    shortcuts: [
      { keys: ['Ctrl+B', ':'], desc: 'Open command prompt' },
    ]
  },
  {
    title: 'Terminal Commands',
    note: 'Run these outside tmux',
    shortcuts: [
      { keys: ['tmux new -s name'], desc: 'New named session' },
      { keys: ['tmux ls'], desc: 'List sessions' },
      { keys: ['tmux attach -t name'], desc: 'Attach to session' },
      { keys: ['tmux kill-session -t name'], desc: 'Kill session' },
    ]
  }
];

function buildTmuxPanel() {
  const body = document.getElementById('tmuxPanelBody');
  if (!body || body.childElementCount > 0) return;

  TMUX_SECTIONS.forEach(section => {
    const sec = document.createElement('div');
    sec.className = 'tmux-section';

    const heading = document.createElement('div');
    heading.className = 'tmux-section-title';
    heading.textContent = section.title;
    sec.appendChild(heading);

    if (section.note) {
      const note = document.createElement('div');
      note.className = 'tmux-section-note';
      note.textContent = section.note;
      sec.appendChild(note);
    }

    section.shortcuts.forEach(s => {
      const row = document.createElement('div');
      row.className = 'tmux-row';

      const keysEl = document.createElement('div');
      keysEl.className = 'tmux-keys';

      s.keys.forEach((k, i) => {
        const kbd = document.createElement('kbd');
        kbd.className = i === 0 && s.keys.length > 1 ? 'tmux-prefix' : 'tmux-key';
        kbd.textContent = k;
        keysEl.appendChild(kbd);
        if (i === 0 && s.keys.length > 1) {
          const plus = document.createElement('span');
          plus.className = 'tmux-plus';
          plus.textContent = '+';
          keysEl.appendChild(plus);
        }
      });

      const desc = document.createElement('div');
      desc.className = 'tmux-desc';
      desc.textContent = s.desc;

      row.appendChild(keysEl);
      row.appendChild(desc);
      sec.appendChild(row);
    });

    body.appendChild(sec);
  });
}

function wireTmux() {
  const btn = document.getElementById('tmuxBtn');
  const panel = document.getElementById('tmuxPanel');
  const overlay = document.getElementById('tmuxOverlay');
  const closeBtn = document.getElementById('tmuxClose');
  if (!btn || !panel) return;

  const open = () => {
    buildTmuxPanel();
    panel.classList.add('open');
    overlay.classList.add('open');
    btn.classList.add('active');
  };
  const close = () => {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    btn.classList.remove('active');
  };

  btn.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ─── Boot ───────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { boot(); wireTmux(); });
} else {
  boot();
  wireTmux();
}
