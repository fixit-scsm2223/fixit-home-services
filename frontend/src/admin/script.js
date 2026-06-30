"use strict";

const STORAGE_KEY = "fixit_admin_dashboard_state";
const API_BASE_URL = window.FIXIT_API_BASE_URL || "/api";
const ADMIN_VIEW_TO_ROUTE = {
  dashboard: "dashboard",
  providers: "provider-verification",
  users: "users",
  jobs: "jobs",
  analytics: "analytics",
  "admin-profile": "profile",
  settings: "settings"
};
const ADMIN_ROUTE_TO_VIEW = Object.fromEntries(
  Object.entries(ADMIN_VIEW_TO_ROUTE).map(([view, route]) => [route, view])
);
ADMIN_ROUTE_TO_VIEW.providers = "providers";

if (typeof window.__fixitAdminCleanup === "function") {
  window.__fixitAdminCleanup();
}

const trackedListeners = [];

function trackEvent(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  trackedListeners.push(() => target.removeEventListener(type, handler, options));
}

window.__fixitAdminCleanup = () => {
  while (trackedListeners.length) {
    const remove = trackedListeners.pop();
    remove();
  }

  document.body.classList.remove("dark-mode", "modal-open", "provider-filter-open");
};

const NAVIGATION = [
  {
    title: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "📊" }
    ]
  },
  {
    title: "Management",
    items: [
      { id: "providers", label: "Provider Verification", icon: "🧑‍🔧" },
      { id: "users", label: "Users", icon: "👥" }
    ]
  },
  {
    title: "Monitoring",
    items: [
      { id: "jobs", label: "Jobs Monitoring", icon: "📋" },
    ]
  },
  {
    title: "Business",
    items: [
      { id: "analytics", label: "Analytics", icon: "📈" }
    ]
  },
  {
    title: "Account",
    items: [
      { id: "admin-profile", label: "My Profile", icon: "👤" },
      { id: "settings", label: "Settings", icon: "⚙️" }
    ]
  }
];

const JOB_STATUS_FLOW = [
  { id: "requested", label: "Requested" },
  { id: "accepted", label: "Accepted" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "cost_pending", label: "Cost Pending" },
  { id: "closed", label: "Closed" },
  { id: "reviewed", label: "Reviewed" }
];

const DEFAULT_STATE = {
  activeView: "dashboard",
  darkMode: false,
  sidebarCollapsed: false,
  dashboardTimeFilter: "all",
  dashboardCategoryFilter: "all",
  providerFilter: "all",
  providerFiltersOpen: false,
  providerUsernameSearch: "",
  providerLocationFilter: "",
  providerRateMax: 300,
  providerDateFrom: "",
  providerDateTo: "",
  activeProfileTab: "admin-details",
  settingsActiveTab: "general",
  userSearch: "",
  userTypeFilter: "all",
  userStatusFilter: "all",
  userSort: "name-asc",
  jobsSearch: "",
  jobsStatusFilter: "all",
  jobsCategoryFilter: "all",
  jobsDateFrom: "",
  jobsDateTo: "",
  jobsSort: "newest",
  analyticsDateFrom: "",
  analyticsDateTo: "",
  analyticsCategoryFilter: "all",
  analyticsProviderUsernameSearch: "",
  analyticsStatusFilter: "all",
  providerDetailTab: "overview",

  metrics: {
    totalProviders: 0,
    totalJobs: 0,
    totalRevenue: 0
  },

  providers: [],

  categories: [],

  jobs: [],

  users: [],

  safetyNotes: [],

  notifications: [],

 settings: {
  allowProviderRegistration: true,
  automaticProviderMatching: false,
  maintenanceMode: false,
  backgroundChecksRequired: true,
  providerReverificationCycle: "12 months",
  reportedUserAction: "manual-review",
  accountSuspensionPolicy: "strict",
  complianceReviewWindow: "48 hours"
},

adminProfile: {
  name: "Ammar Mohd",
  email: "ammar.mohd@fixit.com",
  phone: "+60 11-2345 6789",
  personalPhone: "+60 12-771 8842",
  position: "System Administrator",
  department: "Platform Operations",
  location: "Johor Bahru, Malaysia",
  addressLine: "390 Jalan Dato Onn, Suite 200",
  cityState: "Johor Bahru, Johor",
  postcode: "81100",
  country: "Malaysia",
  building: "South Tower, Level 12",
  joinedOn: "15 January 2026",
  lastLogin: "Today, 9:42 AM",
  bio: "Responsible for provider verification, safety compliance, user management, and daily FixIt platform operations.",
  employeeId: "FX-ADM-014",
  timezone: "GMT+8 Malaysia Time",
  workMode: "Hybrid",
  manager: "Nadia Rahman, Head of Trust & Operations",
  languages: "English, Bahasa Malaysia",
  officeExtension: "Ext. 214",
  nationalId: "MY-880926-01-1456",
  permissionsTier: "Tier 1 Platform Admin",
  roleLevel: "System Administrator",
  accountStatus: "Active",
  emergencyContact: "+60 19-882 4410",
  shiftWindow: "Mon - Fri, 8:30 AM - 6:00 PM",
  assignedPermissions: "Users, Providers, Categories, Jobs, Reports, System Settings",
  managedAreas: "Users, Providers, Categories, Jobs, Reports, System Settings",
  focusAreas: [
    "Provider verification",
    "Fraud prevention",
    "Category governance",
    "Incident response"
  ],
  recentDevices: [
    "Chrome on Windows 11 Â· Johor Bahru Office",
    "Safari on iPhone 15 Â· Secure mobile access",
    "Edge on Windows Laptop Â· Remote review session"
  ]
}
};

let state = loadState();
state.activeView = getViewFromCurrentPath() || state.activeView;

const elements = {
  appShell: document.getElementById("app-shell"),
  sidebar: document.getElementById("app-sidebar"),
  sidebarMenu: document.getElementById("sidebar-menu"),
  sidebarToggle: document.getElementById("sidebar-toggle"),
  sidebarProfileButton: document.getElementById("sidebar-profile-button"),
  mobileMenuButton: document.getElementById("mobile-menu-button"),
  mobileOverlay: document.getElementById("mobile-overlay"),
  breadcrumb: document.getElementById("breadcrumb"),
  appRoot: document.getElementById("app-root"),
  topbarLocationLabel: document.getElementById("topbar-location-label"),

  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  themeLabel: document.getElementById("theme-label"),

  notificationsToggle: document.getElementById("notifications-toggle"),
  notificationPanel: document.getElementById("notification-panel"),
  notificationList: document.getElementById("notification-list"),
  notificationCount: document.getElementById("notification-count"),
  notificationDot: document.getElementById("notification-dot"),
  markAllReadButton: document.getElementById("mark-all-read-button"),

  adminAccountButton: document.getElementById("admin-account-button"),

  modalBackdrop: document.getElementById("modal-backdrop"),
  modalCard: document.getElementById("modal-card")
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function normalizeNotification(notification, index = 0) {
  const title = String(notification?.title || "Notification");
  const message = String(notification?.message || "");
  const searchableCopy = `${title} ${message}`.toLowerCase();
  const matchedProvider = DEFAULT_STATE.providers.find((provider) =>
    searchableCopy.includes(provider.name.toLowerCase())
  );
  const matchedCustomer = DEFAULT_STATE.users.find((user) =>
    String(user.role).toLowerCase() === "customer" && searchableCopy.includes(user.name.toLowerCase())
  );
  const jobMatch = `${title} ${message}`.match(/FX-\d+/i);
  const entityType = notification?.entityType ||
    (matchedProvider ? "provider" : matchedCustomer ? "customer" : jobMatch ? "job" : "system");
  const route = notification?.route ||
    (entityType === "provider" ? "providers" : entityType === "customer" ? "users" : entityType === "job" ? "jobs" : "settings");

  return {
    id: notification?.id || `notification-${index}-${Date.now()}`,
    title,
    message,
    unread: notification?.isRead === true ? false : notification?.unread !== false,
    type: notification?.type || title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    entityType,
    entityId: notification?.entityId || matchedProvider?.id || matchedCustomer?.id || jobMatch?.[0]?.toUpperCase() || "",
    route,
    createdAt: notification?.createdAt || new Date().toISOString()
  };
}

function loadState() {
  try {
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!savedState) {
      return cloneDefaultState();
    }

    const defaultState = cloneDefaultState();
    const mergeCollectionById = (savedCollection, defaultCollection) => {
      if (!Array.isArray(savedCollection)) {
        return defaultCollection;
      }

      return savedCollection.map((item) => {
        const fallback = defaultCollection.find((defaultItem) => defaultItem.id === item.id);
        return fallback
          ? { ...fallback, ...item }
          : item;
      });
    };
    const mergeJobsWithDefaults = (savedJobs, defaultJobs) => {
      const mergedJobs = mergeCollectionById(savedJobs, defaultJobs);
      const savedIds = new Set(mergedJobs.map((job) => job.id));

      return [
        ...mergedJobs,
        ...defaultJobs.filter((job) => !savedIds.has(job.id))
      ];
    };

    return {
      ...defaultState,
      ...savedState,

      activeView: savedState.activeView || defaultState.activeView,
      darkMode: Boolean(savedState.darkMode),
      sidebarCollapsed: Boolean(savedState.sidebarCollapsed),

      dashboardTimeFilter: savedState.dashboardTimeFilter || "all",
      dashboardCategoryFilter: savedState.dashboardCategoryFilter || "all",
      providerFilter: savedState.providerFilter || "all",
      providerFiltersOpen: false,
      providerUsernameSearch: typeof savedState.providerUsernameSearch === "string"
        ? savedState.providerUsernameSearch
        : "",
      providerLocationFilter: savedState.providerLocationFilter || "",
      providerRateMax: Number(savedState.providerRateMax) || 300,
      providerDateFrom: savedState.providerDateFrom || "",
      providerDateTo: savedState.providerDateTo || "",
      activeProfileTab: savedState.activeProfileTab || "admin-details",
      settingsActiveTab: savedState.settingsActiveTab || "general",
      userSearch: typeof savedState.userSearch === "string"
        ? savedState.userSearch
        : "",
      userTypeFilter: savedState.userTypeFilter || "all",
      userStatusFilter: savedState.userStatusFilter || "all",
      userSort: ["name-asc", "newest", "oldest", "last-login"].includes(savedState.userSort)
        ? savedState.userSort
        : "name-asc",
      jobsSearch: typeof savedState.jobsSearch === "string" ? savedState.jobsSearch : "",
      jobsStatusFilter: savedState.jobsStatusFilter || "all",
      jobsCategoryFilter: savedState.jobsCategoryFilter || "all",
      jobsDateFrom: savedState.jobsDateFrom || "",
      jobsDateTo: savedState.jobsDateTo || "",
      jobsSort: savedState.jobsSort || "newest",
      analyticsDateFrom: savedState.analyticsDateFrom || "",
      analyticsDateTo: savedState.analyticsDateTo || "",
      analyticsCategoryFilter: savedState.analyticsCategoryFilter || "all",
      analyticsProviderUsernameSearch: typeof savedState.analyticsProviderUsernameSearch === "string"
        ? savedState.analyticsProviderUsernameSearch
        : "",
      analyticsStatusFilter: savedState.analyticsStatusFilter || "all",
      providerDetailTab: ["overview", "verification", "service", "activity"].includes(savedState.providerDetailTab)
        ? savedState.providerDetailTab
        : "overview",

      metrics: {
        ...defaultState.metrics,
        ...(savedState.metrics || {})
      },

      settings: {
        ...defaultState.settings,
        ...(savedState.settings || {})
      },

      adminProfile: {
        ...defaultState.adminProfile,
        ...(savedState.adminProfile || {})
      },

      providers: mergeCollectionById(savedState.providers, defaultState.providers),

      categories: mergeCollectionById(savedState.categories, defaultState.categories),

      jobs: mergeJobsWithDefaults(savedState.jobs, defaultState.jobs),

      users: mergeCollectionById(savedState.users, defaultState.users),

      safetyNotes: Array.isArray(savedState.safetyNotes)
        ? savedState.safetyNotes
        : Array.isArray(savedState.notes)
          ? savedState.notes
          : defaultState.safetyNotes,

      notifications: Array.isArray(savedState.notifications)
        ? savedState.notifications.map(normalizeNotification)
        : defaultState.notifications.map(normalizeNotification)
    };
  } catch (error) {
    return cloneDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getAuthToken() {
  return localStorage.getItem("fixit_token") || sessionStorage.getItem("fixit_token") || "";
}

function getViewFromCurrentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const [, adminSegment, section = "dashboard"] = path.split("/");

  if (adminSegment !== "admin") {
    return null;
  }

  return ADMIN_ROUTE_TO_VIEW[section] || "dashboard";
}

function updateAdminRoute(viewId, replace = false) {
  const route = ADMIN_VIEW_TO_ROUTE[viewId] || "dashboard";
  const nextPath = `/admin/${route}`;

  if (window.location.pathname === nextPath) {
    return;
  }

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextPath);
}

async function adminRequest(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Admin request failed.");
  }

  return body.data || {};
}

function mergeAdminBootstrap(data) {
  state = {
    ...state,
    metrics: data.metrics || state.metrics,
    providers: Array.isArray(data.providers) ? data.providers : state.providers,
    categories: Array.isArray(data.categories) ? data.categories : state.categories,
    jobs: Array.isArray(data.jobs) ? data.jobs : state.jobs,
    users: Array.isArray(data.users) ? data.users : state.users,
    safetyNotes: Array.isArray(data.safetyNotes) ? data.safetyNotes : state.safetyNotes,
    notifications: Array.isArray(data.notifications)
      ? data.notifications.map(normalizeNotification)
      : state.notifications,
    adminProfile: {
      ...state.adminProfile,
      ...(data.adminProfile || {})
    }
  };
}

async function hydrateAdminState() {
  // Clear any previously cached mock data so stale state never rehydrates
  localStorage.removeItem(STORAGE_KEY);
  try {
    const data = await adminRequest("/admin/bootstrap");
    mergeAdminBootstrap(data);
  } catch (error) {
    console.warn("FixIt admin bootstrap failed; dashboard will show empty state.", error);
  } finally {
    state.activeView = getViewFromCurrentPath() || state.activeView;
    saveState();
  }
}

