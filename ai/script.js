const CONFIG = {
  WORKER_URL: "https://portalite-ai.user-x45.workers.dev",
  GOOGLE_CLIENT_ID: "673084197175-45dil2o15itadf1j0edmsg5ldl4d63pq.apps.googleusercontent.com"
};

const STORAGE_KEYS = {
  token: "portalite_session_token",
  email: "portalite_user_email",
  visited: "portalite_visited",
  chats: "portalite_chats"
};

const WELCOME_TEXT = {
  title: "Portalite AI へようこそ",
  points: [
    "Gemini API を使った自然な会話ができます",
    "左側（スマホはメニューボタンから）でチャット履歴を確認・切り替えできます",
    "最初のやり取りのあと、自動で短いタイトルが付きます",
    "URLに ?q=質問内容 を付けると、開いた瞬間に回答が表示されます"
  ]
};

let state = {
  chats: [],
  activeChatId: null
};

const el = {
  loginScreen: document.getElementById("login-screen"),
  loginError: document.getElementById("login-error"),
  app: document.getElementById("app"),
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebar-overlay"),
  historyList: document.getElementById("history-list"),
  newChatBtn: document.getElementById("new-chat-btn"),
  userEmail: document.getElementById("user-email"),
  logoutBtn: document.getElementById("logout-btn"),
  menuBtn: document.getElementById("menu-btn"),
  messages: document.getElementById("messages"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  sendBtn: document.getElementById("send-btn")
};

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats);
    state.chats = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.chats = [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(state.chats));
}

function createChat() {
  const chat = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), title: null, messages: [] };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  saveChats();
  return chat;
}

function getActiveChat() {
  return state.chats.find(c => c.id === state.activeChatId) || null;
}

function renderHistory() {
  el.historyList.innerHTML = "";
  state.chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "history-item" + (chat.id === state.activeChatId ? " active" : "");
    item.textContent = chat.title || "新しいチャット";
    item.addEventListener("click", () => {
      state.activeChatId = chat.id;
      renderHistory();
      renderMessages();
      closeSidebarOnMobile();
    });
    el.historyList.appendChild(item);
  });
}

function welcomeCardHTML() {
  const items = WELCOME_TEXT.points.map(p => `<li>${p}</li>`).join("");
  return `<div class="welcome-card"><h2>${WELCOME_TEXT.title}</h2><ul>${items}</ul></div>`;
}

function renderMessages() {
  el.messages.innerHTML = "";
  const chat = getActiveChat();
  if (!chat || chat.messages.length === 0) {
    el.messages.insertAdjacentHTML("beforeend", welcomeCardHTML());
    return;
  }
  chat.messages.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.className = "message " + msg.role;
    bubble.textContent = msg.content;
    el.messages.appendChild(bubble);
  });
}

function showWelcomeOverlayIfFirstVisit() {
  if (localStorage.getItem(STORAGE_KEYS.visited)) return;
  localStorage.setItem(STORAGE_KEYS.visited, "1");
  alert(WELCOME_TEXT.title + "\n\n" + WELCOME_TEXT.points.map(p => "・" + p).join("\n"));
}

function openSidebar() {
  el.sidebar.classList.add("open");
  el.sidebarOverlay.classList.add("show");
}

function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.sidebarOverlay.classList.remove("show");
}

function closeSidebarOnMobile() {
  if (window.innerWidth < 768) closeSidebar();
}

async function apiPost(path, body) {
  const res = await fetch(CONFIG.WORKER_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + getToken()
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "リクエストに失敗しました");
  return data;
}

async function sendMessage(text) {
  let chat = getActiveChat();
  if (!chat) chat = createChat();

  chat.messages.push({ role: "user", content: text });
  renderHistory();
  renderMessages();
  saveChats();

  const loading = document.createElement("div");
  loading.className = "message assistant loading";
  loading.textContent = "考え中...";
  el.messages.appendChild(loading);
  loading.scrollIntoView({ block: "start", behavior: "smooth" });

  try {
    const data = await apiPost("/api/chat", { messages: chat.messages });
    loading.remove();

    const bubble = document.createElement("div");
    bubble.className = "message assistant";
    bubble.textContent = data.text;
    el.messages.appendChild(bubble);
    bubble.scrollIntoView({ block: "start", behavior: "smooth" });

    chat.messages.push({ role: "assistant", content: data.text });
    saveChats();

    if (!chat.title) {
      generateTitle(chat);
    }
  } catch (err) {
    loading.remove();
    const bubble = document.createElement("div");
    bubble.className = "message assistant";
    bubble.textContent = "エラーが発生しました: " + err.message;
    el.messages.appendChild(bubble);
    bubble.scrollIntoView({ block: "start", behavior: "smooth" });
  }
}

async function generateTitle(chat) {
  try {
    const firstExchange = chat.messages.slice(0, 2).map(m => m.content).join("\n");
    const data = await apiPost("/api/title", { text: firstExchange });
    chat.title = data.title || "新しいチャット";
    saveChats();
    renderHistory();
  } catch (e) {}
}

function handleQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (!q) return;
  createChat();
  renderHistory();
  sendMessage(q);
}

function showApp(email) {
  el.loginScreen.classList.add("hidden");
  el.app.classList.remove("hidden");
  el.userEmail.textContent = email || "";
  loadChats();
  showWelcomeOverlayIfFirstVisit();

  const query = new URLSearchParams(window.location.search).get("q");
  if (query) {
    handleQueryParam();
  } else {
    if (state.chats.length === 0) createChat();
    else state.activeChatId = state.chats[0].id;
    renderHistory();
    renderMessages();
  }
}

function showLogin(errorMessage) {
  el.app.classList.add("hidden");
  el.loginScreen.classList.remove("hidden");
  el.loginError.textContent = errorMessage || "";
}

function handleCredentialResponse(response) {
  fetch(CONFIG.WORKER_URL + "/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: response.credential })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        showLogin(data.error || "ログインに失敗しました");
        return;
      }
      localStorage.setItem(STORAGE_KEYS.token, data.token);
      localStorage.setItem(STORAGE_KEYS.email, data.email);
      showApp(data.email);
    })
    .catch(() => showLogin("ログインに失敗しました"));
}

function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.getElementById("google-signin-button"),
    { theme: "outline", size: "large", text: "signin_with", locale: "ja" }
  );
}

el.newChatBtn.addEventListener("click", () => {
  createChat();
  renderHistory();
  renderMessages();
  closeSidebarOnMobile();
});

el.menuBtn.addEventListener("click", () => {
  if (el.sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
});

el.sidebarOverlay.addEventListener("click", closeSidebar);

el.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.email);
  showLogin();
});

el.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = el.chatInput.value.trim();
  if (!text) return;
  el.chatInput.value = "";
  sendMessage(text);
});

el.chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    el.chatForm.requestSubmit();
  }
});

window.addEventListener("load", () => {
  const token = getToken();
  if (token) {
    showApp(localStorage.getItem(STORAGE_KEYS.email));
  } else {
    showLogin();
  }
  const checkGoogle = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(checkGoogle);
      initGoogleSignIn();
    }
  }, 100);
});
