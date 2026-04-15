const PROTOCOL_SOURCE = "vscode-cross-port-v4-row-input";
const REQUEST_TIMEOUT_MS = 15000;
const RELAY_DEFAULT = "http://127.0.0.1:9000";
const PEER_ID_KEY = "vscode-cross-port-peer-id";
const REPLACEMENT_ENABLED = true;
const DEFAULT_SESSION_FILE = "conversation.log";
const DEFAULT_FOLDER_CACHE_KEY = "vscode-cross-port-default-folder-cache-v1";
const MANUAL_REPLACEMENT_CACHE_KEY = "vscode-cross-port-manual-replace-v1";
const RELAY_URL_CACHE_KEY = "vscode-cross-port-relay-url-v1";
const RELAY_USERNAME_CACHE_KEY = "vscode-cross-port-relay-username-v1";
const UI_THEME_CACHE_KEY = "vscode-cross-port-ui-theme-v1";
const REPLACEMENT_LINE_LIMIT_CACHE_KEY = "vscode-cross-port-replacement-line-limit-v1";
const XOR_ALGORITHM = "xor-id-v1";

const sessionList = document.getElementById("sessionList");
const fileSelect = document.getElementById("fileSelect");
const fileLineList = document.getElementById("fileLineList");
const currentSessionText = document.getElementById("currentSessionText");
const currentFileLabel = document.getElementById("currentFileLabel");

const localPeerText = document.getElementById("localPeerText");
const connectionText = document.getElementById("connectionText");
const relayText = document.getElementById("relayText");
const activeSessionInfo = document.getElementById("activeSessionInfo");
const replacementFileNameText = document.getElementById("replacementFileNameText");
const replacementSourceText = document.getElementById("replacementSourceText");
const replacementHitText = document.getElementById("replacementHitText");
const replacementCurrentLineText = document.getElementById("replacementCurrentLineText");

const remotePeerInput = document.getElementById("remotePeerInput");
const targetFileInput = document.getElementById("targetFileInput");
const debugPortInput = document.getElementById("debugPortInput");

