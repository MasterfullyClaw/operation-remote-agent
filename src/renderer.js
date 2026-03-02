// src/renderer.js — DOM rendering engine: OS selector, quests, progress, arch diagram, screens

import { QUESTS } from './data/quests.js';
import { QUESTS_WINDOWS } from './data/quests-windows.js';
import { LEVELS } from './data/levels.js';
import { LEVELS_WINDOWS } from './data/levels-windows.js';
import { BRIEFING, VICTORY } from './data/narrative.js';
import { BRIEFING_WINDOWS, VICTORY_WINDOWS } from './data/narrative-windows.js';
import { Terminal } from './terminal.js';
import { typewriter, fadeIn, showLevelTransition } from './animations.js';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class Renderer {
  constructor(state) {
    this.state = state;
    this.terminals = {};
    this._typewriterCtrl = null;
    this._expandedQuest = null;
  }

  // ─── OS-aware data helpers ───────────────────────────────────
  get quests() {
    return this.state.os === 'windows' ? QUESTS_WINDOWS : QUESTS;
  }

  get levels() {
    return this.state.os === 'windows' ? LEVELS_WINDOWS : LEVELS;
  }

  get briefing() {
    return this.state.os === 'windows' ? BRIEFING_WINDOWS : BRIEFING;
  }

  get victory() {
    return this.state.os === 'windows' ? VICTORY_WINDOWS : VICTORY;
  }

  // ─── Screen Management ──────────────────────────────────────
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  // ─── OS Selector Screen ──────────────────────────────────────
  renderOSSelector() {
    const container = document.getElementById('osSelectorContent');
    if (!container) return;
    container.innerHTML = '';

    const cards = [
      {
        os: 'mac',
        label: 'macOS',
        tag: 'v1 // macos',
        title: 'Mac Setup',
        desc: 'Homebrew · tmux · SSH · Tailscale\nNative terminal, no extra layers.',
        icon: '⌘'
      },
      {
        os: 'windows',
        label: 'Windows',
        tag: 'v1 // windows',
        title: 'Windows Setup',
        desc: 'WSL (Ubuntu) · OpenSSH Server · Tailscale\nFull Linux environment inside Windows.',
        icon: '⊞'
      }
    ];

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'os-card';
      el.innerHTML = `
        <div class="os-card-tag">${escapeHtml(card.tag)}</div>
        <div class="os-card-icon">${card.icon}</div>
        <div class="os-card-title">${escapeHtml(card.title)}</div>
        <div class="os-card-desc">${escapeHtml(card.desc)}</div>
        <div class="os-card-arrow">→</div>
      `;
      el.addEventListener('click', () => {
        this.state.selectOS(card.os);
      });
      container.appendChild(el);
    });
  }

  // ─── Mission Briefing ───────────────────────────────────────
  renderBriefing() {
    const doc = document.getElementById('briefingDoc');
    const arch = document.getElementById('briefingArch');
    const btn = document.getElementById('beginBtn');
    if (!doc) return;

    doc.innerHTML = '';
    arch.classList.remove('visible');
    btn.classList.remove('visible');

    const statusEl = document.getElementById('briefingStatus');
    const statusText = document.getElementById('briefingStatusText');
    if (statusEl) statusEl.classList.remove('complete');
    if (statusText) statusText.textContent = 'DECRYPTING MISSION BRIEF...';

    const dateEl = document.querySelector('.briefing-date');
    if (dateEl) dateEl.textContent = this.briefing.date;

    const classEl = document.querySelector('.briefing-classification');
    if (classEl) classEl.textContent = this.briefing.classification;

    const markComplete = () => {
      if (statusEl) statusEl.classList.add('complete');
      if (statusText) statusText.textContent = 'TRANSMISSION COMPLETE — PROCEED WHEN READY';
    };

    this._typewriterCtrl = typewriter(doc, this.briefing.lines, {
      charDelay: 18,
      lineDelay: 60,
      onComplete: () => {
        arch.textContent = this.briefing.archDiagram.join('\n');
        arch.classList.add('visible');
        setTimeout(() => {
          btn.classList.add('visible');
          markComplete();
        }, 600);
      }
    });

    doc.addEventListener('click', () => {
      if (this._typewriterCtrl) {
        this._typewriterCtrl.skip();
        this._typewriterCtrl = null;
        arch.textContent = this.briefing.archDiagram.join('\n');
        arch.classList.add('visible');
        setTimeout(() => {
          btn.classList.add('visible');
          markComplete();
        }, 200);
      }
    }, { once: true });
  }

  // ─── Operations HUD ─────────────────────────────────────────
  renderHUD() {
    // Update subtitle for OS
    const subtitle = document.querySelector('.header .subtitle');
    if (subtitle) {
      subtitle.textContent = this.state.os === 'windows'
        ? 'Control Claude Code from your iPhone — anywhere in the world'
        : 'Control Claude Code from your iPhone — anywhere in the world';
    }
    this.updateProgress();
    this.renderArchDiagram();
    this.renderQuests();
  }

  updateProgress() {
    const { done, total, pct } = this.state.getProgress();
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');
    const pctEl = document.getElementById('progressPct');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = `${done} / ${total} quests`;
    if (pctEl) pctEl.textContent = pct + '%';
  }

  renderArchDiagram() {
    const container = document.getElementById('archDiagram');
    if (!container) return;

    // Set OS-specific arch HTML
    container.innerHTML = this.briefing.archHtml;

    const allNodes = [
      'archMac', 'archPhone', 'archTmux', 'archTermius',
      'archClaude', 'archCode', 'archSSH', 'archClient'
    ];

    const quest = this.quests[this.state.currentQuest];
    const activeNodes = quest ? quest.archHighlight : [];

    const completeNodes = new Set();
    for (const idx of this.state.completed) {
      (this.quests[idx].archHighlight || []).forEach(n => completeNodes.add(n));
    }

    allNodes.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'complete');
      if (activeNodes.includes(id)) {
        el.classList.add('active');
      } else if (completeNodes.has(id)) {
        el.classList.add('complete');
      }
    });
  }

  renderQuests() {
    const container = document.getElementById('questContainer');
    if (!container) return;
    container.innerHTML = '';

    const autoExpand = this._expandedQuest ?? this.state.currentQuest;

    this.levels.forEach((level) => {
      const section = document.createElement('div');
      section.className = 'level-section';

      const header = document.createElement('div');
      header.className = 'level-header';
      header.innerHTML = `
        <span class="level-badge ${level.phase}">${level.badge}</span>
        <span class="level-title">${level.name}</span>
        <span class="level-tagline">${level.tagline}</span>
      `;
      section.appendChild(header);

      const [startIdx, endIdx] = level.questRange;
      for (let qi = startIdx; qi <= endIdx; qi++) {
        section.appendChild(this._renderQuestCard(qi, autoExpand));
      }

      container.appendChild(section);
    });
  }

  _renderQuestCard(questIdx, autoExpand) {
    const quest = this.quests[questIdx];
    const status = this.state.getQuestStatus(questIdx);
    const isExpanded = questIdx === autoExpand;

    const card = document.createElement('div');
    card.className = 'quest-card';
    card.dataset.quest = questIdx;

    if (status === 'active') card.classList.add('active');
    if (status === 'complete') card.classList.add('completed');
    if (status === 'locked') card.classList.add('locked');
    if (isExpanded && status !== 'locked') card.classList.add('expanded');

    let statusIcon, statusClass;
    if (status === 'complete') {
      statusIcon = '\u2713';
      statusClass = 'done';
    } else if (status === 'active') {
      statusIcon = '\u25b6';
      statusClass = 'active-status';
    } else {
      statusIcon = String(questIdx + 1);
      statusClass = 'pending';
    }

    const headerEl = document.createElement('div');
    headerEl.className = 'quest-header';
    headerEl.innerHTML = `
      <div class="quest-status ${statusClass}">${statusIcon}</div>
      <div class="quest-info">
        <div class="quest-name">${escapeHtml(quest.name)}</div>
        <div class="quest-desc">${escapeHtml(quest.desc)}</div>
      </div>
      <div class="quest-chevron">\u25b6</div>
    `;
    headerEl.addEventListener('click', () => this._toggleQuest(questIdx));
    card.appendChild(headerEl);

    const body = document.createElement('div');
    body.className = 'quest-body';
    body.innerHTML = quest.body;
    this._addCopyButtons(body);

    if (quest.terminal) {
      const term = new Terminal(quest.terminal, questIdx, this.state);
      this.terminals[questIdx] = term;
      const h3 = document.createElement('h3');
      h3.textContent = 'Terminal';
      body.appendChild(h3);
      body.appendChild(term.render());
    }

    if (quest.hint) {
      const hint = document.createElement('div');
      hint.className = 'hint-box';
      hint.innerHTML = `<strong>Hint:</strong> ${quest.hint}`;
      body.appendChild(hint);
    }

    const valH3 = document.createElement('h3');
    valH3.textContent = 'Validation';
    body.appendChild(valH3);

    const valDiv = document.createElement('div');
    valDiv.className = 'validation';
    quest.checks.forEach((check, ci) => {
      const checked = this.state.isCheckChecked(questIdx, ci);
      const item = document.createElement('div');
      item.className = 'val-item';
      item.innerHTML = `
        <div class="val-check ${checked ? 'checked' : ''}">${checked ? '\u2713' : ''}</div>
        <span>${escapeHtml(check)}</span>
      `;
      item.querySelector('.val-check').addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.toggleCheck(questIdx, ci);
        this._refreshQuestCard(questIdx);
      });
      valDiv.appendChild(item);
    });
    body.appendChild(valDiv);

    const allChecked = this.state.allChecksComplete(questIdx, quest.checks.length);
    const btn = document.createElement('button');
    btn.className = 'complete-btn';

    if (status === 'complete') {
      btn.className += ' done';
      btn.textContent = '\u2713 Quest Complete';
      btn.disabled = true;
    } else if (allChecked) {
      btn.className += ' ready';
      btn.textContent = 'COMPLETE QUEST';
      btn.addEventListener('click', () => this._onCompleteQuest(questIdx));
    } else {
      btn.className += ' disabled';
      btn.textContent = 'Complete all checks first';
      btn.disabled = true;
    }
    body.appendChild(btn);

    card.appendChild(body);
    return card;
  }

  _addCopyButtons(container) {
    container.querySelectorAll('code').forEach(code => {
      const text = code.textContent;
      const btn = document.createElement('button');
      btn.className = 'copy-btn copy-btn-inline';
      btn.textContent = 'COPY';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✓ COPIED';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'COPY';
            btn.classList.remove('copied');
          }, 1500);
        });
      });
      code.after(btn);
    });
  }

  _toggleQuest(questIdx) {
    const status = this.state.getQuestStatus(questIdx);
    if (status === 'locked') return;

    this._expandedQuest = (this._expandedQuest === questIdx) ? null : questIdx;
    this.renderQuests();
  }

  _refreshQuestCard(questIdx) {
    const card = document.querySelector(`.quest-card[data-quest="${questIdx}"]`);
    if (!card) return;

    const quest = this.quests[questIdx];
    const status = this.state.getQuestStatus(questIdx);

    card.querySelectorAll('.val-item').forEach((item, ci) => {
      const check = item.querySelector('.val-check');
      const checked = this.state.isCheckChecked(questIdx, ci);
      check.className = `val-check ${checked ? 'checked' : ''}`;
      check.textContent = checked ? '\u2713' : '';
    });

    const allChecked = this.state.allChecksComplete(questIdx, quest.checks.length);
    const btn = card.querySelector('.complete-btn');
    if (btn && status !== 'complete') {
      if (allChecked) {
        btn.className = 'complete-btn ready';
        btn.textContent = 'COMPLETE QUEST';
        btn.disabled = false;
        btn.onclick = () => this._onCompleteQuest(questIdx);
      } else {
        btn.className = 'complete-btn disabled';
        btn.textContent = 'Complete all checks first';
        btn.disabled = true;
        btn.onclick = null;
      }
    }
  }

  async _onCompleteQuest(questIdx) {
    const quest = this.quests[questIdx];
    if (!this.state.allChecksComplete(questIdx, quest.checks.length)) return;

    const currentLevel = this.quests[questIdx].level;
    const nextQuest = this.quests[questIdx + 1];
    const crossingLevel = nextQuest && nextQuest.level !== currentLevel;

    this.state.completeQuest(questIdx);

    if (this.state.isGameComplete()) {
      this.renderVictory();
      this.showScreen('victoryScreen');
      return;
    }

    if (crossingLevel) {
      const nextLevel = this.levels.find(l => {
        const [s, e] = l.questRange;
        return questIdx + 1 >= s && questIdx + 1 <= e;
      });
      if (nextLevel) {
        await showLevelTransition(
          nextLevel.badge + ': ' + nextLevel.name,
          nextLevel.tagline
        );
      }
    }

    this._expandedQuest = this.state.currentQuest;
    this.renderHUD();
  }

  // ─── Victory Screen ─────────────────────────────────────────
  renderVictory() {
    const v = this.victory;
    const banner = document.getElementById('victoryBanner');
    const arch = document.getElementById('victoryArch');
    const stats = document.getElementById('victoryStats');
    const closing = document.getElementById('victoryClosing');
    const meta = document.getElementById('victoryMeta');

    if (banner) {
      banner.textContent = v.banner.join('\n');
      fadeIn(banner, 800);
    }

    if (arch) {
      arch.innerHTML = this.briefing.archDiagram.map(line =>
        `<span style="color:var(--green)">${escapeHtml(line)}</span>`
      ).join('\n');
      fadeIn(arch, 800, 400);
    }

    if (stats) {
      stats.innerHTML = '';
      v.stats.components.forEach((comp, i) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
          <div class="stat-name">${escapeHtml(comp.name)}</div>
          <div class="stat-value">${escapeHtml(comp.status)}</div>
          <div class="stat-desc">${escapeHtml(comp.desc)}</div>
        `;
        card.style.opacity = '0';
        stats.appendChild(card);
        fadeIn(card, 500, 600 + i * 150);
      });
    }

    if (closing) {
      closing.textContent = v.closingLine;
      fadeIn(closing, 600, 1400);
    }

    if (meta) {
      meta.textContent = `CAPABILITY: ${v.stats.capability}  |  RANGE: ${v.stats.range}  |  COST: ${v.stats.cost}`;
      fadeIn(meta, 600, 1600);
    }
  }
}
