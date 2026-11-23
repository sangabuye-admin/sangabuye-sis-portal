// INJINI KUU YA SANGABUYE SIS PORTAL (v5.3 - PWA APP, OFFLINE SYNC & DIRECT MESSAGING)
const SGB = {
  lang: localStorage.getItem('sgb_lang') || 'sw',

  insert(table, item) {
    item.id = Date.now() + Math.floor(Math.random() * 100);
    item.created_at = new Date().toLocaleString('sw-TZ');
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
    list.unshift(item);
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.logAction(`Ameongeza taarifa kwenye ${table}`);
    this.notifySync('✅ Data zimehifadhiwa na kusasishwa!');
    return item;
  },
  select(table) {
    return JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
  },
  update(table, id, changes) {
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]').map(x =>
      String(x.id) === String(id) ? { ...x, ...changes } : x
    );
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.logAction(`Amebadilisha taarifa kwenye ${table} (ID: ${id})`);
    this.notifySync('✅ Mabadiliko yamehifadhiwa!');
  },
  getConfig() {
    return JSON.parse(localStorage.getItem('sgb_school_config') || '{"year":"2026","term":"Term I","crdb":"0150838972100"}');
  },

  liveRefresh(silent = false) {
    const activeMenu = document.querySelector('.menu-btn.active');
    if (activeMenu) activeMenu.click();
    const syncEl = document.getElementById('syncTime');
    if (syncEl) syncEl.innerText = ' • Live synced: ' + new Date().toLocaleTimeString();
    this.applyLanguage();
    if (!silent) this.notifySync(this.lang === 'en' ? '✅ Live data refreshed!' : '✅ Data zote zimesasishwa (Live)!');
  },

  notifySync(msg) {
    let toast = document.getElementById('sgbToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sgbToast';
      toast.style.cssText = 'position:fixed;bottom:18px;right:18px;background:#0f294a;color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;font-weight:bold;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  },

  exportBackup() {
    const backup = { portal: 'Sangabuye SIS Portal', exported_at: new Date().toISOString(), data: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sgb_')) backup.data[k] = JSON.parse(localStorage.getItem(k));
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Sangabuye_SIS_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    this.logAction('Amepakua nakala ya mfumo (System Backup)');
    this.notifySync('💾 Nakala ya mfumo (Backup) imepakuliwa!');
  },

  importBackup() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const records = parsed.data || parsed;
          Object.keys(records).forEach(k => {
            if (k.startsWith('sgb_')) localStorage.setItem(k, JSON.stringify(records[k]));
          });
          alert('✅ Data zote za Backup zimerudishwa kikamilifu!');
          this.liveRefresh(true);
        } catch (err) {
          alert('❌ Faili la Backup si sahihi: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  },
  openInboxModal() {
    const u = this.getUser();
    if (!u) return;
    const msgs = this.select('direct_messages');
    let modal = document.getElementById('sgbInboxModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sgbInboxModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;justify-content:center;align-items:center;padding:15px;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#fff;width:100%;max-width:520px;border-radius:12px;padding:20px;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;color:#0f294a;">💬 Ujumbe wa Ndani (Direct Inbox)</h3>
          <button onclick="document.getElementById('sgbInboxModal').style.display='none'" style="background:#dc2626;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;">✕ Funga</button>
        </div>
        <form onsubmit="SGB.sendDirectMsg(event)" style="display:grid;gap:8px;margin-bottom:14px;">
          <select id="dmTo" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
            <option value="Mkuu wa Shule">Kwenda: Mkuu wa Shule (0784 755 173)</option>
            <option value="Mhasibu">Kwenda: Mhasibu (0615 000 305)</option>
            <option value="Mtaaluma">Kwenda: Mtaaluma (Academic)</option>
            <option value="Walimu">Kwenda: Walimu</option>
            <option value="Wazazi">Kwenda: Wazazi</option>
          </select>
          <input type="text" id="dmSubj" required placeholder="Kichwa / Jina la Mwanafunzi" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
          <textarea id="dmBody" rows="2" required placeholder="Andika ujumbe wako hapa..." style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;"></textarea>
          <button type="submit" style="background:#1d4ed8;color:#fff;border:none;padding:9px;border-radius:6px;font-weight:bold;cursor:pointer;">📤 Tuma Ujumbe</button>
        </form>
        <div style="font-size:12.5px;">
          ${msgs.slice(0, 15).map(m => `<div style="border-bottom:1px solid #e2e8f0;padding:8px 0;">
            <b>${m.sender} ➔ ${m.recipient}</b> <small style="color:#64748b;">(${m.created_at})</small><br>
            <u>${m.subject}:</u> ${m.body}
          </div>`).join('') || '<p style="color:#64748b;">Hakuna ujumbe wowote bado.</p>'}
        </div>
      </div>`;
  },

  sendDirectMsg(e) {
    e.preventDefault();
    const u = this.getUser();
    this.insert('direct_messages', {
      sender: u ? u.full_name : 'Mtumiaji',
      recipient: document.getElementById('dmTo').value,
      subject: document.getElementById('dmSubj').value,
      body: document.getElementById('dmBody').value
    });
    this.openInboxModal();
  },

  dict: [
    ['OFISI YA MHASIBU', 'ACCOUNTANT OFFICE'],
    ['OFISI YA MTAALUMA', 'ACADEMIC MASTER OFFICE'],
    ['DASHIBODI YA MWALIMU', 'TEACHER DASHBOARD'],
    ['MKUU WA SHULE', 'HEADMASTER OFFICE'],
    ['MKURUGENZI (DIRECTOR)', 'SCHOOL DIRECTOR'],
    ['TOVUTI YA MZAZI', 'PARENT PORTAL'],
    ['TOVUTI YA MWANAFUNZI', 'STUDENT PORTAL'],
    ['Toka (Logout)', 'Sign Out (Logout)'],
    ['Jina la Mwanafunzi', 'Student Full Name'],
    ['Mwanafunzi', 'Student'],
    ['Somo', 'Subject'],
    ['Darasa', 'Class'],
    ['Jumla', 'Total'],
    ['Daraja', 'Grade'],
    ['Pointi', 'Points'],
    ['Tarehe', 'Date'],
    ['Hali', 'Status'],
    ['Hatua', 'Action'],
    ['Kiasi (TZS)', 'Amount (TZS)'],
    ['Risiti Na.', 'Receipt No.'],
    ['Mchango', 'Category'],
    ['Njia', 'Method'],
    ['Bidhaa', 'Item Name'],
    ['Salio', 'Balance'],
    ['Tahadhari', 'Alert'],
    ['Inatosha', 'In Stock'],
    ['Kinakaribia Kuisha', 'Low Stock']
  ],

  toggleLang() {
    this.lang = this.lang === 'sw' ? 'en' : 'sw';
    localStorage.setItem('sgb_lang', this.lang);
    this.applyLanguage();
    this.notifySync(this.lang === 'en' ? '🌐 Language switched to English' : '🌐 Lugha imebadilishwa kuwa Kiswahili');
  },

  applyLanguage() {
    const toEn = this.lang === 'en';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      let txt = node.nodeValue;
      if (!txt || !txt.trim()) continue;
      this.dict.forEach(([sw, en]) => {
        if (toEn && txt.includes(sw)) txt = txt.replace(sw, en);
        else if (!toEn && txt.includes(en)) txt = txt.replace(en, sw);
      });
      node.nodeValue = txt;
    }
  },
  logAction(action) {
    const user = this.getUser();
    const logs = JSON.parse(localStorage.getItem('sgb_audit_logs') || '[]');
    logs.unshift({ time: new Date().toLocaleString('sw-TZ'), actor: user ? `${user.full_name} (${user.role})` : 'System', action });
    localStorage.setItem('sgb_audit_logs', JSON.stringify(logs.slice(0, 200)));
  },
  getUser() { return JSON.parse(sessionStorage.getItem('sgb_active_user') || 'null'); },
  requireRole(allowedRoles) {
    const u = this.getUser();
    if (!u || !allowedRoles.includes(u.role)) {
      alert('⛔ Huna ruhusa ya kufungua ukurasa huu. Tafadhali ingia na akaunti sahihi.');
      window.location.href = 'index.html';
      return null;
    }
    return u;
  },
  startSessionTimer() {
    let idle = 0;
    setInterval(() => {
      idle++;
      if (idle >= 20) { alert('⏳ Muda wa kikao (dakika 20) umeisha.'); this.logout(); }
    }, 60000);
    ['click', 'keypress', 'mousemove'].forEach(ev => document.addEventListener(ev, () => { idle = 0; }));
  },
  logout() {
    this.logAction('Ametoka kwenye mfumo (Logout)');
    sessionStorage.removeItem('sgb_active_user');
    window.location.href = 'index.html';
  },
  qrImg(text) {
    return `https://qrserver.com{encodeURIComponent(text)}`;
  }
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }

  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const netStatus = navigator.onLine
      ? '<span style="color:#059669;font-size:11px;font-weight:bold;">🟢 Online</span>'
      : '<span style="color:#d97706;font-size:11px;font-weight:bold;">🟠 Offline Mode</span>';
    const tools = document.createElement('div');
    tools.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; align-items:center;';
    tools.innerHTML = `
      ${netStatus}
      <button class="btn" style="background:#7c3aed;color:#fff;" onclick="SGB.openInboxModal()">💬 Ujumbe</button>
      <button class="btn" style="background:#0284c7;color:#fff;" onclick="SGB.liveRefresh()">🔄 Refresh</button>
      <button class="btn" style="background:#d97706;color:#fff;" onclick="SGB.toggleLang()">🌐 SW | EN</button>
      <button class="btn" style="background:#059669;color:#fff;" onclick="SGB.exportBackup()">💾 Backup</button>
      <button class="btn" style="background:#475569;color:#fff;" onclick="SGB.importBackup()">📂 Restore</button>
    `;
    if (topbar.lastElementChild && topbar.children.length > 1) {
      topbar.replaceChild(tools, topbar.lastElementChild);
    } else {
      topbar.appendChild(tools);
    }
  }
  setTimeout(() => SGB.applyLanguage(), 150);
});

window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('sgb_')) SGB.liveRefresh(true);
});