const openPeerBtn = document.getElementById("pickDirBtn");
const clearBtn = document.getElementById("clearBtn");
const connectBtn = document.getElementById("connectBtn");
const selfConnectBtn = document.getElementById("selfConnectBtn");
const quickPortConnectBtn = document.getElementById("selfConnectPortBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const reloadReplaceBtn = document.getElementById("reloadReplaceBtn");
const newSessionBtn = document.getElementById("newSessionBtn");
const panelPeerField = document.getElementById("panelPeerField");

const activityButtons = Array.from(document.querySelectorAll(".activity-btn"));
const activityPanels = Array.from(document.querySelectorAll(".activity-panel"));

const statusText = document.getElementById("statusText");
const countText = document.getElementById("countText");

const previewCard = document.getElementById("previewCard");
const previewName = document.getElementById("previewName");
const previewDirTag = document.getElementById("previewDirTag");
const previewContent = document.getElementById("previewContent");

const requestModal = document.getElementById("requestModal");
const requestFrom = document.getElementById("requestFrom");
const requestFromPort = document.getElementById("requestFromPort");
const requestSession = document.getElementById("requestSession");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");
const configBtn = document.getElementById("configBtn");
const settingsMenu = document.getElementById("settingsMenu");
const settingsDefaultFolderBtn = document.getElementById("settingsDefaultFolderBtn");
const settingsReplaceLimitBtn = document.getElementById("settingsReplaceLimitBtn");
const settingsRelayBtn = document.getElementById("settingsRelayBtn");
const settingsExtensionsBtn = document.getElementById("settingsExtensionsBtn");
const configModal = document.getElementById("configModal");
const defaultFolderNameText = document.getElementById("defaultFolderNameText");
const defaultFolderStatsText = document.getElementById("defaultFolderStatsText");
const replacementLineLimitInput = document.getElementById("replacementLineLimitInput");
const replacementLineLimitHint = document.getElementById("replacementLineLimitHint");
const saveReplacementLineLimitBtn = document.getElementById("saveReplacementLineLimitBtn");
const chooseDefaultFolderBtn = document.getElementById("chooseDefaultFolderBtn");
const clearDefaultFolderBtn = document.getElementById("clearDefaultFolderBtn");
const closeConfigBtn = document.getElementById("closeConfigBtn");
const extensionModal = document.getElementById("extensionModal");
const closeExtensionBtn = document.getElementById("closeExtensionBtn");
const relayModal = document.getElementById("relayModal");
const relayUrlInput = document.getElementById("relayUrlInput");
const relayUsernameInput = document.getElementById("relayUsernameInput");
const saveRelayBtn = document.getElementById("saveRelayBtn");
const resetRelayBtn = document.getElementById("resetRelayBtn");
const closeRelayBtn = document.getElementById("closeRelayBtn");
const helpMenuBtn = document.getElementById("helpMenuBtn");
const helpModal = document.getElementById("helpModal");
const helpUsernameText = document.getElementById("helpUsernameText");
const helpPeerIdText = document.getElementById("helpPeerIdText");
const helpEndpointText = document.getElementById("helpEndpointText");
const copyIdentityBtn = document.getElementById("copyIdentityBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const wpsWordThemeBtn = document.getElementById("wpsWordThemeBtn");
const wpsFileMenuBtn = document.getElementById("wpsFileMenuBtn");
const wpsFileMenu = document.getElementById("wpsFileMenu");
const wpsFileNewBtn = document.getElementById("wpsFileNewBtn");
const wpsFileSaveBtn = document.getElementById("wpsFileSaveBtn");
const wpsAutoSaveToggle = document.getElementById("wpsAutoSaveToggle");
const wpsThemeSwitchMenu = document.getElementById("wpsThemeSwitchMenu");
const wpsThemeSwitchBtn = document.getElementById("wpsThemeSwitchBtn");
const wpsCommentBtn = document.getElementById("wpsCommentBtn");
const wpsContextToggleBtn = document.getElementById("wpsContextToggleBtn");
const wpsMainWorkspace = document.querySelector(".wps-main-workspace");

const urlParams = new URLSearchParams(window.location.search);

const localPeerId = getOrCreatePeerId();
const localEndpoint = getCurrentEndpoint();
const sessions = new Map();

const state = {
  relaySource: null,
  relayReady: false,
  relayConnecting: false,
  relayBaseUrl: resolveInitialRelayBaseUrl(),
  relayUsername: resolveInitialRelayUsername(),
  uiTheme: resolveInitialUiTheme(),
  replacementLineLimit: resolveInitialReplacementLineLimit(),
  activeActivity: "explorer",
  selectedSessionId: null,
  selectedFileName: "",
  pendingOutgoing: null,
  pendingIncoming: null,
  pendingIncomingQueue: [],
  replacementBySession: new Map(),
  defaultReplacementFolder: {
    name: "",
    handle: null,
    files: [],
  },
  sessionAutoReplacementFile: new Map(),
  manualReplacementByEndpoint: new Map(),
};

renderLocalIdentityTag();
if (debugPortInput) {
  debugPortInput.value = String(getCurrentPortNumber() ?? 80);
}
if (targetFileInput) {
  targetFileInput.value = DEFAULT_SESSION_FILE;
}

function getOrCreatePeerId() {
  const cached = localStorage.getItem(PEER_ID_KEY);
  if (cached) {
    return cached;
  }
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const created = `peer-${Date.now()}-${randomPart}`;
  localStorage.setItem(PEER_ID_KEY, created);
  return created;
}

function createId(prefix) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${randomPart}`;
}

function currentTime() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function normalizeRelayUsername(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return "";
  }
  const withoutPrefix = text.startsWith("@") ? text.slice(1) : text;
  const length = Array.from(withoutPrefix).length;
  if (length < 2 || length > 32) {
    return "";
  }
  if (!/^[\p{L}\p{N}._-]+$/u.test(withoutPrefix)) {
    return "";
  }
  return withoutPrefix;
}

function toRelayUsernameKey(username) {
  const normalized = normalizeRelayUsername(username);
  return normalized ? normalized.toLowerCase() : "";
}

function getDefaultRelayUsername() {
  return `user-${localPeerId.slice(-6)}`;
}

function persistRelayUsername() {
  try {
    if (!state.relayUsername) {
      localStorage.removeItem(RELAY_USERNAME_CACHE_KEY);
      return;
    }
    localStorage.setItem(RELAY_USERNAME_CACHE_KEY, state.relayUsername);
  } catch {
    // ignore persistence failures
  }
}

function restoreRelayUsernameFromCache() {
  try {
    const raw = localStorage.getItem(RELAY_USERNAME_CACHE_KEY);
    return normalizeRelayUsername(raw);
  } catch {
    return "";
  }
}

function resolveInitialRelayUsername() {
  const fromQuery = normalizeRelayUsername(urlParams.get("username"));
  if (fromQuery) {
    return fromQuery;
  }
  const fromCache = restoreRelayUsernameFromCache();
  if (fromCache) {
    return fromCache;
  }
  return normalizeRelayUsername(getDefaultRelayUsername()) || "user_default";
}

function normalizeUiTheme(raw) {
  const text = String(raw || "").trim().toLowerCase();
  if (text === "wps-word" || text === "vscode") {
    return text;
  }
  return "vscode";
}

function normalizeReplacementLineLimit(raw) {
  const value = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(value)) {
    return 80;
  }
  return Math.min(2000, Math.max(1, value));
}

function persistReplacementLineLimit() {
  try {
    localStorage.setItem(
      REPLACEMENT_LINE_LIMIT_CACHE_KEY,
      String(normalizeReplacementLineLimit(state.replacementLineLimit))
    );
  } catch {
    // ignore persistence failures
  }
}

function restoreReplacementLineLimitFromCache() {
  try {
    return normalizeReplacementLineLimit(
      localStorage.getItem(REPLACEMENT_LINE_LIMIT_CACHE_KEY)
    );
  } catch {
    return 80;
  }
}

function resolveInitialReplacementLineLimit() {
  const fromQuery = urlParams.get("replaceLineLimit");
  if (fromQuery) {
    return normalizeReplacementLineLimit(fromQuery);
  }
  return restoreReplacementLineLimitFromCache();
}

function isWpsWordPage() {
  const pathname = String(window.location.pathname || "");
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const segments = normalizedPath.split("/").filter(Boolean);
  const pageName = (segments[segments.length - 1] || "index.html").toLowerCase();
  return pageName === "wps-word.html" || pageName === "wps-word";
}

function resolveInitialUiTheme() {
  if (isWpsWordPage()) {
    return "wps-word";
  }
  return "vscode";
}

function persistUiTheme() {
  try {
    localStorage.setItem(UI_THEME_CACHE_KEY, normalizeUiTheme(state.uiTheme));
  } catch {
    // ignore persistence failures
  }
}

function applyUiTheme(themeMode) {
  const normalized = normalizeUiTheme(themeMode);
  state.uiTheme = normalized;
  const useWps = normalized === "wps-word";
  document.body.classList.toggle("theme-wps-word", useWps);
  if (wpsWordThemeBtn) {
    const label = wpsWordThemeBtn.querySelector(".wps-word-btn-text");
    if (label) {
      wpsWordThemeBtn.classList.toggle("active", useWps);
      wpsWordThemeBtn.setAttribute("aria-pressed", useWps ? "true" : "false");
      label.textContent = useWps ? "Switch Back to VSCode Style" : "Switch to WPS Word Style";
    } else {
      wpsWordThemeBtn.classList.remove("active");
      wpsWordThemeBtn.setAttribute("aria-pressed", "false");
    }
  }
}

function toggleUiTheme() {
  const next = isWpsWordPage() ? "vscode" : "wps-word";
  state.uiTheme = next;
  persistUiTheme();
  const nextPage = next === "wps-word" ? "wps-word.html" : "index.html";
  const nextUrl = new URL(window.location.href);
  const normalizedPath =
    nextUrl.pathname.length > 1
      ? nextUrl.pathname.replace(/\/+$/, "")
      : nextUrl.pathname;
  const baseDir = normalizedPath.replace(/[^/]*$/, "/");
  nextUrl.pathname = `${baseDir}${nextPage}`;
  nextUrl.search = window.location.search || "";
  window.location.assign(nextUrl.toString());
}

function renderLocalIdentityTag() {
  if (!localPeerText) {
    return;
  }
  if (isWpsWordPage() || document.body.classList.contains("theme-wps-word")) {
    localPeerText.textContent = state.relayUsername;
    return;
  }
  localPeerText.textContent = `本机：${localEndpoint} · @${state.relayUsername} · ${localPeerId}`;
}

function getIdentityTextForCopy() {
  return [
    `用户名: @${state.relayUsername}`,
    `ID: ${localPeerId}`,
    `端点: ${localEndpoint}`,
  ].join("\n");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function refreshHelpModal() {
  if (helpUsernameText) {
    helpUsernameText.textContent = `用户名：@${state.relayUsername}`;
  }
  if (helpPeerIdText) {
    helpPeerIdText.textContent = `ID：${localPeerId}`;
  }
  if (helpEndpointText) {
    helpEndpointText.textContent = `端点：${localEndpoint}`;
  }
}

function showHelpModal() {
  refreshHelpModal();
  if (helpModal) {
    helpModal.classList.remove("hidden");
  }
}

function hideHelpModal() {
  if (helpModal) {
    helpModal.classList.add("hidden");
  }
}

function xorTransformBytes(inputBytes, keyText) {
  const keyBytes = new TextEncoder().encode(String(keyText || ""));
  if (!keyBytes.length) {
    throw new Error("missing xor key");
  }
  const output = new Uint8Array(inputBytes.length);
  for (let index = 0; index < inputBytes.length; index += 1) {
    output[index] = inputBytes[index] ^ keyBytes[index % keyBytes.length];
  }
  return output;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(base64Text) {
  const binary = atob(String(base64Text || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function xorEncryptTextToBase64(plainText, keyText) {
  const plainBytes = new TextEncoder().encode(String(plainText ?? ""));
  const encrypted = xorTransformBytes(plainBytes, keyText);
  return bytesToBase64(encrypted);
}

function xorDecryptBase64ToText(base64Text, keyText) {
  const encryptedBytes = base64ToBytes(base64Text);
  const plainBytes = xorTransformBytes(encryptedBytes, keyText);
  return new TextDecoder().decode(plainBytes);
}

async function resolveRelayUsernameTarget(username) {
  const normalizedUsername = normalizeRelayUsername(username);
  if (!normalizedUsername) {
    return null;
  }
  const relayBaseUrl = normalizeRelayBaseUrl(state.relayBaseUrl) || getRelayDefaultBaseUrl();
  const response = await fetch(
    `${relayBaseUrl}/resolve-username?username=${encodeURIComponent(normalizedUsername)}`
  );
  if (!response.ok) {
    return null;
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!data || !data.ok) {
    return null;
  }
  return {
    username: normalizeRelayUsername(data.username || normalizedUsername),
    peerId: String(data.peerId || "").trim(),
    endpoint: String(data.endpoint || "").trim(),
  };
}

function setStatus(text) {
  const relayStatus = state.relayReady ? "Relay已连接" : "Relay未连接";
  statusText.textContent = `${relayStatus} | ${text}`;
}

function updateCount() {
  countText.textContent = `会话数：${sessions.size}`;
}

function countActiveSessions() {
  let total = 0;
  for (const session of sessions.values()) {
    if (session.status === "active") {
      total += 1;
    }
  }
  return total;
}

function hidePreview() {
  previewCard.classList.add("hidden");
  previewDirTag.textContent = "";
  previewDirTag.className = "preview-dir-tag hidden";
}

function showPreview({ title, rawContent, isSend }) {
  previewName.textContent = title;
  previewContent.textContent = rawContent;
  previewDirTag.textContent = isSend ? "W" : "R";
  previewDirTag.className = `preview-dir-tag ${isSend ? "send" : "receive"}`;
  previewCard.classList.remove("hidden");
}

function hideRequestModal() {
  requestModal.classList.add("hidden");
}

function hideConfigModal() {
  if (configModal) {
    configModal.classList.add("hidden");
  }
}

function hideExtensionModal() {
  if (extensionModal) {
    extensionModal.classList.add("hidden");
  }
}

function hideRelayModal() {
  if (relayModal) {
    relayModal.classList.add("hidden");
  }
}

function hideSettingsMenu() {
  if (settingsMenu) {
    settingsMenu.classList.add("hidden");
  }
}

function showSettingsMenu() {
  if (settingsMenu) {
    settingsMenu.classList.remove("hidden");
  }
}

function toggleSettingsMenu() {
  if (!settingsMenu) {
    return;
  }
  settingsMenu.classList.toggle("hidden");
}

function hideWpsFileMenu() {
  if (wpsFileMenu) {
    wpsFileMenu.classList.add("hidden");
  }
  hideSettingsMenu();
}

function toggleWpsFileMenu() {
  if (!wpsFileMenu) {
    return;
  }
  wpsFileMenu.classList.toggle("hidden");
}

function hideWpsThemeSwitchButton() {
  if (wpsThemeSwitchMenu) {
    wpsThemeSwitchMenu.classList.add("hidden");
  }
  if (wpsWordThemeBtn) {
    wpsWordThemeBtn.setAttribute("aria-expanded", "false");
  }
}

function toggleWpsThemeSwitchButton() {
  if (!wpsThemeSwitchMenu) {
    return;
  }
  const isHidden = wpsThemeSwitchMenu.classList.toggle("hidden");
  if (wpsWordThemeBtn) {
    wpsWordThemeBtn.setAttribute("aria-expanded", isHidden ? "false" : "true");
  }
}

function setWpsCommentPaneVisible(visible) {
  if (!wpsMainWorkspace) {
    return;
  }
  const useVisible = Boolean(visible);
  wpsMainWorkspace.classList.toggle("comment-open", useVisible);
  if (wpsCommentBtn) {
    wpsCommentBtn.classList.toggle("active", useVisible);
    wpsCommentBtn.setAttribute("aria-pressed", useVisible ? "true" : "false");
  }
  if (wpsContextToggleBtn) {
    wpsContextToggleBtn.classList.toggle("active", useVisible);
    wpsContextToggleBtn.setAttribute("aria-pressed", useVisible ? "true" : "false");
  }
}

function normalizeEndpointCacheKey(endpointText) {
  const normalized = normalizeTargetInput(endpointText || "");
  if (normalized && normalized.endpoint) {
    return `endpoint:${normalized.endpoint.toLowerCase()}`;
  }
  const fallback = String(endpointText || "").trim().toLowerCase();
  return fallback ? `endpoint:${fallback}` : "";
}

function getManualReplacementCacheKeyBySession(session) {
  if (!session) {
    return "";
  }
  if (!session.peerEndpoint || session.peerEndpoint === "未连接") {
    return `session:${session.sessionId}`;
  }
  return normalizeEndpointCacheKey(session.peerEndpoint);
}

function persistDefaultFolderCache() {
  try {
    const folder = state.defaultReplacementFolder;
    if (!folder.name || !Array.isArray(folder.files) || !folder.files.length) {
      localStorage.removeItem(DEFAULT_FOLDER_CACHE_KEY);
      return;
    }
    const payload = {
      name: folder.name,
      files: folder.files.map((file) => ({
        rawName: file.rawName,
        lines: Array.isArray(file.lines) ? file.lines : [],
      })),
      savedAt: Date.now(),
    };
    localStorage.setItem(DEFAULT_FOLDER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures
  }
}

function restoreDefaultFolderCache() {
  try {
    const raw = localStorage.getItem(DEFAULT_FOLDER_CACHE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.files)) {
      return;
    }
    const files = parsed.files
      .filter((file) => file && typeof file.rawName === "string")
      .map((file) => ({
        rawName: file.rawName,
        nameLower: file.rawName.toLowerCase(),
        lines: Array.isArray(file.lines)
          ? file.lines.map((line) => String(line ?? ""))
          : [],
      }));
    state.defaultReplacementFolder.name = String(parsed.name || "");
    state.defaultReplacementFolder.handle = null;
    state.defaultReplacementFolder.files = files;
  } catch {
    // ignore parse failures
  }
}

function persistManualReplacementCache() {
  try {
    if (!state.manualReplacementByEndpoint.size) {
      localStorage.removeItem(MANUAL_REPLACEMENT_CACHE_KEY);
      return;
    }
    const payload = {
      savedAt: Date.now(),
      entries: Array.from(state.manualReplacementByEndpoint.entries()).map(
        ([cacheKey, value]) => ({
          cacheKey,
          pickedFileName: value.pickedFileName || "",
          fileName: value.fileName || getDefaultSessionFileName(),
          lines: Array.isArray(value.lines) ? value.lines : [],
        })
      ),
    };
    localStorage.setItem(MANUAL_REPLACEMENT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures
  }
}

function restoreManualReplacementCache() {
  try {
    const raw = localStorage.getItem(MANUAL_REPLACEMENT_CACHE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) {
      return;
    }
    state.manualReplacementByEndpoint.clear();
    for (const entry of parsed.entries) {
      if (!entry || typeof entry.cacheKey !== "string") {
        continue;
      }
      state.manualReplacementByEndpoint.set(entry.cacheKey, {
        pickedFileName: String(entry.pickedFileName || ""),
        fileName: normalizeFileName(entry.fileName || getDefaultSessionFileName()),
        lines: Array.isArray(entry.lines)
          ? entry.lines.map((line) => String(line ?? ""))
          : [],
      });
    }
  } catch {
    // ignore parse failures
  }
}

function hydrateManualReplacementForSelectedSession() {
  const session = getSelectedSession();
  if (!session) {
    return;
  }
  const cacheKey = getManualReplacementCacheKeyBySession(session);
  if (!cacheKey) {
    return;
  }
  const cached = state.manualReplacementByEndpoint.get(cacheKey);
  if (!cached || !Array.isArray(cached.lines) || !cached.lines.length) {
    return;
  }
  const replacement = getCurrentReplacementState(true);
  if (!replacement) {
    return;
  }
  replacement.fileName = normalizeFileName(cached.fileName || getDefaultSessionFileName());
  replacement.pickedFileName = cached.pickedFileName || replacement.fileName;
  replacement.exists = true;
  replacement.lines = [...cached.lines];
  replacement.loading = false;
}

function persistManualReplacementForSelectedSession() {
  const session = getSelectedSession();
  if (!session) {
    return;
  }
  const replacement = getCurrentReplacementState(false);
  if (!replacement || !replacement.exists || !Array.isArray(replacement.lines)) {
    return;
  }
  const cacheKey = getManualReplacementCacheKeyBySession(session);
  if (!cacheKey) {
    return;
  }
  state.manualReplacementByEndpoint.set(cacheKey, {
    pickedFileName: replacement.pickedFileName || replacement.fileName || "",
    fileName: replacement.fileName || getDefaultSessionFileName(),
    lines: [...replacement.lines],
  });
  persistManualReplacementCache();
}

function refreshConfigModal() {
  if (replacementLineLimitInput) {
    replacementLineLimitInput.value = String(
      normalizeReplacementLineLimit(state.replacementLineLimit)
    );
  }
  if (replacementLineLimitHint) {
    replacementLineLimitHint.textContent =
      `TXT 替换每行最多 ${normalizeReplacementLineLimit(
        state.replacementLineLimit
      )} 个字符；超出部分会在下一行继续替换。`;
  }
  const folder = state.defaultReplacementFolder;
  if (defaultFolderNameText) {
    defaultFolderNameText.textContent = folder.name
      ? `默认文件夹：${folder.name}`
      : "默认文件夹：未设置";
  }
  if (defaultFolderStatsText) {
    defaultFolderStatsText.textContent = `可用文件：${folder.files.length}`;
  }
}

function saveReplacementLineLimitFromConfig() {
  if (!replacementLineLimitInput) {
    return;
  }
  const nextLimit = normalizeReplacementLineLimit(replacementLineLimitInput.value);
  state.replacementLineLimit = nextLimit;
  persistReplacementLineLimit();
  refreshConfigModal();
  renderFileLines();
  updateReplacementStatus();
  setStatus(`替换每行最大字符数已更新为 ${nextLimit}`);
}

function showConfigModal() {
  hideSettingsMenu();
  refreshConfigModal();
  if (configModal) {
    configModal.classList.remove("hidden");
  }
}

function showExtensionModal() {
  hideSettingsMenu();
  if (extensionModal) {
    extensionModal.classList.remove("hidden");
  }
}

function refreshRelayModal() {
  if (relayUrlInput) {
    relayUrlInput.value = state.relayBaseUrl || "";
  }
  if (relayUsernameInput) {
    relayUsernameInput.value = state.relayUsername || "";
  }
}

function showRelayModal() {
  hideSettingsMenu();
  refreshRelayModal();
  if (relayModal) {
    relayModal.classList.remove("hidden");
  }
  if (relayUrlInput) {
    relayUrlInput.focus();
    relayUrlInput.select();
  }
}

function reconnectRelayWithCurrentBaseUrl(reasonText = "") {
  if (state.relaySource) {
    state.relaySource.close();
    state.relaySource = null;
  }
  state.relayReady = false;
  state.relayConnecting = false;
  updateConnectionUI(reasonText || "Relay 重新连接中");
  connectRelay();
}

function saveRelayConfigAndReconnect() {
  const inputValue = relayUrlInput ? relayUrlInput.value : "";
  const normalized = normalizeRelayBaseUrl(inputValue);
  if (!normalized) {
    setStatus("请填写有效的 Relay 地址（例如 127.0.0.1:9000）");
    return;
  }
  state.relayBaseUrl = normalized;
  persistRelayBaseUrl();
  hideRelayModal();
  setStatus(`Relay 地址已更新：${normalized}`);
  reconnectRelayWithCurrentBaseUrl("Relay 地址已更新，正在重连");
}

function resetRelayConfigAndReconnect() {
  state.relayBaseUrl = getRelayDefaultBaseUrl();
  try {
    localStorage.removeItem(RELAY_URL_CACHE_KEY);
  } catch {
    // ignore persistence failures
  }
  refreshRelayModal();
  hideRelayModal();
  setStatus(`Relay 地址已恢复默认：${state.relayBaseUrl}`);
  reconnectRelayWithCurrentBaseUrl("Relay 已恢复默认地址，正在重连");
}

function isDefaultFolderCandidateFile(name) {
  const lower = String(name || "").toLowerCase();
  return [".txt", ".log", ".md", ".json", ".csv", ".c"].some((ext) =>
    lower.endsWith(ext)
  );
}

async function loadDefaultReplacementFolderFromHandle(handle) {
  if (!handle || handle.kind !== "directory") {
    return 0;
  }
  const files = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== "file") {
      continue;
    }
    if (!isDefaultFolderCandidateFile(entry.name)) {
      continue;
    }
    const file = await entry.getFile();
    const text = await file.text();
    files.push({
      rawName: entry.name,
      nameLower: entry.name.toLowerCase(),
      lines: String(text).replace(/\r/g, "").split("\n"),
    });
  }
  files.sort((a, b) => a.rawName.localeCompare(b.rawName, "zh-CN"));
  state.defaultReplacementFolder.name = handle.name || "未命名目录";
  state.defaultReplacementFolder.handle = handle;
  state.defaultReplacementFolder.files = files;
  state.sessionAutoReplacementFile.clear();
  persistDefaultFolderCache();
  refreshConfigModal();
  return files.length;
}

async function chooseDefaultReplacementFolder() {
  if (typeof window.showDirectoryPicker !== "function") {
    setStatus("当前浏览器不支持目录选择，请使用 Chromium 内核浏览器");
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    const count = await loadDefaultReplacementFolderFromHandle(handle);
    renderFileLines();
    updateReplacementStatus();
    if (count > 0) {
      setStatus(`默认文件夹已设置：${handle.name}（${count} 个替换文件）`);
    } else {
      setStatus(`默认文件夹已设置：${handle.name}（未找到可用文本文件）`);
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
    setStatus(`选择默认文件夹失败：${error?.message || "unknown error"}`);
  }
}

function clearDefaultReplacementFolder() {
  state.defaultReplacementFolder.name = "";
  state.defaultReplacementFolder.handle = null;
  state.defaultReplacementFolder.files = [];
  state.sessionAutoReplacementFile.clear();
  persistDefaultFolderCache();
  refreshConfigModal();
  renderFileLines();
  updateReplacementStatus();
  setStatus("已清除默认文件夹配置");
}

function setPeerFieldVisible(visible) {
  if (!panelPeerField) {
    return;
  }
  panelPeerField.hidden = !visible;
}

function showPendingIncomingRequest(incoming) {
  if (!incoming) {
    hideRequestModal();
    return;
  }
  const fromLabel = incoming.fromUsername
    ? `@${incoming.fromUsername} (${incoming.fromEndpoint})`
    : incoming.fromEndpoint;
  requestFrom.textContent = fromLabel;
  requestFromPort.textContent = parsePortFromEndpoint(incoming.fromEndpoint);
  requestSession.textContent = incoming.sessionId;
  requestModal.classList.remove("hidden");
}

function processNextIncomingRequest() {
  if (state.pendingIncoming) {
    return;
  }
  if (!state.pendingIncomingQueue.length) {
    hideRequestModal();
    return;
  }
  const next = state.pendingIncomingQueue.shift();
  state.pendingIncoming = next;
  state.selectedSessionId = next.sessionId;
  const selected = getSelectedSession();
  if (selected && (!state.selectedFileName || !selected.files.has(state.selectedFileName))) {
    state.selectedFileName = getDefaultSessionFileName();
  }
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI("收到建联请求");
  showPendingIncomingRequest(next);
}

function switchActivityPanel(activityName) {
  const next = activityName || "explorer";
  state.activeActivity = next;
  hideSettingsMenu();

  for (const button of activityButtons) {
    const isActive = button.dataset.activity === next;
    button.classList.toggle("active", isActive);
  }

  for (const panel of activityPanels) {
    const isActive = panel.dataset.activityPanel === next;
    panel.classList.toggle("hidden-panel", !isActive);
  }

  if (newSessionBtn) {
    newSessionBtn.classList.toggle("hidden", next !== "explorer");
  }
  if (next !== "explorer") {
    setPeerFieldVisible(false);
  }
}

function getDefaultPort(protocol) {
  if (protocol === "https:") {
    return 443;
  }
  if (protocol === "http:") {
    return 80;
  }
  return null;
}

function getCurrentPortNumber() {
  if (window.location.port) {
    const parsed = Number.parseInt(window.location.port, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return getDefaultPort(window.location.protocol);
}

function formatEndpoint(hostname, port) {
  if (!hostname || !port) {
    return "";
  }
  const needsBracket = hostname.includes(":") && !hostname.startsWith("[");
  const hostPart = needsBracket ? `[${hostname}]` : hostname;
  return `${hostPart}:${port}`;
}

function getCurrentEndpoint() {
  const port = getCurrentPortNumber();
  if (!port) {
    return "unknown";
  }
  return formatEndpoint(window.location.hostname, port);
}

function normalizeRelayBaseUrl(raw) {
  const rawText = String(raw || "").trim();
  if (!rawText) {
    return "";
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawText)
    ? rawText
    : `http://${rawText}`;
  let relayUrl;
  try {
    relayUrl = new URL(withProtocol);
  } catch {
    return "";
  }
  if (relayUrl.protocol !== "http:" && relayUrl.protocol !== "https:") {
    return "";
  }
  const portText = relayUrl.port || String(getDefaultPort(relayUrl.protocol) || "");
  const port = Number.parseInt(portText, 10);
  if (!port || port < 1 || port > 65535) {
    return "";
  }
  const hostPart = relayUrl.hostname.includes(":")
    ? `[${relayUrl.hostname}]`
    : relayUrl.hostname;
  let pathPart = relayUrl.pathname || "";
  if (!pathPart || pathPart === "/") {
    pathPart = "";
  } else if (pathPart.endsWith("/")) {
    pathPart = pathPart.slice(0, -1);
  }
  return `${relayUrl.protocol}//${hostPart}:${port}${pathPart}`;
}

function getRelayDefaultBaseUrl() {
  return normalizeRelayBaseUrl(RELAY_DEFAULT) || RELAY_DEFAULT.replace(/\/$/, "");
}

function persistRelayBaseUrl() {
  try {
    if (!state.relayBaseUrl) {
      localStorage.removeItem(RELAY_URL_CACHE_KEY);
      return;
    }
    localStorage.setItem(RELAY_URL_CACHE_KEY, state.relayBaseUrl);
  } catch {
    // ignore persistence failures
  }
}

function restoreRelayBaseUrlFromCache() {
  try {
    const raw = localStorage.getItem(RELAY_URL_CACHE_KEY);
    return normalizeRelayBaseUrl(raw);
  } catch {
    return "";
  }
}

function resolveInitialRelayBaseUrl() {
  const fromQuery = normalizeRelayBaseUrl(urlParams.get("relay"));
  if (fromQuery) {
    return fromQuery;
  }
  const fromCache = restoreRelayBaseUrlFromCache();
  if (fromCache) {
    return fromCache;
  }
  return getRelayDefaultBaseUrl();
}

function normalizeTargetInput(raw) {
  const rawText = (raw || "").trim();
  if (!rawText) {
    return null;
  }
  let text = rawText.replace(/：/g, ":");
  if (/^\d{1,5}$/.test(text)) {
    text = `localhost:${text}`;
  } else if (/^:\d{1,5}$/.test(text)) {
    text = `localhost${text}`;
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
    ? text
    : `http://${text}`;
  let targetUrl;
  try {
    targetUrl = new URL(withProtocol);
  } catch {
    return null;
  }

  const portText = targetUrl.port || String(getDefaultPort(targetUrl.protocol) || "");
  const port = Number.parseInt(portText, 10);
  if (!port || port < 1 || port > 65535) {
    return null;
  }
  if (!targetUrl.pathname || targetUrl.pathname === "/") {
    targetUrl.pathname = "/index.html";
  }
  return {
    url: targetUrl.toString(),
    endpoint: formatEndpoint(targetUrl.hostname, port),
  };
}

function normalizeConnectTarget(raw) {
  const rawText = String(raw || "").trim();
  if (!rawText) {
    return null;
  }
  const usernameMaybe = normalizeRelayUsername(rawText);
  if (
    usernameMaybe &&
    !rawText.includes(":") &&
    !rawText.includes("/") &&
    !rawText.includes("?")
  ) {
    return {
      kind: "username",
      username: usernameMaybe,
      label: `@${usernameMaybe}`,
    };
  }
  if (rawText.startsWith("@")) {
    const usernameOnly = normalizeRelayUsername(rawText.slice(1));
    if (usernameOnly) {
      return {
        kind: "username",
        username: usernameOnly,
        label: `@${usernameOnly}`,
      };
    }
    return null;
  }
  const endpointTarget = normalizeTargetInput(rawText);
  if (!endpointTarget) {
    return null;
  }
  return {
    kind: "endpoint",
    endpoint: endpointTarget.endpoint,
    url: endpointTarget.url,
    label: endpointTarget.endpoint,
  };
}

function parseEndpoint(endpointText) {
  if (!endpointText) {
    return null;
  }
  const normalized = normalizeTargetInput(endpointText);
  if (!normalized) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(`http://${normalized.endpoint}`);
  } catch {
    return null;
  }
  const host = (parsed.hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  const port = Number.parseInt(parsed.port, 10);
  if (!host || Number.isNaN(port)) {
    return null;
  }
  return { host, port };
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isSameEndpoint(left, right) {
  const a = parseEndpoint(left);
  const b = parseEndpoint(right);
  if (!a || !b) {
    return false;
  }
  if (a.port !== b.port) {
    return false;
  }
  if (a.host === b.host) {
    return true;
  }
  if (isLoopbackHost(a.host) && isLoopbackHost(b.host)) {
    return true;
  }
  if (
    (a.host === "0.0.0.0" && isLoopbackHost(b.host)) ||
    (b.host === "0.0.0.0" && isLoopbackHost(a.host))
  ) {
    return true;
  }
  return false;
}

function parsePortFromEndpoint(endpoint) {
  const matched = /:(\d+)$/.exec(endpoint || "");
  return matched ? matched[1] : "未指定";
}

function normalizeFileName(raw) {
  const text = (raw || "").trim();
  if (!text) {
    return "conversation.log";
  }
  return text.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "conversation.log";
}

function isTxtFileName(fileName) {
  return String(fileName || "").trim().toLowerCase().endsWith(".txt");
}

function splitTextByCharLimit(raw, limit) {
  const text = String(raw ?? "");
  const chars = Array.from(text);
  if (!chars.length) {
    return [""];
  }
  const chunks = [];
  for (let offset = 0; offset < chars.length; offset += limit) {
    chunks.push(chars.slice(offset, offset + limit).join(""));
  }
  return chunks;
}

function buildReplacementDisplayLines(replacement) {
  if (!replacement || !Array.isArray(replacement.lines)) {
    return [];
  }
  if (!replacement.isTxt) {
    return replacement.lines.map((line) => String(line ?? ""));
  }
  const limit = normalizeReplacementLineLimit(state.replacementLineLimit);
  const wrapped = [];
  for (const rawLine of replacement.lines) {
    wrapped.push(...splitTextByCharLimit(rawLine, limit));
  }
  return wrapped;
}

function getDefaultSessionFileName() {
  return normalizeFileName(DEFAULT_SESSION_FILE);
}

function splitMessageLines(content) {
  const lines = String(content ?? "").replace(/\r/g, "").split("\n");
  return lines.length ? lines : [""];
}

function sessionDisplayName(session) {
  return `session-${session.sessionId.slice(-6)}.session`;
}

function ensureSession({
  sessionId,
  peerId,
  peerEndpoint,
  peerUsername = "",
  status = "active",
}) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      peerId: peerId || "",
      peerEndpoint: peerEndpoint || "unknown",
      peerUsername: peerUsername || "",
      status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: new Map(),
      fileOrder: [],
    };
    sessions.set(sessionId, session);
  } else {
    if (peerId) {
      session.peerId = peerId;
    }
    if (peerEndpoint) {
      session.peerEndpoint = peerEndpoint;
    }
    if (peerUsername) {
      session.peerUsername = peerUsername;
    }
    session.status = status || session.status;
    session.updatedAt = Date.now();
  }
  return session;
}

