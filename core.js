// INJINI KUU YA SANGABUYE SIS PORTAL (v5.1 - LIVE SYNC, FULL BILINGUAL & GLOBAL BACKUP)
const SGB = {
  lang: localStorage.getItem('sgb_lang') || 'sw',

  // 1. HIFADHI NA USOMAJI WA DATA
  insert(table, item) {
    item.id = Date.now() + Math.floor(Math.random() * 100);
    item.created_at = new Date().toLocaleString('sw-TZ');
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
    list.unshift(item);
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.logAction(`Ameongeza taarifa kwenye ${table}`);
    this.notifySync('Data zimehifadhiwa na kusasishwa!');
    return item;
  },
  select(table) {
      getConfig() {
    return JSON.parse(localStorage.getItem('sgb_school_config') || '{"year":"2026","term":"Term I","crdb":"0150838972100"}');
  },

    return JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
  },
  update(table, id, changes) {
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]').map(x =>
      String(x.id) === String(id) ? { ...x, ...changes } : x
    );
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.logAction(`Amebadilisha taarifa kwenye ${table} (ID: ${id})`);
    this.notifySync('Mabadiliko yamehifadhiwa!');
  },

  // 2. LIVE REFRESH & REAL-TIME SYNC
  liveRefresh(silent = false) {
    const activeMenu = document.querySelector('.menu-btn.active');
    if (activeMenu) {
      activeMenu.click();
    } else if (typeof renderStudentPortal === 'function') {
      renderStudentPortal();
    } else if (typeof loadChild === 'function' && document.getElementById('childInput')?.value) {
      loadChild();
    }
    const syncEl = document.getElementById('syncTime');
    if (syncEl) syncEl.innerText = ` • Live synced: ${new Date().toLocaleTimeString()}`;
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

  // 3. BACKUP & RESTORE YA MFUMO MZIMA
  exportBackup() {
    const backup = { portal: 'Sangabuye SIS Portal', exported_at: new Date().toISOString(), data: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('sgb_')) backup.data[k] = JSON.parse(localStorage.getItem(k));
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Sangabuye_SIS_Backup_${new Date().toISOString().slice(0,10)}.json`;
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
  // 4. MFUMO WA LUGHA MBILI KWA TAARIFA ZOTE (BILINGUAL ENGINE: SW | EN)
  dict: [
    ['OFISI YA MHASIBU', 'ACCOUNTANT OFFICE'],
    ['OFISI YA MTAALUMA', 'ACADEMIC MASTER OFFICE'],
    ['DASHIBODI YA MWALIMU', 'TEACHER DASHBOARD'],
    ['MKUU WA SHULE', 'HEADMASTER OFFICE'],
    ['MKURUGENZI (DIRECTOR)', 'SCHOOL DIRECTOR'],
    ['IT & SUPER ADMIN', 'IT & SUPER ADMIN'],
    ['TOVUTI YA MZAZI', 'PARENT PORTAL'],
    ['TOVUTI YA MWANAFUNZI', 'STUDENT PORTAL'],
    ['Muhtasari wa Fedha & CRDB', 'Finance & CRDB Summary'],
    ['Mapokezi & Risiti (58/80mm)', 'Receipts & POS (58/80mm)'],
    ['Stoo ya Vyakula & Mali', 'Food & Store Inventory'],
    ['Taarifa ya Michango (PDF)', 'Contribution Statement (PDF)'],
    ['Kikao cha Manunuzi', 'Procurement Committee'],
    ['Bank-Style Statement & Matumizi', 'Bank-Style Statement & Expenses'],
    ['Uhakiki wa Kuhama (Clearance)', 'Student Clearance Checklist'],
    ['1. Usimamizi wa Mitihani & Publish', '1. Exam Management & Publish'],
    ['2. Master Sheet (O & A-Level NECTA)', '2. Master Sheet (O & A-Level NECTA)'],
    ['3. Viti 40 (Real Mix), ISAL & CAL', '3. 40-Seat Rooms, ISAL & CAL'],
    ['4. Kijinsia (M/F), GPA & Remedial', '4. Gender (M/F), GPA & Remedial'],
    ['5. Ripoti Binafsi (A4 PDF)', '5. Student Report Card (A4 PDF)'],
    ['6. Tahasusi & Masomo ya Hiari', '6. Combinations & Subject Allocation'],
    ['7. Smart Timetable (Clash-Free)', '7. Smart Timetable (Clash-Free)'],
    ['8. Transfer Cert & Bulk Marks', '8. Transfer Cert & Bulk Marks'],
    ['1. Masomo & Madarasa Yangu', '1. My Allocated Subjects & Classes'],
    ['2. Jedwali la Alama (Darasa Zima)', '2. Bulk Class Marks Grid'],
    ['3. Mitihani Binafsi ya Somo', '3. Private Subject Tests'],
    ['4. Assignments, CBT & Sahihisha', '4. Assignments, CBT & Grading'],
    ['5. Mahudhurio & Benki ya Maswali', '5. Digital Roll Call & Question Bank'],
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
    ['Kinakaribia Kuisha', 'Low Stock'],
    ['Hakuna alama bado.', 'No marks recorded yet.'],
    ['Hakuna miamala bado.', 'No transactions recorded yet.']
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

  // 5. AUDIT LOGS, SECURITY & AUTO-TOOLBAR
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

// UNGANISHA LIVE REFRESH, BACKUP/RESTORE & LUGHA KWENYE KILA UKURASA KIOTOMATIKI
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

// Sasisha tabo zingine zilizofunguliwa papo hapo (Cross-Tab Live Sync)
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('sgb_')) SGB.liveRefresh(true);
});