function syncProviderStatus(providerId, status, payload = {}) {
  adminRequest(`/admin/providers/${encodeURIComponent(providerId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...payload })
  }).catch((error) => console.warn("Provider status sync failed.", error));
}

function syncUserStatus(userId, status, payload = {}) {
  adminRequest(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...payload })
  }).catch((error) => console.warn("User status sync failed.", error));
}

function syncJobNote(job, note) {
  const jobId = job.dbId || job.id;
  adminRequest(`/admin/jobs/${encodeURIComponent(jobId)}/admin-note`, {
    method: "PATCH",
    body: JSON.stringify({ admin_note: note })
  }).catch((error) => console.warn("Job note sync failed.", error));
}

function syncSafetyNotes() {
  adminRequest("/admin/safety-notes", {
    method: "PUT",
    body: JSON.stringify({ notes: state.safetyNotes })
  }).catch((error) => console.warn("Safety notes sync failed.", error));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
  return `RM ${Number(amount).toLocaleString("en-MY")}`;
}

function humanizeStatus(status) {
  return String(status).replaceAll("_", " ");
}

function parseDisplayDate(dateText) {
  return new Date(`${dateText} 12:00:00`);
}

function getDashboardReferenceDate() {
  const providerDates = state.providers.map((provider) => parseDisplayDate(provider.submitted));
  const jobDates = state.jobs
    .filter((job) => job.createdOn)
    .map((job) => parseDisplayDate(job.createdOn));

  const timestamps = [...providerDates, ...jobDates]
    .map((date) => date.getTime())
    .filter((value) => !Number.isNaN(value));

  return new Date(Math.max(...timestamps));
}

function matchesDashboardTimeFilter(dateText) {
  if (state.dashboardTimeFilter === "all" || !dateText) {
    return true;
  }

  const recordDate = parseDisplayDate(dateText);
  const referenceDate = getDashboardReferenceDate();

  if (Number.isNaN(recordDate.getTime()) || Number.isNaN(referenceDate.getTime())) {
    return true;
  }

  const dayStart = new Date(referenceDate);
  dayStart.setHours(0, 0, 0, 0);

  if (state.dashboardTimeFilter === "today") {
    return recordDate >= dayStart;
  }

  if (state.dashboardTimeFilter === "week") {
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    return recordDate >= weekStart;
  }

  if (state.dashboardTimeFilter === "month") {
    return (
      recordDate.getMonth() === referenceDate.getMonth() &&
      recordDate.getFullYear() === referenceDate.getFullYear()
    );
  }

  return true;
}

function matchesDashboardCategoryFilter(categoryName) {
  return state.dashboardCategoryFilter === "all" || categoryName === state.dashboardCategoryFilter;
}

function getDashboardProviders() {
  const categoryRates = {
    Cleaning: 80,
    Gardening: 95,
    "AC Service": 150,
    Plumbing: 90,
    Electrical: 110
  };
  const locationQuery = state.providerLocationFilter.trim().toLowerCase();
  const usernameQuery = state.providerUsernameSearch.trim().toLowerCase();
  const dateFrom = state.providerDateFrom ? new Date(`${state.providerDateFrom}T00:00:00`) : null;
  const dateTo = state.providerDateTo ? new Date(`${state.providerDateTo}T23:59:59`) : null;

  return state.providers.filter((provider) => {
    const submittedDate = parseDisplayDate(provider.submitted);
    const searchableLocation = `${provider.location || ""} ${provider.serviceArea || ""}`.toLowerCase();
    const searchableUsername = String(provider.username || "").toLowerCase();
    const baseRate = Number(provider.baseRate) || categoryRates[provider.category] || 100;

    return matchesDashboardTimeFilter(provider.submitted) &&
      matchesDashboardCategoryFilter(provider.category) &&
      (!usernameQuery || searchableUsername.includes(usernameQuery)) &&
      (!locationQuery || searchableLocation.includes(locationQuery)) &&
      baseRate <= state.providerRateMax &&
      (!dateFrom || submittedDate >= dateFrom) &&
      (!dateTo || submittedDate <= dateTo);
  });
}

function getProviderVerificationRecords() {
  return getDashboardProviders().filter((provider) =>
    state.providerFilter === "all" || provider.status === state.providerFilter
  );
}

function updateProviderFilterPanelSummary() {
  const showResultsButton = document.querySelector('[data-action="show-provider-results"]');
  const rateValue = document.getElementById("provider-rate-value");

  if (showResultsButton) {
    showResultsButton.textContent = `Show Results (${getProviderVerificationRecords().length})`;
  }

  if (rateValue) {
    rateValue.textContent = `RM ${state.providerRateMax}`;
  }
}

function getDashboardJobs() {
  return state.jobs.filter((job) =>
    matchesDashboardTimeFilter(job.createdOn) &&
    matchesDashboardCategoryFilter(job.category)
  );
}

function getDashboardCategories() {
  const visibleCategoryNames = new Set([
    ...getDashboardProviders().map((provider) => provider.category),
    ...getDashboardJobs().map((job) => job.category)
  ]);

  return state.categories.filter((category) =>
    (state.dashboardCategoryFilter === "all" || category.name === state.dashboardCategoryFilter) &&
    (visibleCategoryNames.size === 0 || visibleCategoryNames.has(category.name))
  );
}

function getPendingProviders(source = state.providers) {
  return source.filter((provider) => provider.status === "pending");
}

function getPendingCount(source = state.providers) {
  return getPendingProviders(source).length;
}

function getStatusBadge(status) {
  return `
    <span class="status-badge ${escapeHtml(status)}">
      ${escapeHtml(humanizeStatus(status))}
    </span>
  `;
}

function clearInlineFieldError(field) {
  if (!field) {
    return;
  }

  const errorId = field.getAttribute("aria-describedby");
  if (errorId) {
    document.getElementById(errorId)?.remove();
  }

  field.removeAttribute("aria-invalid");
  field.removeAttribute("aria-describedby");
}

function showInlineFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);

  if (!field) {
    console.error(message);
    return;
  }

  clearInlineFieldError(field);

  const error = document.createElement("small");
  error.className = "inline-field-error";
  error.id = `${fieldId}-error`;
  error.textContent = message;

  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", error.id);
  field.insertAdjacentElement("afterend", error);
  field.focus();
}

function addNotification(title, message, metadata = {}) {
  const nextNotification = normalizeNotification({
    id: metadata.id || `notification-${Date.now()}`,
    title,
    message,
    unread: true,
    ...metadata,
    createdAt: metadata.createdAt || new Date().toISOString()
  });
  const duplicateIndex = state.notifications.findIndex((notification) =>
    notification.type === nextNotification.type &&
    notification.entityType === nextNotification.entityType &&
    notification.entityId === nextNotification.entityId &&
    notification.message === nextNotification.message
  );

  if (duplicateIndex >= 0) {
    state.notifications.splice(duplicateIndex, 1);
  }

  state.notifications.unshift(nextNotification);
  state.notifications = state.notifications.slice(0, 12);

  saveState();
  renderNotifications();
}

function renderSidebar() {
  elements.sidebarMenu.innerHTML = NAVIGATION.map((group) => `
    <section class="nav-group">
      <p class="nav-group-title">${group.title}</p>

      ${group.items.map((item) => `
        <button
          class="nav-item ${state.activeView === item.id ? "active" : ""}"
          type="button"
          data-action="navigate"
          data-view="${item.id}"
        >
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-text">${item.label}</span>
        </button>
      `).join("")}
    </section>
  `).join("");

  elements.appShell.classList.toggle(
    "sidebar-collapsed",
    state.sidebarCollapsed
  );

  elements.sidebarToggle.textContent = state.sidebarCollapsed ? "→" : "←";
}

function applyTheme() {
  document.body.classList.toggle("dark-mode", state.darkMode);

  elements.themeIcon.textContent = state.darkMode ? "☀️" : "🌙";
  elements.themeLabel.textContent = state.darkMode ? "Light" : "Dark";
}

function renderNotifications() {
  const unreadNotifications = state.notifications.filter(
    (notification) => notification.unread
  );

  elements.notificationCount.textContent = `${unreadNotifications.length} new`;
  elements.notificationDot.style.display = unreadNotifications.length
    ? "block"
    : "none";

  if (!unreadNotifications.length) {
    elements.notificationList.innerHTML = `
      <div class="notification-empty-state">
        <span class="notification-empty-icon" aria-hidden="true">&#10003;</span>
        <strong>No new notifications</strong>
        <span>You are all caught up.</span>
      </div>
    `;
    return;
  }

  elements.notificationList.innerHTML = unreadNotifications.map((item) => `
    <button class="notification-item unread" type="button" data-action="open-notification" data-id="${escapeHtml(item.id)}">
      <span class="notification-item-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.message)}</span>
      </span>
      <span class="notification-chevron" aria-hidden="true">&#8250;</span>
    </button>
  `).join("");
}

function openNotification(notificationId) {
  const notification = state.notifications.find((item) => item.id === notificationId);

  if (!notification) {
    return;
  }

  notification.unread = false;
  saveState();
  renderNotifications();
  elements.notificationPanel.classList.add("hidden");

  if (notification.entityType === "customer") {
    state.activeView = "users";
    renderCurrentView();
    openCustomerDetailsModal(notification.entityId);
    return;
  }

  if (notification.entityType === "provider") {
    state.activeView = "providers";
    state.providerFilter = "all";
    renderCurrentView();
    openProviderModal(notification.entityId);
    return;
  }

  if (notification.entityType === "job") {
    state.activeView = "jobs";
    renderCurrentView();
    openJobModal(notification.entityId);
    return;
  }

  if (notification.entityType === "category") {
    state.activeView = "settings";
    state.settingsActiveTab = "categories";
    renderCurrentView();
    return;
  }

  navigateToView(notification.route || "dashboard");
}

function pageHeading(title, subtitle, action = "") {
  return `
    <div class="page-heading">
      <div>
        <h1 class="page-title">${title}</h1>
        <p class="page-subtitle">${subtitle}</p>
      </div>

      ${action}
    </div>
  `;
}

function statCard(icon, value, label, trend, accent, trendColor) {
  return `
    <article
      class="stat-card"
      style="--accent:${accent}; --trend:${trendColor}"
    >
      <div class="stat-card-top">
        <div class="stat-icon">${icon}</div>
        <div class="stat-mini-chart" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
      <div class="stat-card-copy">
        <span class="stat-label">${label}</span>
        <strong class="stat-value">${value}</strong>
      </div>
      <div class="stat-card-footer">
        <span class="stat-trend">${trend}</span>
        <span class="stat-period">vs previous period</span>
      </div>
    </article>
  `;
}

function providerActionButtons(provider) {
  if (provider.status === "pending") {
    return `
      <div class="button-row">
        <button
          class="success-button small-button"
          data-action="verify-provider"
          data-id="${provider.id}"
        >
          ✓ Verify
        </button>

        <button
          class="danger-button small-button"
          data-action="reject-provider"
          data-id="${provider.id}"
        >
          ✕ Reject
        </button>
      </div>
    `;
  }

  if (provider.status === "rejected") {
    return `
      <button
        class="secondary-button small-button"
        data-action="restore-provider"
        data-id="${provider.id}"
      >
        Restore
      </button>
    `;
  }

  if (provider.status === "verified") {
    return `
      <div class="button-row">
        <button class="secondary-button small-button" data-action="view-provider" data-id="${provider.id}">
          View details
        </button>
        <button class="danger-button small-button" data-action="suspend-provider" data-id="${provider.id}">
          Suspend
        </button>
      </div>
    `;
  }

  if (provider.status === "suspended") {
    return `
      <div class="button-row">
        <button class="secondary-button small-button" data-action="view-provider" data-id="${provider.id}">
          View details
        </button>
        <button class="success-button small-button" data-action="reinstate-provider" data-id="${provider.id}">
          Restore Provider
        </button>
      </div>
    `;
  }

  return `
    <button
      class="secondary-button small-button"
      data-action="view-provider"
      data-id="${provider.id}"
    >
      View
    </button>
  `;
}

function providerTableRows(providers) {
  if (!providers.length) {
    return `
      <tr class="verification-empty-row">
        <td colspan="5">
          <div class="verification-empty-state">
            <span class="verification-empty-icon" aria-hidden="true">&#10003;</span>
            <div>
              <strong>Verification queue is clear</strong>
              <span>There are no pending provider applications requiring action.</span>
            </div>
            <button class="secondary-button small-button" type="button" data-action="navigate" data-view="providers">
              View all providers
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  return providers.map((provider) => `
    <tr>
      <td>
        <span class="table-name">${escapeHtml(provider.name)}</span>
        <span class="table-muted">${escapeHtml(provider.location)}</span>
      </td>

      <td>${provider.icon} ${escapeHtml(provider.category)}</td>
      <td>${escapeHtml(provider.submitted)}</td>
      <td>${getStatusBadge(provider.status)}</td>
      <td>${providerActionButtons(provider)}</td>
    </tr>
  `).join("");
}

function providerCardGridLegacy(providers) {
  if (!providers.length) {
    return `
      <div class="providers-empty-state">
        <strong>No providers found</strong>
        <span>Try switching the verification filter to view a different group.</span>
      </div>
    `;
  }

  return `
    <div class="provider-card-grid">
      ${providers.map((provider) => `
        <article class="provider-card">
          <div class="provider-card-head">
            <div class="provider-card-identity">
              <div class="provider-card-avatar">${provider.icon}</div>

              <div>
                <h3>${escapeHtml(provider.name)}</h3>
                <p>${escapeHtml(provider.location)}</p>
              </div>
            </div>

            ${getStatusBadge(provider.status)}
          </div>

          <div class="provider-card-category">
            <span class="provider-card-category-icon">${provider.icon}</span>
            <span>${escapeHtml(provider.category)}</span>
          </div>

          <div class="provider-card-meta">
            <div class="provider-card-meta-item">
              <span>Submitted</span>
              <strong>${escapeHtml(provider.submitted)}</strong>
            </div>

            <div class="provider-card-meta-item">
              <span>Verification score</span>
              <strong>${escapeHtml(provider.verificationScore || "Pending")}</strong>
            </div>

            <div class="provider-card-meta-item">
              <span>Response time</span>
              <strong>${escapeHtml(provider.responseTime || "Not available")}</strong>
            </div>

            <div class="provider-card-meta-item">
              <span>Completed jobs</span>
              <strong>${escapeHtml(String(provider.jobsCompleted || 0))}</strong>
            </div>
          </div>

          <div class="provider-card-detail-list">
            <div class="provider-card-detail">
              <span>Coverage</span>
              <strong>${escapeHtml(provider.serviceArea || provider.location)}</strong>
            </div>

            <div class="provider-card-detail">
              <span>Documents</span>
              <strong>${escapeHtml(provider.document)}</strong>
            </div>

            <div class="provider-card-detail">
              <span>Availability</span>
              <strong>${escapeHtml(provider.availability || "Check schedule")}</strong>
            </div>

            <div class="provider-card-detail">
              <span>Customer rating</span>
              <strong>${escapeHtml(provider.rating ? `${provider.rating} / 5` : "New provider")}</strong>
            </div>
          </div>

          <div class="provider-card-footer">
            <div class="provider-card-highlight">
              <span>Recommended for</span>
              <strong>${escapeHtml(provider.category)} jobs around ${escapeHtml(provider.location)}</strong>
            </div>

            <div class="button-row">
              ${providerActionButtons(provider)}
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function providerCardGrid(providers) {
  if (!providers.length) {
    const hasUsernameSearch = Boolean(state.providerUsernameSearch.trim());

    return `
      <div class="providers-empty-state provider-search-empty-state">
        <span class="provider-empty-search-icon" aria-hidden="true"></span>
        <strong>${hasUsernameSearch ? "No provider found with this username." : "No providers found"}</strong>
        <span>${hasUsernameSearch
          ? "Check the username and try a different search."
          : "There are no provider records matching this status and the current filters."}</span>
      </div>
    `;
  }

  return `
    <div class="provider-card-grid provider-status-card-grid">
      ${providers.map((provider) => {
        const status = provider.status || "pending";
        const coverage = provider.serviceArea || provider.location || "Not provided";

        return `
          <article class="provider-card provider-status-card provider-card-${escapeHtml(status)}">
            <div class="provider-card-head">
              <div class="provider-card-identity">
                <div class="provider-card-avatar" role="img" aria-label="${escapeHtml(provider.name)} profile photo">
                  ${provider.icon}
                </div>
                <div>
                  <h3>${escapeHtml(provider.name)}</h3>
                  <span class="provider-card-username">${escapeHtml(provider.username || "Username unavailable")}</span>
                  <p>${escapeHtml(provider.location)}</p>
                </div>
              </div>
              ${getStatusBadge(status)}
            </div>

            <div class="provider-card-category">
              <span class="provider-card-category-icon">${provider.icon}</span>
              <span>${escapeHtml(provider.category)}</span>
            </div>

            ${status === "pending" ? `
              <section class="provider-application-block">
                <div class="provider-application-intro">
                  <span>Bio & experience</span>
                  <strong>${escapeHtml(provider.experience || "Experience not provided")}</strong>
                  <p>${escapeHtml(provider.bio || "No professional bio was supplied with this application.")}</p>
                </div>

                <div class="provider-application-grid">
                  <div><span>Coverage area</span><strong>${escapeHtml(coverage)}</strong></div>
                  <div><span>Base rate</span><strong>${formatCurrency(Number(provider.baseRate) || 0)}</strong></div>
                  <div><span>Availability</span><strong>${escapeHtml(provider.availability || "Not provided")}</strong></div>
                  <div><span>Submitted</span><strong>${escapeHtml(provider.submitted)}</strong></div>
                  <div><span>Verification status</span><strong>Awaiting admin review</strong></div>
                </div>

                <div class="provider-document-row">
                  <div>
                    <span>KYC documents</span>
                    <strong>${escapeHtml(provider.document || "No documents submitted")}</strong>
                  </div>
                  <button type="button" data-action="view-provider" data-id="${provider.id}">Preview document</button>
                </div>
              </section>
            ` : status === "verified" ? `
              <section class="provider-performance-block">
                <div class="provider-performance-heading">
                  <div><span>Marketplace performance</span><strong>Live provider activity</strong></div>
                  <span class="provider-live-indicator"><i></i>Live</span>
                </div>
                <div class="provider-performance-grid">
                  <div><span>Customer rating</span><strong>${escapeHtml(provider.rating ? `${provider.rating} / 5` : "Not available")}</strong></div>
                  <div><span>Completed jobs</span><strong>${escapeHtml(String(provider.jobsCompleted || 0))}</strong></div>
                  <div><span>Response time</span><strong>${escapeHtml(provider.responseTime || "Not available")}</strong></div>
                  <div><span>Availability</span><strong>${escapeHtml(provider.availability || "Check schedule")}</strong></div>
                </div>
                <div class="provider-coverage-row"><span>Location & coverage</span><strong>${escapeHtml(coverage)}</strong></div>
              </section>
            ` : status === "rejected" ? `
              <section class="provider-application-block provider-decision-block">
                <div class="provider-application-intro">
                  <span>Application decision</span>
                  <strong>Application rejected</strong>
                  <p>This provider cannot go live unless the application is restored for another review.</p>
                </div>
                <div class="provider-application-grid">
                  <div><span>Coverage area</span><strong>${escapeHtml(coverage)}</strong></div>
                  <div><span>Submitted</span><strong>${escapeHtml(provider.submitted)}</strong></div>
                  <div><span>KYC status</span><strong>${escapeHtml(provider.document || "Documents unavailable")}</strong></div>
                </div>
              </section>
            ` : `
              <section class="provider-application-block provider-suspension-block">
                <div class="provider-application-intro">
                  <span>Marketplace access</span>
                  <strong>Provider account suspended</strong>
                  <p>This verified provider is temporarily blocked from accepting new customer bookings.</p>
                </div>
                <div class="provider-application-grid">
                  <div><span>Location & coverage</span><strong>${escapeHtml(coverage)}</strong></div>
                  <div><span>Availability before suspension</span><strong>${escapeHtml(provider.availability || "Not available")}</strong></div>
                  <div><span>Suspension date</span><strong>${escapeHtml(provider.suspensionDate || "Not recorded")}</strong></div>
                  <div><span>Suspension reason</span><strong>${escapeHtml(provider.suspensionReason || "Not recorded")}</strong></div>
                  ${provider.suspensionAdminNote ? `
                    <div class="provider-suspension-note">
                      <span>Internal admin note</span>
                      <strong>${escapeHtml(provider.suspensionAdminNote)}</strong>
                    </div>
                  ` : ""}
                </div>
              </section>
            `}

            <footer class="provider-status-card-footer">
              <div class="provider-status-context">
                <span>${status === "pending" ? "Application actions" : status === "verified" ? "Provider controls" : "Account controls"}</span>
                <strong>${status === "pending" ? "Review submitted information before deciding" : humanizeStatus(status)}</strong>
              </div>
              <div class="button-row">${providerActionButtons(provider)}</div>
            </footer>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function categoryRows(categories, shortMode = false) {
  const visibleCategories = shortMode ? categories.slice(0, 3) : categories;

  return visibleCategories.map((category) => `
    <div class="category-row">
      <div class="category-content">
        <span>${category.icon}</span>

        <div>
          <strong>${escapeHtml(category.name)}</strong>
          ${shortMode ? "" : `<small>${escapeHtml(category.description)}</small>`}
        </div>
      </div>

      <div class="category-actions">
        ${getStatusBadge(category.status)}

        <button
          class="secondary-button small-button"
          data-action="edit-category"
          data-id="${category.id}"
        >
          Edit
        </button>
      </div>
    </div>
  `).join("");
}

function renderDashboard() {
  const pendingProviders = getPendingProviders();
  const verificationQueue = pendingProviders.slice(0, 3);

  return `
    ${pageHeading(
      "Admin Dashboard",
      "Platform oversight — verify providers, manage categories, monitor safety."
    )}

    <section class="stats-grid">
      ${statCard(
        "🧑‍🔧",
        state.metrics.totalProviders.toLocaleString(),
        "Total Providers",
        "↑ 12 this week",
        "#3861e8",
        "#08af60"
      )}

      ${statCard(
        "⌛",
        pendingProviders.length,
        "Pending Verification",
        pendingProviders.length ? `${pendingProviders.length} need review` : "Queue cleared",
        "#f5a623",
        pendingProviders.length ? "#df5d60" : "#22c55e"
      )}

      ${statCard(
        "📋",
        state.metrics.totalJobs.toLocaleString(),
        "Total Jobs",
        "↑ 4.2% this month",
        "#08c86b",
        "#08af60"
      )}

      ${statCard(
        "💰",
        formatCurrency(state.metrics.totalRevenue),
        "Total Revenue",
        "↑ 18.7% YTD",
        "#10b8aa",
        "#08af60"
      )}
    </section>

    <section class="dashboard-grid dashboard-grid-single">
      <article class="content-card verification-queue-card">
        <div class="verification-card-head">
          <div class="verification-card-title">
            <span class="verification-card-icon" aria-hidden="true">&#128737;</span>
            <div>
              <h2>Pending Provider Verification</h2>
              <p>Review applications before providers can accept customer bookings.</p>
            </div>
          </div>
          <div class="verification-card-actions">
            <span class="verification-count-badge"><strong>${pendingProviders.length}</strong> pending</span>
            <button type="button" data-action="navigate" data-view="providers">Open verification</button>
          </div>
        </div>

        ${pendingProviders.length ? `
          <div class="table-wrapper verification-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Category</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${providerTableRows(verificationQueue)}</tbody>
            </table>
          </div>
        ` : `
          <div class="verification-empty-wrap">
            <div class="verification-empty-state">
              <span class="verification-empty-icon" aria-hidden="true">&#10003;</span>
              <div>
                <strong>Verification queue is clear</strong>
                <span>There are no pending provider applications requiring action.</span>
              </div>
              <button class="secondary-button small-button" type="button" data-action="navigate" data-view="providers">
                View all providers
              </button>
            </div>
          </div>
        `}
      </article>

      <article class="content-card">
        <div class="content-card-body">
          <div class="section-header">
            <div>
              <h2 class="section-title">⚙️ Service Categories</h2>
              <p class="section-subtitle">
                Manage available home-service categories.
              </p>
            </div>
          </div>

          <div class="category-list">
            ${categoryRows(state.categories, true)}
          </div>

          <div style="margin-top:17px;">
            <button class="primary-button" data-action="add-category">
              + Add Category
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="dashboard-bottom-grid">
      <article class="live-monitor">
        <div class="live-monitor-head">
          <div class="dashboard-panel-title">
            <span class="dashboard-panel-icon jobs" aria-hidden="true">&#128203;</span>
            <div>
              <h2>All jobs monitoring</h2>
              <p>Latest activity across the platform.</p>
            </div>
          </div>

          <div class="dashboard-panel-summary">
            <span class="live-label"><i></i>Live</span>
            <span class="dashboard-record-count">${Math.min(state.jobs.length, 3)} recent</span>
          </div>
        </div>

        <div class="monitor-job-list">
          ${state.jobs.slice(0, 3).map((job) => `
            <div class="monitor-job-row">
              <div class="monitor-job-icon">${job.icon}</div>

              <div class="monitor-job-copy">
                <strong>#${job.id} · ${escapeHtml(job.title)}</strong>
                <span>${escapeHtml(job.provider)} → ${escapeHtml(job.customer)}</span>
              </div>

              <div class="monitor-job-end">
                <span class="monitor-job-amount">${formatCurrency(job.amount)}</span>
                ${getStatusBadge(job.status)}
              </div>
            </div>
          `).join("")}
        </div>

        <footer class="dashboard-panel-footer">
          <span>Updated from the latest platform activity</span>
          <button type="button" data-action="navigate" data-view="jobs">View all jobs</button>
        </footer>
      </article>

      <article class="safety-card">
        <div class="safety-card-head">
          <div class="dashboard-panel-title">
            <span class="dashboard-panel-icon safety" aria-hidden="true">&#128737;</span>
            <div>
              <h2>Safety & Compliance Notes</h2>
              <p>Active rules protecting customers and providers.</p>
            </div>
          </div>
          <span class="safety-policy-count">${state.safetyNotes.length} active</span>
        </div>

        <ul class="safety-list">
          ${state.safetyNotes.slice(0, 5).map((note, index) => `
            <li class="safety-note-row severity-${index < 2 ? "high" : index < 4 ? "medium" : "low"}">
              <span class="safety-note-icon" aria-hidden="true">${["🔒", "📋", "🚫", "📞", "✅"][index] || "•"}</span>
              <span class="safety-note-copy">${escapeHtml(note)}</span>
            </li>
          `).join("")}
        </ul>

        <footer class="dashboard-panel-footer safety-panel-footer">
          <span>Policies are managed centrally in Settings</span>
          <button type="button" data-action="open-safety-settings">Review policies</button>
        </footer>
      </article>
    </section>
  `;
}

function renderProviderVerificationFilterBarLegacy(providerCount) {
  const categories = ["all", ...new Set(state.providers.map((provider) => provider.category).filter(Boolean))];

  return `
    <section class="category-filter-bar provider-verification-filter-bar">
      <span class="cfb-label">Category</span>
      <div class="chip-row provider-chip-row">
        ${categories.map((category) => `
          <button class="btn-chip ${state.dashboardCategoryFilter === category ? "active" : ""}" type="button"
            data-action="set-provider-category-filter" data-category="${escapeHtml(category)}">
            ${category === "all" ? "All" : escapeHtml(category)}
          </button>
        `).join("")}
      </div>

      <div class="cfb-actions">
        <div class="provider-toolbar-count provider-toolbar-count-inline">
          <strong>${providerCount}</strong><span>provider records shown</span>
        </div>
        <div class="filters-anchor">
          <button class="secondary-button small-button provider-filter-toggle" type="button"
            data-action="toggle-provider-filters" aria-expanded="${state.providerFiltersOpen}">Filters</button>
          ${state.providerFiltersOpen ? `
            <div class="filters-popover provider-filters-popover">
              <div class="provider-popover-head">
                <div><h3>Filters</h3><p>Refine provider verification records.</p></div>
                <button class="icon-button" type="button" data-action="toggle-provider-filters" aria-label="Close filters">Close</button>
              </div>
              <div class="provider-popover-body">
                <div class="dashboard-filter-group">
                  <label class="dashboard-filter-label" for="provider-time-filter">Time</label>
                  <select class="select-control dashboard-select-control" id="provider-time-filter">
                    <option value="all" ${state.dashboardTimeFilter === "all" ? "selected" : ""}>All time</option>
                    <option value="today" ${state.dashboardTimeFilter === "today" ? "selected" : ""}>Today</option>
                    <option value="week" ${state.dashboardTimeFilter === "week" ? "selected" : ""}>This Week</option>
                    <option value="month" ${state.dashboardTimeFilter === "month" ? "selected" : ""}>This Month</option>
                  </select>
                </div>
                <div class="dashboard-filter-group">
                  <label class="dashboard-filter-label" for="provider-filter">Status</label>
                  <select class="select-control dashboard-select-control" id="provider-filter">
                    <option value="all" ${state.providerFilter === "all" ? "selected" : ""}>All providers</option>
                    <option value="pending" ${state.providerFilter === "pending" ? "selected" : ""}>Pending</option>
                    <option value="verified" ${state.providerFilter === "verified" ? "selected" : ""}>Verified</option>
                    <option value="rejected" ${state.providerFilter === "rejected" ? "selected" : ""}>Rejected</option>
                  </select>
                </div>
              </div>
              <div class="provider-popover-actions">
                <button class="secondary-button small-button dashboard-clear-button" type="button" data-action="reset-provider-filters">Clear Filters</button>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderProviderVerificationFilterBar(providerCount) {
  const statusCountSource = getDashboardProviders();
  const statusTabs = [
    { id: "all", label: "All Providers" },
    { id: "pending", label: "Pending Applications" },
    { id: "verified", label: "Verified Providers" },
    { id: "rejected", label: "Rejected" },
    { id: "suspended", label: "Suspended" }
  ];

  return `
    <section class="provider-search-toolbar">
      <label class="provider-username-search" for="provider-username-search">
        <span class="provider-search-icon" aria-hidden="true"></span>
        <input
          id="provider-username-search"
          type="search"
          value="${escapeHtml(state.providerUsernameSearch)}"
          placeholder="Search provider by username"
          autocomplete="off"
        >
      </label>

      <div class="provider-search-actions">
        <div class="provider-toolbar-count provider-toolbar-count-inline">
          <strong>${providerCount}</strong>
          <span>provider records shown</span>
        </div>
        <button class="primary-button provider-filter-toggle" type="button" data-action="toggle-provider-filters">
          Filter Providers
        </button>
      </div>
    </section>

    <div class="provider-status-tabs" role="tablist" aria-label="Provider verification status">
      ${statusTabs.map((tab) => {
        const count = tab.id === "all"
          ? statusCountSource.length
          : statusCountSource.filter((provider) => provider.status === tab.id).length;

        return `
          <button class="provider-status-tab ${state.providerFilter === tab.id ? "active" : ""}" type="button"
            role="tab" aria-selected="${state.providerFilter === tab.id ? "true" : "false"}"
            data-action="set-provider-status-filter" data-status="${tab.id}">
            <span>${tab.label}</span><strong>${count}</strong>
          </button>
        `;
      }).join("")}
    </div>

    ${state.providerFiltersOpen ? `
      <div class="provider-filter-overlay" role="presentation">
        <button class="provider-filter-backdrop" type="button" data-action="close-provider-filters" aria-label="Close filters"></button>
        <aside class="provider-filter-panel" role="dialog" aria-modal="true" aria-labelledby="provider-filter-title">
          <header class="provider-filter-panel-head">
            <div>
              <span class="provider-filter-eyebrow">Provider Verification</span>
              <h2 id="provider-filter-title">Filter Providers</h2>
              <p>Use filters to quickly find the provider applications that need your attention.</p>
            </div>
            <button class="provider-filter-close" type="button" data-action="close-provider-filters" aria-label="Close filters">&times;</button>
          </header>

          <div class="provider-filter-panel-body">
            <div class="provider-filter-section provider-filter-form-grid">
              <label class="provider-filter-control provider-filter-control-wide">
                <span>Service category</span>
                <select id="provider-category-filter">
                  <option value="all">All service categories</option>
                  ${state.categories.map((category) => `
                    <option value="${escapeHtml(category.name)}" ${state.dashboardCategoryFilter === category.name ? "selected" : ""}>
                      ${category.icon} ${escapeHtml(category.name)}
                    </option>
                  `).join("")}
                </select>
              </label>

              <label class="provider-filter-control provider-filter-control-wide">
                <span>Location</span>
                <input id="provider-location-filter" type="search" value="${escapeHtml(state.providerLocationFilter)}"
                  placeholder="Search city or service area">
              </label>

              <label class="provider-filter-control provider-filter-control-wide provider-rate-control">
                <span>Maximum base rate <strong id="provider-rate-value">RM ${state.providerRateMax}</strong></span>
                <input id="provider-rate-filter" type="range" min="50" max="300" step="10" value="${state.providerRateMax}">
                <small><span>RM 50</span><span>RM 300+</span></small>
              </label>

              <div class="provider-filter-date-group provider-filter-control-wide">
                <span class="provider-filter-group-label">Application date</span>
                <div class="provider-date-grid">
                  <label class="provider-filter-control"><span>From</span><input id="provider-date-from" type="date" value="${state.providerDateFrom}"></label>
                  <label class="provider-filter-control"><span>To</span><input id="provider-date-to" type="date" value="${state.providerDateTo}"></label>
                </div>
              </div>
            </div>
          </div>

          <footer class="provider-filter-panel-actions">
            <button class="secondary-button provider-clear-filters" type="button" data-action="reset-provider-filters">Clear Filters</button>
            <button class="primary-button provider-show-results" type="button" data-action="show-provider-results">Show Results (${providerCount})</button>
          </footer>
        </aside>
      </div>
    ` : ""}
  `;
}

function renderProvidersPage() {
  const filteredProviders = getProviderVerificationRecords();

  return `
    ${pageHeading(
      "Provider Verification",
      "Review applications and control which providers can accept customer bookings."
    )}

    <article class="page-card">
      <div class="page-card-body">
        <section class="provider-filters-stack">
          ${renderProviderVerificationFilterBar(filteredProviders.length)}
        </section>

        ${providerCardGrid(filteredProviders)}
      </div>
    </article>
  `;
}

function renderCategoriesPage() {
  return `
    ${pageHeading(
      "Service Categories",
      "Create, edit, activate, or pause marketplace services.",
      `<button class="primary-button" data-action="add-category">+ Add Category</button>`
    )}

    <article class="page-card">
      <div class="page-card-body">
        <div class="category-list">
          ${state.categories.map((category) => `
            <div class="category-row">
              <div class="category-content">
                <span style="font-size:1.35rem;">${category.icon}</span>

                <div>
                  <strong>${escapeHtml(category.name)}</strong>
                  <small>${escapeHtml(category.description)}</small>
                </div>
              </div>

              <div class="category-actions">
                ${getStatusBadge(category.status)}

                <button
                  class="secondary-button small-button"
                  data-action="edit-category"
                  data-id="${category.id}"
                >
                  Edit
                </button>

                <button
                  class="secondary-button small-button"
                  data-action="toggle-category"
                  data-id="${category.id}"
                >
                  ${category.status === "active" ? "Pause" : "Activate"}
                </button>

                <button
                  class="danger-button small-button"
                  data-action="delete-category"
                  data-id="${category.id}"
                >
                  Delete
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function getSortedUsersLegacy(users) {
  return [...users].sort((firstUser, secondUser) => {
    if (state.userSort === "name-desc") {
      return secondUser.name.localeCompare(firstUser.name);
    }

    if (state.userSort === "active-first") {
      const firstValue = firstUser.status === "active" ? 0 : 1;
      const secondValue = secondUser.status === "active" ? 0 : 1;

      return firstValue - secondValue ||
        firstUser.name.localeCompare(secondUser.name);
    }

    if (state.userSort === "suspended-first") {
      const firstValue = firstUser.status === "suspended" ? 0 : 1;
      const secondValue = secondUser.status === "suspended" ? 0 : 1;

      return firstValue - secondValue ||
        firstUser.name.localeCompare(secondUser.name);
    }

    return firstUser.name.localeCompare(secondUser.name);
  });
}

function renderUserRowsLegacy(users) {
  if (!users.length) {
    return `
      <tr>
        <td colspan="4" style="text-align:center; color:var(--muted); padding:24px;">
          No matching users found.
        </td>
      </tr>
    `;
  }

  return users.map((user) => `
    <tr>
      <td>
        <span class="table-name">${escapeHtml(user.name)}</span>
        <span class="table-muted">${escapeHtml(user.username || "@unknown")}</span>
        ${user.status === "suspended" && user.suspensionReason ? `
          <span class="table-note">Suspension reason: ${escapeHtml(user.suspensionReason)}</span>
        ` : ""}
      </td>

      <td>
        <span class="table-name">${escapeHtml(user.email)}</span>
        <span class="table-muted">${escapeHtml(user.role)}</span>
      </td>

      <td>${getStatusBadge(user.status)}</td>

      <td>
        <button
          class="${user.status === "active" ? "danger-button" : "success-button"} small-button"
          data-action="${user.status === "active" ? "suspend-user" : "restore-user"}"
          data-id="${user.id}"
        >
          ${user.status === "active" ? "Suspend" : "Restore"}
        </button>
      </td>
    </tr>
  `).join("");
}

function renderUsersPageLegacy() {
  const searchText = state.userSearch.trim().toLowerCase();

  const matchingUsers = state.users.filter((user) => {
    const haystack = [user.name, user.username || "", user.email]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !searchText || haystack.includes(searchText);
    const matchesType = state.userTypeFilter === "all"
      || (state.userTypeFilter === "customers" && user.role.toLowerCase() === "customer")
      || (state.userTypeFilter === "providers" && user.role.toLowerCase() === "provider");

    return matchesSearch && matchesType;
  });

  const sortedUsers = getSortedUsers(matchingUsers);

  const customers = sortedUsers.filter(
    (user) => user.role.toLowerCase() === "customer"
  );

  const providers = sortedUsers.filter(
    (user) => user.role.toLowerCase() === "provider"
  );

  return `
    ${pageHeading(
      "Users",
      "View customer and provider accounts across the FixIt platform."
    )}

    <div class="users-controls">
      <div class="search-by-name">
        <span>🔍</span>

        <input
          class="input-control"
          id="user-search"
          type="text"
          value="${escapeHtml(state.userSearch)}"
          placeholder="Search by name, username, or emailâ€¦"
        >
      </div>

      <select class="select-control" id="user-type-filter">
        <option value="all" ${state.userTypeFilter === "all" ? "selected" : ""}>
          All Users
        </option>

        <option value="customers" ${state.userTypeFilter === "customers" ? "selected" : ""}>
          Customers
        </option>

        <option value="providers" ${state.userTypeFilter === "providers" ? "selected" : ""}>
          Service Providers
        </option>
      </select>

      <select class="select-control" id="user-sort">
        <option value="name-asc" ${state.userSort === "name-asc" ? "selected" : ""}>
          Name: A to Z
        </option>

        <option value="name-desc" ${state.userSort === "name-desc" ? "selected" : ""}>
          Name: Z to A
        </option>

        <option value="active-first" ${state.userSort === "active-first" ? "selected" : ""}>
          Active first
        </option>

        <option value="suspended-first" ${state.userSort === "suspended-first" ? "selected" : ""}>
          Suspended first
        </option>
      </select>
    </div>

    <section class="users-sections">
      <article class="page-card ${state.userTypeFilter === "providers" ? "hidden" : ""}">
        <div class="users-section-heading">
          <div>
            <h2 class="section-title">👤 Customers</h2>
            <p class="section-subtitle">Customer accounts registered on FixIt.</p>
          </div>

          <span class="users-count">${customers.length} customer(s)</span>
        </div>

        <div class="table-wrapper" style="margin-top:16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${renderUserRows(customers)}
            </tbody>
          </table>
        </div>
      </article>

      <article class="page-card ${state.userTypeFilter === "customers" ? "hidden" : ""}">
        <div class="users-section-heading">
          <div>
            <h2 class="section-title">🧑‍🔧 Service Providers</h2>
            <p class="section-subtitle">Provider accounts that offer services on FixIt.</p>
          </div>

          <span class="users-count">${providers.length} provider(s)</span>
        </div>

        <div class="table-wrapper" style="margin-top:16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${renderUserRows(providers)}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}
function getCustomerUsers() {
  return state.users.filter((user) => String(user.role).toLowerCase() === "customer");
}

function getCustomerTrustInfo(trustLevel) {
  const trustMap = {
    trusted: {
      label: "Trusted",
      className: "trusted",
      explanation: "Trusted: No account issues detected."
    },
    normal: {
      label: "Normal",
      className: "normal",
      explanation: "Normal: Standard account activity with no current concerns."
    },
    needs_review: {
      label: "Needs Review",
      className: "needs-review",
      explanation: "Needs Review: Several cancellations or reports may require attention."
    },
    restricted: {
      label: "Restricted",
      className: "restricted",
      explanation: "Restricted: Account access is currently limited."
    }
  };

  return trustMap[trustLevel] || trustMap.normal;
}

function getSortedUsers(users) {
  return [...users].sort((firstUser, secondUser) => {
    if (state.userSort === "newest") {
      return new Date(secondUser.joinedAt || 0) - new Date(firstUser.joinedAt || 0);
    }

    if (state.userSort === "oldest") {
      return new Date(firstUser.joinedAt || 0) - new Date(secondUser.joinedAt || 0);
    }

    if (state.userSort === "last-login") {
      return new Date(secondUser.lastLoginAt || 0) - new Date(firstUser.lastLoginAt || 0);
    }

    return firstUser.name.localeCompare(secondUser.name);
  });
}

function renderCustomerRows(customers) {
  if (!customers.length) {
    return `
      <tr>
        <td colspan="6">
          <div class="customer-empty-state">
            <span class="customer-empty-icon" aria-hidden="true">CU</span>
            <strong>No matching customers found</strong>
            <small>Try changing or clearing the current filters.</small>
          </div>
        </td>
      </tr>
    `;
  }

  return customers.map((customer) => {
    const trust = getCustomerTrustInfo(customer.trustLevel);
    const initials = customer.name
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return `
      <tr>
        <td>
          <div class="customer-account-cell">
            <span class="customer-table-avatar">${escapeHtml(initials)}</span>
            <div>
              <strong>${escapeHtml(customer.name)}</strong>
              <small>${escapeHtml(customer.username || "@unknown")}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="customer-contact-email">${escapeHtml(customer.email)}</span>
          <small class="customer-contact-phone">${escapeHtml(customer.phone || "Phone unavailable")}</small>
        </td>
        <td>${getStatusBadge(customer.status)}</td>
        <td><span class="trust-badge ${trust.className}">${trust.label}</span></td>
        <td><span class="customer-join-date">${escapeHtml(customer.joinedOn || "Not recorded")}</span></td>
        <td>
          <div class="button-row customer-row-actions">
            <button
              class="secondary-button small-button"
              type="button"
              data-action="view-customer"
              data-id="${escapeHtml(customer.id)}"
            >
              View Details
            </button>
            <button
              class="${customer.status === "active" ? "danger-button" : "success-button"} small-button"
              type="button"
              data-action="${customer.status === "active" ? "suspend-user" : "restore-user"}"
              data-id="${escapeHtml(customer.id)}"
            >
              ${customer.status === "active" ? "Suspend" : "Restore"}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderUsersPage() {
  const allCustomers = getCustomerUsers();
  const searchText = state.userSearch.trim().toLowerCase();
  const filteredCustomers = getSortedUsers(allCustomers.filter((customer) => {
    const searchableText = [
      customer.name,
      customer.username || "",
      customer.email,
      customer.phone || ""
    ].join(" ").toLowerCase();

    return (!searchText || searchableText.includes(searchText)) &&
      (state.userStatusFilter === "all" || customer.status === state.userStatusFilter);
  }));
  const activeCustomers = allCustomers.filter((customer) => customer.status === "active").length;
  const suspendedCustomers = allCustomers.filter((customer) => customer.status === "suspended").length;
  const trustReviewCustomers = allCustomers.filter((customer) =>
    ["needs_review", "restricted"].includes(customer.trustLevel)
  ).length;
  const summaryCards = [
    { code: "CUS", label: "Total Customers", value: allCustomers.length, tone: "blue" },
    { code: "ACT", label: "Active Customers", value: activeCustomers, tone: "green" },
    { code: "SUS", label: "Suspended Customers", value: suspendedCustomers, tone: "red" },
    { code: "REV", label: "Trust Review Needed", value: trustReviewCustomers, tone: "orange" }
  ];

  return `
    ${pageHeading(
      "Users",
      "Manage customer accounts, account access, and platform trust."
    )}

    <section class="customer-summary-grid" aria-label="Customer account summary">
      ${summaryCards.map((card) => `
        <article class="customer-summary-card ${card.tone}">
          <span class="customer-summary-code">${card.code}</span>
          <div>
            <strong>${card.value}</strong>
            <span>${card.label}</span>
          </div>
        </article>
      `).join("")}
    </section>

    <article class="page-card customer-control-card">
      <div class="customer-control-head">
        <div>
          <span class="analytics-eyebrow">CUSTOMER DIRECTORY</span>
          <h2>Find a customer account</h2>
          <p>Search customer identity and refine account access records.</p>
        </div>
        <button class="job-clear-button" type="button" data-action="reset-user-filters">Clear Filters</button>
      </div>

      <div class="customer-control-grid">
        <label class="customer-search-control" for="user-search">
          <span class="customer-search-icon" aria-hidden="true"></span>
          <input
            id="user-search"
            type="search"
            value="${escapeHtml(state.userSearch)}"
            placeholder="Search by name, username, email, or phone"
            autocomplete="off"
          >
        </label>

        <label class="customer-select-control">
          <span>Status</span>
          <select id="user-status-filter">
            <option value="all" ${state.userStatusFilter === "all" ? "selected" : ""}>All</option>
            <option value="active" ${state.userStatusFilter === "active" ? "selected" : ""}>Active</option>
            <option value="suspended" ${state.userStatusFilter === "suspended" ? "selected" : ""}>Suspended</option>
          </select>
        </label>

        <label class="customer-select-control">
          <span>Sort By</span>
          <select id="user-sort">
            <option value="name-asc" ${state.userSort === "name-asc" ? "selected" : ""}>Name A-Z</option>
            <option value="newest" ${state.userSort === "newest" ? "selected" : ""}>Newest First</option>
            <option value="oldest" ${state.userSort === "oldest" ? "selected" : ""}>Oldest First</option>
            <option value="last-login" ${state.userSort === "last-login" ? "selected" : ""}>Last Login</option>
          </select>
        </label>

        <span class="customer-result-count">
          <strong>${filteredCustomers.length}</strong> of ${allCustomers.length} customers shown
        </span>
      </div>
    </article>

    <article class="page-card customer-table-card">
      <div class="customer-table-heading">
        <div>
          <h2>Customer Accounts</h2>
          <p>Review account access, contact information, and trust status.</p>
        </div>
        <span class="users-count">${allCustomers.length} customers</span>
      </div>

      <div class="table-wrapper customer-table-wrapper">
        <table class="data-table customer-account-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Account Status</th>
              <th>Trust Level</th>
              <th>Join Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${renderCustomerRows(filteredCustomers)}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function resetUserFilters() {
  state.userSearch = "";
  state.userStatusFilter = "all";
  state.userSort = "name-asc";
  renderCurrentView();
}

function getJobDate(job, field = "created") {
  const isoValue = field === "scheduled" ? job.scheduledAt : job.createdAt;
  const fallbackValue = field === "scheduled" ? job.createdOn : job.createdOn;
  const date = isoValue ? new Date(isoValue) : parseDisplayDate(fallbackValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatJobDateTime(job) {
  const scheduledDate = getJobDate(job, "scheduled");

  if (!scheduledDate) {
    return "Not scheduled";
  }

  return scheduledDate.toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getFilteredJobs() {
  const searchTerm = state.jobsSearch.trim().toLowerCase();
  const fromDate = state.jobsDateFrom ? new Date(`${state.jobsDateFrom}T00:00:00`) : null;
  const toDate = state.jobsDateTo ? new Date(`${state.jobsDateTo}T23:59:59`) : null;

  return state.jobs
    .filter((job) => {
      const createdDate = getJobDate(job);
      const searchableText = [
        job.id,
        job.title,
        job.category,
        job.provider,
        job.customer
      ].join(" ").toLowerCase();

      return (!searchTerm || searchableText.includes(searchTerm)) &&
        (state.jobsStatusFilter === "all" || job.status === state.jobsStatusFilter) &&
        (state.jobsCategoryFilter === "all" || job.category === state.jobsCategoryFilter) &&
        (!fromDate || !createdDate || createdDate >= fromDate) &&
        (!toDate || !createdDate || createdDate <= toDate);
    })
    .sort((firstJob, secondJob) => {
      if (state.jobsSort === "amount-high") {
        return Number(secondJob.amount) - Number(firstJob.amount);
      }

      if (state.jobsSort === "amount-low") {
        return Number(firstJob.amount) - Number(secondJob.amount);
      }

      const firstDate = getJobDate(firstJob)?.getTime() || 0;
      const secondDate = getJobDate(secondJob)?.getTime() || 0;

      return state.jobsSort === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
}

function renderJobsPage() {
  const jobs = getFilteredJobs();
  const categoryOptions = [...new Set(state.jobs.map((job) => job.category))].sort();
  const summaryItems = [
    { label: "Total Jobs", value: jobs.length, code: "ALL", tone: "blue" },
    { label: "Requested", value: jobs.filter((job) => job.status === "requested").length, code: "REQ", tone: "orange" },
    { label: "In Progress", value: jobs.filter((job) => job.status === "in_progress").length, code: "LIVE", tone: "teal" },
    { label: "Completed", value: jobs.filter((job) => ["completed", "closed", "reviewed"].includes(job.status)).length, code: "DONE", tone: "green" },
    { label: "Cost Pending", value: jobs.filter((job) => job.status === "cost_pending").length, code: "RM", tone: "violet" }
  ];

  return `
    ${pageHeading(
      "Jobs Monitoring",
      "Monitor every FixIt service request from booking through review without changing its workflow."
    )}

    <section class="job-summary-grid" aria-label="Filtered job summary">
      ${summaryItems.map((item) => `
        <article class="job-summary-card ${item.tone}">
          <span class="job-summary-code">${item.code}</span>
          <div>
            <strong>${item.value}</strong>
            <span>${item.label}</span>
          </div>
        </article>
      `).join("")}
    </section>

    <article class="page-card job-filter-card">
      <div class="job-filter-heading">
        <div>
          <span class="analytics-eyebrow">MONITORING CONTROLS</span>
          <h2>Find a job record</h2>
          <p>Search and combine filters to narrow the operational queue.</p>
        </div>

        <button class="job-clear-button" type="button" data-action="reset-job-filters">
          Clear Filters
        </button>
      </div>

      <div class="job-filter-grid">
        <label class="job-filter-field job-search-field">
          <span>Search</span>
          <div class="job-search-control">
            <i aria-hidden="true"></i>
            <input
              id="jobs-search"
              type="search"
              value="${escapeHtml(state.jobsSearch)}"
              placeholder="Search by Job ID, provider, customer, or service"
            >
          </div>
        </label>

        <label class="job-filter-field">
          <span>Status</span>
          <select id="jobs-status-filter">
            <option value="all">All Statuses</option>
            ${JOB_STATUS_FLOW.map((status) => `
              <option value="${status.id}" ${state.jobsStatusFilter === status.id ? "selected" : ""}>
                ${status.label}
              </option>
            `).join("")}
          </select>
        </label>

        <label class="job-filter-field">
          <span>Service Category</span>
          <select id="jobs-category-filter">
            <option value="all">All Categories</option>
            ${categoryOptions.map((category) => `
              <option value="${escapeHtml(category)}" ${state.jobsCategoryFilter === category ? "selected" : ""}>
                ${escapeHtml(category)}
              </option>
            `).join("")}
          </select>
        </label>

        <label class="job-filter-field">
          <span>Sort By</span>
          <select id="jobs-sort">
            <option value="newest" ${state.jobsSort === "newest" ? "selected" : ""}>Newest</option>
            <option value="oldest" ${state.jobsSort === "oldest" ? "selected" : ""}>Oldest</option>
            <option value="amount-high" ${state.jobsSort === "amount-high" ? "selected" : ""}>Amount: High to Low</option>
            <option value="amount-low" ${state.jobsSort === "amount-low" ? "selected" : ""}>Amount: Low to High</option>
          </select>
        </label>

        <label class="job-filter-field">
          <span>From</span>
          <input id="jobs-date-from" type="date" value="${escapeHtml(state.jobsDateFrom)}">
        </label>

        <label class="job-filter-field">
          <span>To</span>
          <input id="jobs-date-to" type="date" value="${escapeHtml(state.jobsDateTo)}">
        </label>
      </div>
    </article>

    <article class="page-card job-table-card">
      <div class="job-table-head">
        <div>
          <h2>Job Records</h2>
          <p>Current workflow and payment visibility across the platform.</p>
        </div>

        <span class="job-result-count"><strong>${jobs.length}</strong> of ${state.jobs.length} records shown</span>
      </div>

      <div class="table-wrapper job-table-wrapper">
        <table class="data-table job-monitor-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Service</th>
              <th>Provider</th>
              <th>Customer</th>
              <th>Scheduled Date & Time</th>
              <th>Final Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${jobs.length ? jobs.map((job) => `
              <tr>
                <td>
                  <span class="job-id-cell">#${escapeHtml(job.id)}</span>
                  <small>${escapeHtml(job.createdOn)}</small>
                </td>
                <td>
                  <div class="job-service-cell">
                    <span>${escapeHtml(job.icon || job.category.slice(0, 2).toUpperCase())}</span>
                    <div>
                      <strong>${escapeHtml(job.title)}</strong>
                      <small>${escapeHtml(job.category)}</small>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(job.provider)}</td>
                <td>${escapeHtml(job.customer)}</td>
                <td><span class="job-schedule-cell">${escapeHtml(formatJobDateTime(job))}</span></td>
                <td><strong>${formatCurrency(job.amount)}</strong></td>
                <td>${getStatusBadge(job.status)}</td>
                <td>
                  <button
                    class="secondary-button small-button"
                    type="button"
                    data-action="view-job"
                    data-id="${escapeHtml(job.id)}"
                  >
                    View Job
                  </button>
                </td>
              </tr>
            `).join("") : `
              <tr>
                <td colspan="8">
                  <div class="job-empty-state">
                    <strong>No matching jobs</strong>
                    <span>Try changing or clearing the current filters.</span>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderSafetyPage() {
  return `
    ${pageHeading(
      "Safety & Compliance",
      "Create platform rules and maintain safety requirements for providers."
    )}

    <section class="two-column-grid">
      <article class="page-card">
        <div class="page-card-body">
          <h2 class="section-title">Add Safety Note</h2>
          <p class="section-subtitle">
            Publish a compliance rule for the FixIt administration team.
          </p>

          <form id="safety-form" style="margin-top:20px;" novalidate>
            <div class="form-group">
              <label for="safety-note">Safety or compliance note</label>

              <textarea
                class="textarea-control"
                id="safety-note"
                required
                placeholder="Example: All providers must upload a valid CIDB licence before verification."
              ></textarea>
            </div>

            <button class="primary-button" type="submit">
              Publish Note
            </button>
          </form>
        </div>
      </article>

      <article class="page-card">
        <div class="page-card-body">
          <h2 class="section-title">Active Safety Notes</h2>
          <p class="section-subtitle">
            These rules are currently active on FixIt.
          </p>

          <div class="note-list" style="margin-top:20px;">
            ${state.safetyNotes.map((note, index) => `
              <div class="note-row">
                <p>
                  <strong>⚠️ Rule ${index + 1}</strong><br>
                  ${escapeHtml(note)}
                </p>

                <button
                  class="note-delete-button"
                  data-action="delete-safety-note"
                  data-index="${index}"
                >
                  Delete
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderAnalyticsPageLegacy() {
  const categoryDemand = [
    { name: "Cleaning", value: 82, jobs: 4280, color: "#416cf0", icon: "🧹" },
    { name: "Plumbing", value: 71, jobs: 3690, color: "#10b8aa", icon: "🚿" },
    { name: "Electrical", value: 58, jobs: 3015, color: "#f5a623", icon: "⚡" },
    { name: "AC Service", value: 46, jobs: 2380, color: "#08c86b", icon: "❄️" }
  ];

  const monthlyJobs = [
    { month: "Jan", value: 42 },
    { month: "Feb", value: 57 },
    { month: "Mar", value: 48 },
    { month: "Apr", value: 74 },
    { month: "May", value: 68 },
    { month: "Jun", value: 91 }
  ];

  return `
    ${pageHeading(
      "Analytics",
      "Track FixIt platform performance, provider growth, and service demand.",
      `<button class="primary-button" data-action="export-report">⇩ Export CSV</button>`
    )}

    <!-- PLATFORM OVERVIEW AT TOP -->
    <section class="analytics-overview-card">
      <div class="analytics-overview-head">
        <div>
          <span class="analytics-eyebrow">LIVE PLATFORM SUMMARY</span>
          <h2>Platform Overview</h2>
          <p>Current performance across providers, jobs, verification, and revenue.</p>
        </div>

        <span class="analytics-live-status">● Updated now</span>
      </div>

      <div class="analytics-summary-grid">
        <div class="analytics-summary-item">
          <div class="analytics-summary-icon blue-icon">🧑‍🔧</div>
          <div>
            <strong>${state.metrics.totalProviders.toLocaleString()}</strong>
            <span>Total Providers</span>
            <small>↑ 12 this week</small>
          </div>
        </div>

        <div class="analytics-summary-item">
          <div class="analytics-summary-icon orange-icon">⌛</div>
          <div>
            <strong>${getPendingCount()}</strong>
            <span>Verification Queue</span>
            <small class="warning-text">Needs review</small>
          </div>
        </div>

        <div class="analytics-summary-item">
          <div class="analytics-summary-icon green-icon">📋</div>
          <div>
            <strong>${state.metrics.totalJobs.toLocaleString()}</strong>
            <span>Total Jobs Created</span>
            <small>↑ 4.2% this month</small>
          </div>
        </div>

        <div class="analytics-summary-item">
          <div class="analytics-summary-icon teal-icon">💰</div>
          <div>
            <strong>${formatCurrency(state.metrics.totalRevenue)}</strong>
            <span>Total Revenue</span>
            <small>↑ 18.7% year to date</small>
          </div>
        </div>
      </div>
    </section>

    <!-- CHARTS -->
    <section class="analytics-charts-layout">
      <article class="modern-chart-card demand-chart-card">
        <div class="modern-chart-head">
          <div>
            <span class="analytics-eyebrow">SERVICE PERFORMANCE</span>
            <h2>Service Category Demand</h2>
            <p>Most requested FixIt service categories this month.</p>
          </div>

          <div class="chart-total-jobs">
            <strong>13,365</strong>
            <span>Total category jobs</span>
          </div>
        </div>

        <div class="demand-chart-list">
          ${categoryDemand.map((category) => `
            <div class="demand-chart-row">
              <div class="demand-chart-label">
                <span class="demand-chart-icon">${category.icon}</span>

                <div>
                  <strong>${category.name}</strong>
                  <small>${category.jobs.toLocaleString()} completed jobs</small>
                </div>
              </div>

              <div class="demand-chart-progress-area">
                <div class="demand-chart-track">
                  <div
                    class="demand-chart-fill"
                    style="width:${category.value}%; background:${category.color};"
                  ></div>
                </div>
              </div>

              <div class="demand-chart-value">
                <strong>${category.value}%</strong>
                <span>Demand</span>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="demand-chart-footer">
          <span><i class="legend-dot blue-dot"></i> Highest demand: Cleaning</span>
          <span>Based on completed and active job requests.</span>
        </div>
      </article>

      <article class="modern-chart-card jobs-chart-card">
        <div class="modern-chart-head">
          <div>
            <span class="analytics-eyebrow">MONTHLY ACTIVITY</span>
            <h2>Job Growth</h2>
            <p>Completed jobs during the first half of 2026.</p>
          </div>

          <span class="growth-badge">↑ 18.7%</span>
        </div>

        <div class="monthly-bar-chart">
          ${monthlyJobs.map((month) => `
            <div class="monthly-bar-item">
              <span class="monthly-bar-value">${month.value}</span>

              <div class="monthly-bar-track">
                <div
                  class="monthly-bar-fill"
                  style="height:${month.value}%;"
                ></div>
              </div>

              <span class="monthly-bar-month">${month.month}</span>
            </div>
          `).join("")}
        </div>

        <div class="jobs-chart-summary">
          <div>
            <strong>91</strong>
            <span>June jobs</span>
          </div>

          <div>
            <strong>+23</strong>
            <span>Since January</span>
          </div>

          <div>
            <strong>74%</strong>
            <span>Average completion</span>
          </div>
        </div>
      </article>
    </section>
  `;
}




function getAnalyticsJobs() {
  const fromDate = state.analyticsDateFrom ? new Date(`${state.analyticsDateFrom}T00:00:00`) : null;
  const toDate = state.analyticsDateTo ? new Date(`${state.analyticsDateTo}T23:59:59`) : null;
  const providerUsernameQuery = state.analyticsProviderUsernameSearch.trim().toLowerCase();

  return state.jobs.filter((job) => {
    const createdDate = getJobDate(job);
    const provider = state.providers.find((item) => item.name === job.provider);
    const providerUsername = String(provider?.username || "").toLowerCase();

    return (state.analyticsCategoryFilter === "all" || job.category === state.analyticsCategoryFilter) &&
      (!providerUsernameQuery || providerUsername.includes(providerUsernameQuery)) &&
      (state.analyticsStatusFilter === "all" || job.status === state.analyticsStatusFilter) &&
      (!fromDate || !createdDate || createdDate >= fromDate) &&
      (!toDate || !createdDate || createdDate <= toDate);
  });
}

function getAnalyticsProviders() {
  const providerUsernameQuery = state.analyticsProviderUsernameSearch.trim().toLowerCase();

  return state.providers.filter((provider) =>
    (state.analyticsCategoryFilter === "all" || provider.category === state.analyticsCategoryFilter) &&
    (!providerUsernameQuery || String(provider.username || "").toLowerCase().includes(providerUsernameQuery))
  );
}

function buildAnalyticsModel() {
  const jobs = getAnalyticsJobs();
  const providers = getAnalyticsProviders();
  const jobScale = state.metrics.totalJobs / Math.max(state.jobs.length, 1);
  const recordedRevenue = state.jobs.reduce((total, job) => total + Number(job.amount || 0), 0);
  const revenueScale = state.metrics.totalRevenue / Math.max(recordedRevenue, 1);
  const completedStatuses = ["completed", "closed", "reviewed"];
  const revenue = Math.round(jobs.reduce((total, job) => total + Number(job.amount || 0), 0) * revenueScale);
  const completedJobs = Math.round(jobs.filter((job) => completedStatuses.includes(job.status)).length * jobScale);
  const verifiedProviders = providers.filter((provider) => provider.status === "verified");
  const providerScale = state.metrics.totalProviders / Math.max(state.providers.length, 1);
  const averageRating = verifiedProviders.length
    ? verifiedProviders.reduce((total, provider) => total + Number(provider.rating || 0), 0) / verifiedProviders.length
    : 0;
  const customerCount = new Set(jobs.map((job) => job.customer)).size;
  const jobRatio = jobs.length / Math.max(state.jobs.length, 1);
  const statusRows = JOB_STATUS_FLOW.map((status) => ({
    ...status,
    value: Math.round(jobs.filter((job) => job.status === status.id).length * jobScale)
  }));
  const categoryRows = state.categories.map((category) => ({
    name: category.name,
    value: Math.round(jobs.filter((job) => job.category === category.name).length * jobScale)
  })).sort((first, second) => second.value - first.value);
  const providerRows = verifiedProviders
    .slice()
    .sort((first, second) => Number(second.rating) - Number(first.rating) || Number(second.jobsCompleted) - Number(first.jobsCompleted))
    .slice(0, 5);
  const verificationRows = ["pending", "verified", "rejected", "suspended"].map((status) => ({
    id: status,
    label: status === "pending" ? "Pending" : status.charAt(0).toUpperCase() + status.slice(1),
    value: providers.filter((provider) => provider.status === status).length
  }));
  const monthlyWeights = [0.12, 0.14, 0.15, 0.17, 0.19, 0.23];
  const monthlyRevenue = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
    month,
    revenue: Math.round(revenue * monthlyWeights[index]),
    commission: Math.round(revenue * monthlyWeights[index] * 0.12)
  }));
  const customerActivity = [68, 79, 75, 91, 104, 116].map((value, index) => ({
    label: `W${index + 1}`,
    value: Math.round(value * Math.max(jobRatio, 0.08))
  }));

  return {
    jobs,
    providers,
    completedJobs,
    revenue,
    commission: Math.round(revenue * 0.12),
    activeProviders: Math.round(verifiedProviders.length * providerScale),
    newCustomers: customerCount * 36,
    averageRating,
    pendingApplications: providers.filter((provider) => provider.status === "pending").length,
    openReports: Math.max(1, Math.round(state.safetyNotes.length / 2)),
    statusRows,
    categoryRows,
    providerRows,
    verificationRows,
    monthlyRevenue,
    customerActivity
  };
}

function renderAnalyticsPage() {
  const model = buildAnalyticsModel();
  const categories = [...new Set(state.jobs.map((job) => job.category))].sort();
  const statusMax = Math.max(...model.statusRows.map((row) => row.value), 1);
  const categoryMax = Math.max(...model.categoryRows.map((row) => row.value), 1);
  const revenueMax = Math.max(...model.monthlyRevenue.map((row) => row.revenue), 1);
  const activityMax = Math.max(...model.customerActivity.map((row) => row.value), 1);
  const verificationTotal = Math.max(model.verificationRows.reduce((total, row) => total + row.value, 0), 1);
  const verifiedPercent = Math.round((model.verificationRows.find((row) => row.id === "verified")?.value || 0) / verificationTotal * 100);
  const topCategory = model.categoryRows.find((row) => row.value > 0);
  const topProvider = model.providerRows[0];
  const metricCards = [
    { label: "Completed Jobs", value: model.completedJobs.toLocaleString(), detail: "Closed or reviewed", code: "JOB", tone: "blue" },
    { label: "Platform Revenue", value: formatCurrency(model.revenue), detail: "Filtered gross value", code: "RM", tone: "teal" },
    { label: "12% Commission", value: formatCurrency(model.commission), detail: "Estimated platform share", code: "12%", tone: "violet" },
    { label: "Active Providers", value: model.activeProviders.toLocaleString(), detail: "Verified marketplace supply", code: "PRO", tone: "green" },
    { label: "New Customers", value: model.newCustomers.toLocaleString(), detail: "Estimated acquisitions", code: "NEW", tone: "blue" },
    { label: "Average Rating", value: model.averageRating ? `${model.averageRating.toFixed(1)} / 5` : "No data", detail: "Verified providers", code: "AVG", tone: "orange" },
    { label: "Pending Applications", value: model.pendingApplications, detail: "Awaiting admin review", code: "KYC", tone: "orange" },
    { label: "Disputes / Safety Reports", value: model.openReports, detail: "Requires monitoring", code: "RPT", tone: "red" }
  ];

  return `
    ${pageHeading(
      "Analytics & Reports",
      "Understand service demand, revenue, provider performance, and customer activity."
    )}

    <article class="page-card analytics-filter-card">
      <div class="analytics-filter-head">
        <div>
          <span class="analytics-eyebrow">REPORT FILTERS</span>
          <h2>Refine platform analytics</h2>
          <p>Every summary and chart below responds to the selected records.</p>
        </div>

        <div class="analytics-filter-actions">
          <button class="job-clear-button" type="button" data-action="reset-analytics-filters">Clear Filters</button>
          <button class="primary-button" type="button" data-action="export-report">Export Report</button>
        </div>
      </div>

      <div class="analytics-filter-grid">
        <label class="job-filter-field">
          <span>From Date</span>
          <input id="analytics-date-from" type="date" value="${escapeHtml(state.analyticsDateFrom)}">
        </label>
        <label class="job-filter-field">
          <span>To Date</span>
          <input id="analytics-date-to" type="date" value="${escapeHtml(state.analyticsDateTo)}">
        </label>
        <label class="job-filter-field">
          <span>Service Category</span>
          <select id="analytics-category-filter">
            <option value="all">All Categories</option>
            ${categories.map((category) => `
              <option value="${escapeHtml(category)}" ${state.analyticsCategoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>
            `).join("")}
          </select>
        </label>
        <label class="job-filter-field analytics-provider-search-field">
          <span>Provider Username</span>
          <div class="analytics-search-input-wrap">
            <span aria-hidden="true">&#128269;</span>
            <input id="analytics-provider-username-search" type="search"
              value="${escapeHtml(state.analyticsProviderUsernameSearch)}"
              placeholder="Search provider username..." autocomplete="off">
          </div>
        </label>
        <label class="job-filter-field">
          <span>Job Status</span>
          <select id="analytics-status-filter">
            <option value="all">All Statuses</option>
            ${JOB_STATUS_FLOW.map((status) => `
              <option value="${status.id}" ${state.analyticsStatusFilter === status.id ? "selected" : ""}>${status.label}</option>
            `).join("")}
          </select>
        </label>
      </div>
    </article>

    <section class="analytics-kpi-grid" aria-label="Platform summary">
      ${metricCards.map((metric) => `
        <article class="analytics-kpi-card ${metric.tone}">
          <span class="analytics-kpi-code">${metric.code}</span>
          <div>
            <strong>${metric.value}</strong>
            <span>${metric.label}</span>
            <small>${metric.detail}</small>
          </div>
        </article>
      `).join("")}
    </section>

    <section class="analytics-report-grid">
      <article class="analytics-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">WORKFLOW</span>
            <h2>Jobs by Status</h2>
            <p>Estimated platform volume across each service stage.</p>
          </div>
          <span class="analytics-data-pill">${model.jobs.length} source records</span>
        </div>
        <div class="analytics-horizontal-chart">
          ${model.statusRows.map((row) => `
            <div class="analytics-bar-row">
              <span>${row.label}</span>
              <div><i style="width:${Math.round(row.value / statusMax * 100)}%"></i></div>
              <strong>${row.value.toLocaleString()}</strong>
            </div>
          `).join("")}
        </div>
      </article>

      <article class="analytics-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">FINANCIALS</span>
            <h2>Revenue & Commission Trend</h2>
            <p>Six-month distribution of gross value and the 12% platform share.</p>
          </div>
          <span class="analytics-data-pill">${formatCurrency(model.revenue)}</span>
        </div>
        <div class="analytics-column-chart">
          ${model.monthlyRevenue.map((row) => `
            <div class="analytics-column-item">
              <div class="analytics-column-values">
                <span>${formatCurrency(row.revenue)}</span>
                <small>${formatCurrency(row.commission)} fee</small>
              </div>
              <div class="analytics-column-track">
                <i class="revenue-bar" style="height:${Math.max(4, Math.round(row.revenue / revenueMax * 100))}%"></i>
                <i class="commission-bar" style="height:${Math.max(2, Math.round(row.commission / revenueMax * 100))}%"></i>
              </div>
              <strong>${row.month}</strong>
            </div>
          `).join("")}
        </div>
        <div class="analytics-chart-legend">
          <span><i class="revenue-key"></i>Revenue</span>
          <span><i class="commission-key"></i>Commission</span>
        </div>
      </article>

      <article class="analytics-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">SERVICE DEMAND</span>
            <h2>Most Requested Services</h2>
            <p>Category demand from the current report selection.</p>
          </div>
        </div>
        <div class="analytics-service-list">
          ${model.categoryRows.map((row, index) => `
            <div class="analytics-service-row">
              <span class="analytics-rank">${String(index + 1).padStart(2, "0")}</span>
              <div class="analytics-service-copy">
                <strong>${escapeHtml(row.name)}</strong>
                <div><i style="width:${Math.round(row.value / categoryMax * 100)}%"></i></div>
              </div>
              <span>${row.value.toLocaleString()} jobs</span>
            </div>
          `).join("")}
        </div>
      </article>

      <article class="analytics-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">QUALITY</span>
            <h2>Top Provider Performance</h2>
            <p>Verified providers ranked by rating and completed work.</p>
          </div>
        </div>
        <div class="analytics-provider-list">
          ${model.providerRows.length ? model.providerRows.map((provider, index) => `
            <div class="analytics-provider-row">
              <span class="analytics-provider-rank">${index + 1}</span>
              <div>
                <strong>${escapeHtml(provider.name)}</strong>
                <small>${escapeHtml(provider.category)} - ${escapeHtml(provider.responseTime)}</small>
              </div>
              <div>
                <strong>${Number(provider.rating).toFixed(1)} / 5</strong>
                <small>${Number(provider.jobsCompleted).toLocaleString()} jobs</small>
              </div>
            </div>
          `).join("") : `
            <div class="analytics-empty-copy">No verified provider matches these filters.</div>
          `}
        </div>
      </article>

      <article class="analytics-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">CUSTOMERS</span>
            <h2>Customer Activity</h2>
            <p>Weekly activity index for the selected service records.</p>
          </div>
          <span class="analytics-data-pill">${model.newCustomers.toLocaleString()} new</span>
        </div>
        <div class="analytics-activity-chart">
          ${model.customerActivity.map((row) => `
            <div>
              <span>${row.value}</span>
              <i style="height:${Math.max(4, Math.round(row.value / activityMax * 100))}%"></i>
              <small>${row.label}</small>
            </div>
          `).join("")}
        </div>
      </article>

      <article class="analytics-report-card verification-report-card">
        <div class="analytics-report-head">
          <div>
            <span class="analytics-eyebrow">PROVIDER ONBOARDING</span>
            <h2>Verification Summary</h2>
            <p>Current provider application distribution.</p>
          </div>
        </div>
        <div class="verification-chart-layout">
          <div class="verification-donut" style="--verified:${verifiedPercent}%">
            <div>
              <strong>${verifiedPercent}%</strong>
              <span>verified</span>
            </div>
          </div>
          <div class="verification-legend-list">
            ${model.verificationRows.map((row) => `
              <div class="${row.id}">
                <span><i></i>${row.label}</span>
                <strong>${row.value}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    </section>

    <article class="platform-insights-card">
      <div class="platform-insights-intro">
        <span class="analytics-eyebrow">PLATFORM INSIGHTS</span>
        <h2>What deserves attention</h2>
        <p>Generated from the current report selection to help administrators spot the next useful action.</p>
      </div>
      <div class="platform-insight-grid">
        <div>
          <span>01</span>
          <strong>${topCategory ? `${escapeHtml(topCategory.name)} leads demand` : "Demand is evenly distributed"}</strong>
          <p>${topCategory ? `${topCategory.value.toLocaleString()} estimated jobs are associated with this service in the current view.` : "Broaden the filters to compare service demand."}</p>
        </div>
        <div>
          <span>02</span>
          <strong>${model.pendingApplications} applications need review</strong>
          <p>Keep verification moving so high-demand areas have enough active providers.</p>
        </div>
        <div>
          <span>03</span>
          <strong>${topProvider ? `${escapeHtml(topProvider.name)} is the quality leader` : "No quality leader in this view"}</strong>
          <p>${topProvider ? `${Number(topProvider.rating).toFixed(1)} average rating across ${Number(topProvider.jobsCompleted).toLocaleString()} completed jobs.` : "Select all providers to restore performance comparisons."}</p>
        </div>
      </div>
    </article>
  `;
}

function renderAdminProfilePageLegacy() {
  const profile = state.adminProfile;
  const verifiedProviders = state.providers.filter((provider) => provider.status === "verified").length;
  const pendingProviders = state.providers.filter((provider) => provider.status === "pending").length;
  const activeCategories = state.categories.filter((category) => category.status === "active").length;
  const monitoredJobs = state.jobs.length;

  const initials = profile.name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return `
    ${pageHeading(
      "My Profile",
      "Manage your FixIt administrator profile and account information.",
      `<button class="primary-button" data-action="edit-admin-profile">Edit Profile</button>`
    )}

    <section class="admin-profile-layout">
      <article class="profile-identity-card">
        <div class="profile-cover"></div>

        <div class="profile-identity-content">
          <div class="admin-profile-avatar-large">${initials}</div>

          <div class="admin-profile-main-info">
            <span class="profile-role-chip">System Administrator</span>
            <h2>${escapeHtml(profile.name)}</h2>
              <p>${escapeHtml(profile.position)} - ${escapeHtml(profile.department)}</p>

            <p class="profile-bio">
              ${escapeHtml(profile.bio)}
            </p>

            <div class="profile-meta-row">
              <span class="profile-meta-pill">${escapeHtml(profile.permissionsTier)}</span>
              <span class="profile-meta-pill">${escapeHtml(profile.workMode)}</span>
              <span class="profile-meta-pill">${escapeHtml(profile.timezone)}</span>
            </div>
          </div>

          <div class="profile-hero-stats">
            <div class="profile-stat-card">
              <span>Verified Providers</span>
              <strong>${verifiedProviders}</strong>
              <small>Currently approved on the platform</small>
            </div>

            <div class="profile-stat-card">
              <span>Pending Reviews</span>
              <strong>${pendingProviders}</strong>
              <small>Applications waiting for action</small>
            </div>

            <div class="profile-stat-card">
              <span>Live Categories</span>
              <strong>${activeCategories}</strong>
              <small>Services currently available</small>
            </div>

            <div class="profile-stat-card">
              <span>Jobs Monitored</span>
              <strong>${monitoredJobs}</strong>
              <small>Recent operational records tracked</small>
            </div>
          </div>
        </div>

        <div class="profile-contact-strip">
          <div>
            <span>Work Email</span>
            <strong>${escapeHtml(profile.email)}</strong>
          </div>

          <div>
            <span>Phone Number</span>
            <strong>${escapeHtml(profile.phone)}</strong>
          </div>

          <div>
            <span>Location</span>
            <strong>${escapeHtml(profile.location)}</strong>
          </div>

          <div>
            <span>Employee ID</span>
            <strong>${escapeHtml(profile.employeeId)}</strong>
          </div>
        </div>
      </article>

      <section class="admin-profile-details-grid">
        <article class="page-card">
          <div class="page-card-body">
            <div class="section-header">
              <div>
                <h2 class="section-title">Profile Overview</h2>
                <p class="section-subtitle">
                  A fuller administrative identity with operational context.
                </p>
              </div>
            </div>

            <div class="profile-info-grid">
              <div class="profile-info-item">
                <span>Full Name</span>
                <strong>${escapeHtml(profile.name)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Position</span>
                <strong>${escapeHtml(profile.position)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Department</span>
                <strong>${escapeHtml(profile.department)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Joined FixIt</span>
                <strong>${escapeHtml(profile.joinedOn)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Manager</span>
                <strong>${escapeHtml(profile.manager)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Languages</span>
                <strong>${escapeHtml(profile.languages)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Timezone</span>
                <strong>${escapeHtml(profile.timezone)}</strong>
              </div>

              <div class="profile-info-item">
                <span>Shift Window</span>
                <strong>${escapeHtml(profile.shiftWindow)}</strong>
              </div>
            </div>

            <div class="profile-focus-block">
              <span class="profile-focus-label">Operational Focus</span>
              <div class="chip-row">
                ${(profile.focusAreas || []).map((area) => `
                  <span class="btn-chip active">${escapeHtml(area)}</span>
                `).join("")}
              </div>
            </div>
          </div>
        </article>

        <article class="page-card">
          <div class="page-card-body">
            <div class="section-header">
              <div>
                <h2 class="section-title">Account & Security</h2>
                <p class="section-subtitle">
                  Modeled after real admin account and session views.
                </p>
              </div>
            </div>

            <div class="security-status-list">
              <div class="security-status-row">
                <div>
                  <strong>Account Role</strong>
                  <span>Full administrator access</span>
                </div>

                <span class="status-badge active">Administrator</span>
              </div>

              <div class="security-status-row">
                <div>
                  <strong>Two-Factor Authentication</strong>
                  <span>Extra account security is enabled</span>
                </div>

                <span class="status-badge verified">Enabled</span>
              </div>

              <div class="security-status-row">
                <div>
                  <strong>Account Status</strong>
                  <span>Account can access all FixIt admin tools</span>
                </div>

                <span class="status-badge active">Active</span>
              </div>

              <div class="security-status-row">
                <div>
                  <strong>Last Login</strong>
                  <span>${escapeHtml(profile.lastLogin)}</span>
                </div>

                <span class="status-badge completed">Secure</span>
              </div>

              <div class="security-status-row">
                <div>
                  <strong>Access Tier</strong>
                  <span>${escapeHtml(profile.permissionsTier)}</span>
                </div>

                <span class="status-badge review">Scoped</span>
              </div>
            </div>

            <div class="profile-session-panel">
              <div class="profile-session-head">
                <h3>Recent Sessions</h3>
                <span>Trusted devices and access context</span>
              </div>

              <div class="profile-session-list">
                ${(profile.recentDevices || []).map((device, index) => `
                  <div class="profile-session-item">
                    <div>
                      <strong>${escapeHtml(device)}</strong>
                      <span>${index === 0 ? "Current trusted session" : "Recognized access session"}</span>
                    </div>

                    <span class="status-badge ${index === 0 ? "active" : "verified"}">
                      ${index === 0 ? "Current" : "Trusted"}
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </article>

        <article class="page-card profile-operations-card">
          <div class="page-card-body">
            <div class="section-header">
              <div>
                <h2 class="section-title">Operations Snapshot</h2>
                <p class="section-subtitle">
                  A realistic view of what this admin account is responsible for.
                </p>
              </div>
            </div>

            <div class="profile-ops-grid">
              <div class="profile-ops-item">
                <span>Office Extension</span>
                <strong>${escapeHtml(profile.officeExtension)}</strong>
              </div>

              <div class="profile-ops-item">
                <span>Emergency Contact</span>
                <strong>${escapeHtml(profile.emergencyContact)}</strong>
              </div>

              <div class="profile-ops-item">
                <span>Provider Queue Ownership</span>
                <strong>${pendingProviders} records in review</strong>
              </div>

              <div class="profile-ops-item">
                <span>Service Governance</span>
                <strong>${activeCategories} active service categories</strong>
              </div>

              <div class="profile-ops-item">
                <span>Escalation Scope</span>
                <strong>Fraud, compliance, and high-priority disputes</strong>
              </div>

              <div class="profile-ops-item">
                <span>Monitoring Coverage</span>
                <strong>${monitoredJobs} recent jobs under observation</strong>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  `;
}
function getProfileDetailIcon(label) {
  const icons = {
    "Work Email": "@",
    "Work Phone": "WP",
    "Personal Phone": "PP",
    "Account Status": "OK",
    "Professional Bio": "BIO",
    "Last Login": "LOG",
    "Office Address": "LOC",
    "City / State": "CTY",
    Postcode: "ZIP",
    Country: "MY",
    "Building / Floor": "BLD",
    "Emergency Contact": "SOS",
    Position: "JOB",
    Department: "DEP"
  };

  return icons[label] || "INF";
}

function renderAdminProfilePage() {
  const profile = state.adminProfile;
  const activeTab = state.activeProfileTab || "admin-details";
  const initials = profile.name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  const tabs = [
    { id: "about", label: "About" },
    { id: "address", label: "Address" },
    { id: "admin-details", label: "Admin Details" }
  ];
  const details = {
    about: [
      ["Work Email", profile.email],
      ["Work Phone", profile.phone],
      ["Personal Phone", profile.personalPhone],
      ["Account Status", profile.accountStatus],
      ["Professional Bio", profile.bio],
      ["Last Login", profile.lastLogin]
    ],
    address: [
      ["Office Address", profile.addressLine],
      ["City / State", profile.cityState],
      ["Postcode", profile.postcode],
      ["Country", profile.country],
      ["Building / Floor", profile.building],
      ["Emergency Contact", profile.emergencyContact]
    ],
    "admin-details": [
      ["Work Email", profile.email],
      ["Work Phone", profile.phone],
      ["Personal Phone", profile.personalPhone],
      ["Position", profile.position],
      ["Department", profile.department],
      ["Professional Bio", profile.bio],
      ["Account Status", profile.accountStatus],
      ["Last Login", profile.lastLogin]
    ]
  };
  const activeDetails = details[activeTab] || details["admin-details"];

  return `
    ${pageHeading(
      "My Profile",
      "",
      `<button class="primary-button" data-action="edit-admin-profile">Edit Profile</button>`
    )}

    <section class="profile-reference-layout">
      <article class="page-card profile-sidebar-card">
        <div class="page-card-body">
          <div class="profile-sidebar-head">
            <div class="profile-picture-frame" role="img" aria-label="${escapeHtml(profile.name)} profile picture">
              <div class="admin-profile-avatar-large profile-sidebar-avatar">${initials}</div>
            </div>
            <div class="profile-sidebar-identity">
              <h2>${escapeHtml(profile.name)}</h2>
              <span class="profile-admin-id">#${escapeHtml(profile.employeeId)}</span>
              <div class="profile-sidebar-meta">
                <span>${escapeHtml(profile.position)}</span>
                <span>${escapeHtml(profile.department)}</span>
              </div>
              <small class="profile-account-state"><i></i>${escapeHtml(profile.accountStatus)}</small>
            </div>
          </div>
        </div>
      </article>

      <div class="profile-main-column">
        <article class="page-card profile-table-card">
          <div class="page-card-body">
            <div class="profile-switcher profile-switcher-main" role="tablist" aria-label="Profile information sections">
              ${tabs.map((tab) => `
                <button class="profile-switcher-tab ${activeTab === tab.id ? "active" : ""}" type="button"
                  role="tab" aria-selected="${activeTab === tab.id}" data-action="switch-profile-tab" data-tab="${tab.id}">
                  ${tab.label}
                </button>
              `).join("")}
            </div>

            <div class="profile-info-table" role="tabpanel">
              ${activeDetails.map(([label, value]) => `
                <div class="profile-info-table-row">
                  <span class="profile-info-icon" aria-hidden="true">${getProfileDetailIcon(label)}</span>
                  <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not provided")}</strong></div>
                </div>
              `).join("")}
            </div>
          </div>
        </article>

        <section class="profile-reference-bottom">
          <article class="page-card">
            <div class="page-card-body">
              <h2 class="section-title">Activity</h2>
              <div class="profile-activity-list">
                <div class="profile-activity-item"><div class="profile-activity-copy"><strong>Provider review completed</strong><span>Verification documents approved</span><small>Today, 10:18 AM</small></div></div>
                <div class="profile-activity-item"><div class="profile-activity-copy"><strong>Account policy updated</strong><span>Compliance review settings revised</span><small>Yesterday, 4:35 PM</small></div></div>
                <div class="profile-activity-item"><div class="profile-activity-copy"><strong>User case resolved</strong><span>Support escalation closed</span><small>18 June, 2:10 PM</small></div></div>
              </div>
            </div>
          </article>

          <article class="page-card">
            <div class="page-card-body">
              <h2 class="section-title">Admin Scope</h2>
              <div class="profile-scope-list">
                <div class="profile-scope-item"><strong>Assigned Permissions</strong><span>${escapeHtml(profile.assignedPermissions)}</span></div>
                <div class="profile-scope-item"><strong>Managed Areas</strong><span>${escapeHtml(profile.managedAreas)}</span></div>
                <div class="profile-scope-item"><strong>Account Status</strong><span>${escapeHtml(profile.accountStatus)}</span></div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </section>
  `;
}

function openAdminProfileModal() {
  const profile = state.adminProfile;

  openModal(`
    <form id="admin-profile-form" class="profile-edit-form" novalidate>
      <div class="modal-head profile-edit-head">
        <div>
          <span class="analytics-eyebrow">ADMIN ACCOUNT</span>
          <h2>Edit Admin Profile</h2>
          <p>Keep contact, workplace, and official administrator information accurate.</p>
        </div>
        <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
      </div>

      <div class="profile-edit-tabs" role="tablist" aria-label="Edit profile sections">
        <button class="active" type="button" role="tab" aria-selected="true" data-action="switch-profile-edit-tab" data-tab="about">About</button>
        <button type="button" role="tab" aria-selected="false" data-action="switch-profile-edit-tab" data-tab="address">Address</button>
        <button type="button" role="tab" aria-selected="false" data-action="switch-profile-edit-tab" data-tab="admin-details">Admin Details</button>
      </div>

      <div class="modal-scroll-body profile-edit-body">
        <section class="profile-edit-panel active" data-profile-edit-panel="about" role="tabpanel">
          <div class="profile-edit-section-head"><strong>About</strong><span>Identity and contact details used across the Admin console.</span></div>
          <div class="profile-edit-grid">
            <div class="form-group"><label for="admin-name">Full Name</label><input class="input-control" id="admin-name" data-profile-field="name" required value="${escapeHtml(profile.name)}"></div>
            <div class="form-group"><label for="admin-email">Work Email</label><input class="input-control" id="admin-email" data-profile-field="email" type="email" required value="${escapeHtml(profile.email)}"></div>
            <div class="form-group"><label for="admin-work-phone">Work Phone</label><input class="input-control" id="admin-work-phone" data-profile-field="phone" required value="${escapeHtml(profile.phone)}"></div>
            <div class="form-group"><label for="admin-personal-phone">Personal Phone</label><input class="input-control" id="admin-personal-phone" data-profile-field="personalPhone" required value="${escapeHtml(profile.personalPhone)}"></div>
            <div class="form-group"><label for="admin-position">Position</label><input class="input-control" id="admin-position" data-profile-field="position" required value="${escapeHtml(profile.position)}"></div>
            <div class="form-group"><label for="admin-department">Department</label><input class="input-control" id="admin-department" data-profile-field="department" required value="${escapeHtml(profile.department)}"></div>
            <div class="form-group profile-edit-wide"><label for="admin-bio">Professional Bio</label><textarea class="textarea-control" id="admin-bio" data-profile-field="bio" rows="4" required>${escapeHtml(profile.bio)}</textarea></div>
          </div>
        </section>

        <section class="profile-edit-panel" data-profile-edit-panel="address" role="tabpanel" hidden>
          <div class="profile-edit-section-head"><strong>Address</strong><span>Office location and workplace contact information.</span></div>
          <div class="profile-edit-grid">
            <div class="form-group profile-edit-wide"><label for="admin-office-address">Office Address</label><input class="input-control" id="admin-office-address" data-profile-field="addressLine" required value="${escapeHtml(profile.addressLine)}"></div>
            <div class="form-group"><label for="admin-building">Building / Floor</label><input class="input-control" id="admin-building" data-profile-field="building" required value="${escapeHtml(profile.building)}"></div>
            <div class="form-group"><label for="admin-city-state">City / State</label><input class="input-control" id="admin-city-state" data-profile-field="cityState" required value="${escapeHtml(profile.cityState)}"></div>
            <div class="form-group"><label for="admin-postcode">Postcode</label><input class="input-control" id="admin-postcode" data-profile-field="postcode" required value="${escapeHtml(profile.postcode)}"></div>
            <div class="form-group"><label for="admin-country">Country</label><input class="input-control" id="admin-country" data-profile-field="country" required value="${escapeHtml(profile.country)}"></div>
            <div class="form-group profile-edit-wide"><label for="admin-emergency-contact">Emergency Contact</label><input class="input-control" id="admin-emergency-contact" data-profile-field="emergencyContact" required value="${escapeHtml(profile.emergencyContact)}"></div>
          </div>
        </section>

        <section class="profile-edit-panel" data-profile-edit-panel="admin-details" role="tabpanel" hidden>
          <div class="profile-edit-section-head"><strong>Admin Details</strong><span>Official administrator record and current access state.</span></div>
          <div class="profile-edit-grid">
            <div class="form-group"><label for="admin-detail-email">Work Email</label><input class="input-control" id="admin-detail-email" data-profile-field="email" type="email" required value="${escapeHtml(profile.email)}"></div>
            <div class="form-group"><label for="admin-detail-work-phone">Work Phone</label><input class="input-control" id="admin-detail-work-phone" data-profile-field="phone" required value="${escapeHtml(profile.phone)}"></div>
            <div class="form-group"><label for="admin-detail-personal-phone">Personal Phone</label><input class="input-control" id="admin-detail-personal-phone" data-profile-field="personalPhone" required value="${escapeHtml(profile.personalPhone)}"></div>
            <div class="form-group"><label for="admin-detail-position">Position</label><input class="input-control" id="admin-detail-position" data-profile-field="position" required value="${escapeHtml(profile.position)}"></div>
            <div class="form-group"><label for="admin-detail-department">Department</label><input class="input-control" id="admin-detail-department" data-profile-field="department" required value="${escapeHtml(profile.department)}"></div>
            <div class="form-group"><label>Account Status</label><div class="profile-readonly-field"><span class="status-badge active">${escapeHtml(profile.accountStatus)}</span><small>Managed by account security</small></div></div>
            <div class="form-group"><label>Last Login</label><div class="profile-readonly-field"><strong>${escapeHtml(profile.lastLogin)}</strong><small>System-generated activity</small></div></div>
            <div class="form-group profile-edit-wide"><label for="admin-detail-bio">Professional Bio</label><textarea class="textarea-control" id="admin-detail-bio" data-profile-field="bio" rows="4" required>${escapeHtml(profile.bio)}</textarea></div>
          </div>
        </section>
      </div>

      <div class="modal-footer profile-edit-footer">
        <button class="secondary-button" type="button" data-action="close-modal">
          Cancel
        </button>
        <button class="primary-button" type="submit">Save All Changes</button>
      </div>
    </form>
  `, "profile-edit-modal");
}

function switchProfileEditTab(tabId) {
  document.querySelectorAll("[data-profile-edit-panel]").forEach((panel) => {
    const isActive = panel.dataset.profileEditPanel === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
  document.querySelectorAll('[data-action="switch-profile-edit-tab"]').forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function getProfileFormValue(fieldName) {
  return document.querySelector(`[data-profile-field="${fieldName}"]`)?.value.trim() || "";
}

function saveAdminProfileForm() {
  const profileForm = {
    name: getProfileFormValue("name"),
    email: getProfileFormValue("email"),
    phone: getProfileFormValue("phone"),
    personalPhone: getProfileFormValue("personalPhone"),
    position: getProfileFormValue("position"),
    department: getProfileFormValue("department"),
    bio: getProfileFormValue("bio"),
    addressLine: getProfileFormValue("addressLine"),
    building: getProfileFormValue("building"),
    cityState: getProfileFormValue("cityState"),
    postcode: getProfileFormValue("postcode"),
    country: getProfileFormValue("country"),
    emergencyContact: getProfileFormValue("emergencyContact")
  };
  const fieldIds = {
    name: "admin-name",
    email: "admin-email",
    phone: "admin-work-phone",
    personalPhone: "admin-personal-phone",
    position: "admin-position",
    department: "admin-department",
    bio: "admin-bio",
    addressLine: "admin-office-address",
    building: "admin-building",
    cityState: "admin-city-state",
    postcode: "admin-postcode",
    country: "admin-country",
    emergencyContact: "admin-emergency-contact"
  };
  const missingField = Object.entries(profileForm).find(([, value]) => !value);

  if (missingField) {
    const fieldId = fieldIds[missingField[0]];
    const targetPanel = document.getElementById(fieldId)?.closest("[data-profile-edit-panel]")?.dataset.profileEditPanel;
    if (targetPanel) switchProfileEditTab(targetPanel);
    showInlineFieldError(fieldId, "This field is required.");
    return;
  }

  const emailField = document.getElementById("admin-email");
  if (emailField.validity.typeMismatch) {
    switchProfileEditTab("about");
    showInlineFieldError("admin-email", "Enter a valid email address.");
    return;
  }

  state.adminProfile = {
    ...state.adminProfile,
    ...profileForm,
    location: `${profileForm.cityState}, ${profileForm.country}`
  };

  saveState();
  closeModal();
  renderCurrentView();
}




function renderSettingsPage() {
  const settingsTabs = [
    { id: "general", label: "General Settings" },
    { id: "safety", label: "Safety & Compliance" },
    { id: "categories", label: "Service Categories" }
  ];
  const activeTab = state.settingsActiveTab || "general";

  return `
    ${pageHeading(
      "Settings",
      "Manage global FixIt platform settings and controls."
    )}

    <section class="settings-overview">
      <div class="settings-overview-copy">
        <span class="settings-overview-icon" aria-hidden="true">&#9881;</span>
        <div>
          <span class="settings-eyebrow">Platform Control Center</span>
          <h2>Configure FixIt with confidence</h2>
          <p>Manage platform preferences, safety policies, and service availability from one organized workspace.</p>
        </div>
      </div>

      <div class="settings-overview-meta">
        <span><i class="settings-live-dot"></i>Platform live</span>
        <span><strong>${state.categories.length}</strong> service categories</span>
        <span><strong>${state.settings.complianceReviewWindow}</strong> review window</span>
      </div>
    </section>

    <section class="settings-tabs" role="tablist" aria-label="Settings sections">
      ${settingsTabs.map((tab) => `
        <button
          class="settings-tab ${activeTab === tab.id ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${activeTab === tab.id ? "true" : "false"}"
          data-action="switch-settings-tab"
          data-tab="${tab.id}"
        >
          <span class="settings-tab-icon" aria-hidden="true">
            ${tab.id === "general" ? "&#9881;" : tab.id === "safety" ? "&#128737;" : "&#9638;"}
          </span>
          ${tab.label}
        </button>
      `).join("")}
    </section>

    ${activeTab === "general" ? `
      <article class="page-card settings-panel">
        <div class="page-card-body">
          <div class="settings-panel-heading">
            <div class="settings-panel-heading-icon" aria-hidden="true">&#9881;</div>
            <div>
              <h2>General Settings</h2>
              <p>Control how providers join, how bookings are matched, and when the platform is available.</p>
            </div>
          </div>

          <div class="settings-list">
          <div class="setting-row">
            <div>
              <strong>Allow provider registration</strong>
              <span>New providers can submit verification applications.</span>
            </div>

            <input
              class="switch-input"
              type="checkbox"
              data-setting="allowProviderRegistration"
              ${state.settings.allowProviderRegistration ? "checked" : ""}
            >
          </div>

          <div class="setting-row">
            <div>
              <strong>Automatic provider matching</strong>
              <span>Suggest providers automatically after a customer books a service.</span>
            </div>

            <input
              class="switch-input"
              type="checkbox"
              data-setting="automaticProviderMatching"
              ${state.settings.automaticProviderMatching ? "checked" : ""}
            >
          </div>

          <div class="setting-row">
            <div>
              <strong>Maintenance mode</strong>
              <span>Temporarily limit normal user access while you update the platform.</span>
            </div>

            <input
              class="switch-input"
              type="checkbox"
              data-setting="maintenanceMode"
              ${state.settings.maintenanceMode ? "checked" : ""}
            >
          </div>

          </div>

          <div class="settings-danger-zone">
            <div>
              <strong>Reset demonstration data</strong>
              <span>Restore providers, users, categories, and settings to their initial sample values.</span>
            </div>
            <button class="danger-button" data-action="reset-demo">Reset Demo Data</button>
          </div>
        </div>
      </article>
    ` : ""}

    ${activeTab === "safety" ? `
      <section class="settings-card-grid">
        <article class="page-card settings-card safety-rules-card">
          <div class="page-card-body">
            <div class="safety-rules-heading">
              <div>
                <span class="settings-card-eyebrow">Marketplace protection</span>
                <h2 class="section-title">Platform safety rules</h2>
                <p class="section-subtitle">Core policy controls that govern safe marketplace activity.</p>
              </div>
              <span class="safety-rules-count">2 controls</span>
            </div>

            <div class="safety-rules-list">
              <div class="safety-setting-row">
                <span class="safety-setting-icon" aria-hidden="true">BG</span>
                <div class="safety-setting-copy">
                  <strong>Background checks required</strong>
                  <span>All provider applications must pass a background review.</span>
                </div>

                <label class="safety-setting-control safety-switch-control">
                  <span>Required</span>
                  <input
                    class="switch-input"
                    type="checkbox"
                    aria-label="Require provider background checks"
                    data-setting="backgroundChecksRequired"
                    ${state.settings.backgroundChecksRequired ? "checked" : ""}
                  >
                </label>
              </div>

              <div class="safety-setting-row">
                <span class="safety-setting-icon" aria-hidden="true">HR</span>
                <div class="safety-setting-copy">
                  <strong>Compliance review window</strong>
                  <span>Expected review turnaround for new escalations.</span>
                </div>

                <label class="safety-setting-control safety-select-control">
                  <span>Review within</span>
                  <select class="select-control settings-inline-select" aria-label="Compliance review window" data-setting-select="complianceReviewWindow">
                    <option value="24 hours" ${state.settings.complianceReviewWindow === "24 hours" ? "selected" : ""}>24 hours</option>
                    <option value="48 hours" ${state.settings.complianceReviewWindow === "48 hours" ? "selected" : ""}>48 hours</option>
                    <option value="72 hours" ${state.settings.complianceReviewWindow === "72 hours" ? "selected" : ""}>72 hours</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </article>

        <article class="page-card settings-card">
          <div class="page-card-body">
            <h2 class="section-title">Provider verification requirements</h2>
            <p class="section-subtitle">Define the review depth required before providers go live.</p>

            <div class="setting-row">
              <div>
                <strong>Re-verification cycle</strong>
                <span>How often live providers must renew their credentials.</span>
              </div>

              <select class="select-control settings-inline-select" data-setting-select="providerReverificationCycle">
                <option value="6 months" ${state.settings.providerReverificationCycle === "6 months" ? "selected" : ""}>6 months</option>
                <option value="12 months" ${state.settings.providerReverificationCycle === "12 months" ? "selected" : ""}>12 months</option>
                <option value="18 months" ${state.settings.providerReverificationCycle === "18 months" ? "selected" : ""}>18 months</option>
              </select>
            </div>

            <div class="setting-chip-list">
              <span class="profile-role-chip">Government ID</span>
              <span class="profile-role-chip">Trade license</span>
              <span class="profile-role-chip">Proof of address</span>
            </div>
          </div>
        </article>

        <article class="page-card settings-card">
          <div class="page-card-body">
            <h2 class="section-title">Restricted or prohibited services</h2>
            <p class="section-subtitle">Reference list for service types that need manual approval or complete blocking.</p>

            <div class="setting-chip-list">
              <span class="settings-tag">Hazardous chemical handling</span>
              <span class="settings-tag">Unlicensed structural repair</span>
              <span class="settings-tag">After-hours high-risk callouts</span>
            </div>
          </div>
        </article>

        <article class="page-card settings-card">
          <div class="page-card-body">
            <h2 class="section-title">Reported user actions</h2>
            <p class="section-subtitle">Choose how the platform handles high-risk reports.</p>

            <select class="select-control" data-setting-select="reportedUserAction">
              <option value="manual-review" ${state.settings.reportedUserAction === "manual-review" ? "selected" : ""}>Send to manual review</option>
              <option value="temporary-hold" ${state.settings.reportedUserAction === "temporary-hold" ? "selected" : ""}>Apply temporary hold</option>
              <option value="escalate-immediately" ${state.settings.reportedUserAction === "escalate-immediately" ? "selected" : ""}>Escalate immediately</option>
            </select>
          </div>
        </article>

        <article class="page-card settings-card">
          <div class="page-card-body">
            <h2 class="section-title">Account suspension policy</h2>
            <p class="section-subtitle">Determine how aggressive admin enforcement should be for repeated violations.</p>

            <select class="select-control" data-setting-select="accountSuspensionPolicy">
              <option value="moderate" ${state.settings.accountSuspensionPolicy === "moderate" ? "selected" : ""}>Moderate</option>
              <option value="strict" ${state.settings.accountSuspensionPolicy === "strict" ? "selected" : ""}>Strict</option>
              <option value="zero-tolerance" ${state.settings.accountSuspensionPolicy === "zero-tolerance" ? "selected" : ""}>Zero tolerance</option>
            </select>
          </div>
        </article>

        <article class="page-card settings-card">
          <div class="page-card-body">
            <div class="section-header">
              <div>
                <h2 class="section-title">Compliance notes</h2>
                <p class="section-subtitle">Track review instructions and active platform rules.</p>
              </div>
            </div>

            <form id="safety-form" class="settings-note-form" novalidate>
              <textarea
                class="textarea-control"
                id="safety-note"
                placeholder="Add a new compliance rule, review note, or operational reminder"
              ></textarea>

              <div class="button-row">
                <button class="primary-button" type="submit">Add Note</button>
              </div>
            </form>

            <div class="settings-note-list">
              ${state.safetyNotes.map((note, index) => `
                <div class="settings-note-item">
                  <span>${escapeHtml(note)}</span>
                  <button class="note-delete-button" type="button" data-action="delete-safety-note" data-index="${index}">
                    Remove
                  </button>
                </div>
              `).join("")}
            </div>
          </div>
        </article>
      </section>
    ` : ""}

    ${activeTab === "categories" ? `
      <article class="page-card settings-panel">
        <div class="page-card-body">
          <div class="section-header">
            <div>
              <h2 class="section-title">Service Categories</h2>
              <p class="section-subtitle">Create, edit, activate, or pause marketplace services.</p>
            </div>

            <button class="primary-button" data-action="add-category">+ Add Category</button>
          </div>

          <div class="category-list compact-category-list">
            ${state.categories.map((category) => `
              <div class="category-row">
                <div class="category-content">
                  <span>${category.icon}</span>

                  <div>
                    <strong>${escapeHtml(category.name)}</strong>
                    <small>${escapeHtml(category.description)}</small>
                  </div>
                </div>

                <div class="category-actions">
                  ${getStatusBadge(category.status)}

                  <button
                    class="secondary-button small-button"
                    data-action="edit-category"
                    data-id="${category.id}"
                  >
                    Edit
                  </button>

                  <button
                    class="secondary-button small-button"
                    data-action="toggle-category"
                    data-id="${category.id}"
                  >
                    ${category.status === "active" ? "Pause" : "Activate"}
                  </button>

                  <button
                    class="danger-button small-button"
                    data-action="delete-category"
                    data-id="${category.id}"
                  >
                    Delete
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
    ` : ""}
  `;
}

function renderCurrentView() {
  if (state.activeView === "categories") {
    state.activeView = "settings";
    state.settingsActiveTab = "categories";
  }

  if (state.activeView === "safety") {
    state.activeView = "settings";
    state.settingsActiveTab = "safety";
  }

  updateAdminRoute(state.activeView, true);

  const renderers = {
    dashboard: renderDashboard,
  providers: renderProvidersPage,
  categories: renderCategoriesPage,
  users: renderUsersPage,
  jobs: renderJobsPage,
  safety: renderSafetyPage,
  analytics: renderAnalyticsPage,
  "admin-profile": renderAdminProfilePage,
  settings: renderSettingsPage
};

  const renderer = renderers[state.activeView] || renderDashboard;

  elements.appRoot.innerHTML = renderer();
  elements.topbarLocationLabel.textContent = state.adminProfile.location || "Johor Bahru, Malaysia";
  document.getElementById("top-profile-name").textContent = state.adminProfile.name;
  document.getElementById("top-profile-role").textContent = state.adminProfile.position;
  document.getElementById("top-profile-avatar").textContent = state.adminProfile.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  document.body.classList.toggle(
    "provider-filter-open",
    state.activeView === "providers" && state.providerFiltersOpen
  );
  elements.breadcrumb.textContent = `FixIt / ${getViewLabel(state.activeView)}`;
  document.title = `FixIt | ${getViewLabel(state.activeView)}`;

  renderSidebar();
  saveState();
}

function getViewLabel(viewId) {
  for (const group of NAVIGATION) {
    const item = group.items.find((navItem) => navItem.id === viewId);

    if (item) {
      return item.label;
    }
  }

  return "Admin Dashboard";
}

function navigateToView(viewId) {
  state.activeView = viewId;
  updateAdminRoute(viewId);

  elements.sidebar.classList.remove("mobile-open");
  elements.mobileOverlay.classList.remove("active");

  renderCurrentView();
}

function openModal(content, modifier = "") {
  elements.modalCard.className = `modal-card${modifier ? ` ${modifier}` : ""}`;
  elements.modalCard.innerHTML = content;
  elements.modalBackdrop.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal() {
  elements.modalBackdrop.classList.add("hidden");
  elements.modalCard.className = "modal-card";
  elements.modalCard.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function openCategoryModal(categoryId = null) {
  const category = categoryId
    ? state.categories.find((item) => item.id === categoryId)
    : null;

  openModal(`
    <div class="modal-head">
      <div>
        <h2>${category ? "Edit Category" : "Add Service Category"}</h2>
        <p>${category ? "Update this FixIt service category." : "Create a new category for providers and customers."}</p>
      </div>

      <button class="modal-close" data-action="close-modal">✕</button>
    </div>

    <form id="category-form" novalidate>
      <input type="hidden" id="category-id" value="${category ? category.id : ""}">

      <div class="form-group">
        <label for="category-name">Category name</label>

        <input
          class="input-control"
          id="category-name"
          required
          value="${category ? escapeHtml(category.name) : ""}"
          placeholder="Example: Pest Control"
        >
      </div>

      <div class="form-group">
        <label for="category-icon">Icon</label>

        <input
          class="input-control"
          id="category-icon"
          required
          maxlength="4"
          value="${category ? escapeHtml(category.icon) : "🛠️"}"
        >
      </div>

      <div class="form-group">
        <label for="category-description">Description</label>

        <textarea
          class="textarea-control"
          id="category-description"
          required
          placeholder="Short description of this service"
        >${category ? escapeHtml(category.description) : ""}</textarea>
      </div>

      <div class="form-group">
        <label for="category-status">Status</label>

        <select class="select-control" id="category-status">
          <option value="active" ${category && category.status === "active" ? "selected" : ""}>
            Active
          </option>

          <option value="review" ${category && category.status === "review" ? "selected" : ""}>
            Review
          </option>
        </select>
      </div>

      <div class="modal-footer">
        <button class="secondary-button" type="button" data-action="close-modal">
          Cancel
        </button>

        <button class="primary-button" type="submit">
          ${category ? "Save Changes" : "Add Category"}
        </button>
      </div>
    </form>
  `);
}

function openProviderModalLegacy(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider) {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <h2>${escapeHtml(provider.name)}</h2>
        <p>Provider verification profile</p>
      </div>

      <button class="modal-close" data-action="close-modal">✕</button>
    </div>

    <div class="setting-row">
      <div>
        <strong>Service category</strong>
        <span>${provider.icon} ${escapeHtml(provider.category)}</span>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <strong>Location</strong>
        <span>${escapeHtml(provider.location)}</span>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <strong>Document status</strong>
        <span>${escapeHtml(provider.document)}</span>
      </div>

      ${getStatusBadge(provider.status)}
    </div>

    <div class="modal-footer">
      <button class="primary-button" type="button" data-action="close-modal">
        Close
      </button>
    </div>
  `);
}

function getProviderProfileData(provider) {
  const providerJobs = state.jobs.filter((job) => job.provider === provider.name);
  const activeStatuses = ["requested", "accepted", "in_progress", "cost_pending"];
  const usernameBase = String(provider.username || provider.name).replace(/^@/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const coverageAreas = String(provider.serviceArea || provider.location || "")
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
  const additionalCategories = Array.isArray(provider.additionalCategories)
    ? provider.additionalCategories
    : [];
  const hasPrimaryDocument = Boolean(provider.document);
  const documents = [
    { name: "CIDB Certificate", status: provider.document || "Not submitted", available: hasPrimaryDocument },
    { name: "Identity Document", status: hasPrimaryDocument ? "Submitted" : "Not submitted", available: hasPrimaryDocument },
    { name: "Business Registration", status: provider.businessRegistration || "Not available", available: Boolean(provider.businessRegistration) }
  ];
  const statusHistory = Array.isArray(provider.statusHistory) && provider.statusHistory.length
    ? provider.statusHistory
    : [{ date: provider.submitted, title: "Application submitted", note: `${provider.category} provider application received.` }];

  return {
    providerId: provider.providerId || provider.id.toUpperCase().replace("PROVIDER", "FX-PRO"),
    email: provider.email || `${usernameBase || "provider"}@providers.fixit.my`,
    phone: provider.phone || `+60 1${String(provider.id).slice(-1) || "2"}-880 24${String(provider.id).slice(-1) || "0"}0`,
    joinedDate: provider.joinedDate || provider.submitted,
    updatedDate: provider.lastUpdated || provider.suspensionDate || provider.submitted,
    verificationDate: provider.verificationDate || (provider.status === "verified" ? provider.submitted : "Not verified"),
    verifiedBy: provider.verifiedBy || (provider.status === "verified" ? state.adminProfile.name : "Not assigned"),
    documents,
    coverageAreas,
    additionalCategories,
    providerJobs,
    activeJobs: providerJobs.filter((job) => activeStatuses.includes(job.status)).length,
    reviewsCount: provider.reviewsCount || Math.round(Number(provider.jobsCompleted || 0) * 0.62),
    lastActivity: provider.lastActivity || providerJobs[0]?.createdOn || provider.submitted,
    statusHistory
  };
}

function recordProviderStatusChange(provider, title, note) {
  provider.statusHistory = Array.isArray(provider.statusHistory) ? provider.statusHistory : [];
  provider.statusHistory.unshift({
    date: new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }),
    title,
    note
  });
  provider.lastUpdated = provider.statusHistory[0].date;
}

function openProviderModal(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider) {
    return;
  }

  const activeTab = state.providerDetailTab || "overview";
  const profile = getProviderProfileData(provider);
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "verification", label: "Verification & Documents" },
    { id: "service", label: "Service & Coverage" },
    { id: "activity", label: "Activity" }
  ];
  const footerActions = provider.status === "pending" ? `
      <button class="success-button" type="button" data-action="verify-provider" data-id="${escapeHtml(provider.id)}">Approve Provider</button>
      <button class="danger-button" type="button" data-action="reject-provider" data-id="${escapeHtml(provider.id)}">Reject Provider</button>
    ` : provider.status === "verified" ? `
      <button class="secondary-button" type="button" data-action="view-provider-jobs" data-id="${escapeHtml(provider.id)}">View Provider Jobs</button>
      <button class="danger-button" type="button" data-action="suspend-provider" data-id="${escapeHtml(provider.id)}">Suspend Provider</button>
    ` : provider.status === "suspended" ? `
      <button class="secondary-button" type="button" data-action="view-provider-jobs" data-id="${escapeHtml(provider.id)}">View Provider Jobs</button>
      <button class="success-button" type="button" data-action="reinstate-provider" data-id="${escapeHtml(provider.id)}">Reinstate Provider</button>
    ` : `
      <button class="primary-button" type="button" data-action="restore-provider" data-id="${escapeHtml(provider.id)}">Reopen Verification</button>
    `;

  openModal(`
    <div class="modal-head provider-detail-modal-head">
      <div>
        <span class="analytics-eyebrow">PROVIDER RECORD</span>
        <h2>${escapeHtml(provider.name)}</h2>
        <p>Provider verification profile, marketplace access, and operational history.</p>
      </div>
      <div class="provider-modal-status">
        ${getStatusBadge(provider.status)}
        <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
      </div>
    </div>

    <div class="provider-detail-tabs" role="tablist" aria-label="Provider record sections">
      ${tabs.map((tab) => `
        <button class="${activeTab === tab.id ? "active" : ""}" type="button" role="tab"
          aria-selected="${activeTab === tab.id}" data-action="switch-provider-detail-tab"
          data-tab="${tab.id}" data-id="${escapeHtml(provider.id)}">${tab.label}</button>
      `).join("")}
    </div>

    <div class="modal-scroll-body provider-detail-body">
      ${activeTab === "overview" ? `
        <section class="provider-overview-layout">
          <div class="provider-profile-summary">
            <span class="provider-profile-avatar">${provider.icon}</span>
            <div><strong>${escapeHtml(provider.name)}</strong><span>${escapeHtml(provider.username || "Username unavailable")}</span><small>${escapeHtml(profile.providerId)}</small></div>
          </div>
          <div class="provider-record-grid">
            ${[
              ["Full Name", provider.name], ["Username", provider.username || "Not provided"],
              ["Provider ID", profile.providerId], ["Email", profile.email], ["Phone Number", profile.phone],
              ["Account Status", humanizeStatus(provider.status)], ["Verification Status", humanizeStatus(provider.status)],
              ["Joined Date", profile.joinedDate], ["Last Updated", profile.updatedDate]
            ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
          </div>
          ${provider.status === "suspended" ? `
            <div class="provider-modal-suspension">
              <div class="provider-modal-suspension-head"><span class="provider-warning-mark">!</span><div><span>SUSPENSION STATUS</span><strong>Marketplace access is suspended</strong></div></div>
              <div class="provider-suspension-audit-grid"><div><span>Suspension date</span><strong>${escapeHtml(provider.suspensionDate || "Not recorded")}</strong></div><div><span>Suspension reason</span><strong>${escapeHtml(provider.suspensionReason || "Not recorded")}</strong></div>${provider.suspensionAdminNote ? `<div class="provider-audit-note"><span>Internal admin note</span><strong>${escapeHtml(provider.suspensionAdminNote)}</strong></div>` : ""}</div>
            </div>
          ` : ""}
        </section>
      ` : activeTab === "verification" ? `
        <section class="provider-document-section">
          <div class="provider-section-intro"><strong>Verification & Documents</strong><span>Review identity and business credentials submitted for marketplace access.</span></div>
          <div class="provider-document-grid">
            ${profile.documents.map((document) => `
              <article class="provider-document-card ${document.available ? "available" : "missing"}">
                <div><span class="provider-document-icon">${document.available ? "DOC" : "--"}</span><div><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.status)}</span></div></div>
                ${document.available ? `<div class="button-row"><button class="secondary-button small-button" type="button" data-action="view-provider-document" data-id="${escapeHtml(provider.id)}" data-document="${escapeHtml(document.name)}">View Document</button><button class="secondary-button small-button" type="button" data-action="download-provider-document" data-id="${escapeHtml(provider.id)}" data-document="${escapeHtml(document.name)}">Download</button></div>` : `<small>No document has been supplied.</small>`}
              </article>
            `).join("")}
          </div>
          <div class="provider-record-grid provider-verification-audit">
            <div><span>Submission Date</span><strong>${escapeHtml(provider.submitted)}</strong></div>
            <div><span>Verification Date</span><strong>${escapeHtml(profile.verificationDate)}</strong></div>
            <div><span>Verified By Admin</span><strong>${escapeHtml(profile.verifiedBy)}</strong></div>
            <div><span>Document Status</span><strong>${escapeHtml(provider.document || "Not submitted")}</strong></div>
          </div>
        </section>
      ` : activeTab === "service" ? `
        <section class="provider-service-section">
          <div class="provider-section-intro"><strong>Service & Coverage</strong><span>Marketplace offering, rate, reach, and availability.</span></div>
          <div class="provider-record-grid">
            <div><span>Primary Category</span><strong>${escapeHtml(provider.category)}</strong></div>
            <div><span>Base Rate</span><strong>${formatCurrency(Number(provider.baseRate) || 0)}</strong></div>
            <div><span>Service Location</span><strong>${escapeHtml(provider.location)}</strong></div>
            <div><span>Availability</span><strong>${escapeHtml(provider.availability || "Not provided")}</strong></div>
            <div><span>Years of Experience</span><strong>${escapeHtml(provider.experience || "Not provided")}</strong></div>
            <div class="provider-record-wide"><span>Service Description</span><strong>${escapeHtml(provider.bio || "No description supplied")}</strong></div>
          </div>
          <div class="provider-tag-section"><span>Categories</span><div class="provider-tag-list"><i>${escapeHtml(provider.category)}</i>${profile.additionalCategories.map((category) => `<i>${escapeHtml(category)}</i>`).join("")}</div></div>
          <div class="provider-tag-section"><span>Coverage Areas</span><div class="provider-tag-list">${profile.coverageAreas.map((area) => `<i>${escapeHtml(area)}</i>`).join("")}</div></div>
        </section>
      ` : `
        <section class="provider-activity-section">
          <div class="provider-section-intro"><strong>Provider Activity</strong><span>Marketplace performance and administrator action history.</span></div>
          <div class="provider-activity-metrics">
            <div><span>Completed Jobs</span><strong>${Number(provider.jobsCompleted || 0).toLocaleString()}</strong></div>
            <div><span>Active Jobs</span><strong>${profile.activeJobs}</strong></div>
            <div><span>Average Rating</span><strong>${provider.rating ? `${Number(provider.rating).toFixed(1)} / 5` : "No rating"}</strong></div>
            <div><span>Reviews</span><strong>${profile.reviewsCount}</strong></div>
            <div><span>Last Activity</span><strong>${escapeHtml(profile.lastActivity)}</strong></div>
          </div>
          <div class="provider-action-timeline">
            ${profile.statusHistory.map((entry) => `<div><i></i><span>${escapeHtml(entry.date)}</span><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.note)}</p></div>`).join("")}
          </div>
        </section>
      `}
    </div>

    <div class="modal-footer provider-detail-footer">
      <button class="secondary-button" type="button" data-action="close-modal">Close</button>
      ${footerActions}
    </div>
  `, "provider-detail-modal");
}

function openProviderDocumentModal(providerId, documentName) {
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider) return;

  openModal(`
    <div class="modal-head"><div><span class="analytics-eyebrow">PROVIDER DOCUMENT</span><h2>${escapeHtml(documentName)}</h2><p>${escapeHtml(provider.name)} - ${escapeHtml(provider.username || "Username unavailable")}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button></div>
    <div class="provider-document-preview"><span>DOCUMENT PREVIEW</span><strong>${escapeHtml(documentName)}</strong><p>${escapeHtml(provider.document || "Document metadata is unavailable.")}</p><small>Submitted ${escapeHtml(provider.submitted)}</small></div>
    <div class="modal-footer"><button class="secondary-button" type="button" data-action="view-provider" data-id="${escapeHtml(provider.id)}">Back to Provider</button><button class="primary-button" type="button" data-action="download-provider-document" data-id="${escapeHtml(provider.id)}" data-document="${escapeHtml(documentName)}">Download</button></div>
  `, "provider-document-modal");
}

function downloadProviderDocument(providerId, documentName) {
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider) return;

  const content = [
    "FixIt Provider Document Record",
    `Provider: ${provider.name}`,
    `Username: ${provider.username || "Not provided"}`,
    `Document: ${documentName}`,
    `Status: ${provider.document || "Not available"}`,
    `Submitted: ${provider.submitted}`
  ].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${provider.id}-${documentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function viewProviderJobs(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider) return;

  state.jobsSearch = provider.name;
  state.activeView = "jobs";
  closeModal();
  renderCurrentView();
}

function openJobModalLegacy(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);

  if (!job) {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <h2>#${job.id} · ${escapeHtml(job.title)}</h2>
        <p>Current FixIt job details.</p>
      </div>

      <button class="modal-close" data-action="close-modal">✕</button>
    </div>

    <div class="setting-row">
      <div>
        <strong>Provider</strong>
        <span>${escapeHtml(job.provider)}</span>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <strong>Customer</strong>
        <span>${escapeHtml(job.customer)}</span>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <strong>Final job amount</strong>
        <span>${formatCurrency(job.amount)}</span>
      </div>

      ${getStatusBadge(job.status)}
    </div>

    <div class="modal-footer">
      <button class="primary-button" type="button" data-action="close-modal">
        Close
      </button>
    </div>
  `);
}

function openJobModal(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);

  if (!job) {
    return;
  }

  const currentStep = Math.max(JOB_STATUS_FLOW.findIndex((status) => status.id === job.status), 0);
  const priceDifference = Number(job.amount || 0) - Number(job.estimatedPrice || 0);

  openModal(`
    <div class="modal-head job-modal-head">
      <div>
        <span class="analytics-eyebrow">JOB MONITORING</span>
        <h2>#${escapeHtml(job.id)} - ${escapeHtml(job.title)}</h2>
        <p>Read-only operational detail for this FixIt service request.</p>
      </div>
      <div class="job-modal-head-actions">
        ${getStatusBadge(job.status)}
        <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
      </div>
    </div>

    <section class="job-modal-summary">
      <div>
        <span>Service</span>
        <strong>${escapeHtml(job.category)}</strong>
      </div>
      <div>
        <span>Submitted</span>
        <strong>${escapeHtml(job.createdOn)}</strong>
      </div>
      <div>
        <span>Scheduled</span>
        <strong>${escapeHtml(formatJobDateTime(job))}</strong>
      </div>
      <div>
        <span>Final Amount</span>
        <strong>${formatCurrency(job.amount)}</strong>
      </div>
    </section>

    <section class="job-party-grid">
      <article class="job-party-card">
        <div class="job-party-card-head">
          <span class="job-party-avatar">CU</span>
          <div>
            <small>CUSTOMER</small>
            <h3>${escapeHtml(job.customer)}</h3>
          </div>
        </div>
        <dl>
          <div><dt>Phone</dt><dd>${escapeHtml(job.customerPhone || "Not provided")}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(job.customerEmail || "Not provided")}</dd></div>
          <div><dt>Service Address</dt><dd>${escapeHtml(job.serviceAddress || "Not provided")}</dd></div>
        </dl>
      </article>

      <article class="job-party-card">
        <div class="job-party-card-head">
          <span class="job-party-avatar provider">PR</span>
          <div>
            <small>PROVIDER</small>
            <h3>${escapeHtml(job.provider)}</h3>
          </div>
        </div>
        <dl>
          <div><dt>Service</dt><dd>${escapeHtml(job.category)}</dd></div>
          <div><dt>Phone</dt><dd>${escapeHtml(job.providerContact || "Not provided")}</dd></div>
          <div><dt>Assignment</dt><dd>${humanizeStatus(job.status) === "requested" ? "Awaiting acceptance" : "Assigned to this job"}</dd></div>
        </dl>
      </article>
    </section>

    <section class="job-modal-section">
      <div class="job-modal-section-head">
        <div>
          <span class="analytics-eyebrow">COST DETAILS</span>
          <h3>Service pricing</h3>
        </div>
        <span class="job-cost-difference ${priceDifference > 0 ? "increase" : ""}">
          ${priceDifference === 0 ? "No variance" : `${priceDifference > 0 ? "+" : "-"}${formatCurrency(Math.abs(priceDifference))} variance`}
        </span>
      </div>
      <div class="job-cost-grid">
        <div><span>Estimated price</span><strong>${formatCurrency(job.estimatedPrice || job.amount)}</strong></div>
        <div><span>Final amount</span><strong>${formatCurrency(job.amount)}</strong></div>
        <div><span>Payment stage</span><strong>${["closed", "reviewed"].includes(job.status) ? "Confirmed" : job.status === "cost_pending" ? "Awaiting confirmation" : "Tracked in workflow"}</strong></div>
      </div>
    </section>

    <section class="job-modal-section">
      <div class="job-modal-section-head">
        <div>
          <span class="analytics-eyebrow">WORKFLOW TIMELINE</span>
          <h3>Job progress</h3>
        </div>
      </div>
      <ol class="job-workflow-timeline">
        ${JOB_STATUS_FLOW.map((status, index) => `
          <li class="${index < currentStep ? "complete" : index === currentStep ? "active" : ""}">
            <i></i>
            <span>${status.label}</span>
            <small>${index < currentStep ? "Completed" : index === currentStep ? "Current stage" : "Upcoming"}</small>
          </li>
        `).join("")}
      </ol>
    </section>

    <section class="job-modal-section">
      <div class="job-modal-section-head">
        <div>
          <span class="analytics-eyebrow">JOB NOTES</span>
          <h3>Service context</h3>
        </div>
      </div>
      <div class="job-note-grid">
        <div>
          <span>Customer Note</span>
          <p>${escapeHtml(job.customerNote || "No customer note was added.")}</p>
        </div>
        <div>
          <span>Provider Note</span>
          <p>${escapeHtml(job.providerNote || "No provider update is available yet.")}</p>
        </div>
        <div class="admin-note">
          <span>Admin Note</span>
          <p>${escapeHtml(job.adminNote || "No internal monitoring note has been added.")}</p>
        </div>
      </div>
    </section>

    <div class="modal-footer job-modal-footer">
      <button class="secondary-button" type="button" data-action="close-modal">Close</button>
      <button class="secondary-button" type="button" data-action="view-job-provider" data-id="${escapeHtml(job.id)}">View Provider</button>
      <button class="secondary-button" type="button" data-action="view-job-customer" data-id="${escapeHtml(job.id)}">View Customer</button>
      <button class="primary-button" type="button" data-action="add-admin-job-note" data-id="${escapeHtml(job.id)}">Add Admin Note</button>
    </div>
  `, "job-detail-modal");
}

function openJobPartyModal(jobId, partyType) {
  const job = state.jobs.find((item) => item.id === jobId);

  if (!job) {
    return;
  }

  const isProvider = partyType === "provider";
  const provider = isProvider
    ? state.providers.find((item) => item.name === job.provider)
    : null;
  const detailRows = isProvider
    ? [
        ["Service Category", job.category],
        ["Phone", job.providerContact || "Not provided"],
        ["Marketplace Status", provider ? humanizeStatus(provider.status) : "Assigned provider"],
        ["Customer Rating", provider?.rating ? `${provider.rating} / 5` : "Not available"],
        ["Completed Jobs", provider?.jobsCompleted ?? "Not available"],
        ["Response Time", provider?.responseTime || "Not available"]
      ]
    : [
        ["Phone", job.customerPhone || "Not provided"],
        ["Email", job.customerEmail || "Not provided"],
        ["Service Address", job.serviceAddress || "Not provided"],
        ["Current Request", `#${job.id} - ${job.title}`]
      ];

  openModal(`
    <div class="modal-head">
      <div>
        <span class="analytics-eyebrow">${isProvider ? "PROVIDER RECORD" : "CUSTOMER RECORD"}</span>
        <h2>${escapeHtml(isProvider ? job.provider : job.customer)}</h2>
        <p>Monitoring context connected to job #${escapeHtml(job.id)}.</p>
      </div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>
    <div class="job-party-detail-list">
      ${detailRows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="modal-footer">
      <button class="secondary-button" type="button" data-action="back-to-job" data-id="${escapeHtml(job.id)}">Back to Job</button>
      <button class="primary-button" type="button" data-action="close-modal">Close</button>
    </div>
  `);
}

function openAdminJobNoteModal(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);

  if (!job) {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <span class="analytics-eyebrow">INTERNAL NOTE</span>
        <h2>Add Admin Note</h2>
        <p>Record monitoring context for #${escapeHtml(job.id)}. This does not change the job status.</p>
      </div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>
    <form id="job-admin-note-form">
      <input id="job-admin-note-id" type="hidden" value="${escapeHtml(job.id)}">
      <div class="form-group">
        <label for="job-admin-note">Admin note</label>
        <textarea
          class="textarea-control"
          id="job-admin-note"
          rows="5"
          placeholder="Add a concise internal monitoring note..."
        >${escapeHtml(job.adminNote || "")}</textarea>
      </div>
      <div class="modal-footer">
        <button class="secondary-button" type="button" data-action="back-to-job" data-id="${escapeHtml(job.id)}">Cancel</button>
        <button class="primary-button" type="submit">Save Note</button>
      </div>
    </form>
  `);
}

function saveAdminJobNote() {
  const jobId = document.getElementById("job-admin-note-id")?.value;
  const job = state.jobs.find((item) => item.id === jobId);
  const note = document.getElementById("job-admin-note")?.value.trim() || "";

  if (!job) {
    return;
  }

  job.adminNote = note;
  syncJobNote(job, note);
  saveState();
  openJobModal(jobId);
}

function verifyProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider) {
    return;
  }

  provider.status = "verified";
  provider.document = "CIDB verified";
  provider.verificationDate = new Date().toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  provider.verifiedBy = state.adminProfile.name;
  recordProviderStatusChange(provider, "Provider approved", "Verification documents approved and marketplace access enabled.");
  syncProviderStatus(providerId, "verified");

  state.metrics.totalProviders += 1;

  addNotification(
    "Provider verified",
    `${provider.name} can now receive customer bookings.`,
    { type: "provider_verified", entityType: "provider", entityId: provider.id, route: "providers" }
  );

  closeModal();
  renderCurrentView();
}

function rejectProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider || provider.status !== "pending") {
    return;
  }

  openModal(`
    <div class="modal-head provider-rejection-head">
      <div><span class="analytics-eyebrow">VERIFICATION DECISION</span><h2>Reject Provider Application</h2><p>Record a clear reason before moving this application to Rejected.</p></div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>
    <div class="suspend-provider-identity"><span class="provider-modal-avatar">${provider.icon}</span><div><span>PROVIDER</span><strong>${escapeHtml(provider.name)}</strong><small>${escapeHtml(provider.username || "Username unavailable")}</small></div></div>
    <form id="provider-rejection-form" novalidate>
      <input id="reject-provider-id" type="hidden" value="${escapeHtml(provider.id)}">
      <div class="form-group"><label for="provider-rejection-reason">Rejection reason <span class="required-mark">*</span></label><select class="select-control" id="provider-rejection-reason" required><option value="">Select a reason</option><option value="Incomplete or invalid KYC documents">Incomplete or invalid KYC documents</option><option value="Unable to verify provider identity">Unable to verify provider identity</option><option value="Duplicate or fraudulent application">Duplicate or fraudulent application</option><option value="Restricted service offering">Restricted service offering</option><option value="Other">Other</option></select></div>
      <div class="form-group hidden" id="provider-rejection-other-group"><label for="provider-rejection-other">Custom reason <span class="required-mark">*</span></label><textarea class="textarea-control" id="provider-rejection-other" rows="3" placeholder="Explain the rejection reason"></textarea></div>
      <div class="form-group"><label for="provider-rejection-message">Provider message <span class="optional-mark">Optional</span></label><textarea class="textarea-control" id="provider-rejection-message" rows="3" placeholder="Add guidance the provider can use before reapplying"></textarea></div>
      <div class="modal-footer"><button class="secondary-button" type="button" data-action="close-modal">Cancel</button><button class="danger-button" id="confirm-provider-rejection" type="submit" disabled>Confirm Rejection</button></div>
    </form>
  `, "provider-rejection-modal");
}

function updateProviderRejectionState() {
  const reasonSelect = document.getElementById("provider-rejection-reason");
  const otherGroup = document.getElementById("provider-rejection-other-group");
  const otherInput = document.getElementById("provider-rejection-other");
  const confirmButton = document.getElementById("confirm-provider-rejection");

  if (!reasonSelect || !otherGroup || !otherInput || !confirmButton) return;

  const needsOther = reasonSelect.value === "Other";
  otherGroup.classList.toggle("hidden", !needsOther);
  otherInput.required = needsOther;
  confirmButton.disabled = !reasonSelect.value || (needsOther && !otherInput.value.trim());
}

function submitProviderRejection() {
  const providerId = document.getElementById("reject-provider-id")?.value;
  const provider = state.providers.find((item) => item.id === providerId);
  const reasonSelect = document.getElementById("provider-rejection-reason");
  const otherReason = document.getElementById("provider-rejection-other")?.value.trim() || "";
  const providerMessage = document.getElementById("provider-rejection-message")?.value.trim() || "";

  if (!provider || !reasonSelect?.value) {
    if (reasonSelect) showInlineFieldError("provider-rejection-reason", "Select a rejection reason.");
    return;
  }

  if (reasonSelect.value === "Other" && !otherReason) {
    updateProviderRejectionState();
    showInlineFieldError("provider-rejection-other", "Enter the custom rejection reason.");
    return;
  }

  provider.status = "rejected";
  provider.rejectionReason = reasonSelect.value === "Other" ? `Other: ${otherReason}` : reasonSelect.value;
  provider.rejectionMessage = providerMessage;
  recordProviderStatusChange(provider, "Application rejected", provider.rejectionReason);
  syncProviderStatus(providerId, "rejected", {
    reason: provider.rejectionReason,
    message: providerMessage
  });
  addNotification(
    "Provider rejected",
    `${provider.name}'s application was rejected.`,
    { type: "provider_rejected", entityType: "provider", entityId: provider.id, route: "providers" }
  );
  closeModal();
  renderCurrentView();
}

function restoreProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider) {
    return;
  }

  provider.status = "pending";
  recordProviderStatusChange(provider, "Verification reopened", "Application returned to the pending review queue.");
  syncProviderStatus(providerId, "pending");
  addNotification(
    "Provider verification reopened",
    `${provider.name}'s application returned to the verification queue.`,
    { type: "provider_verification_reopened", entityType: "provider", entityId: provider.id, route: "providers" }
  );
  closeModal();
  renderCurrentView();
}

function suspendProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider || provider.status !== "verified") {
    return;
  }

  openModal(`
    <div class="modal-head suspend-provider-modal-head">
      <div>
        <span class="analytics-eyebrow">MARKETPLACE ACCESS</span>
        <h2>Suspend Provider</h2>
        <p>Review the impact and record an internal reason before continuing.</p>
      </div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>

    <div class="suspend-provider-identity">
      <span class="provider-modal-avatar">${provider.icon}</span>
      <div>
        <span>PROVIDER</span>
        <strong>${escapeHtml(provider.name)}</strong>
        <small>${escapeHtml(provider.username || "Username unavailable")}</small>
      </div>
    </div>

    <div class="suspend-provider-warning">
      <span class="provider-warning-mark" aria-hidden="true">!</span>
      <p>This provider will no longer appear to customers and cannot accept new bookings while suspended.</p>
    </div>

    <form id="suspend-provider-form" novalidate>
      <input id="suspend-provider-id" type="hidden" value="${escapeHtml(provider.id)}">

      <div class="form-group">
        <label for="provider-suspension-reason">Suspension reason <span class="required-mark">*</span></label>
        <select class="select-control" id="provider-suspension-reason" required>
          <option value="">Select a reason</option>
          <option value="Expired or invalid KYC document">Expired or invalid KYC document</option>
          <option value="Safety concern">Safety concern</option>
          <option value="Repeated customer complaints">Repeated customer complaints</option>
          <option value="Inactive provider account">Inactive provider account</option>
          <option value="Policy violation">Policy violation</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="form-group hidden" id="provider-suspension-other-group">
        <label for="provider-suspension-other">Custom suspension reason <span class="required-mark">*</span></label>
        <textarea
          class="textarea-control"
          id="provider-suspension-other"
          rows="3"
          placeholder="Explain why this provider is being suspended"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="provider-suspension-note">Internal admin message / notes <span class="optional-mark">Optional</span></label>
        <textarea
          class="textarea-control"
          id="provider-suspension-note"
          rows="3"
          placeholder="Add context for other administrators"
        ></textarea>
      </div>

      <div class="modal-footer suspend-provider-modal-footer">
        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
        <button class="danger-button" id="confirm-provider-suspension" type="submit" disabled>
          Confirm Suspension
        </button>
      </div>
    </form>
  `, "suspend-provider-modal");
}

function updateProviderSuspendModalState() {
  const reasonSelect = document.getElementById("provider-suspension-reason");
  const otherGroup = document.getElementById("provider-suspension-other-group");
  const otherInput = document.getElementById("provider-suspension-other");
  const confirmButton = document.getElementById("confirm-provider-suspension");

  if (!reasonSelect || !otherGroup || !otherInput || !confirmButton) {
    return;
  }

  const needsCustomReason = reasonSelect.value === "Other";
  otherGroup.classList.toggle("hidden", !needsCustomReason);
  otherInput.required = needsCustomReason;
  confirmButton.disabled = !reasonSelect.value || (needsCustomReason && !otherInput.value.trim());
}

function submitProviderSuspension() {
  const providerId = document.getElementById("suspend-provider-id")?.value;
  const provider = state.providers.find((item) => item.id === providerId);
  const reasonSelect = document.getElementById("provider-suspension-reason");
  const customReason = document.getElementById("provider-suspension-other")?.value.trim() || "";
  const adminNote = document.getElementById("provider-suspension-note")?.value.trim() || "";

  if (!provider) {
    return;
  }

  if (!reasonSelect?.value) {
    showInlineFieldError("provider-suspension-reason", "Select a suspension reason before continuing.");
    return;
  }

  if (reasonSelect.value === "Other" && !customReason) {
    updateProviderSuspendModalState();
    showInlineFieldError("provider-suspension-other", "Enter the custom suspension reason.");
    return;
  }

  provider.status = "suspended";
  provider.suspensionReason = reasonSelect.value === "Other"
    ? `Other: ${customReason}`
    : reasonSelect.value;
  provider.suspensionAdminNote = adminNote;
  provider.suspensionDate = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  recordProviderStatusChange(provider, "Provider suspended", provider.suspensionReason);
  syncProviderStatus(providerId, "suspended", {
    reason: provider.suspensionReason,
    note: adminNote
  });

  addNotification(
    "Provider suspended",
    `${provider.name} can no longer accept new bookings.`,
    { type: "provider_suspended", entityType: "provider", entityId: provider.id, route: "providers" }
  );

  closeModal();
  renderCurrentView();
}

function reinstateProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);

  if (!provider || provider.status !== "suspended") {
    return;
  }

  provider.status = "verified";
  provider.suspensionReason = "";
  provider.suspensionAdminNote = "";
  recordProviderStatusChange(provider, "Provider reinstated", "Marketplace access restored by an administrator.");
  syncProviderStatus(providerId, "verified");

  addNotification(
    "Provider reinstated",
    `${provider.name} can accept customer bookings again.`,
    { type: "provider_reinstated", entityType: "provider", entityId: provider.id, route: "providers" }
  );

  closeModal();
  renderCurrentView();
}

function toggleCategory(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) {
    return;
  }

  category.status = category.status === "active" ? "review" : "active";
  renderCurrentView();
}

function deleteCategory(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) {
    return;
  }

  const confirmed = window.confirm(
    `Delete the ${category.name} category?`
  );

  if (!confirmed) {
    return;
  }

  state.categories = state.categories.filter(
    (item) => item.id !== categoryId
  );
  closeModal();
  renderCurrentView();
}

function openSuspendUserModalLegacy(userId) {
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Suspend User</h2>
        <p>This user will lose access to their FixIt account until the suspension is lifted.</p>
      </div>

      <button class="modal-close" type="button" data-action="close-modal">Ã¢Å“â€¢</button>
    </div>

    <form id="suspend-user-form" novalidate>
      <input type="hidden" id="suspend-user-id" value="${user.id}">

      <div class="modal-user-summary">
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.username || "@unknown")}</span>
      </div>

      <div class="form-group">
        <label for="suspension-reason">Reason for suspension</label>
        <select class="select-control" id="suspension-reason" required>
          <option value="">Select a reason</option>
          <option value="Violation of platform policy">Violation of platform policy</option>
          <option value="Suspicious activity">Suspicious activity</option>
          <option value="Incomplete verification">Incomplete verification</option>
          <option value="Inappropriate behavior">Inappropriate behavior</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="form-group hidden" id="suspension-other-group">
        <label for="suspension-other-reason">Additional explanation</label>
        <textarea
          class="textarea-control"
          id="suspension-other-reason"
          placeholder="Add the reason for this suspension"
        ></textarea>
      </div>

      <div class="modal-footer">
        <button class="secondary-button" type="button" data-action="close-modal">
          Cancel
        </button>

        <button class="danger-button" type="submit" id="confirm-suspend-button" disabled>
          Confirm Suspension
        </button>
      </div>
    </form>
  `);
}

function openRestoreUserModalLegacy(userId) {
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Restore User Account</h2>
        <p>Are you sure you want to restore access for this user?</p>
      </div>

      <button class="modal-close" type="button" data-action="close-modal">Ã¢Å“â€¢</button>
    </div>

    <div class="modal-user-summary">
      <strong>${escapeHtml(user.name)}</strong>
      <span>${escapeHtml(user.username || "@unknown")}</span>
    </div>

    <div class="modal-footer">
      <button class="secondary-button" type="button" data-action="close-modal">
        Cancel
      </button>

      <button class="success-button" type="button" data-action="confirm-restore-user" data-id="${user.id}">
        Restore Account
      </button>
    </div>
  `);
}

function updateSuspendModalStateLegacy() {
  const reasonSelect = document.getElementById("suspension-reason");
  const otherGroup = document.getElementById("suspension-other-group");
  const otherInput = document.getElementById("suspension-other-reason");
  const confirmButton = document.getElementById("confirm-suspend-button");

  if (!reasonSelect || !otherGroup || !otherInput || !confirmButton) {
    return;
  }

  const requiresOtherReason = reasonSelect.value === "Other";
  otherGroup.classList.toggle("hidden", !requiresOtherReason);

  const hasValidReason = Boolean(
    reasonSelect.value && (!requiresOtherReason || otherInput.value.trim())
  );

  confirmButton.disabled = !hasValidReason;
}

function submitUserSuspensionLegacy() {
  const userId = document.getElementById("suspend-user-id")?.value;
  const reasonSelect = document.getElementById("suspension-reason");
  const otherInput = document.getElementById("suspension-other-reason");
  const user = state.users.find((item) => item.id === userId);

  if (!user || !reasonSelect) {
    return;
  }

  const reason = reasonSelect.value === "Other"
    ? otherInput?.value.trim()
    : reasonSelect.value;

  if (!reason) {
    showInlineFieldError("suspension-reason", "Select a suspension reason before continuing.");
    return;
  }

  user.status = "suspended";
  user.suspensionReason = reason;

  closeModal();
  renderCurrentView();
}

function openCustomerDetailsModal(userId) {
  const customer = state.users.find((item) =>
    item.id === userId && String(item.role).toLowerCase() === "customer"
  );

  if (!customer) {
    return;
  }

  const trust = getCustomerTrustInfo(customer.trustLevel);
  const initials = customer.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const suspensionHistory = Array.isArray(customer.suspensionHistory)
    ? customer.suspensionHistory
    : [];

  openModal(`
    <div class="modal-head customer-detail-head">
      <div>
        <span class="analytics-eyebrow">CUSTOMER ACCOUNT</span>
        <h2>${escapeHtml(customer.name)}</h2>
        <p>${escapeHtml(customer.username || "@unknown")}</p>
      </div>
      <div class="customer-modal-status">
        ${getStatusBadge(customer.status)}
        <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
      </div>
    </div>

    <div class="customer-modal-summary">
      <span class="customer-modal-avatar">${escapeHtml(initials)}</span>
      <div>
        <span>CUSTOMER</span>
        <strong>${escapeHtml(customer.name)}</strong>
        <small>${escapeHtml(customer.email)}</small>
      </div>
    </div>

    <section class="customer-detail-columns">
      <article class="customer-detail-section">
        <div class="customer-detail-section-head">
          <span>ACCOUNT DETAILS</span>
          <h3>Identity and access</h3>
        </div>
        <dl class="customer-detail-list">
          <div><dt>Full name</dt><dd>${escapeHtml(customer.name)}</dd></div>
          <div><dt>Username</dt><dd>${escapeHtml(customer.username || "@unknown")}</dd></div>
          <div><dt>Email</dt><dd>${escapeHtml(customer.email)}</dd></div>
          <div><dt>Phone number</dt><dd>${escapeHtml(customer.phone || "Not available")}</dd></div>
          <div><dt>Account status</dt><dd>${escapeHtml(humanizeStatus(customer.status))}</dd></div>
          <div><dt>Join date</dt><dd>${escapeHtml(customer.joinedOn || "Not recorded")}</dd></div>
          <div><dt>Last login</dt><dd>${escapeHtml(customer.lastLogin || "Not recorded")}</dd></div>
        </dl>
      </article>

      <article class="customer-detail-section">
        <div class="customer-detail-section-head">
          <span>PLATFORM ACTIVITY</span>
          <h3>Booking history</h3>
        </div>
        <div class="customer-activity-grid">
          <div><span>Total bookings</span><strong>${Number(customer.totalBookings || 0)}</strong></div>
          <div><span>Completed bookings</span><strong>${Number(customer.completedBookings || 0)}</strong></div>
          <div><span>Cancelled bookings</span><strong>${Number(customer.cancelledBookings || 0)}</strong></div>
          <div><span>Reviews submitted</span><strong>${Number(customer.reviewsSubmitted || 0)}</strong></div>
          <div class="customer-activity-wide">
            <span>Most recent booking</span>
            <strong>${escapeHtml(customer.recentBooking || "No recent booking")}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="customer-trust-panel ${trust.className}">
      <div class="customer-trust-panel-head">
        <div>
          <span>ACCOUNT TRUST LEVEL</span>
          <h3>Platform trust assessment</h3>
        </div>
        <span class="trust-badge ${trust.className}">${trust.label}</span>
      </div>
      <p>${trust.explanation}</p>
      <div class="customer-trust-metrics">
        <div><span>Customer reports</span><strong>${Number(customer.reports || 0)}</strong></div>
        <div><span>Booking cancellations</span><strong>${Number(customer.cancelledBookings || 0)}</strong></div>
        <div><span>Admin notes</span><strong>${escapeHtml(customer.adminNotes || "No admin notes")}</strong></div>
      </div>
    </section>

    ${customer.status === "suspended" ? `
      <section class="customer-current-suspension">
        <span class="provider-warning-mark" aria-hidden="true">!</span>
        <div>
          <span>CURRENT SUSPENSION</span>
          <strong>${escapeHtml(customer.suspensionReason || "Reason not recorded")}</strong>
          <p>Suspended on ${escapeHtml(customer.suspensionDate || "an unrecorded date")}${customer.suspensionAdminNote ? ` - ${escapeHtml(customer.suspensionAdminNote)}` : ""}</p>
        </div>
      </section>
    ` : ""}

    <section class="customer-history-section">
      <div class="customer-detail-section-head">
        <span>SUSPENSION HISTORY</span>
        <h3>Previous access actions</h3>
      </div>
      ${suspensionHistory.length ? `
        <div class="customer-history-list">
          ${suspensionHistory.map((entry) => `
            <div>
              <span>${escapeHtml(entry.date || "Date unavailable")}</span>
              <strong>${escapeHtml(entry.reason || "Reason unavailable")}</strong>
              ${entry.adminNote ? `<small>${escapeHtml(entry.adminNote)}</small>` : ""}
            </div>
          `).join("")}
        </div>
      ` : `
        <p class="customer-history-empty">No previous customer suspensions are recorded.</p>
      `}
    </section>

    <div class="modal-footer customer-detail-footer">
      <button class="secondary-button" type="button" data-action="close-modal">Close</button>
      <button
        class="${customer.status === "active" ? "danger-button" : "success-button"}"
        type="button"
        data-action="${customer.status === "active" ? "suspend-user" : "restore-user"}"
        data-id="${escapeHtml(customer.id)}"
      >
        ${customer.status === "active" ? "Suspend Customer" : "Restore Customer"}
      </button>
    </div>
  `, "customer-detail-modal");
}

function openSuspendUserModal(userId) {
  const customer = state.users.find((item) =>
    item.id === userId && String(item.role).toLowerCase() === "customer"
  );

  if (!customer || customer.status !== "active") {
    return;
  }

  const initials = customer.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  openModal(`
    <div class="modal-head suspend-customer-head">
      <div>
        <span class="analytics-eyebrow">CUSTOMER ACCOUNT ACCESS</span>
        <h2>Suspend Customer</h2>
        <p>Review the account impact and record an internal reason before continuing.</p>
      </div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>

    <div class="suspend-customer-identity">
      <span class="customer-modal-avatar">${escapeHtml(initials)}</span>
      <div>
        <span>CUSTOMER</span>
        <strong>${escapeHtml(customer.name)}</strong>
        <small>${escapeHtml(customer.username || "@unknown")}</small>
      </div>
    </div>

    <div class="suspend-customer-warning">
      <span class="provider-warning-mark" aria-hidden="true">!</span>
      <p>This customer will lose access to their FixIt account and cannot create, manage, or review bookings while suspended.</p>
    </div>

    <form id="suspend-user-form" novalidate>
      <input id="suspend-user-id" type="hidden" value="${escapeHtml(customer.id)}">

      <div class="form-group">
        <label for="suspension-reason">Suspension reason <span class="required-mark">*</span></label>
        <select class="select-control" id="suspension-reason" required>
          <option value="">Select a reason</option>
          <option value="Suspicious or fraudulent activity">Suspicious or fraudulent activity</option>
          <option value="Repeated booking cancellations">Repeated booking cancellations</option>
          <option value="Repeated abuse of service providers">Repeated abuse of service providers</option>
          <option value="Platform policy violation">Platform policy violation</option>
          <option value="Safety concern">Safety concern</option>
          <option value="Account inactivity">Account inactivity</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="form-group hidden" id="suspension-other-group">
        <label for="suspension-other-reason">Custom suspension reason <span class="required-mark">*</span></label>
        <textarea
          class="textarea-control"
          id="suspension-other-reason"
          rows="3"
          placeholder="Explain why this customer is being suspended"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="customer-suspension-note">Internal admin note <span class="optional-mark">Optional</span></label>
        <textarea
          class="textarea-control"
          id="customer-suspension-note"
          rows="3"
          placeholder="Add context for other administrators"
        ></textarea>
      </div>

      <div class="modal-footer suspend-customer-footer">
        <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
        <button class="danger-button" type="submit" id="confirm-suspend-button" disabled>
          Confirm Suspension
        </button>
      </div>
    </form>
  `, "suspend-customer-modal");
}

function openRestoreUserModal(userId) {
  const customer = state.users.find((item) =>
    item.id === userId && String(item.role).toLowerCase() === "customer"
  );

  if (!customer || customer.status !== "suspended") {
    return;
  }

  openModal(`
    <div class="modal-head">
      <div>
        <span class="analytics-eyebrow">CUSTOMER ACCOUNT ACCESS</span>
        <h2>Restore Customer Account</h2>
        <p>Restore account access and allow this customer to manage bookings again.</p>
      </div>
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close modal">x</button>
    </div>
    <div class="modal-user-summary">
      <strong>${escapeHtml(customer.name)}</strong>
      <span>${escapeHtml(customer.username || "@unknown")}</span>
    </div>
    <div class="modal-footer">
      <button class="secondary-button" type="button" data-action="close-modal">Cancel</button>
      <button class="success-button" type="button" data-action="confirm-restore-user" data-id="${escapeHtml(customer.id)}">
        Restore Customer
      </button>
    </div>
  `);
}

function updateSuspendModalState() {
  const reasonSelect = document.getElementById("suspension-reason");
  const otherGroup = document.getElementById("suspension-other-group");
  const otherInput = document.getElementById("suspension-other-reason");
  const confirmButton = document.getElementById("confirm-suspend-button");

  if (!reasonSelect || !otherGroup || !otherInput || !confirmButton) {
    return;
  }

  const requiresOtherReason = reasonSelect.value === "Other";
  otherGroup.classList.toggle("hidden", !requiresOtherReason);
  otherInput.required = requiresOtherReason;
  confirmButton.disabled = !reasonSelect.value ||
    (requiresOtherReason && !otherInput.value.trim());
}

function submitUserSuspension() {
  const userId = document.getElementById("suspend-user-id")?.value;
  const reasonSelect = document.getElementById("suspension-reason");
  const otherReason = document.getElementById("suspension-other-reason")?.value.trim() || "";
  const adminNote = document.getElementById("customer-suspension-note")?.value.trim() || "";
  const customer = state.users.find((item) =>
    item.id === userId && String(item.role).toLowerCase() === "customer"
  );

  if (!customer) {
    return;
  }

  if (!reasonSelect?.value) {
    showInlineFieldError("suspension-reason", "Select a suspension reason before continuing.");
    return;
  }

  if (reasonSelect.value === "Other" && !otherReason) {
    updateSuspendModalState();
    showInlineFieldError("suspension-other-reason", "Enter the custom suspension reason.");
    return;
  }

  const suspensionReason = reasonSelect.value === "Other"
    ? `Other: ${otherReason}`
    : reasonSelect.value;
  const suspensionDate = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  customer.status = "suspended";
  customer.suspensionReason = suspensionReason;
  customer.suspensionDate = suspensionDate;
  customer.suspensionAdminNote = adminNote;
  customer.suspensionHistory = Array.isArray(customer.suspensionHistory)
    ? customer.suspensionHistory
    : [];
  customer.suspensionHistory.unshift({
    date: suspensionDate,
    reason: suspensionReason,
    adminNote
  });
  syncUserStatus(userId, "suspended", {
    reason: suspensionReason,
    note: adminNote
  });

  addNotification(
    "Customer suspended",
    `${customer.name} can no longer access customer booking tools.`,
    { type: "customer_suspended", entityType: "customer", entityId: customer.id, route: "users" }
  );

  closeModal();
  renderCurrentView();
}

function restoreUserAccount(userId) {
  const user = state.users.find((item) =>
    item.id === userId && String(item.role).toLowerCase() === "customer"
  );

  if (!user) {
    return;
  }

  user.status = "active";
  user.suspensionReason = "";
  user.suspensionDate = "";
  user.suspensionAdminNote = "";
  syncUserStatus(userId, "active");

  addNotification(
    "Customer reinstated",
    `${user.name} can access customer booking tools again.`,
    { type: "customer_reinstated", entityType: "customer", entityId: user.id, route: "users" }
  );

  closeModal();
  renderCurrentView();
}

function saveCategoryForm() {
  const categoryId = document.getElementById("category-id").value;
  const name = document.getElementById("category-name").value.trim();
  const icon = document.getElementById("category-icon").value.trim();
  const description = document
    .getElementById("category-description")
    .value
    .trim();
  const status = document.getElementById("category-status").value;

  const missingCategoryField = [
    ["category-name", name],
    ["category-icon", icon],
    ["category-description", description]
  ].find(([, value]) => !value);

  if (missingCategoryField) {
    showInlineFieldError(missingCategoryField[0], "This field is required.");
    return;
  }

  if (categoryId) {
    const category = state.categories.find(
      (item) => item.id === categoryId
    );

    if (category) {
      category.name = name;
      category.icon = icon;
      category.description = description;
      category.status = status;
    }
  } else {
    state.categories.push({
      id: `category-${Date.now()}`,
      name,
      icon,
      description,
      status
    });
  }

  closeModal();
  renderCurrentView();
}

function addSafetyNote() {
  const safetyInput = document.getElementById("safety-note");
  const note = safetyInput.value.trim();

  if (!note) {
    showInlineFieldError("safety-note", "Write a note before publishing it.");
    return;
  }

  state.safetyNotes.unshift(note);
  syncSafetyNotes();

  addNotification(
    "Safety note published",
    "A new platform compliance rule is active.",
    { type: "safety_note_published", entityType: "system", entityId: "safety", route: "settings" }
  );

  renderCurrentView();
}

function deleteSafetyNote(index) {
  state.safetyNotes.splice(index, 1);
  syncSafetyNotes();
  renderCurrentView();
}

function exportAnalyticsReportLegacy() {
  const rows = [
    ["Metric", "Value"],
    ["Total Providers", state.metrics.totalProviders],
    ["Pending Verification", getPendingCount()],
    ["Total Jobs", state.metrics.totalJobs],
    ["Total Revenue", state.metrics.totalRevenue]
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "fixit-admin-report.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const textValue = String(value ?? "");
  return `"${textValue.replaceAll('"', '""')}"`;
}

function exportAnalyticsReport() {
  const model = buildAnalyticsModel();
  const rows = [
    ["FixIt Analytics Report"],
    ["From Date", state.analyticsDateFrom || "All time"],
    ["To Date", state.analyticsDateTo || "All time"],
    ["Service Category", state.analyticsCategoryFilter],
    ["Provider Username", state.analyticsProviderUsernameSearch || "All providers"],
    ["Job Status", state.analyticsStatusFilter],
    [],
    ["Metric", "Value"],
    ["Completed Jobs", model.completedJobs],
    ["Platform Revenue", model.revenue],
    ["12% Commission", model.commission],
    ["Active Providers", model.activeProviders],
    ["New Customers", model.newCustomers],
    ["Average Rating", model.averageRating.toFixed(1)],
    ["Pending Applications", model.pendingApplications],
    ["Open Safety Reports", model.openReports],
    [],
    ["Job ID", "Service", "Provider", "Customer", "Scheduled", "Final Amount", "Status"],
    ...model.jobs.map((job) => [
      job.id,
      job.title,
      job.provider,
      job.customer,
      formatJobDateTime(job),
      job.amount,
      humanizeStatus(job.status)
    ])
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "fixit-analytics-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetJobFilters() {
  state.jobsSearch = "";
  state.jobsStatusFilter = "all";
  state.jobsCategoryFilter = "all";
  state.jobsDateFrom = "";
  state.jobsDateTo = "";
  state.jobsSort = "newest";
  renderCurrentView();
}

function resetAnalyticsFilters() {
  state.analyticsDateFrom = "";
  state.analyticsDateTo = "";
  state.analyticsCategoryFilter = "all";
  state.analyticsProviderUsernameSearch = "";
  state.analyticsStatusFilter = "all";
  renderCurrentView();
}

function resetDashboardFilters() {
  state.dashboardTimeFilter = "all";
  state.dashboardCategoryFilter = "all";
  state.providerFilter = "all";
  state.providerFiltersOpen = false;
  state.providerUsernameSearch = "";
  state.providerLocationFilter = "";
  state.providerRateMax = 300;
  state.providerDateFrom = "";
  state.providerDateTo = "";

  renderCurrentView();
}

function clearProviderPanelFilters() {
  state.dashboardCategoryFilter = "all";
  state.providerLocationFilter = "";
  state.providerRateMax = 300;
  state.providerDateFrom = "";
  state.providerDateTo = "";

  const categoryFilter = document.getElementById("provider-category-filter");
  const locationFilter = document.getElementById("provider-location-filter");
  const rateFilter = document.getElementById("provider-rate-filter");
  const dateFrom = document.getElementById("provider-date-from");
  const dateTo = document.getElementById("provider-date-to");

  if (categoryFilter) categoryFilter.value = "all";
  if (locationFilter) locationFilter.value = "";
  if (rateFilter) rateFilter.value = "300";
  if (dateFrom) dateFrom.value = "";
  if (dateTo) dateTo.value = "";

  updateProviderFilterPanelSummary();
}

function resetDemoData() {
  const confirmed = window.confirm(
    "Reset every demo change and restore the original data?"
  );

  if (!confirmed) {
    return;
  }

  state = cloneDefaultState();

  saveState();
  applyTheme();
  renderNotifications();
  renderCurrentView();
}

/* EVENTS */

trackEvent(document, "click", (event) => {
  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;
  const id = actionElement.dataset.id;

  if (action === "navigate") {
    navigateToView(actionElement.dataset.view);
  }

  if (action === "open-notification") {
    openNotification(id);
  }

  if (action === "verify-provider") {
    verifyProvider(id);
  }

  if (action === "reject-provider") {
    rejectProvider(id);
  }

  if (action === "restore-provider") {
    restoreProvider(id);
  }

  if (action === "suspend-provider") {
    suspendProvider(id);
  }

  if (action === "reinstate-provider") {
    reinstateProvider(id);
  }

  if (action === "view-provider") {
    state.providerDetailTab = "overview";
    openProviderModal(id);
  }

  if (action === "switch-provider-detail-tab") {
    state.providerDetailTab = actionElement.dataset.tab || "overview";
    openProviderModal(id);
  }

  if (action === "view-provider-jobs") {
    viewProviderJobs(id);
  }

  if (action === "view-provider-document") {
    openProviderDocumentModal(id, actionElement.dataset.document || "Provider document");
  }

  if (action === "download-provider-document") {
    downloadProviderDocument(id, actionElement.dataset.document || "Provider document");
  }

  if (action === "edit-admin-profile") {
    openAdminProfileModal();
  }

  if (action === "add-category") {
    openCategoryModal();
  }

  if (action === "edit-category") {
    openCategoryModal(id);
  }

  if (action === "toggle-category") {
    toggleCategory(id);
  }

  if (action === "delete-category") {
    deleteCategory(id);
  }

  if (action === "suspend-user") {
    openSuspendUserModal(id);
  }

  if (action === "restore-user") {
    openRestoreUserModal(id);
  }

  if (action === "view-customer") {
    openCustomerDetailsModal(id);
  }

  if (action === "confirm-restore-user") {
    restoreUserAccount(id);
  }

  if (action === "view-job") {
    openJobModal(id);
  }

  if (action === "view-job-provider") {
    openJobPartyModal(id, "provider");
  }

  if (action === "view-job-customer") {
    openJobPartyModal(id, "customer");
  }

  if (action === "add-admin-job-note") {
    openAdminJobNoteModal(id);
  }

  if (action === "back-to-job") {
    openJobModal(id);
  }

  if (action === "reset-job-filters") {
    resetJobFilters();
  }

  if (action === "reset-analytics-filters") {
    resetAnalyticsFilters();
  }

  if (action === "reset-user-filters") {
    resetUserFilters();
  }

  if (action === "delete-safety-note") {
    deleteSafetyNote(Number(actionElement.dataset.index));
  }

  if (action === "close-modal") {
    closeModal();
  }

  if (action === "export-report") {
    exportAnalyticsReport();
  }

  if (action === "reset-dashboard-filters") {
    resetDashboardFilters();
  }

  if (action === "toggle-provider-filters") {
    state.providerFiltersOpen = !state.providerFiltersOpen;
    renderCurrentView();
  }

  if (action === "close-provider-filters" || action === "show-provider-results") {
    state.providerFiltersOpen = false;
    renderCurrentView();
  }

  if (action === "set-provider-status-filter") {
    const selectedStatus = actionElement.dataset.status || "all";
    state.providerFilter = selectedStatus;
    renderCurrentView();
  }

  if (action === "set-provider-category-filter") {
    state.dashboardCategoryFilter = actionElement.dataset.category || "all";
    renderCurrentView();
  }

  if (action === "reset-provider-filters") {
    clearProviderPanelFilters();
  }

  if (action === "switch-profile-tab") {
    state.activeProfileTab = actionElement.dataset.tab || "admin-details";
    renderCurrentView();
  }

  if (action === "switch-profile-edit-tab") {
    switchProfileEditTab(actionElement.dataset.tab || "about");
  }

  if (action === "switch-settings-tab") {
    state.settingsActiveTab = actionElement.dataset.tab || "general";
    renderCurrentView();
  }

  if (action === "open-safety-settings") {
    state.activeView = "settings";
    state.settingsActiveTab = "safety";
    renderCurrentView();
  }

  if (action === "reset-demo") {
    resetDemoData();
  }
});

trackEvent(document, "submit", (event) => {
  event.preventDefault();

  if (event.target.id === "category-form") {
    saveCategoryForm();
  }

  if (event.target.id === "safety-form") {
    addSafetyNote();
  }

  if (event.target.id === "admin-profile-form") {
    saveAdminProfileForm();
  }

  if (event.target.id === "suspend-user-form") {
    submitUserSuspension();
  }

  if (event.target.id === "job-admin-note-form") {
    saveAdminJobNote();
  }

  if (event.target.id === "suspend-provider-form") {
    submitProviderSuspension();
  }

  if (event.target.id === "provider-rejection-form") {
    submitProviderRejection();
  }

});

trackEvent(document, "change", (event) => {
  if (event.target.matches('[aria-invalid="true"]')) {
    clearInlineFieldError(event.target);
  }

  const reportFilterMap = {
    "jobs-status-filter": "jobsStatusFilter",
    "jobs-category-filter": "jobsCategoryFilter",
    "jobs-date-from": "jobsDateFrom",
    "jobs-date-to": "jobsDateTo",
    "jobs-sort": "jobsSort",
    "analytics-date-from": "analyticsDateFrom",
    "analytics-date-to": "analyticsDateTo",
    "analytics-category-filter": "analyticsCategoryFilter",
    "analytics-status-filter": "analyticsStatusFilter"
  };

  if (reportFilterMap[event.target.id]) {
    state[reportFilterMap[event.target.id]] = event.target.value;
    renderCurrentView();
    return;
  }
  
  if (event.target.id === "user-sort") {
    state.userSort = event.target.value;
    renderCurrentView();
  }

  if (event.target.id === "user-status-filter") {
    state.userStatusFilter = event.target.value;
    renderCurrentView();
  }


  if (event.target.id === "provider-filter") {
    state.providerFilter = event.target.value;
    renderCurrentView();
  }

  if (event.target.id === "provider-category-filter") {
    state.dashboardCategoryFilter = event.target.value;
    updateProviderFilterPanelSummary();
  }

  if (event.target.id === "provider-rate-filter") {
    state.providerRateMax = Number(event.target.value) || 300;
    updateProviderFilterPanelSummary();
  }

  if (event.target.id === "provider-date-from") {
    state.providerDateFrom = event.target.value;
    updateProviderFilterPanelSummary();
  }

  if (event.target.id === "provider-date-to") {
    state.providerDateTo = event.target.value;
    updateProviderFilterPanelSummary();
  }

  if (event.target.id === "dashboard-time-filter" || event.target.id === "provider-time-filter") {
    state.dashboardTimeFilter = event.target.value;
    renderCurrentView();
  }

  if (event.target.id === "dashboard-category-filter") {
    state.dashboardCategoryFilter = event.target.value;
    renderCurrentView();
  }

  if (event.target.dataset.setting) {
    state.settings[event.target.dataset.setting] = event.target.checked;

    saveState();
  }

  if (event.target.dataset.settingSelect) {
    state.settings[event.target.dataset.settingSelect] = event.target.value;
    saveState();
  }

  if (event.target.id === "suspension-reason") {
    updateSuspendModalState();
  }

  if (event.target.id === "provider-suspension-reason") {
    updateProviderSuspendModalState();
  }

  if (event.target.id === "provider-rejection-reason") {
    updateProviderRejectionState();
  }
});

trackEvent(document, "input", (event) => {
  if (event.target.matches('[aria-invalid="true"]')) {
    clearInlineFieldError(event.target);
  }

  if (event.target.dataset.profileField) {
    const fieldName = event.target.dataset.profileField;
    document.querySelectorAll(`[data-profile-field="${fieldName}"]`).forEach((field) => {
      if (field !== event.target) {
        field.value = event.target.value;
      }
    });
  }

  if (event.target.id === "provider-username-search") {
    const cursorPosition = event.target.selectionStart;
    state.providerUsernameSearch = event.target.value;
    renderCurrentView();

    const usernameInput = document.getElementById("provider-username-search");
    if (usernameInput) {
      usernameInput.focus();
      usernameInput.setSelectionRange(cursorPosition, cursorPosition);
    }
    return;
  }

  if (event.target.id === "analytics-provider-username-search") {
    const cursorPosition = event.target.selectionStart;
    state.analyticsProviderUsernameSearch = event.target.value;
    renderCurrentView();

    const analyticsProviderInput = document.getElementById("analytics-provider-username-search");
    if (analyticsProviderInput) {
      analyticsProviderInput.focus();
      analyticsProviderInput.setSelectionRange(cursorPosition, cursorPosition);
    }
    return;
  }

  if (event.target.id === "provider-rate-filter") {
    state.providerRateMax = Number(event.target.value) || 300;
    updateProviderFilterPanelSummary();
    return;
  }

  if (event.target.id === "provider-suspension-other") {
    updateProviderSuspendModalState();
    return;
  }

  if (event.target.id === "provider-rejection-other") {
    updateProviderRejectionState();
    return;
  }

  if (event.target.id === "jobs-search") {
    const cursorPosition = event.target.selectionStart;
    state.jobsSearch = event.target.value;
    renderCurrentView();

    const searchInput = document.getElementById("jobs-search");
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(cursorPosition, cursorPosition);
    }
    return;
  }

  if (event.target.id === "provider-location-filter") {
    state.providerLocationFilter = event.target.value;
    updateProviderFilterPanelSummary();
    return;
  }

  if (event.target.id !== "user-search") {
    if (event.target.id === "suspension-other-reason") {
      updateSuspendModalState();
    }
    return;
  }

  const cursorPosition = event.target.selectionStart;
  state.userSearch = event.target.value;

  renderCurrentView();

  const searchInput = document.getElementById("user-search");

  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(cursorPosition, cursorPosition);
  }
});

trackEvent(elements.sidebarToggle, "click", () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;

  saveState();
  renderSidebar();
});

trackEvent(elements.mobileMenuButton, "click", () => {
  elements.sidebar.classList.add("mobile-open");
  elements.mobileOverlay.classList.add("active");
});

trackEvent(elements.mobileOverlay, "click", () => {
  elements.sidebar.classList.remove("mobile-open");
  elements.mobileOverlay.classList.remove("active");
});

trackEvent(elements.themeToggle, "click", () => {
  state.darkMode = !state.darkMode;

  saveState();
  applyTheme();
});

trackEvent(elements.notificationsToggle, "click", () => {
  elements.notificationPanel.classList.toggle("hidden");
});

trackEvent(elements.markAllReadButton, "click", (event) => {
  // The notification list rerenders below, so keep this click from being
  // mistaken for an outside click after its original button is detached.
  event.stopPropagation();

  state.notifications.forEach((notification) => {
    notification.unread = false;
  });

  saveState();
  renderNotifications();
});

trackEvent(elements.adminAccountButton, "click", () => {
  navigateToView("admin-profile");
});

trackEvent(elements.sidebarProfileButton, "click", () => {
  navigateToView("admin-profile");
});

trackEvent(elements.modalBackdrop, "click", (event) => {
  if (event.target === elements.modalBackdrop) {
    closeModal();
  }
});

trackEvent(document, "keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    elements.notificationPanel.classList.add("hidden");
  }
});

trackEvent(document, "click", (event) => {
  const clickedInsideNotifications =
    elements.notificationPanel.contains(event.target) ||
    elements.notificationsToggle.contains(event.target);

  if (!clickedInsideNotifications) {
    elements.notificationPanel.classList.add("hidden");
  }
});

function initialiseApp() {
  hydrateAdminState().finally(() => {
    applyTheme();
    renderNotifications();
    renderCurrentView();
  });
}

trackEvent(window, "popstate", () => {
  const routeView = getViewFromCurrentPath();

  if (routeView && routeView !== state.activeView) {
    state.activeView = routeView;
    renderCurrentView();
  }
});

if (document.readyState === "loading") {
  trackEvent(document, "DOMContentLoaded", initialiseApp);
} else {
  initialiseApp();
}