function ensureFile(session, fileName) {
  const normalized = normalizeFileName(fileName);
  if (!session.files.has(normalized)) {
    session.files.set(normalized, { fileName: normalized, lines: [] });
    session.fileOrder.push(normalized);
  }
  return session.files.get(normalized);
}

function appendFileContentInSession({
  sessionId,
  fileName,
  content,
  direction,
  endpoint,
  peerId,
}) {
  const session = ensureSession({
    sessionId,
    peerId,
    peerEndpoint: endpoint,
    status: "active",
  });
  const file = ensureFile(session, fileName);
  const timestamp = currentTime();
  for (const raw of splitMessageLines(content)) {
    file.lines.push({
      id: createId("line"),
      raw,
      direction,
      endpoint,
      time: timestamp,
    });
  }
  session.updatedAt = Date.now();
  if (!state.selectedSessionId) {
    state.selectedSessionId = sessionId;
  }
  if (state.selectedSessionId === sessionId) {
    state.selectedFileName = file.fileName;
  }
}

function isSessionPendingOutgoing(sessionId) {
  return Boolean(
    state.pendingOutgoing && state.pendingOutgoing.sessionId === sessionId
  );
}

function isSessionPendingIncoming(sessionId) {
  if (state.pendingIncoming && state.pendingIncoming.sessionId === sessionId) {
    return true;
  }
  return state.pendingIncomingQueue.some(
    (incoming) => incoming.sessionId === sessionId
  );
}

