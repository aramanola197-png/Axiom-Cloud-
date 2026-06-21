// Mobile sidebar
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const mobileHamburger = document.getElementById('mobileHamburger');
if (mobileHamburger) {
  mobileHamburger.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('open');
  });
  sidebarBackdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('open');
  });
}

// Workspace dropdown
const workspaceBtn = document.getElementById('workspaceBtn');
const workspaceDropdown = document.getElementById('workspaceDropdown');
if (workspaceBtn) {
  workspaceBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    workspaceDropdown.classList.toggle('open');
  });
  document.querySelectorAll('.workspace-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.workspace-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const name = opt.dataset.name || opt.textContent.trim();
      document.getElementById('currentWorkspaceName').textContent = name;
      window.currentWorkspaceId = opt.dataset.id || null;
      workspaceDropdown.classList.remove('open');
    });
  });
}

// User dropdown
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
if (userMenuBtn) {
  userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('open');
  });
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
  if (workspaceDropdown) workspaceDropdown.classList.remove('open');
  if (userDropdown) userDropdown.classList.remove('open');
});

// Toast helper (global)
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Welcome banner dismiss
const welcomeBanner = document.getElementById('welcomeBanner');
const welcomeBannerClose = document.getElementById('welcomeBannerClose');
if (welcomeBannerClose) {
  welcomeBannerClose.addEventListener('click', () => {
    welcomeBanner.style.display = 'none';
  });
}
