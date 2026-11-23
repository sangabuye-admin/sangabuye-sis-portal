// INJINI KUU YA SANGABUYE SIS PORTAL (v6.0 - FIREBASE LIVE CLOUD SYNC + PWA)
const FIREBASE_DB_URL = 'https://sangabuye-sis-default-rtdb.firebaseio.com';

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
      if (syncEl) syncEl.innerText = ' • ☁️ Cloud Saved: ' + new Date().toLocaleTimeString();
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
      if (!silent) this.notifySync('☁️ Data zote zimesawazishwa na Cloud (Firebase)!');
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
    this.notifySync('✅ Imehifadhiwa & Kupandishwa Hewani (Cloud)!');
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
  findParentPhone(message) {
    const msgLower = (message || '').toLowerCase();
    const users = this.select('users_profile');
    const bus = this.select('school_bus_routes');

    for (const u of users) {
      if (u.full_name && msgLower.includes(u.full_name.toLowerCase()) && u.phone_number && /\d{9,}/.test(u.phone_number)) {
        return u.phone_number;
      }
    }
    for (const b of bus) {
      if (b.student_name && msgLower.includes(b.student_name.toLowerCase()) && b.phone && /\d{9,}/.test(b.phone)) {
        return b.phone;
      }
    }
    return '';
  },

  formatPhone(rawPhone, message = '') {
    let detected = rawPhone || this.findParentPhone(message);
    let p = (detected || '').replace(/\D/g, '');
    if (!p) {
      p = (prompt('Ingiza namba ya simu ya Mzazi (Mfano: 0755123456):') || '').replace(/\D/g, '');
    } else {
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
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 160, 160);
        callback(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  liveRefresh(silent = false) {
    this.pullFromCloud(silent);
    const activeMenu = document.querySelector('.menu-btn.active');
    if (activeMenu) activeMenu.click();
    this.applyLanguage();
    if (!silent) this.notifySync(this.lang === 'en' ? '☁️ Synced with Cloud!' : '☁️ Data zote zimesawazishwa hewani!');
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
    const jsonStr = JSON.stringify(backup);

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Sangabuye_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}

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
        <h3 style="margin:0 0 8px;color:#0f294a;">💾 Nakala ya Data Zako (Backup Code)</h3>
        <p style="font-size:12px;color:#475569;">Bofya <b>Nakili (Copy)</b> kunakili data zako, au bofya <b>☁️ Pandisha Zote Cloud</b> kuzipeleka moja kwa moja kwenye Firebase:</p>
        <textarea id="bkOutText" rows="5" readonly style="width:100%;font-size:11px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;">${jsonStr}</textarea><br><br>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="SGB.copyBackupText()" style="background:#059669;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">📋 Nakili (Copy)</button>
          <button onclick="SGB.pushAllLocalToCloud()" style="background:#1d4ed8;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">☁️ Pandisha Zote Cloud</button>
          <button onclick="document.getElementById('sgbBackupModal').style.display='none'" style="background:#dc2626;color:#fff;border:none;padding:9px 12px;border-radius:6px;font-weight:bold;cursor:pointer;">✕ Funga</button>
        </div>
      </div>`;
  },

  pushAllLocalToCloud() {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sgb_')) {
        this.pushToCloud(k.replace('sgb_', ''));
      }
    }
    alert('☁️ Data zote za kwenye kifaa hiki zimepandishwa hewani (Firebase Cloud)!');
  },

  copyBackupText() {
    const el = document.getElementById('bkOutText');
    el.select();
    el.setSelectionRange(0, 999999);
    if (navigator.clipboard) navigator.clipboard.writeText(el.value).catch(() => {});
    document.execCommand('copy');
    alert('✅ Data zimenakiliwa (Copied)!');
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
        <p style="font-size:12px;color:#475569;">Bandika (Paste) maandishi ya Backup hapa chini AU chagua faili la <code>.json</code>:</p>
        <textarea id="bkInText" rows="5" placeholder="Bandika (Paste) kodi ya Backup hapa..." style="width:100%;font-size:11px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;"></textarea><br><br>
        <input type="file" id="bkFileInp" accept=".json" style="margin-bottom:12px;">
        <div style="display:flex;gap:8px;">
          <button onclick="SGB.processRestoreText()" style="background:#1d4ed8;color:#fff;border:none;padding:9px 14px;border-radius:6px;font-weight:bold;cursor:pointer;">✅ Rudisha & Pandisha Cloud</button>
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
      if (!raw) { alert('⚠️ Bandika maandishi ya Backup au chagua faili kwanza.'); return; }
      const parsed = JSON.parse(raw);
      const records = parsed.data || parsed;
      Object.keys(records).forEach(k => {
        if (k.startsWith('sgb_')) {
          localStorage.setItem(k, JSON.stringify(records[k]));
          this.pushToCloud(k.replace('sgb_', ''));
        }
      });
      document.getElementById('sgbRestoreModal').style.display = 'none';
      alert('✅ Data zote zimerudishwa na kupandishwa hewani (Cloud)!');
      this.liveRefresh(true);
    } catch (err) {
      alert('❌ Maandishi au faili la Backup si sahihi: ' + err.message);
    }
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
        <p><b>🏫 Shule:</b> Sangabuye Secondary School (S.L.P 11898, Ilemela - Mwanza)</p>
        <p><b>📞 Mkuu wa Shule:</b> 0784 755 173 | <b>Mhasibu:</b> 0615 000 305</p>
        <p><b>🏦 Akaunti ya Benki:</b> CRDB <code>0150838972100</code> (SHULE YA SEKONDARI SANGABUYE E.K)</p>
        <hr>
        <p><b>1. Live Cloud Sync (Firebase):</b> Taarifa zote zinahifadhiwa hewani moja kwa moja na kuonekana kwenye simu na kompyuta zote za shule.</p>
        <p><b>2. Kuweka Kwenye Simu Kama App:</b> Kwenye Chrome (Android) bofya vidoti vitatu (⋮) kisha <i>Add to Home screen / Install app</i>. Kwenye iPhone (Safari) bofya <i>Share ➔ Add to Home Screen</i>.</p>
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
    ['Salio', 'Balance']
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

SGB.pullFromCloud(true);
setInterval(() => SGB.pullFromCloud(true), 12000);

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
      ? '<span style="color:#059669;font-size:11px;font-weight:bold;">☁️ Cloud Online</span>'
      : '<span style="color:#d97706;font-size:11px;font-weight:bold;">🟠 Offline Mode</span>';
    const tools = document.createElement('div');
    tools.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; align-items:center;';
    tools.innerHTML = `
      ${netStatus}
      <button class="btn" style="background:#0f294a;color:#fff;" onclick="SGB.openHelpModal()">❓ Msaada</button>
      <button class="btn" style="background:#7c3aed;color:#fff;" onclick="SGB.openInboxModal()">💬 Ujumbe</button>
      <button class="btn" style="background:#0284c7;color:#fff;" onclick="SGB.liveRefresh()">🔄 Sync</button>
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