function getSessionListStatusLabel(session) {
  if (!session) {
    return "未选择";
  }
  if (isSessionPendingOutgoing(session.sessionId)) {
    return "发起建联中";
  }
  if (isSessionPendingIncoming(session.sessionId)) {
    return "待接受";
  }
  switch (session.status) {
    case "draft":
      return "草稿";
    case "pending":
      return "待连接";
    case "incoming":
      return "待处理";
    case "active":
      return "已连接";
    case "closed":
      return "已断开";
    case "failed":
      return "失败";
    case "timeout":
      return "超时";
    case "rejected":
      return "已拒绝";
    default:
      return session.status || "未知";
  }
}

function setSessionStatus(sessionId, status) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  session.status = status;
  session.updatedAt = Date.now();
}

function getSelectedSession() {
  return state.selectedSessionId ? sessions.get(state.selectedSessionId) || null : null;
}

function getConnectedSession() {
  const selected = getSelectedSession();
  if (!selected || selected.status !== "active") {
    return null;
  }
  return selected;
}

function createReplacementState() {
  return {
    fileName: "",
    exists: false,
    lines: null,
    loading: false,
    requestId: 0,
    pickedFileName: "",
  };
}

function getReplacementStateBySession(sessionId, createIfMissing = true) {
  if (!sessionId) {
    return null;
  }
  let replacement = state.replacementBySession.get(sessionId);
  if (!replacement && createIfMissing) {
    replacement = createReplacementState();
    state.replacementBySession.set(sessionId, replacement);
  }
  return replacement || null;
}

function getCurrentReplacementState(createIfMissing = true) {
  return getReplacementStateBySession(state.selectedSessionId, createIfMissing);
}

function resolveDefaultFolderFileForSession(sessionId) {
  if (!sessionId) {
    return null;
  }
  const files = state.defaultReplacementFolder.files;
  if (!Array.isArray(files) || !files.length) {
    return null;
  }

  const assignedName = state.sessionAutoReplacementFile.get(sessionId);
  if (assignedName) {
    const assignedFile = files.find((file) => file.rawName === assignedName);
    if (assignedFile) {
      return assignedFile;
    }
  }

  const session = sessions.get(sessionId);
  const sessionSuffix = sessionId.slice(-6).toLowerCase();
  let matched = files.find((file) => file.nameLower.includes(sessionSuffix));

  if (!matched && session) {
    const endpointPort = parsePortFromEndpoint(session.peerEndpoint);
    if (endpointPort && endpointPort !== "未指定") {
      matched = files.find((file) =>
        file.nameLower.includes(String(endpointPort).toLowerCase())
      );
    }
  }

  if (!matched) {
    const used = new Set(state.sessionAutoReplacementFile.values());
    matched =
      files.find((file) => !used.has(file.rawName)) ||
      files[state.sessionAutoReplacementFile.size % files.length];
  }

  if (matched) {
    state.sessionAutoReplacementFile.set(sessionId, matched.rawName);
  }
  return matched || null;
}

function getManualReplacementForCurrentSession() {
  const replacement = getCurrentReplacementState(false);
  if (!replacement) {
    return null;
  }
  if (!replacement.pickedFileName) {
    return null;
  }
  if (
    replacement.exists &&
    replacement.fileName === state.selectedFileName &&
    Array.isArray(replacement.lines)
  ) {
    const sourceName = replacement.pickedFileName || replacement.fileName || "-";
    return {
      type: "manual",
      sourceText: sourceName,
      lines: replacement.lines,
      isTxt: isTxtFileName(sourceName),
    };
  }
  return null;
}

function getAutoFolderReplacementForCurrentSession() {
  const session = getSelectedSession();
  if (!session) {
    return null;
  }
  const matched = resolveDefaultFolderFileForSession(session.sessionId);
  if (!matched || !Array.isArray(matched.lines)) {
    return null;
  }
  const sourceName = matched.rawName || "";
  return {
    type: "default-folder",
    sourceText: `${state.defaultReplacementFolder.name}/${matched.rawName}`,
    lines: matched.lines,
    isTxt: isTxtFileName(sourceName),
  };
}

function getEffectiveReplacementForCurrentSession() {
  return (
    getManualReplacementForCurrentSession() ||
    getAutoFolderReplacementForCurrentSession()
  );
}

function getReplacementLine(index, fallbackRaw) {
  if (!REPLACEMENT_ENABLED) {
    return fallbackRaw;
  }
  const replacement = getEffectiveReplacementForCurrentSession();
  const displayLines = buildReplacementDisplayLines(replacement);
  if (index < displayLines.length) {
    return displayLines[index] ?? "";
  }
  return fallbackRaw;
}

function updateReplacementStatus(options = {}) {
  const hoverIndex =
    typeof options.hoverIndex === "number" && options.hoverIndex >= 0
      ? options.hoverIndex
      : null;
  const hoverLineText =
    typeof options.hoverLineText === "string" ? options.hoverLineText : "";

  const session = getSelectedSession();
  const file = session && state.selectedFileName
    ? session.files.get(state.selectedFileName)
    : null;
  const fileLineCount = file && Array.isArray(file.lines) ? file.lines.length : 0;

  const replacement = getEffectiveReplacementForCurrentSession();
  if (!REPLACEMENT_ENABLED) {
    if (replacementFileNameText) {
      replacementFileNameText.textContent = `文件名：${state.selectedFileName || "-"}`;
    }
    if (replacementSourceText) {
      replacementSourceText.textContent = "读取来源：已关闭";
    }
    if (replacementHitText) {
      replacementHitText.textContent = `命中行数：0/${fileLineCount}`;
    }
    if (replacementCurrentLineText) {
      replacementCurrentLineText.textContent = "当前读取行：-（替换已关闭，直接原文）";
    }
    return;
  }
  const replacementDisplayLines = buildReplacementDisplayLines(replacement);
  const replacementActive = replacementDisplayLines.length > 0;
  const replacementLines = replacementDisplayLines.length;
  const hitCount = Math.min(fileLineCount, replacementLines);

  if (replacementFileNameText) {
    replacementFileNameText.textContent = `文件名：${state.selectedFileName || "-"}`;
  }
  if (replacementSourceText) {
    const sourceText = replacement ? replacement.sourceText : "-";
    replacementSourceText.textContent = replacement
      ? `读取来源：${sourceText}${replacement.type === "manual" ? "（手动）" : "（默认文件夹）"}`
      : state.defaultReplacementFolder.files.length
        ? `读取来源：默认文件夹 ${state.defaultReplacementFolder.name}（未匹配）`
        : "读取来源：-";
  }
  if (replacementHitText) {
    replacementHitText.textContent = `命中行数：${hitCount}/${fileLineCount}`;
  }
  if (replacementCurrentLineText) {
    if (hoverIndex === null) {
      replacementCurrentLineText.textContent = replacementActive
        ? "当前读取行：-（悬浮行查看）"
        : "当前读取行：-（未启用替换）";
    } else {
      replacementCurrentLineText.textContent = `当前读取行：L${hoverIndex + 1} ${hoverLineText || "<EMPTY>"}`;
    }
  }
}

function getDesiredReplacementFileName() {
  return getDefaultSessionFileName();
}

async function loadReplacementFileForSelected(options = {}) {
  const notify = Boolean(options.notify);
  const replacement = getCurrentReplacementState(true);
  if (!replacement) {
    return;
  }
  if (!REPLACEMENT_ENABLED) {
    replacement.exists = false;
    replacement.lines = null;
    replacement.loading = false;
    replacement.fileName = "";
    replacement.pickedFileName = "";
    if (notify) {
      setStatus("替换已关闭，当前直接显示原文");
    }
    return;
  }
  const fileName = getDesiredReplacementFileName();
  if (!fileName) {
    return;
  }
  state.selectedFileName = fileName;
  replacement.fileName = fileName;
  replacement.loading = false;

  if (replacement.pickedFileName && replacement.exists && Array.isArray(replacement.lines)) {
    if (notify) {
      setStatus(`当前会话使用手动替换文件：${replacement.pickedFileName}`);
    }
    return;
  }

  replacement.exists = false;
  replacement.lines = null;
  if (notify) {
    if (state.defaultReplacementFolder.files.length) {
      setStatus("当前会话使用默认文件夹自动替换（如有匹配）");
    } else {
      setStatus("未指定手动替换文件，且未配置默认文件夹");
    }
  }
}

