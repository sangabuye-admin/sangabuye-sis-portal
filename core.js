// INJINI KUU YA SANGABUYE SIS PORTAL (v5.2 - FIXED & STABLE)
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
    else if (typeof renderStudentPortal === 'function') renderStudentPortal();
    else if (typeof loadChild === 'function' && document.getElementById('childInput') && document.getElementById('childInput').value) loadChild();
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

window.addEventListener('DOMContentLoaded', () => {
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const tools = document.createElement('div');
    tools.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap;';
    tools.innerHTML = `
      <button class="btn" style="background:#0284c7;color:#fff;" onclick="SGB.liveRefresh()">🔄 Live Refresh</button>
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
