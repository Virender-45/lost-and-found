const api = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const showMessage = (element, message, isError = false) => {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? '#c0392b' : '#21845e';
};

async function currentUser() {
  try { return (await api('/api/auth/me')).user; } catch { return null; }
}

async function addAuthNavigation() {
  const nav = document.querySelector('.nav-links');
  if (!nav || document.querySelector('#authNav') || document.querySelector('#logoutButton') || document.querySelector('#loginForm') || document.querySelector('#registerForm')) return;
  const user = await currentUser();
  const wrapper = document.createElement('span');
  wrapper.id = 'authNav';
  wrapper.className = 'auth-nav';
  if (!user) {
    wrapper.innerHTML = '<a href="login.html">Login</a><a href="register.html">Register</a>';
  } else {
    const target = user.role === 'admin' ? 'admin.html' : 'user-dashboard.html';
    wrapper.innerHTML = `<a href="${target}">${user.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}</a><button class="nav-button" id="navLogout">Logout</button>`;
  }
  nav.appendChild(wrapper);
  document.querySelector('#navLogout')?.addEventListener('click', logout);
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } finally { location.href = 'index.html'; }
}

document.querySelector('#logoutButton')?.addEventListener('click', logout);

document.querySelector('#loginForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#message');
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: document.querySelector('#email').value, password: document.querySelector('#password').value }) });
    location.href = result.user.role === 'admin' ? 'admin.html' : 'user-dashboard.html';
  } catch (error) { showMessage(message, error.message, true); }
});

document.querySelector('#registerForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#message');
  try {
    const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: document.querySelector('#name').value, email: document.querySelector('#email').value, password: document.querySelector('#password').value }) });
    showMessage(message, result.message);
    location.href = 'user-dashboard.html';
  } catch (error) { showMessage(message, error.message, true); }
});

// Only signed-in users can submit reports. The backend enforces this too.
async function setupReportForm() {
  const form = document.querySelector('#itemForm');
  if (!form) return;
  const user = await currentUser();
  if (!user) {
    const msg = document.querySelector('#message');
    showMessage(msg, 'Please log in before submitting a report. Redirecting to login...');
    setTimeout(() => { location.href = 'login.html'; }, 900);
    form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
    return;
  }
  const statusFromUrl = new URLSearchParams(location.search).get('status');
  if (['Lost', 'Found'].includes(statusFromUrl)) document.querySelector('#status').value = statusFromUrl;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = Object.fromEntries(['itemName', 'category', 'description', 'location', 'date', 'contact', 'status'].map(id => [id, document.getElementById(id).value.trim()]));
    try {
      const result = await api('/api/items', { method: 'POST', body: JSON.stringify(payload) });
      showMessage(document.querySelector('#message'), result.message);
      form.reset();
    } catch (error) { showMessage(document.querySelector('#message'), error.message, true); }
  });
}

function renderItemCard(item, options = {}) {
  const card = document.createElement('article');
  card.className = 'item-card';
  const approval = options.showApproval ? `<p><strong>Approval:</strong> ${escapeHTML(item.approvalStatus)}</p>` : '';
  const resolution = `<p><strong>Case:</strong> ${escapeHTML(item.resolutionStatus || 'Open')}</p>`;
  const owner = item.reportedBy?.name ? `<p><strong>Reported by:</strong> ${escapeHTML(item.reportedBy.name)}</p>` : '';
  const deleteButton = options.canDelete ? `<button class="danger-btn" data-delete-item="${escapeHTML(item._id)}">Delete report</button>` : '';
  card.innerHTML = `<h3>${escapeHTML(item.itemName)}</h3><p><strong>Category:</strong> ${escapeHTML(item.category)}</p><p><strong>Description:</strong> ${escapeHTML(item.description)}</p><p><strong>Location:</strong> ${escapeHTML(item.location)}</p><p><strong>Date:</strong> ${escapeHTML(String(item.date).slice(0, 10))}</p><p><strong>Contact:</strong> ${escapeHTML(item.contact)}</p>${owner}${approval}${resolution}<span class="status ${item.status === 'Lost' ? 'lost' : 'found'}">${escapeHTML(item.status)}</span><div class="card-actions">${deleteButton}</div>`;
  return card;
}

async function loadPublicItems() {
  const list = document.querySelector('#itemList');
  if (!list) return;
  async function refresh() {
    list.replaceChildren();
    list.innerHTML = '<p>Loading reported items...</p>';
    try {
      const status = document.querySelector('#filterStatus')?.value || 'All';
      const query = status === 'All' ? '' : `?status=${encodeURIComponent(status)}`;
      const { items } = await api(`/api/items${query}`);
      list.replaceChildren();
      if (!items.length) { list.innerHTML = '<p>No approved reports found.</p>'; return; }
      items.forEach(item => list.appendChild(renderItemCard(item)));
    } catch (error) { list.textContent = error.message; }
  }
  document.querySelector('#filterStatus')?.addEventListener('change', refresh);
  await refresh();
}