async function loadReplacementFromPickedFile() {
  const replacement = getCurrentReplacementState(true);
  if (!replacement) {
    setStatus("请先选择会话，再为该会话读取替换文件");
    return;
  }
  if (!REPLACEMENT_ENABLED) {
    setStatus("替换已关闭，当前直接显示原文");
    return;
  }
  const applyFileName = getDesiredReplacementFileName();
  let pickedFile = null;

  if (typeof window.showOpenFilePicker === "function") {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Text Files",
            accept: {
              "text/plain": [".txt", ".log", ".md", ".json", ".csv", ".c"],
              "application/json": [".json"],
              "text/x-c": [".c"],
              "text/*": [".txt", ".log", ".md", ".c"],
            },
          },
        ],
      });
      if (handles && handles[0]) {
        pickedFile = await handles[0].getFile();
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      setStatus(`打开文件失败：${error?.message || "unknown error"}`);
      return;
    }
  } else {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.log,.md,.json,.csv,.c,text/plain,text/x-c,application/json,text/*";
    pickedFile = await new Promise((resolve) => {
      input.addEventListener(
        "change",
        () => {
          resolve(input.files && input.files[0] ? input.files[0] : null);
        },
        { once: true }
      );
      input.click();
    });
    if (!pickedFile) {
      return;
    }
  }

  if (!pickedFile) {
    return;
  }

  const sourceFileName = normalizeFileName(pickedFile.name || applyFileName);
  replacement.requestId += 1;
  replacement.loading = false;
  state.selectedFileName = applyFileName;
  replacement.fileName = applyFileName;
  replacement.pickedFileName = sourceFileName;
  if (targetFileInput) {
    targetFileInput.value = applyFileName;
  }

  try {
    const text = await pickedFile.text();
    replacement.exists = true;
    replacement.lines = String(text).replace(/\r/g, "").split("\n");
    persistManualReplacementForSelectedSession();
    renderFileSelect();
    renderFileLines();
    setStatus(`已读取替换文件：${sourceFileName} -> 替换 ${applyFileName}（${replacement.lines.length} 行）`);
  } catch (error) {
    replacement.exists = false;
    replacement.lines = null;
    renderFileLines();
    setStatus(`读取文件失败：${error?.message || "unknown error"}`);
  }
}

function deleteSessionById(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  const shouldDelete = window.confirm(
    `确认删除会话 ${sessionDisplayName(session)} 吗？`
  );
  if (!shouldDelete) {
    return;
  }

  const isSelfLoop =
    (session.peerId === localPeerId &&
      isSameEndpoint(session.peerEndpoint, localEndpoint)) ||
    (session.peerUsername &&
      toRelayUsernameKey(session.peerUsername) === toRelayUsernameKey(state.relayUsername));
  if (session.status === "active" && !isSelfLoop) {
    const packet = buildPacket("disconnect", {
      sessionId: session.sessionId,
      toEndpoint:
        session.peerEndpoint && !String(session.peerEndpoint).startsWith("@")
          ? session.peerEndpoint
          : undefined,
      toPeerId: session.peerId || undefined,
      toUsername: session.peerUsername || undefined,
      reason: "session-deleted",
    });
    postRelayPacket(packet, { requireDelivery: true }).catch(() => {});
  }

  if (state.pendingOutgoing && state.pendingOutgoing.sessionId === sessionId) {
    clearPendingOutgoing();
  }
  if (state.pendingIncoming && state.pendingIncoming.sessionId === sessionId) {
    state.pendingIncoming = null;
  }
  state.pendingIncomingQueue = state.pendingIncomingQueue.filter(
    (incoming) => incoming.sessionId !== sessionId
  );

  sessions.delete(sessionId);
  state.replacementBySession.delete(sessionId);
  state.sessionAutoReplacementFile.delete(sessionId);
  hidePreview();

  if (state.selectedSessionId === sessionId) {
    const next = Array.from(sessions.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    )[0];
    if (next) {
      state.selectedSessionId = next.sessionId;
      state.selectedFileName = getDefaultSessionFileName();
    } else {
      state.selectedSessionId = null;
      state.selectedFileName = "";
    }
  }

  renderSessionList();
  renderFileSelect();
  renderFileLines();
  processNextIncomingRequest();
  updateConnectionUI();
  setStatus(`已删除会话：${sessionDisplayName(session)}`);
}

function renderSessionList() {
  sessionList.innerHTML = "";
  const isWpsSessionStrip =
    isWpsWordPage() || document.body.classList.contains("theme-wps-word");
  const sessionArray = Array.from(sessions.values()).sort((a, b) => {
    if (isWpsSessionStrip) {
      return a.createdAt - b.createdAt;
    }
    return b.updatedAt - a.updatedAt;
  });

  if (!sessionArray.length) {
    if (!isWpsSessionStrip) {
      const empty = document.createElement("li");
      empty.className = "session-item";
      empty.innerHTML = `<div class="session-meta">暂无会话文件</div>`;
      sessionList.appendChild(empty);
    }
    updateCount();
    return;
  }

  for (const session of sessionArray) {
    const item = document.createElement("li");
    item.className = "session-item";
    if (session.sessionId === state.selectedSessionId) {
      item.classList.add("active");
    }

    const name = document.createElement("div");
    name.className = "session-name";
    name.textContent = sessionDisplayName(session);

    const row = document.createElement("div");
    row.className = "session-row";
    row.appendChild(name);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "session-delete-btn";
    deleteBtn.textContent = isWpsSessionStrip ? "×" : "删除";
    deleteBtn.title = `删除 ${sessionDisplayName(session)}`;
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSessionById(session.sessionId);
    });
    row.appendChild(deleteBtn);

    item.appendChild(row);
    if (!isWpsSessionStrip) {
      const meta = document.createElement("div");
      meta.className = "session-meta";
      meta.textContent = `${getSessionListStatusLabel(session)} · 文件${session.fileOrder.length}`;
      item.appendChild(meta);
    }
    item.addEventListener("click", () => {
      setPeerFieldVisible(false);
      state.selectedSessionId = session.sessionId;
      state.selectedFileName = getDefaultSessionFileName();
      renderSessionList();
      renderFileSelect();
      renderFileLines();
      updateConnectionUI();
    });
    sessionList.appendChild(item);
  }

  updateCount();
}

function syncRemotePeerInputWithSelectedSession() {
  const session = getSelectedSession();
  if (!session || !remotePeerInput) {
    return;
  }
  const endpoint = (session.peerEndpoint || "").trim();
  if (!endpoint || endpoint === "未连接" || endpoint === "unknown") {
    return;
  }
  if (isSameEndpoint(endpoint, localEndpoint)) {
    return;
  }
  remotePeerInput.value = endpoint;
}

function renderFileSelect() {
  const defaultFileName = getDefaultSessionFileName();
  if (fileSelect) {
    fileSelect.innerHTML = "";
  }
  const session = getSelectedSession();
  if (!session) {
    if (fileSelect) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "暂无文件";
      fileSelect.appendChild(option);
      fileSelect.disabled = true;
    }
    currentSessionText.textContent = "未选择会话";
    currentFileLabel.textContent = defaultFileName;
    if (targetFileInput) {
      targetFileInput.value = defaultFileName;
    }
    return;
  }

  state.selectedFileName = defaultFileName;
  ensureFile(session, state.selectedFileName);

  if (fileSelect) {
    const option = document.createElement("option");
    option.value = state.selectedFileName;
    option.textContent = state.selectedFileName;
    fileSelect.appendChild(option);
    fileSelect.disabled = true;
    fileSelect.value = state.selectedFileName;
  }
  currentSessionText.textContent = `${sessionDisplayName(session)} · ${session.peerEndpoint}`;
  currentFileLabel.textContent = state.selectedFileName || defaultFileName;
  if (targetFileInput) {
    targetFileInput.value = state.selectedFileName || defaultFileName;
  }
  syncRemotePeerInputWithSelectedSession();
  hydrateManualReplacementForSelectedSession();
  loadReplacementFileForSelected();
}

function canEditSelectedSession() {
  const session = getSelectedSession();
  const connected = getConnectedSession();
  return Boolean(connected && session && connected.sessionId === session.sessionId);
}

function focusContentEditableToEnd(element) {
  if (!element) {
    return;
  }
  element.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function appendDraftLine() {
  const draftItem = document.createElement("li");
  draftItem.className = "file-line-item draft-item";

  const lineNo = document.createElement("span");
  lineNo.className = "line-no draft-no";
  lineNo.textContent = "NEW";

  const lineContent = document.createElement("span");
  lineContent.className = "line-content draft-line";
  lineContent.spellcheck = false;

  if (!canEditSelectedSession()) {
    lineContent.textContent = "（连接后可在此行输入，按 Enter 发送）";
    lineContent.setAttribute("contenteditable", "false");
  } else {
    lineContent.setAttribute("contenteditable", "true");
    lineContent.setAttribute("data-placeholder", "在这一行输入，按 Enter 发送");
    lineContent.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const content = lineContent.textContent || "";
        sendFromRowInput(content, () => {
          lineContent.textContent = "";
        });
      }
    });
  }

  draftItem.appendChild(lineNo);
  draftItem.appendChild(lineContent);
  fileLineList.appendChild(draftItem);

  if (canEditSelectedSession()) {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      const busyElsewhere =
        active === remotePeerInput ||
        active === targetFileInput ||
        active === fileSelect;
      if (!busyElsewhere) {
        focusContentEditableToEnd(lineContent);
      }
    });
  }
}

function renderFileLines() {
  fileLineList.innerHTML = "";
  const replacement = getEffectiveReplacementForCurrentSession();
  const replacementDisplayLines = buildReplacementDisplayLines(replacement);
  const wpsReplacementActive = Boolean(
    REPLACEMENT_ENABLED &&
    replacementDisplayLines.length &&
    document.body.classList.contains("theme-wps-word")
  );
  fileLineList.classList.toggle("wps-replacement-active", wpsReplacementActive);

  const session = getSelectedSession();
  if (!session) {
    const empty = document.createElement("li");
    empty.className = "file-line-item";
    empty.innerHTML = `<span class="line-no">--</span><span class="line-content">暂无会话内容</span>`;
    fileLineList.appendChild(empty);
    updateReplacementStatus();
    return;
  }

  const file = session.files.get(state.selectedFileName);
  if (!file || !file.lines.length) {
    const empty = document.createElement("li");
    empty.className = "file-line-item";
    empty.innerHTML = `<span class="line-no">--</span><span class="line-content">该文件暂无内容（在下方 NEW 行输入，Enter 发送）</span>`;
    fileLineList.appendChild(empty);
    updateReplacementStatus();
  } else {
    file.lines.forEach((line, index) => {
      const item = document.createElement("li");
      item.className = "file-line-item";

      const lineNo = document.createElement("span");
      lineNo.className = "line-no";
      lineNo.textContent = String(index + 1).padStart(4, "0");

      const lineContent = document.createElement("span");
      lineContent.className = "line-content";

      const isSend = line.direction === "send";
      const originalRaw = line.raw ?? "";
      const hasReplacementLine = index < replacementDisplayLines.length;
      const replacedRaw = hasReplacementLine
        ? String(replacementDisplayLines[index] ?? "")
        : originalRaw;
      const displayText = replacedRaw === "" ? "<EMPTY>" : replacedRaw;
      const hoverText = `${isSend ? "W" : "R"} ${originalRaw === "" ? "<EMPTY>" : originalRaw}`;
      lineContent.textContent = displayText;

      item.appendChild(lineNo);
      item.appendChild(lineContent);
      item.addEventListener("mouseenter", () => {
        lineContent.textContent = hoverText;
        lineContent.classList.add(isSend ? "hover-send" : "hover-receive");
        updateReplacementStatus({ hoverIndex: index, hoverLineText: replacedRaw });
        showPreview({
          title: `${file.fileName}（原始内容）`,
          rawContent: `${line.time}\n${line.endpoint}\n\n${originalRaw || "<EMPTY>"}`,
          isSend,
        });
      });
      item.addEventListener("mouseleave", () => {
        lineContent.textContent = displayText;
        lineContent.classList.remove("hover-send", "hover-receive");
        updateReplacementStatus();
        hidePreview();
      });
      fileLineList.appendChild(item);
    });
    updateReplacementStatus();
  }

  appendDraftLine();
}

function getSessionStatusDescription(session) {
  if (!session) {
    return "未选择会话";
  }
  if (isSessionPendingOutgoing(session.sessionId)) {
    return `发起建联中，等待 ${session.peerEndpoint} 响应`;
  }
  if (isSessionPendingIncoming(session.sessionId)) {
    return `收到建联请求（${session.peerEndpoint}）`;
  }

  switch (session.status) {
    case "draft":
      return "草稿会话（待建立连接）";
    case "pending":
      return `待连接（${session.peerEndpoint}）`;
    case "incoming":
      return `待处理请求（${session.peerEndpoint}）`;
    case "active":
      return `已连接 ${session.peerEndpoint}`;
    case "closed":
      return "已断开";
    case "failed":
      return "建联失败";
    case "timeout":
      return "建联超时";
    case "rejected":
      return "对端拒绝";
    default:
      return `${session.status}（${session.peerEndpoint || "未知对端"}）`;
  }
}

function updateConnectionUI(reasonText = "") {
  const selected = getSelectedSession();
  const isSelectedConnected = Boolean(selected && selected.status === "active");
  const isPending = Boolean(state.pendingOutgoing);
  const activeCount = countActiveSessions();

  connectBtn.disabled = isPending;
  disconnectBtn.disabled = !isSelectedConnected;
  remotePeerInput.disabled = isPending;
  if (selfConnectBtn) {
    selfConnectBtn.disabled = isPending;
  }
  if (quickPortConnectBtn) {
    quickPortConnectBtn.disabled = isPending;
  }
  if (reloadReplaceBtn) {
    reloadReplaceBtn.disabled = !state.selectedFileName || !REPLACEMENT_ENABLED;
  }

  relayText.textContent = state.relayReady
    ? `Relay 状态：已连接（${state.relayBaseUrl}）`
    : `Relay 状态：未连接（${state.relayBaseUrl}）`;

  relayText.textContent = state.relayReady
    ? `Relay 状态：已连接（${state.relayBaseUrl} / @${state.relayUsername}）`
    : `Relay 状态：未连接（${state.relayBaseUrl} / @${state.relayUsername}）`;

  if (selected) {
    const statusTextValue = getSessionStatusDescription(selected);
    connectionText.textContent = `连接状态：${statusTextValue}`;
    activeSessionInfo.textContent = `当前会话：${sessionDisplayName(selected)} · ${selected.status} · 活跃连接 ${activeCount}`;
  } else if (!state.relayReady) {
    connectionText.textContent = "连接状态：等待 Relay 连接";
    activeSessionInfo.textContent = `当前会话：无 · 活跃连接 ${activeCount}`;
  } else if (isPending) {
    connectionText.textContent = `连接状态：请求中，等待 ${state.pendingOutgoing.targetLabel || state.pendingOutgoing.targetEndpoint} 响应`;
    activeSessionInfo.textContent = `当前会话：待确认（${state.pendingOutgoing.sessionId.slice(-6)}）`;
  } else {
    connectionText.textContent = reasonText ? `连接状态：${reasonText}` : "连接状态：未连接";
    activeSessionInfo.textContent = `当前会话：无 · 活跃连接 ${activeCount}`;
  }
}

function buildPacket(type, payload = {}) {
  return {
    source: PROTOCOL_SOURCE,
    type,
    messageId: createId("msg"),
    fromPeerId: localPeerId,
    fromUsername: state.relayUsername,
    fromEndpoint: localEndpoint,
    sentAt: Date.now(),
    ...payload,
  };
}

async function postRelayPacket(packet, options = {}) {
  const requireDelivery = Boolean(options.requireDelivery);
  const relayBaseUrl = normalizeRelayBaseUrl(state.relayBaseUrl) || getRelayDefaultBaseUrl();
  state.relayBaseUrl = relayBaseUrl;
  const response = await fetch(`${relayBaseUrl}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(packet),
  });
  if (!response.ok) {
    let details = "";
    try {
      const errorJson = await response.json();
      details = errorJson?.error ? ` (${errorJson.error})` : "";
    } catch {
      details = "";
    }
    throw new Error(`relay send failed: ${response.status}${details}`);
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (requireDelivery && (!data || !data.delivered)) {
    const routeText = data?.route ? ` via ${data.route}` : "";
    throw new Error(`relay delivered 0${routeText}`);
  }
  return data;
}

function clearPendingOutgoing() {
  if (!state.pendingOutgoing) {
    return;
  }
  if (state.pendingOutgoing.timeoutTimer) {
    clearTimeout(state.pendingOutgoing.timeoutTimer);
  }
  state.pendingOutgoing = null;
}

function isPacketForLocal(packet) {
  if (packet.toPeerId && packet.toPeerId === localPeerId) {
    return true;
  }
  if (
    packet.toUsername &&
    toRelayUsernameKey(packet.toUsername) === toRelayUsernameKey(state.relayUsername)
  ) {
    return true;
  }
  if (packet.toEndpoint && isSameEndpoint(packet.toEndpoint, localEndpoint)) {
    return true;
  }
  return false;
}

function connectRelay() {
  if (state.relayConnecting && state.relaySource) {
    return;
  }
  if (state.relaySource) {
    state.relaySource.close();
    state.relaySource = null;
  }
  const relayBaseUrl = normalizeRelayBaseUrl(state.relayBaseUrl) || getRelayDefaultBaseUrl();
  state.relayBaseUrl = relayBaseUrl;
  state.relayUsername =
    normalizeRelayUsername(state.relayUsername) ||
    normalizeRelayUsername(getDefaultRelayUsername()) ||
    "user_default";
  persistRelayUsername();
  renderLocalIdentityTag();
  refreshHelpModal();

  const registerUrl =
    `${relayBaseUrl}/register?endpoint=${encodeURIComponent(localEndpoint)}` +
    `&peerId=${encodeURIComponent(localPeerId)}` +
    `&username=${encodeURIComponent(state.relayUsername)}`;
  const source = new EventSource(registerUrl);
  state.relaySource = source;
  state.relayConnecting = true;

  source.onopen = () => {
    if (state.relaySource !== source) {
      return;
    }
    state.relayReady = true;
    state.relayConnecting = false;
    updateConnectionUI();
    setStatus(`已连接 Relay：${relayBaseUrl}（@${state.relayUsername}）`);
  };

  source.onerror = () => {
    if (state.relaySource !== source) {
      return;
    }
    state.relayReady = false;
    state.relayConnecting = false;
    updateConnectionUI("Relay 断开");
    setStatus(`Relay 连接异常：${relayBaseUrl}（@${state.relayUsername}）`);
  };

  source.onmessage = (event) => {
    if (state.relaySource !== source) {
      return;
    }
    if (!event.data) {
      return;
    }
    let packet;
    try {
      packet = JSON.parse(event.data);
    } catch {
      return;
    }
    routeIncomingPacket(packet);
  };
}

function openTargetPageOnly() {
  const target = normalizeTargetInput(remotePeerInput.value);
  if (!target) {
    setStatus("请先填写有效的对端地址（URL / IP:端口）");
    return;
  }
  remotePeerInput.value = target.endpoint;
  const opened = window.open(target.url, "_blank");
  if (!opened) {
    setStatus("打开对端页面失败：请允许浏览器弹窗");
    return;
  }
  setStatus(`已打开对端页面：${target.url}`);
}

function togglePeerPanelFromPlus() {
  switchActivityPanel("explorer");
  const shouldShow = !panelPeerField || panelPeerField.hidden;
  setPeerFieldVisible(shouldShow);

  if (shouldShow && remotePeerInput) {
    remotePeerInput.focus();
    remotePeerInput.select();
  }
}

function handleGlobalPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (panelPeerField && !panelPeerField.hidden) {
    const inPeerPanel =
      panelPeerField.contains(target) ||
      (newSessionBtn && newSessionBtn.contains(target));
    if (!inPeerPanel) {
      setPeerFieldVisible(false);
    }
  }

  if (settingsMenu && !settingsMenu.classList.contains("hidden")) {
    const inSettingsMenu =
      settingsMenu.contains(target) ||
      (configBtn && configBtn.contains(target));
    if (!inSettingsMenu) {
      hideSettingsMenu();
    }
  }

  if (wpsFileMenu && !wpsFileMenu.classList.contains("hidden")) {
    const inWpsFileMenu =
      wpsFileMenu.contains(target) ||
      (wpsFileMenuBtn && wpsFileMenuBtn.contains(target));
    if (!inWpsFileMenu) {
      hideWpsFileMenu();
    }
  }

  if (wpsThemeSwitchMenu && !wpsThemeSwitchMenu.classList.contains("hidden")) {
    const inThemeSwitch =
      wpsThemeSwitchMenu.contains(target) ||
      (wpsWordThemeBtn && wpsWordThemeBtn.contains(target));
    if (!inThemeSwitch) {
      hideWpsThemeSwitchButton();
    }
  }
}

function handleGlobalKeyDown(event) {
  if (event.key === "Escape") {
    setPeerFieldVisible(false);
    hideWpsFileMenu();
    hideWpsThemeSwitchButton();
    hideSettingsMenu();
    hideConfigModal();
    hideExtensionModal();
    hideRelayModal();
    hideHelpModal();
  }
}

async function requestConnection() {
  if (!state.relayReady) {
    connectRelay();
    updateConnectionUI("Relay 未连接，正在重连");
    setStatus(`Relay 未连接，正在重连：${state.relayBaseUrl}`);
    return;
  }
  if (state.pendingOutgoing) {
    updateConnectionUI("当前已有建联请求，请等待响应后重试");
    return;
  }

  const target = normalizeConnectTarget(remotePeerInput.value);
  if (!target) {
    updateConnectionUI("请填写有效的对端地址（URL / IP:端口）");
    return;
  }
  remotePeerInput.value = target.label;

  if (
    target.kind === "username" &&
    toRelayUsernameKey(target.username) === toRelayUsernameKey(state.relayUsername)
  ) {
    updateConnectionUI("本页自连请点“本页自连”");
    return;
  }

  if (target.kind === "endpoint" && isSameEndpoint(target.endpoint, localEndpoint)) {
    updateConnectionUI("本页自连请点“本页自连”");
    return;
  }
  setPeerFieldVisible(false);

  const requestId = createId("req");
  let sessionId = createId("session");
  let session = null;
  const targetEndpoint = target.kind === "endpoint" ? target.endpoint : target.label;
  const targetUsername = target.kind === "username" ? target.username : "";
  const resolvedTarget =
    target.kind === "username"
      ? await resolveRelayUsernameTarget(target.username).catch(() => null)
      : null;
  const routePeerId = resolvedTarget?.peerId || "";
  const routeEndpoint =
    target.kind === "endpoint"
      ? target.endpoint
      : resolvedTarget?.endpoint || undefined;
  const selected = getSelectedSession();
  if (selected && selected.status === "draft") {
    selected.peerEndpoint = targetEndpoint;
    selected.peerUsername = targetUsername;
    selected.status = "pending";
    selected.updatedAt = Date.now();
    session = selected;
    sessionId = selected.sessionId;
  } else {
    session = ensureSession({
      sessionId,
      peerId: "",
      peerEndpoint: targetEndpoint,
      peerUsername: targetUsername,
      status: "pending",
    });
  }

  state.pendingOutgoing = {
    requestId,
    sessionId,
    targetType: target.kind,
    targetEndpoint: targetEndpoint,
    targetUsername: targetUsername,
    targetLabel: target.label,
    timeoutTimer: null,
  };
  state.selectedSessionId = session.sessionId;
  state.selectedFileName = getDefaultSessionFileName();
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI();

  const packet = buildPacket("connect-request", {
    requestId,
    sessionId,
    toEndpoint: target.kind === "endpoint" ? target.endpoint : undefined,
    toUsername: target.kind === "username" ? target.username : undefined,
  });

  postRelayPacket(packet, { requireDelivery: true })
    .then(() => {
      setStatus(`已发起建联请求 -> ${target.label}`);
    })
    .catch((error) => {
      clearPendingOutgoing();
      setSessionStatus(sessionId, "failed");
      renderSessionList();
      updateConnectionUI("建联请求发送失败");
      setStatus(`建联失败：${error.message}`);
    });

  state.pendingOutgoing.timeoutTimer = setTimeout(() => {
    if (!state.pendingOutgoing || state.pendingOutgoing.requestId !== requestId) {
      return;
    }
    clearPendingOutgoing();
    setSessionStatus(sessionId, "timeout");
    renderSessionList();
    updateConnectionUI("建联超时，请重试");
    setStatus(`建联超时：${target.label} 未响应`);
  }, REQUEST_TIMEOUT_MS);
}

function startSelfConnect() {
  if (state.pendingOutgoing) {
    return;
  }
  setPeerFieldVisible(false);
  const fileName = getDefaultSessionFileName();
  const selected = getSelectedSession();
  const session =
    selected && selected.status === "draft"
      ? ensureSession({
          sessionId: selected.sessionId,
          peerId: localPeerId,
          peerEndpoint: localEndpoint,
          status: "active",
        })
      : ensureSession({
          sessionId: createId("self-session"),
          peerId: localPeerId,
          peerEndpoint: localEndpoint,
          status: "active",
        });

  ensureFile(session, fileName);
  state.selectedSessionId = session.sessionId;
  state.selectedFileName = fileName;
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI();
  setStatus(`本页自连成功：${sessionDisplayName(session)}`);
}

function quickConnectByPort() {
  if (state.pendingOutgoing) {
    return;
  }
  setPeerFieldVisible(false);
  const portText = debugPortInput ? debugPortInput.value.trim() : "";
  const targetPort = Number.parseInt(portText, 10);
  if (!targetPort || targetPort < 1 || targetPort > 65535) {
    updateConnectionUI("端口无效，请输入 1~65535");
    return;
  }
  remotePeerInput.value = `${window.location.hostname}:${targetPort}`;
  requestConnection();
}

function acceptIncomingRequest() {
  if (!state.pendingIncoming) {
    return;
  }
  const incoming = state.pendingIncoming;
  const packet = buildPacket("connect-response", {
    requestId: incoming.requestId,
    sessionId: incoming.sessionId,
    toEndpoint: incoming.fromEndpoint,
    toPeerId: incoming.fromPeerId,
    toUsername: incoming.fromUsername || undefined,
    accepted: true,
    reason: "accepted",
  });

  postRelayPacket(packet, { requireDelivery: true })
    .then(() => {
      const session = ensureSession({
        sessionId: incoming.sessionId,
        peerId: incoming.fromPeerId,
        peerEndpoint: incoming.fromEndpoint,
        peerUsername: incoming.fromUsername || "",
        status: "active",
      });
      state.selectedSessionId = session.sessionId;
      state.selectedFileName = getDefaultSessionFileName();
      state.pendingIncoming = null;
      processNextIncomingRequest();
      renderSessionList();
      renderFileSelect();
      renderFileLines();
      updateConnectionUI();
      setStatus(`已接受 ${incoming.fromEndpoint} 的建联`);
    })
    .catch((error) => {
      setStatus(`接受失败：${error.message}`);
    });
}

function rejectIncomingRequest() {
  if (!state.pendingIncoming) {
    return;
  }
  const incoming = state.pendingIncoming;
  const packet = buildPacket("connect-response", {
    requestId: incoming.requestId,
    sessionId: incoming.sessionId,
    toEndpoint: incoming.fromEndpoint,
    toPeerId: incoming.fromPeerId,
    toUsername: incoming.fromUsername || undefined,
    accepted: false,
    reason: "rejected",
  });

  postRelayPacket(packet).catch(() => {});
  setSessionStatus(incoming.sessionId, "rejected");
  state.pendingIncoming = null;
  processNextIncomingRequest();
  renderSessionList();
  updateConnectionUI("已拒绝建联");
  setStatus(`已拒绝 ${incoming.fromEndpoint} 的建联请求`);
}

function sendFromRowInput(contentInput, onSuccess) {
  const connected = getConnectedSession();
  if (!connected) {
    return;
  }
  const content = String(contentInput ?? "").replace(/\r/g, "");
  if (!content.trim()) {
    return;
  }
  const fileName = getDefaultSessionFileName();

  state.selectedSessionId = connected.sessionId;
  state.selectedFileName = fileName;

  if (connected.peerId === localPeerId && isSameEndpoint(connected.peerEndpoint, localEndpoint)) {
    appendFileContentInSession({
      sessionId: connected.sessionId,
      fileName,
      content,
      direction: "send",
      endpoint: connected.peerEndpoint,
      peerId: connected.peerId,
    });
    if (typeof onSuccess === "function") {
      onSuccess();
    }
    renderSessionList();
    renderFileSelect();
    renderFileLines();
    setStatus(`本页自连：已发送 ${fileName}`);
    return;
  }

  let payloadEncrypted = "";
  try {
    payloadEncrypted = xorEncryptTextToBase64(
      JSON.stringify({ fileName, content }),
      localPeerId
    );
  } catch (error) {
    setStatus(`加密失败：${error?.message || "unknown error"}`);
    return;
  }

  const packet = buildPacket("data-message", {
    sessionId: connected.sessionId,
    toEndpoint:
      connected.peerEndpoint && !String(connected.peerEndpoint).startsWith("@")
        ? connected.peerEndpoint
        : undefined,
    toPeerId: connected.peerId || undefined,
    toUsername: connected.peerUsername || undefined,
    payloadEncrypted,
    secure: {
      alg: XOR_ALGORITHM,
      mode: "sender-id-xor",
    },
  });

  postRelayPacket(packet, { requireDelivery: true })
    .then(() => {
      appendFileContentInSession({
        sessionId: connected.sessionId,
        fileName,
        content,
        direction: "send",
        endpoint: connected.peerEndpoint,
        peerId: connected.peerId,
      });
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      renderSessionList();
      renderFileSelect();
      renderFileLines();
      setStatus(`已发送 ${fileName} -> ${connected.peerEndpoint}`);
    })
    .catch((error) => {
      setStatus(`发送失败：${error.message}`);
    });
}

function disconnectSession() {
  const connected = getConnectedSession();
  if (!connected) {
    updateConnectionUI("当前会话未连接");
    return;
  }
  const packet = buildPacket("disconnect", {
    sessionId: connected.sessionId,
    toEndpoint:
      connected.peerEndpoint && !String(connected.peerEndpoint).startsWith("@")
        ? connected.peerEndpoint
        : undefined,
    toPeerId: connected.peerId || undefined,
    toUsername: connected.peerUsername || undefined,
    reason: "manual-disconnect",
  });
  postRelayPacket(packet).catch(() => {});
  setSessionStatus(connected.sessionId, "closed");
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI("当前会话已断开");
  setStatus(`已断开会话 ${sessionDisplayName(connected)} -> ${connected.peerEndpoint}`);
}

function handleConnectRequest(packet) {
  if (!isPacketForLocal(packet)) {
    return;
  }
  if ((!packet.fromEndpoint && !packet.fromUsername) || !packet.sessionId) {
    return;
  }
  const fromEndpoint = packet.fromEndpoint || `@${packet.fromUsername || "unknown"}`;
  const fromUsername = normalizeRelayUsername(packet.fromUsername || "");
  const existing = sessions.get(packet.sessionId);
  const incomingSession = ensureSession({
    sessionId: packet.sessionId,
    peerId: packet.fromPeerId,
    peerEndpoint: fromEndpoint,
    peerUsername: fromUsername,
    status: existing && existing.status === "active" ? "active" : "incoming",
  });

  const duplicatedCurrent =
    state.pendingIncoming &&
    state.pendingIncoming.requestId === packet.requestId &&
    state.pendingIncoming.sessionId === packet.sessionId;
  const duplicatedQueued = state.pendingIncomingQueue.some(
    (incoming) =>
      incoming.requestId === packet.requestId &&
      incoming.sessionId === packet.sessionId
  );
  if (duplicatedCurrent || duplicatedQueued) {
    return;
  }

  state.pendingIncomingQueue.push({
    requestId: packet.requestId,
    sessionId: packet.sessionId,
    fromPeerId: packet.fromPeerId,
    fromEndpoint: fromEndpoint,
    fromUsername: fromUsername,
  });

  if (!state.selectedSessionId) {
    state.selectedSessionId = incomingSession.sessionId;
    state.selectedFileName = getDefaultSessionFileName();
  }

  renderSessionList();
  renderFileSelect();
  renderFileLines();
  processNextIncomingRequest();
  setStatus(`收到 ${packet.fromEndpoint} 的建联请求`);
}

function handleConnectResponse(packet) {
  if (!isPacketForLocal(packet)) {
    return;
  }
  if (!state.pendingOutgoing) {
    return;
  }
  if (packet.requestId !== state.pendingOutgoing.requestId) {
    return;
  }
  if (packet.sessionId !== state.pendingOutgoing.sessionId) {
    return;
  }
  if (state.pendingOutgoing.targetType === "endpoint") {
    if (!isSameEndpoint(packet.fromEndpoint, state.pendingOutgoing.targetEndpoint)) {
      return;
    }
  } else if (state.pendingOutgoing.targetType === "username") {
    const expectedUser = toRelayUsernameKey(state.pendingOutgoing.targetUsername);
    const incomingUser = toRelayUsernameKey(packet.fromUsername || "");
    if (expectedUser && incomingUser && expectedUser !== incomingUser) {
      return;
    }
  }

  if (packet.accepted) {
    const session = ensureSession({
      sessionId: packet.sessionId,
      peerId: packet.fromPeerId,
      peerEndpoint:
        packet.fromEndpoint || state.pendingOutgoing.targetEndpoint || "unknown",
      peerUsername:
        normalizeRelayUsername(packet.fromUsername || "") ||
        state.pendingOutgoing.targetUsername ||
        "",
      status: "active",
    });
    state.selectedSessionId = session.sessionId;
    state.selectedFileName = getDefaultSessionFileName();
    clearPendingOutgoing();
    renderSessionList();
    renderFileSelect();
    renderFileLines();
    updateConnectionUI();
    setStatus(`建联成功：${packet.fromEndpoint} 已接受`);
    return;
  }

  clearPendingOutgoing();
  setSessionStatus(packet.sessionId, "rejected");
  renderSessionList();
  updateConnectionUI(`建联被拒绝（${packet.reason || "rejected"}）`);
  setStatus(`建联被拒绝：${packet.reason || "rejected"}`);
}

function handleDataMessage(packet) {
  if (!isPacketForLocal(packet)) {
    return;
  }
  if (!packet.sessionId) {
    return;
  }

  let payload = null;
  if (
    packet.secure &&
    packet.secure.alg === XOR_ALGORITHM &&
    typeof packet.payloadEncrypted === "string"
  ) {
    try {
      const plainText = xorDecryptBase64ToText(packet.payloadEncrypted, localPeerId);
      payload = JSON.parse(plainText || "{}");
    } catch (error) {
      setStatus(`消息解密失败：${error?.message || "unknown error"}`);
      return;
    }
  } else {
    payload = packet.payload || {};
  }
  const fileName = getDefaultSessionFileName();
  const content =
    typeof payload.content === "string"
      ? payload.content
      : JSON.stringify(payload.content ?? "", null, 2);

  appendFileContentInSession({
    sessionId: packet.sessionId,
    fileName,
    content,
    direction: "recv",
    endpoint: packet.fromEndpoint || "unknown",
    peerId: packet.fromPeerId,
  });

  if (!state.selectedSessionId) {
    state.selectedSessionId = packet.sessionId;
    state.selectedFileName = fileName;
  }

  renderSessionList();
  renderFileSelect();
  renderFileLines();
  setStatus(`收到 ${packet.fromEndpoint} 的消息`);
}

function handleDisconnect(packet) {
  if (!isPacketForLocal(packet)) {
    return;
  }
  if (!packet.sessionId) {
    return;
  }
  if (state.pendingOutgoing && state.pendingOutgoing.sessionId === packet.sessionId) {
    clearPendingOutgoing();
  }
  setSessionStatus(packet.sessionId, "closed");
  if (state.pendingIncoming && state.pendingIncoming.sessionId === packet.sessionId) {
    state.pendingIncoming = null;
    processNextIncomingRequest();
  } else {
    state.pendingIncomingQueue = state.pendingIncomingQueue.filter(
      (incoming) => incoming.sessionId !== packet.sessionId
    );
  }
  if (state.selectedSessionId === packet.sessionId) {
    updateConnectionUI("对端已断开");
  } else {
    updateConnectionUI();
  }
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  const fromLabel = packet.fromUsername
    ? `@${packet.fromUsername}`
    : packet.fromEndpoint || "unknown";
  if (packet.reason === "session-deleted") {
    setStatus(`对端已删除会话并断开：${fromLabel}`);
  } else {
    setStatus(`收到 ${fromLabel} 的断开消息`);
  }
}

function routeIncomingPacket(packet) {
  if (!packet || typeof packet !== "object") {
    return;
  }
  if (packet.source !== PROTOCOL_SOURCE || typeof packet.type !== "string") {
    return;
  }
  if (packet.fromPeerId === localPeerId) {
    return;
  }

  switch (packet.type) {
    case "connect-request":
      handleConnectRequest(packet);
      break;
    case "connect-response":
      handleConnectResponse(packet);
      break;
    case "data-message":
      handleDataMessage(packet);
      break;
    case "disconnect":
      handleDisconnect(packet);
      break;
    default:
      break;
  }
}

function clearDisplayData() {
  sessions.clear();
  state.selectedSessionId = null;
  state.selectedFileName = "";
  state.pendingIncoming = null;
  state.pendingIncomingQueue = [];
  state.replacementBySession.clear();
  state.sessionAutoReplacementFile.clear();
  clearPendingOutgoing();
  hidePreview();
  hideRequestModal();
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI("显示已清空");
  setStatus("已清空会话文件展示");
}

function bindActions() {
  if (activityButtons.length) {
    for (const button of activityButtons) {
      button.addEventListener("click", () => {
        const next = button.dataset.activity || "explorer";
        switchActivityPanel(next);
      });
    }
  }
  if (newSessionBtn) {
    newSessionBtn.addEventListener("click", togglePeerPanelFromPlus);
  }
  if (wpsFileMenuBtn) {
    wpsFileMenuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      hideSettingsMenu();
      toggleWpsFileMenu();
    });
  }
  if (wpsFileNewBtn) {
    wpsFileNewBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      hideWpsFileMenu();
      togglePeerPanelFromPlus();
    });
  }
  if (wpsFileSaveBtn) {
    wpsFileSaveBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      hideWpsFileMenu();
      setStatus("已保存当前会话文档");
    });
  }
  if (wpsAutoSaveToggle) {
    wpsAutoSaveToggle.addEventListener("change", () => {
      setStatus(
        wpsAutoSaveToggle.checked ? "已开启自动保存（界面模式）" : "已关闭自动保存（界面模式）"
      );
    });
  }
  if (wpsCommentBtn) {
    wpsCommentBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextVisible = !wpsMainWorkspace || !wpsMainWorkspace.classList.contains("comment-open");
      setWpsCommentPaneVisible(nextVisible);
    });
  }
  if (wpsContextToggleBtn) {
    wpsContextToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextVisible = !wpsMainWorkspace || !wpsMainWorkspace.classList.contains("comment-open");
      setWpsCommentPaneVisible(nextVisible);
    });
  }
  if (configBtn) {
    configBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleSettingsMenu();
    });
  }
  if (helpMenuBtn) {
    helpMenuBtn.addEventListener("click", showHelpModal);
  }
  if (wpsWordThemeBtn) {
    if (isWpsWordPage() && wpsWordThemeBtn.classList.contains("wps-ribbon-tab")) {
      wpsWordThemeBtn.setAttribute("aria-haspopup", "menu");
      wpsWordThemeBtn.setAttribute("aria-expanded", "false");
      wpsWordThemeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleWpsThemeSwitchButton();
      });
    } else {
      wpsWordThemeBtn.addEventListener("click", toggleUiTheme);
    }
  }
  if (wpsThemeSwitchBtn) {
    wpsThemeSwitchBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      hideWpsThemeSwitchButton();
      toggleUiTheme();
    });
  }
  if (settingsDefaultFolderBtn) {
    settingsDefaultFolderBtn.addEventListener("click", showConfigModal);
  }
  if (settingsReplaceLimitBtn) {
    settingsReplaceLimitBtn.addEventListener("click", () => {
      showConfigModal();
      if (replacementLineLimitInput) {
        replacementLineLimitInput.focus();
        replacementLineLimitInput.select();
      }
    });
  }
  if (settingsRelayBtn) {
    settingsRelayBtn.addEventListener("click", showRelayModal);
  }
  if (settingsExtensionsBtn) {
    settingsExtensionsBtn.addEventListener("click", showExtensionModal);
  }
  if (chooseDefaultFolderBtn) {
    chooseDefaultFolderBtn.addEventListener("click", chooseDefaultReplacementFolder);
  }
  if (clearDefaultFolderBtn) {
    clearDefaultFolderBtn.addEventListener("click", clearDefaultReplacementFolder);
  }
  if (closeConfigBtn) {
    closeConfigBtn.addEventListener("click", hideConfigModal);
  }
  if (saveReplacementLineLimitBtn) {
    saveReplacementLineLimitBtn.addEventListener("click", saveReplacementLineLimitFromConfig);
  }
  if (replacementLineLimitInput) {
    replacementLineLimitInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveReplacementLineLimitFromConfig();
      }
    });
  }
  if (closeExtensionBtn) {
    closeExtensionBtn.addEventListener("click", hideExtensionModal);
  }
  if (saveRelayBtn) {
    saveRelayBtn.addEventListener("click", saveRelayConfigAndReconnect);
  }
  if (resetRelayBtn) {
    resetRelayBtn.addEventListener("click", resetRelayConfigAndReconnect);
  }
  if (closeRelayBtn) {
    closeRelayBtn.addEventListener("click", hideRelayModal);
  }
  if (relayUrlInput) {
    relayUrlInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveRelayConfigAndReconnect();
      }
    });
  }
  if (relayUsernameInput) {
    relayUsernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveRelayConfigAndReconnect();
      }
    });
  }
  if (copyIdentityBtn) {
    copyIdentityBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(getIdentityTextForCopy());
        setStatus("已复制身份信息");
      } catch (error) {
        setStatus(`复制失败：${error?.message || "unknown error"}`);
      }
    });
  }
  if (closeHelpBtn) {
    closeHelpBtn.addEventListener("click", hideHelpModal);
  }
  if (configModal) {
    configModal.addEventListener("click", (event) => {
      if (event.target === configModal) {
        hideConfigModal();
      }
    });
  }
  if (extensionModal) {
    extensionModal.addEventListener("click", (event) => {
      if (event.target === extensionModal) {
        hideExtensionModal();
      }
    });
  }
  if (relayModal) {
    let relayOverlayPointerDown = false;
    relayModal.addEventListener("pointerdown", (event) => {
      relayOverlayPointerDown = event.target === relayModal;
    });
    relayModal.addEventListener("click", (event) => {
      if (event.target === relayModal && relayOverlayPointerDown) {
        hideRelayModal();
      }
      relayOverlayPointerDown = false;
    });
  }
  if (helpModal) {
    helpModal.addEventListener("click", (event) => {
      if (event.target === helpModal) {
        hideHelpModal();
      }
    });
  }
  if (openPeerBtn) {
    openPeerBtn.addEventListener("click", openTargetPageOnly);
  }
  if (reloadReplaceBtn && !REPLACEMENT_ENABLED) {
    reloadReplaceBtn.textContent = "替换已关闭";
    reloadReplaceBtn.title = "当前已关闭替换，页面直接显示原文";
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", clearDisplayData);
  }
  if (connectBtn) {
    connectBtn.addEventListener("click", requestConnection);
  }
  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", disconnectSession);
  }

  if (selfConnectBtn) {
    selfConnectBtn.addEventListener("click", startSelfConnect);
  }
  if (quickPortConnectBtn) {
    quickPortConnectBtn.addEventListener("click", quickConnectByPort);
  }

  if (fileSelect) {
    fileSelect.addEventListener("change", () => {
      state.selectedFileName = getDefaultSessionFileName();
      currentFileLabel.textContent = state.selectedFileName;
      if (targetFileInput) {
        targetFileInput.value = state.selectedFileName;
      }
      loadReplacementFileForSelected();
      renderFileLines();
    });
  }

  if (reloadReplaceBtn) {
    reloadReplaceBtn.addEventListener("click", () => {
      loadReplacementFromPickedFile();
    });
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", acceptIncomingRequest);
  }
  if (rejectBtn) {
    rejectBtn.addEventListener("click", rejectIncomingRequest);
  }
  document.addEventListener("pointerdown", handleGlobalPointerDown);
  document.addEventListener("keydown", handleGlobalKeyDown);
}

function reconnectRelayWithCurrentBaseUrl(reasonText = "") {
  if (state.relaySource) {
    state.relaySource.close();
    state.relaySource = null;
  }
  state.relayReady = false;
  state.relayConnecting = false;
  updateConnectionUI(reasonText || "Relay 重新连接中");
  connectRelay();
}

function saveRelayConfigAndReconnect() {
  const inputValue = relayUrlInput ? relayUrlInput.value : "";
  const normalizedUrl = normalizeRelayBaseUrl(inputValue);
  if (!normalizedUrl) {
    setStatus("请填写有效的 Relay 地址（例如 127.0.0.1:9000）");
    return;
  }
  const usernameInput = relayUsernameInput ? relayUsernameInput.value : "";
  const normalizedUsername = normalizeRelayUsername(usernameInput);
  if (!normalizedUsername) {
    setStatus("请填写有效用户名（2~32位，支持中文、字母数字、._-）");
    return;
  }
  state.relayBaseUrl = normalizedUrl;
  state.relayUsername = normalizedUsername;
  persistRelayBaseUrl();
  persistRelayUsername();
  renderLocalIdentityTag();
  refreshHelpModal();
  hideRelayModal();
  setStatus(`Relay 配置已更新：${state.relayBaseUrl} / @${state.relayUsername}`);
  reconnectRelayWithCurrentBaseUrl("Relay 配置已更新，正在重连");
}

function resetRelayConfigAndReconnect() {
  state.relayBaseUrl = getRelayDefaultBaseUrl();
  state.relayUsername =
    normalizeRelayUsername(getDefaultRelayUsername()) || "user_default";
  try {
    localStorage.removeItem(RELAY_URL_CACHE_KEY);
    localStorage.removeItem(RELAY_USERNAME_CACHE_KEY);
  } catch {
    // ignore persistence failures
  }
  refreshRelayModal();
  renderLocalIdentityTag();
  refreshHelpModal();
  hideRelayModal();
  setStatus(`Relay 配置已恢复默认：${state.relayBaseUrl} / @${state.relayUsername}`);
  reconnectRelayWithCurrentBaseUrl("Relay 已恢复默认配置，正在重连");
}

function requestConnection() {
  if (!state.relayReady) {
    connectRelay();
    updateConnectionUI("Relay 未连接，正在重连");
    setStatus(`Relay 未连接，正在重连：${state.relayBaseUrl}`);
    return;
  }
  if (state.pendingOutgoing) {
    updateConnectionUI("当前已有建联请求，请等待响应后重试");
    return;
  }

  const target = normalizeConnectTarget(remotePeerInput.value);
  if (!target) {
    updateConnectionUI("请填写有效的对端地址（用户名 / URL / IP:端口）");
    return;
  }
  remotePeerInput.value = target.label;

  if (
    target.kind === "username" &&
    toRelayUsernameKey(target.username) === toRelayUsernameKey(state.relayUsername)
  ) {
    updateConnectionUI("本页自连请点“本页自连”");
    return;
  }
  if (target.kind === "endpoint" && isSameEndpoint(target.endpoint, localEndpoint)) {
    updateConnectionUI("本页自连请点“本页自连”");
    return;
  }

  setPeerFieldVisible(false);

  const requestId = createId("req");
  let sessionId = createId("session");
  let session = null;
  const targetEndpoint = target.kind === "endpoint" ? target.endpoint : target.label;
  const targetUsername = target.kind === "username" ? target.username : "";
  const routePeerId = "";
  const routeEndpoint = target.kind === "endpoint" ? target.endpoint : undefined;
  const selected = getSelectedSession();
  if (selected && selected.status === "draft") {
    selected.peerEndpoint = targetEndpoint;
    selected.peerUsername = targetUsername;
    selected.status = "pending";
    selected.updatedAt = Date.now();
    session = selected;
    sessionId = selected.sessionId;
  } else {
    session = ensureSession({
      sessionId,
      peerId: "",
      peerEndpoint: targetEndpoint,
      peerUsername: targetUsername,
      status: "pending",
    });
  }

  state.pendingOutgoing = {
    requestId,
    sessionId,
    targetType: target.kind,
    targetEndpoint,
    targetUsername,
    targetPeerId: routePeerId,
    targetLabel: target.label,
    timeoutTimer: null,
  };
  state.selectedSessionId = session.sessionId;
  state.selectedFileName = getDefaultSessionFileName();
  renderSessionList();
  renderFileSelect();
  renderFileLines();
  updateConnectionUI();

  const packet = buildPacket("connect-request", {
    requestId,
    sessionId,
    toEndpoint: routeEndpoint,
    toPeerId: routePeerId || undefined,
    toUsername: target.kind === "username" ? target.username : undefined,
  });

  postRelayPacket(packet, { requireDelivery: true })
    .then(() => {
      setStatus(`已发起建联请求 -> ${target.label}`);
    })
    .catch((error) => {
      clearPendingOutgoing();
      setSessionStatus(sessionId, "failed");
      renderSessionList();
      updateConnectionUI("建联请求发送失败");
      setStatus(`建联失败：${error.message}`);
    });

  state.pendingOutgoing.timeoutTimer = setTimeout(() => {
    if (!state.pendingOutgoing || state.pendingOutgoing.requestId !== requestId) {
      return;
    }
    clearPendingOutgoing();
    setSessionStatus(sessionId, "timeout");
    renderSessionList();
    updateConnectionUI("建联超时，请重试");
    setStatus(`建联超时：${target.label} 未响应`);
  }, REQUEST_TIMEOUT_MS);
}

bindActions();
restoreDefaultFolderCache();
restoreManualReplacementCache();
refreshConfigModal();
refreshRelayModal();
refreshHelpModal();
hideWpsFileMenu();
hideWpsThemeSwitchButton();
setWpsCommentPaneVisible(false);
applyUiTheme(state.uiTheme);
switchActivityPanel(state.activeActivity);
renderSessionList();
renderFileSelect();
renderFileLines();
updateConnectionUI();
setStatus(`正在连接 Relay：${state.relayBaseUrl}（@${state.relayUsername}）`);
connectRelay();
