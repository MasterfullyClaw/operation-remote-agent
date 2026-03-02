// src/terminal.js — Interactive terminal simulator component

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeCmd(cmd) {
  return cmd.trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeCopyBtn(text) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
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
  return btn;
}

export class Terminal {
  constructor(terminalData, questIdx, state) {
    this.data = terminalData;
    this.questIdx = questIdx;
    this.state = state;
    this.el = null;
    this.bodyEl = null;
    this.inputEl = null;
  }

  render() {
    const cmdIdx = this.state.getTerminalCmdIndex(this.questIdx);
    const allDone = cmdIdx >= this.data.commands.length;
    const nextCmd = this.data.commands[cmdIdx];
    const prompt = this.data.prompt || '~ % ';

    const el = document.createElement('div');
    el.className = 'terminal';

    el.innerHTML = `
      <div class="terminal-bar">
        <div class="terminal-dot r"></div>
        <div class="terminal-dot y"></div>
        <div class="terminal-dot g"></div>
        <div class="terminal-title">${escapeHtml(this.data.title)}</div>
      </div>
      <div class="terminal-body">
        ${allDone ? `<div class="term-line term-info">\u25b8 Terminal objectives complete.</div>` : ''}
      </div>
      <div class="terminal-input-area">
        <div class="terminal-input-row">
          <span class="term-prompt">${escapeHtml(prompt)}</span>
          <input type="text" class="terminal-input"
            placeholder="${allDone ? 'All commands completed' : 'Type command here...'}"
            ${allDone ? 'disabled' : ''}
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>
      </div>
    `;

    this.el = el;
    this.bodyEl = el.querySelector('.terminal-body');
    this.inputEl = el.querySelector('.terminal-input');

    // Initial hint line with copy button
    if (!allDone && nextCmd) {
      this._appendHintLine(nextCmd.cmd);
    }

    if (!allDone) {
      this.inputEl.addEventListener('keydown', (e) => this._onKeydown(e));
    }

    return el;
  }

  focus() {
    if (this.inputEl && !this.inputEl.disabled) {
      this.inputEl.focus();
    }
  }

  _appendHintLine(cmd) {
    const div = document.createElement('div');
    div.className = 'term-line term-info term-hint-line';

    const text = document.createTextNode('\u25b8 Type: ');
    const cmdSpan = document.createElement('span');
    cmdSpan.className = 'term-hint-cmd';
    cmdSpan.textContent = cmd;

    div.appendChild(text);
    div.appendChild(cmdSpan);
    div.appendChild(makeCopyBtn(cmd));
    this.bodyEl.appendChild(div);
  }

  _onKeydown(e) {
    if (e.key !== 'Enter') return;
    const cmd = this.inputEl.value.trim();
    if (!cmd) return;

    const cmdIdx = this.state.getTerminalCmdIndex(this.questIdx);
    const expected = this.data.commands[cmdIdx];

    // Echo the typed command
    const prompt = this.data.prompt || '~ % ';
    this._appendLine('term-line', `<span class="term-prompt">${escapeHtml(prompt)}</span>${escapeHtml(cmd)}`);

    if (expected && normalizeCmd(cmd) === normalizeCmd(expected.cmd)) {
      this._appendLine('term-line term-output', expected.output);
      this._appendLine('term-line term-success', '\u2713 ' + expected.successMsg);

      this.state.advanceTerminal(this.questIdx);

      const newIdx = this.state.getTerminalCmdIndex(this.questIdx);
      if (newIdx >= this.data.commands.length) {
        this._appendLine('term-line term-info', '\u25b8 Terminal objectives complete.');
        this.inputEl.disabled = true;
        this.inputEl.placeholder = 'All commands completed';
      } else {
        // Next hint with copy button
        this._appendHintLine(this.data.commands[newIdx].cmd);
      }
    } else {
      const hint = expected
        ? `\u2717 Try: ${expected.cmd}`
        : '\u2717 Unknown command';
      this._appendLine('term-line term-error', hint);
    }

    this.inputEl.value = '';
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  _appendLine(className, content) {
    const div = document.createElement('div');
    div.className = className;
    if (content.includes('<span')) {
      div.innerHTML = content;
    } else {
      div.textContent = content;
    }
    this.bodyEl.appendChild(div);
  }
}
