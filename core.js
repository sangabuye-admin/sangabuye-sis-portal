// INJINI KUU YA SANGABUYE SIS PORTAL (v7.0 - FFARS, FULL BILINGUAL, CLOUD SYNC, BACKUP & TOPBAR LOGOUT)
const FIREBASE_DB_URL = 'https://firebaseio.com';

const SGB = {
  lang: localStorage.getItem('sgb_lang') || 'sw',

  pushToCloud(table) {
    if (!navigator.onLine) return;
    const raw = localStorage.getItem('sgb_' + table);
    if (!raw) return;
    fetch(`${FIREBASE_DB_URL}/sgb_${table}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: raw
    }).then(() => {
      const syncEl = document.getElementById('syncTime');
      if (syncEl) syncEl.innerText = ' • ☁️ Cloud Live: ' + new Date().toLocaleTimeString();
    }).catch(() => {});
  },

  async pullFromCloud(silent = true) {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/.json`);
      if (!res.ok) return;
      const cloudData = await res.json();
      if (cloudData && typeof cloudData === 'object') {
        let changed = false;
        Object.keys(cloudData).forEach(k => {
          if (k.startsWith('sgb_') && cloudData[k] !== null) {
            const incoming = JSON.stringify(cloudData[k]);
            if (localStorage.getItem(k) !== incoming) {
              localStorage.setItem(k, incoming);
              changed = true;
            }
          }
        });
        const syncEl = document.getElementById('syncTime');
        if (syncEl) syncEl.innerText = ' • ☁️ Cloud Live: ' + new Date().toLocaleTimeString();
        if (changed) {
          const activeMenu = document.querySelector('.menu-btn.active');
          if (activeMenu) activeMenu.click();
          setTimeout(() => this.applyLanguage(), 100);
        }
      }
      if (!silent) this.notifySync(this.lang === 'en' ? '☁️ System & Cloud Refreshed!' : '☁️ Mfumo na Data Zimesasishwa!');
    } catch (e) {}
  },

  insert(table, item) {
    item.id = Date.now() + Math.floor(Math.random() * 100);
    item.created_at = new Date().toLocaleString('sw-TZ');
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
    list.unshift(item);
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.pushToCloud(table);
    this.logAction(`Ameongeza taarifa kwenye ${table}`);
    this.notifySync('✅ Imehifadhiwa & Kupandishwa Hewani!');
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
    this.pushToCloud(table);
    this.logAction(`Amebadilisha taarifa kwenye ${table} (ID: ${id})`);
    this.notifySync('✅ Mabadiliko yamehifadhiwa hewani!');
  },

  getConfig() {
    return JSON.parse(localStorage.getItem('sgb_school_config') || '{"year":"2026","term":"Term I","crdb":"0150838972100"}');
  },
  numberToWords(num) {
    num = Math.floor(Number(num) || 0);
    if (num === 0) return 'Zero shillings and zero cents only';
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const convert = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    };
    return convert(num) + ' shillings and zero cents only';
  },

  findParentPhone(message) {
    const msgLower = (message || '').toLowerCase();
    for (const u of this.select('users_profile')) {
      if (u.full_name && msgLower.includes(u.full_name.toLowerCase()) && u.phone_number && /\d{9,}/.test(u.phone_number)) return u.phone_number;
    }
    for (const b of this.select('school_bus_routes')) {
      if (b.student_name && msgLower.includes(b.student_name.toLowerCase()) && b.phone && /\d{9,}/.test(b.phone)) return b.phone;
    }
    return '';
  },

  formatPhone(rawPhone, message = '') {
    let detected = rawPhone || this.findParentPhone(message);
    let p = (detected || '').replace(/\D/g, '');
    if (!p) p = (prompt('Ingiza namba ya simu ya Mzazi (Mfano: 0755123456):') || '').replace(/\D/g, '');
    else {
      const confirmed = prompt('Thibitisha au badilisha namba ya simu ya Mzazi:', detected);
      if (confirmed === null) return null;
      p = confirmed.replace(/\D/g, '');
    }
    if (!p) return null;
    if (p.startsWith('0')) p = '255' + p.slice(1);
    return p;
  },

  sendWhatsApp(rawPhone, message) {
    const phone = this.formatPhone(rawPhone, message);
    if (!phone) return;
    this.insert('comms_logs', { channel: 'WhatsApp', phone, message });
    window.open(`https://wa.me{phone}?text=${encodeURIComponent(message)}`, '_blank');
  },

  sendSMS(rawPhone, message) {
    const phone = this.formatPhone(rawPhone, message);
    if (!phone) return;
    const localNum = phone.startsWith('255') ? '0' + phone.slice(3) : phone;
    this.insert('comms_logs', { channel: 'SMS', phone: localNum, message });
    window.location.href = `sms:${localNum}?body=${encodeURIComponent(message)}`;
  },

  compressPhoto(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160; canvas.height = 160;
        canvas.getContext('2d').drawImage(img, 0, 0, 160, 160);
        callback(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async liveRefresh(silent = false) {
    await this.pullFromCloud(silent);
    const activeMenu = document.querySelector('.menu-btn.active');
    if (activeMenu) activeMenu.click();
    setTimeout(() => this.applyLanguage(), 120);
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
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sgb_')) {
        try { backup.data[k] = JSON.parse(localStorage.getItem(k)); count++; } catch (e) {}
      }
    }
    const jsonStr = JSON.stringify(backup, null, 2);
    const fileName = 'Sangabuye_Backup_' + new Date().toISOString().slice(0, 10) + '.json';

    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    let modal = document.getElementById('sgbBackupModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sgbBackupModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10002;display:flex;justify-content:center;align-items:center;padding:15px;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#fff;width:100%;max-width:500px;border-radius:12px;padding:18px;">
        <h3 style="margin:0 0 8px;color:#0f294a;">💾 Backup Imepakuliwa (Majedwali ${count})</h3>
        <p style="font-size:12px;color:#475569;">Faili <b>${fileName}</b> limepakuliwa. Unaweza pia kunakili (Copy) maandishi haya au kuyapandisha Cloud:</p>
        <textarea id="bkOutText" rows="5" readonly style="width:100%;font-size:11px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;">${jsonStr}</textarea><br><br>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="SGB.copyBackupText()" style="background:#059669;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">📋 Nakili (Copy)</button>
          <button onclick="SGB.pushAllLocalToCloud()" style="background:#1d4ed8;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">☁️ Pandisha Cloud</button>
          <button onclick="document.getElementById('sgbBackupModal').style.display='none'" style="background:#dc2626;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">✕ Funga</button>
        </div>
      </div>`;
  },

  pushAllLocalToCloud() {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sgb_')) this.pushToCloud(k.replace('sgb_', ''));
    }
    alert('☁️ Data zote zimepandishwa hewani (Firebase Cloud)!');
  },

  copyBackupText() {
    const el = document.getElementById('bkOutText');
    el.select(); el.setSelectionRange(0, 999999);
    if (navigator.clipboard) navigator.clipboard.writeText(el.value).catch(() => {});
    document.execCommand('copy');
    alert('✅ Backup imenakiliwa (Copied)!');
  },

  importBackup() {
    let modal = document.getElementById('sgbRestoreModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sgbRestoreModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10002;display:flex;justify-content:center;align-items:center;padding:15px;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#fff;width:100%;max-width:500px;border-radius:12px;padding:18px;">
        <h3 style="margin:0 0 8px;color:#0f294a;">📂 Rudisha Data Zako (Restore)</h3>
        <textarea id="bkInText" rows="5" placeholder="Bandika (Paste) kodi ya Backup hapa au chagua faili..." style="width:100%;font-size:11px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;"></textarea><br><br>
        <input type="file" id="bkFileInp" accept=".json" style="margin-bottom:12px;">
        <div style="display:flex;gap:8px;">
          <button onclick="SGB.processRestoreText()" style="background:#1d4ed8;color:#fff;border:none;padding:9px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">✅ Rudisha Data Sasa</button>
          <button onclick="document.getElementById('sgbRestoreModal').style.display='none'" style="background:#dc2626;color:#fff;border:none;padding:9px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">✕ Funga</button>
        </div>
      </div>`;
    document.getElementById('bkFileInp').onchange = (e) => {
      const file = e.target.files;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { document.getElementById('bkInText').value = ev.target.result; };
      reader.readAsText(file);
    };
  },

  processRestoreText() {
    try {
      const raw = document.getElementById('bkInText').value.trim();
      if (!raw) { alert('⚠️ Bandika maandishi au chagua faili kwanza.'); return; }
      const parsed = JSON.parse(raw);
      const records = parsed.data || parsed;
      Object.keys(records).forEach(k => {
        if (k.startsWith('sgb_')) {
          localStorage.setItem(k, JSON.stringify(records[k]));
          this.pushToCloud(k.replace('sgb_', ''));
        }
      });
      document.getElementById('sgbRestoreModal').style.display = 'none';
      alert('✅ Data zote zimerudishwa kikamilifu!');
      this.liveRefresh(true);
    } catch (err) { alert('❌ Faili la Backup si sahihi: ' + err.message); }
  },
  openHelpModal() {
    let modal = document.getElementById('sgbHelpModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sgbHelpModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:10001;display:flex;justify-content:center;align-items:center;padding:15px;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:#fff;width:100%;max-width:520px;border-radius:12px;padding:20px;max-height:85vh;overflow-y:auto;line-height:1.6;font-size:13px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;color:#0f294a;">❓ Mwongozo wa Haraka — Sangabuye SIS</h3>
          <button onclick="document.getElementById('sgbHelpModal').style.display='none'" style="background:#dc2626;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;">✕ Funga</button>
        </div>
        <p><b>🏫 Shule:</b> Halmashauri ya Manispaa ya Ilemela — Shule ya Sekondari Sangabuye (S.L.P 11898, Mwanza)</p>
        <p><b>📞 Mkuu wa Shule:</b> 0784 755 173 | <b>Mhasibu:</b> 0615 000 305</p>
        <p><b>🏦 CRDB Bank:</b> <code>0150838972100</code> (SHULE YA SEKONDARI SANGABUYE E.K)</p>
      </div>`;
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
            <option value="Mkuu wa Shule">Mkuu wa Shule (0784 755 173)</option>
            <option value="Mhasibu">Mhasibu (0615 000 305)</option>
            <option value="Mtaaluma">Mtaaluma (Academic)</option>
            <option value="Walimu">Walimu</option>
            <option value="Wazazi">Wazazi</option>
          </select>
          <input type="text" id="dmSubj" required placeholder="Kichwa / Jina la Mwanafunzi" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
          <textarea id="dmBody" rows="2" required placeholder="Andika ujumbe wako hapa..." style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;"></textarea>
          <button type="submit" style="background:#1d4ed8;color:#fff;border:none;padding:9px;border-radius:6px;font-weight:bold;cursor:pointer;">📤 Tuma Ujumbe</button>
        </form>
        <div style="font-size:12.5px;">
          ${msgs.slice(0, 15).map(m => `<div style="border-bottom:1px solid #e2e8f0;padding:8px 0;"><b>${m.sender} ➔ ${m.recipient}</b> <small>(${m.created_at})</small><br><u>${m.subject}:</u> ${m.body}</div>`).join('') || '<p>Hakuna ujumbe wowote bado.</p>'}
        </div>
      </div>`;
  },

  sendDirectMsg(e) {
    e.preventDefault();
    const u = this.getUser();
    this.insert('direct_messages', { sender: u ? u.full_name : 'Mtumiaji', recipient: document.getElementById('dmTo').value, subject: document.getElementById('dmSubj').value, body: document.getElementById('dmBody').value });
    this.openInboxModal();
  },

  dict: [
    ['OFISI YA MHASIBU', 'ACCOUNTANT OFFICE'], ['OFISI YA MTAALUMA', 'ACADEMIC MASTER OFFICE'],
    ['DASHIBODI YA MWALIMU', 'TEACHER DASHBOARD'], ['MKUU WA SHULE', 'HEADMASTER OFFICE'],
    ['MKURUGENZI (DIRECTOR)', 'SCHOOL DIRECTOR'], ['TOVUTI YA MZAZI', 'PARENT PORTAL'],
    ['TOVUTI YA MWANAFUNZI', 'STUDENT PORTAL'], ['MAKTABA YA SHULE', 'SCHOOL LIBRARY'],
    ['MABWENI & ZAHANATI', 'HOSTELS & SICKBAY'], ['Muhtasari (Fedha & Stoo)', 'Summary (Finance & Store)'],
    ['Mapokezi (Kapu la Michango)', 'Receipts (Fee Basket)'], ['Taarifa Kwa Mzazi & Wadaiwa', 'Parent Statement & Defaulters'],
    ['Viwango vya Ada, Kambi & Basi', 'Fee Structures, Camp & Bus'], ['Matumizi & FFARS PV', 'Expenses & FFARS PV'],
    ['Kamati ya Manunuzi', 'Procurement Committee'], ['Mishahara (Pre-Audit & Slip)', 'Payroll (Pre-Audit & Slip)'],
    ['Masurufu (Imprest) & Petty Cash', 'Staff Imprest & Petty Cash'], ['Ruzuku (Capitation Grant)', 'Government Capitation Grant'],
    ['Bajeti vs Utekelezaji', 'Budget vs Actual Variance'], ['Stoo ya Vyakula & Vifaa', 'Food & Equipment Store'],
    ['Daftari la Mali (Fixed Assets)', 'Fixed Assets Register'], ['Ripoti, Funga Hesabu & Clearance', 'Reports, Lock & Clearance'],
    ['Jina la Mwanafunzi', 'Student Full Name'], ['Namba ya Usajili', 'Registration Number'],
    ['Simu ya Mzazi', 'Parent Phone'], ['Aina ya Malipo', 'Payment Category'],
    ['Kiasi Kilicholipwa', 'Amount Paid'], ['Salio / Deni', 'Balance / Debt'],
    ['Chanzo cha Pato', 'Revenue Source'], ['Kiasi (TZS)', 'Amount (TZS)'],
    ['Tarehe', 'Date'], ['Hali', 'Status'], ['Hatua', 'Action'], ['Mtumishi', 'Staff Member'],
    ['Kazi', 'Job Title'], ['Bidhaa', 'Item Name'], ['Salio', 'Balance'], ['Mwanafunzi', 'Student']
  ],
  toggleLang() {
    this.lang = this.lang === 'sw' ? 'en' : 'sw';
    localStorage.setItem('sgb_lang', this.lang);
    this.applyLanguage();
    this.notifySync(this.lang === 'en' ? '🌐 Full System Switched to English' : '🌐 Mfumo Mzima Umebadilishwa Kuwa Kiswahili');
  },

  applyLanguage() {
    const toEn = this.lang === 'en';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      let txt = node.nodeValue;
      if (!txt || !txt.trim()) continue;
      this.dict.forEach(([sw, en]) => {
        if (toEn && txt.includes(sw)) txt = txt.split(sw).join(en);
        else if (!toEn && txt.includes(en)) txt = txt.split(en).join(sw);
      });
      node.nodeValue = txt;
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      let ph = el.getAttribute('placeholder');
      this.dict.forEach(([sw, en]) => {
        if (toEn && ph.includes(sw)) ph = ph.split(sw).join(en);
        else if (!toEn && ph.includes(en)) ph = ph.split(en).join(sw);
      });
      el.setAttribute('placeholder', ph);
    });
  },

  logAction(action) {
    const user = this.getUser();
    const logs = JSON.parse(localStorage.getItem('sgb_audit_logs') || '[]');
    logs.unshift({ time: new Date().toLocaleString('sw-TZ'), actor: user ? `${user.full_name} (${user.role})` : 'System', action });
    localStorage.setItem('sgb_audit_logs', JSON.stringify(logs.slice(0, 200)));
    this.pushToCloud('audit_logs');
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
    setInterval(() => { idle++; if (idle >= 20) { alert('⏳ Muda wa kikao umeisha.'); this.logout(); } }, 60000);
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

SGB.pullFromCloud(true);
setInterval(() => SGB.pullFromCloud(true), 12000);

window.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest'; link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const netStatus = navigator.onLine
      ? '<span style="color:#059669;font-size:11px;font-weight:bold;">☁️ Cloud Online</span>'
      : '<span style="color:#d97706;font-size:11px;font-weight:bold;">🟠 Offline Mode</span>';
    const tools = document.createElement('div');
    tools.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; align-items:center;';
    tools.innerHTML = `
      ${netStatus}
      <button class="btn" style="background:#0f294a;color:#fff;" onclick="SGB.openHelpModal()">❓ Msaada</button>
      <button class="btn" style="background:#7c3aed;color:#fff;" onclick="SGB.openInboxModal()">💬 Ujumbe</button>
      <button class="btn" style="background:#0284c7;color:#fff;" onclick="SGB.liveRefresh(false)">🔄 Refresh</button>
      <button class="btn" style="background:#d97706;color:#fff;" onclick="SGB.toggleLang()">🌐 SW | EN</button>
      <button class="btn" style="background:#059669;color:#fff;" onclick="SGB.exportBackup()">💾 Backup</button>
      <button class="btn" style="background:#475569;color:#fff;" onclick="SGB.importBackup()">📂 Restore</button>
      <button class="btn" style="background:#dc2626;color:#fff;" onclick="SGB.logout()">🚪 Logout</button>
    `;
    if (topbar.lastElementChild && topbar.children.length > 1) topbar.replaceChild(tools, topbar.lastElementChild);
    else topbar.appendChild(tools);
  }
  setTimeout(() => SGB.applyLanguage(), 150);
});