async function loadMyReports() {
  const list = document.querySelector('#myItems');
  if (!list) return;
  try {
    const user = await currentUser();
    if (!user) { location.href = 'login.html'; return; }
    const { items } = await api('/api/items/mine');
    list.replaceChildren();
    if (!items.length) { list.innerHTML = '<p>You have not submitted any reports yet.</p>'; return; }
    items.forEach(item => list.appendChild(renderItemCard(item, { showApproval: true, canDelete: true })));
    list.querySelectorAll('[data-delete-item]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Delete this report?')) return;
      try { await api(`/api/items/${button.dataset.deleteItem}`, { method: 'DELETE' }); await loadMyReports(); }
      catch (error) { alert(error.message); }
    }));
  } catch (error) { list.textContent = error.message; }
}

async function loadUserDashboard() {
  const welcome = document.querySelector('#welcomeText');
  if (!welcome) return;
  const user = await currentUser();
  if (!user) { location.href = 'login.html'; return; }
  if (user.role === 'admin') { location.href = 'admin.html'; return; }
  welcome.textContent = `Welcome, ${user.name}. You are logged in as a user.`;
}

async function loadAdminDashboard() {
  const summary = document.querySelector('#adminSummary');
  if (!summary) return;
  const user = await currentUser();
  if (!user) { location.href = 'login.html'; return; }
  if (user.role !== 'admin') { location.href = 'user-dashboard.html'; return; }
  try {
    const counts = await api('/api/admin/summary');
    summary.innerHTML = [['Total users', counts.users], ['Total reports', counts.items], ['Pending approval', counts.pending], ['Approved reports', counts.approved], ['Resolved cases', counts.resolved]].map(([label, count]) => `<div class="summary-card"><span>${escapeHTML(label)}</span><strong>${count}</strong></div>`).join('');
    await refreshAdminItems();
    await refreshAdminUsers();
  } catch (error) { summary.textContent = error.message; }
}

async function refreshAdminItems() {
  const target = document.querySelector('#adminItems');
  try {
    const { items } = await api('/api/admin/items');
    if (!items.length) { target.innerHTML = '<p>No reports yet.</p>'; return; }
    target.innerHTML = `<table><thead><tr><th>Item</th><th>Type</th><th>Reporter</th><th>Approval</th><th>Case</th><th>Actions</th></tr></thead><tbody>${items.map(item => `<tr><td>${escapeHTML(item.itemName)}<small>${escapeHTML(item.location)}</small></td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.reportedBy?.name || 'Unknown')}<small>${escapeHTML(item.reportedBy?.email || '')}</small></td><td><select data-approval="${escapeHTML(item._id)}"><option ${item.approvalStatus === 'Pending' ? 'selected' : ''}>Pending</option><option ${item.approvalStatus === 'Approved' ? 'selected' : ''}>Approved</option><option ${item.approvalStatus === 'Rejected' ? 'selected' : ''}>Rejected</option></select></td><td><select data-resolution="${escapeHTML(item._id)}"><option ${item.resolutionStatus === 'Open' ? 'selected' : ''}>Open</option><option ${item.resolutionStatus === 'Resolved' ? 'selected' : ''}>Resolved</option></select></td><td><button class="small-btn" data-save-item="${escapeHTML(item._id)}">Save</button> <button class="danger-btn" data-delete-admin-item="${escapeHTML(item._id)}">Delete</button></td></tr>`).join('')}</tbody></table>`;
    target.querySelectorAll('[data-save-item]').forEach(button => button.addEventListener('click', async () => {
      const id = button.dataset.saveItem;
      const approvalStatus = target.querySelector(`[data-approval="${id}"]`).value;
      const resolutionStatus = target.querySelector(`[data-resolution="${id}"]`).value;
      try { await api(`/api/admin/items/${id}`, { method: 'PATCH', body: JSON.stringify({ approvalStatus, resolutionStatus }) }); showMessage(document.querySelector('#adminMessage'), 'Report updated.'); await loadAdminDashboard(); }
      catch (error) { showMessage(document.querySelector('#adminMessage'), error.message, true); }
    }));
    target.querySelectorAll('[data-delete-admin-item]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Permanently delete this report?')) return;
      try { await api(`/api/items/${button.dataset.deleteAdminItem}`, { method: 'DELETE' }); await loadAdminDashboard(); }
      catch (error) { showMessage(document.querySelector('#adminMessage'), error.message, true); }
    }));
  } catch (error) { target.textContent = error.message; }
}

async function refreshAdminUsers() {
  const target = document.querySelector('#adminUsers');
  try {
    const { users } = await api('/api/admin/users');
    if (!users.length) { target.innerHTML = '<p>No registered users yet.</p>'; return; }
    target.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Registered</th><th>Action</th></tr></thead><tbody>${users.map(user => `<tr><td>${escapeHTML(user.name)}</td><td>${escapeHTML(user.email)}</td><td>${escapeHTML(String(user.createdAt).slice(0, 10))}</td><td><button class="danger-btn" data-delete-user="${escapeHTML(user._id)}">Delete user</button></td></tr>`).join('')}</tbody></table>`;
    target.querySelectorAll('[data-delete-user]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Delete this user and all of their reports?')) return;
      try { await api(`/api/admin/users/${button.dataset.deleteUser}`, { method: 'DELETE' }); await loadAdminDashboard(); }
      catch (error) { showMessage(document.querySelector('#adminMessage'), error.message, true); }
    }));
  } catch (error) { target.textContent = error.message; }
}

async function init() {
  await addAuthNavigation();
  await setupReportForm();
  await loadPublicItems();
  await loadMyReports();
  await loadUserDashboard();
  await loadAdminDashboard();
}
init();
