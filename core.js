// INJINI KUU YA SANGABUYE SIS PORTAL (v5.0 COMPREHENSIVE)
const SGB = {
  // 1. Hifadhi na Usomaji wa Data
  insert(table, item) {
    item.id = Date.now();
    item.created_at = new Date().toLocaleString('sw-TZ');
    const list = JSON.parse(localStorage.getItem('sgb_' + table) || '[]');
    list.unshift(item);
    localStorage.setItem('sgb_' + table, JSON.stringify(list));
    this.logAction(`Ameongeza taarifa kwenye ${table}`);
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
  },
  // 2. Audit Logs (Sehemu ya 4)
  logAction(action) {
    const user = this.getUser();
    const logs = JSON.parse(localStorage.getItem('sgb_audit_logs') || '[]');
    logs.unshift({
      time: new Date().toLocaleString('sw-TZ'),
      actor: user ? `${user.full_name} (${user.role})` : 'System',
      action
    });
    localStorage.setItem('sgb_audit_logs', JSON.stringify(logs.slice(0, 200)));
  },
  // 3. Usimamizi wa Mtumiaji & Ulinzi wa Ukurasa (RBAC)
  getUser() {
    return JSON.parse(sessionStorage.getItem('sgb_active_user') || 'null');
  },
  requireRole(allowedRoles) {
    const u = this.getUser();
    if (!u || !allowedRoles.includes(u.role)) {
      alert('⛔ Huna ruhusa ya kufungua ukurasa huu. Tafadhali ingia na akaunti sahihi.');
      window.location.href = 'index.html';
      return null;
    }
    return u;
  },
  logout() {
    this.logAction('Ametoka kwenye mfumo (Logout)');
    sessionStorage.removeItem('sgb_active_user');
    window.location.href = 'index.html';
  },
  // 4. Auto-Logout baada ya dakika 20 (Sehemu ya 4)
  startSessionTimer() {
    let idle = 0;
    setInterval(() => {
      idle++;
      if (idle >= 20) {
        alert('⏳ Muda wa kikao (dakika 20 bila kutumia mfumo) umeisha kwa usalama wa data.');
        this.logout();
      }
    }, 60000);
    ['click', 'keypress', 'mousemove'].forEach(ev => document.addEventListener(ev, () => { idle = 0; }));
  },
  // 5. QR Code Generator (Sehemu ya 4)
  qrImg(text) {
    return `https://qrserver.com{encodeURIComponent(text)}`;
  }
};
