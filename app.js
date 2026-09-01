(() => {
  "use strict";

  const CHECKIN_KEY = "skal.prototype.checkin.v1";
  const ONBOARDING_KEY = "skal.prototype.welcomed.v1";
  const HISTORY_KEY = "skal.prototype.history.v1";
  const HISTORY_ENABLED_KEY = "skal.prototype.history-enabled.v1";
  const THEME_KEY = "cheers-with-me.theme.v1";
  const LANGUAGE_KEY = "cheers-with-me.language.v1";
  const INVITE_URL = `${location.origin}${location.pathname}?invite=friend`;
  const i18n = window.CheersI18n || { translations: { "zh-CN": {} }, localeNames: { "zh-CN": "简体中文" }, badges: { "zh-CN": "中" } };

  const tileThemes = {
    night: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    day: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
  };

  const friends = [
    { id: "alex", name: "Alex", initial: "A", color: "#d08a5e", city: "Stockholm", place: "Södermalm", country: "Sweden", lat: 59.316, lng: 18.072, drink: "coffee", emoji: "☕", minutesAgo: 18, active: true },
    { id: "lina", name: "Lina", initial: "L", color: "#c99b69", city: "Shanghai", place: "静安区", country: "China", lat: 31.231, lng: 121.454, drink: "tea", emoji: "🍵", minutesAgo: 42, active: true },
    { id: "maya", name: "Maya", initial: "M", color: "#b9798f", city: "New York", place: "Brooklyn", country: "USA", lat: 40.681, lng: -73.958, drink: "cocktail", emoji: "🍸", minutesAgo: 7, active: true },
    { id: "kenji", name: "Kenji", initial: "K", color: "#81a98d", city: "Tokyo", place: "Shibuya", country: "Japan", lat: 35.659, lng: 139.701, drink: "sake", emoji: "🍶", minutesAgo: 31, active: true },
    { id: "sunny", name: "Sunny", initial: "S", color: "#d7b15b", city: "Stockholm", place: "Solna", country: "Sweden", active: false },
    { id: "emma", name: "Emma", initial: "E", color: "#7f9eb6", city: "Copenhagen", place: "", country: "Denmark", active: false },
    { id: "tamer", name: "Tamer", initial: "T", color: "#b38b5d", city: "Stockholm", place: "", country: "Sweden", active: false }
  ];

  const state = {
    map: null,
    tileLayer: null,
    friendMarkers: new Map(),
    ownMarker: null,
    currentFriend: null,
    selectedDrink: "wine",
    selectedEmoji: "🍷",
    precision: "city",
    hours: 4,
    deferredInstall: null,
    toastTimer: null,
    checkin: readCheckin(),
    history: readHistory(),
    historyEnabled: localStorage.getItem(HISTORY_ENABLED_KEY) === "true",
    avatarVariant: 0,
    themeMode: localStorage.getItem(THEME_KEY) || "auto",
    theme: "night",
    languageMode: localStorage.getItem(LANGUAGE_KEY) || "auto",
    language: "zh-CN"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const drinkIcon = (drink, extraClass = "") => `<svg class="drink-svg ${extraClass}" aria-hidden="true"><use href="#drink-${drink}"></use></svg>`;

  function detectLanguage() {
    const preferred = (navigator.languages?.[0] || navigator.language || "zh-CN").toLowerCase();
    if (preferred.startsWith("sv")) return "sv";
    if (preferred.startsWith("zh")) return "zh-CN";
    return "en";
  }

  function resolveLanguage(mode) {
    return mode === "auto" ? detectLanguage() : (i18n.translations[mode] ? mode : "en");
  }

  function t(key, values = {}) {
    const languagePack = i18n.translations[state.language] || i18n.translations.en || {};
    const fallbackPack = i18n.translations["zh-CN"] || {};
    const template = languagePack[key] ?? fallbackPack[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
  }

  function dateLocale() {
    return state.language === "zh-CN" ? "zh-CN" : state.language === "sv" ? "sv-SE" : "en-US";
  }

  function applyLanguage(mode, announce = false) {
    state.languageMode = ["auto", "zh-CN", "en", "sv"].includes(mode) ? mode : "auto";
    state.language = resolveLanguage(state.languageMode);
    document.documentElement.lang = state.language;
    document.documentElement.dataset.language = state.language;
    document.title = state.language === "zh-CN" ? "喝了吗 — Cheers With Me" : "Cheers With Me";

    $$('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    $$('[data-i18n-html]').forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
    $$('[data-i18n-aria]').forEach((element) => { element.setAttribute("aria-label", t(element.dataset.i18nAria)); });
    $$('[data-i18n-alt]').forEach((element) => { element.setAttribute("alt", t(element.dataset.i18nAlt)); });
    $$('[data-i18n-content]').forEach((element) => { element.setAttribute("content", t(element.dataset.i18nContent)); });

    const badge = $("#languageBadge");
    if (badge) badge.textContent = i18n.badges[state.language] || "EN";
    const detected = $("#detectedLanguage");
    if (detected) detected.textContent = i18n.localeNames[detectLanguage()] || "English";
    $$("#languageOptions button").forEach((button) => {
      const selected = button.dataset.language === state.languageMode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    renderFriendList();
    renderHistory();
    updateLiveStatus();
    applyTheme(state.theme, false);
    if (announce) showToast(t("system.languageChanged"));
  }

  function readCheckin() {
    try {
      const value = JSON.parse(localStorage.getItem(CHECKIN_KEY) || "null");
      if (!value || !value.expiresAt || value.expiresAt <= Date.now()) {
        localStorage.removeItem(CHECKIN_KEY);
        return null;
      }
      return value;
    } catch {
      localStorage.removeItem(CHECKIN_KEY);
      return null;
    }
  }

  function saveCheckin(value) {
    state.checkin = value;
    if (value) localStorage.setItem(CHECKIN_KEY, JSON.stringify(value));
    else localStorage.removeItem(CHECKIN_KEY);
  }

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value.slice(0, 30) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(checkin) {
    if (!state.historyEnabled) return;
    const entry = { ...checkin, id: `${checkin.createdAt}-${checkin.drink}` };
    state.history = [entry, ...state.history].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    renderHistory();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function automaticTheme() {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19 ? "day" : "night";
  }

  function applyTheme(theme, announce = false) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    const color = theme === "day" ? "#74c7c8" : "#07110f";
    $('meta[name="theme-color"]')?.setAttribute("content", color);
    const symbol = $("#themeSymbol");
    if (symbol) symbol.textContent = theme === "day" ? "☀" : "☾";
    const button = $("#themeButton");
    if (button) button.setAttribute("aria-label", theme === "day" ? t("system.themeDayAria") : t("system.themeNightAria"));
    installTileLayer();
    if (announce) showToast(theme === "day" ? t("system.themeDayToast") : t("system.themeNightToast"));
  }

  function installTileLayer() {
    if (!state.map || !window.L) return;
    if (state.tileLayer) state.tileLayer.remove();
    state.tileLayer = L.tileLayer(tileThemes[state.theme], {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: "© OpenStreetMap © CARTO"
    }).addTo(state.map);
    state.tileLayer.bringToBack();
  }

  function toggleTheme() {
    const next = state.theme === "day" ? "night" : "day";
    state.themeMode = next;
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next, true);
  }

  function initMap() {
    if (!window.L) {
      showToast(t("system.mapError"));
      return;
    }
    const worldZoom = window.innerWidth < 620 ? 1.25 : 2;
    state.map = L.map("map", {
      zoomControl: false,
      minZoom: 1,
      maxZoom: 18,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      worldCopyJump: true,
      attributionControl: true
    }).setView([20, 20], worldZoom);

    installTileLayer();

    friends.filter((friend) => friend.active).forEach(addFriendMarker);
    if (state.checkin) addOwnMarker();

    state.map.on("click", () => closeSheets());
    window.setTimeout(() => state.map.invalidateSize(), 180);
  }

  function markerIcon(emoji, isMe = false) {
    return L.divIcon({
      className: "drink-marker-wrap",
      html: `<div class="drink-marker${isMe ? " me" : ""}">${drinkIcon(drinkForEmoji(emoji))}</div>`,
      iconSize: [50, 58],
      iconAnchor: [25, 56]
    });
  }

  function drinkForEmoji(emoji) {
    return ({ "🍷": "wine", "🍺": "beer", "🍸": "cocktail", "🥂": "champagne", "🍶": "sake", "☕": "coffee", "🍵": "tea", "🫧": "zero" })[emoji] || "wine";
  }

  function addFriendMarker(friend) {
    if (!state.map || !friend.lat || !friend.lng) return;
    const marker = L.marker([friend.lat, friend.lng], {
      icon: markerIcon(friend.emoji),
      title: `${friend.name} · ${friend.city}`,
      keyboard: true,
      riseOnHover: true
    }).addTo(state.map);
    marker.on("click", () => openFriend(friend, false));
    state.friendMarkers.set(friend.id, marker);
  }

  function addOwnMarker() {
    if (!state.map || !state.checkin) return;
    if (state.ownMarker) state.ownMarker.remove();
    state.ownMarker = L.marker([state.checkin.lat, state.checkin.lng], {
      icon: markerIcon(state.checkin.emoji, true),
      title: `${t("profile.me")} · ${state.checkin.label}`,
      keyboard: true,
      zIndexOffset: 500
    }).addTo(state.map);
    state.ownMarker.on("click", () => openSheet("checkinSheet"));
  }

  function renderFriendList() {
    $("#friendList").innerHTML = friends.map((friend) => `
      <div class="friend-row">
        <span class="friend-row-avatar" style="background:${friend.color}">${friend.initial}</span>
        <span class="friend-row-copy">
          <strong>${friend.name}</strong>
          <small>${friend.active ? `${friend.city} · ${relativeTime(friend.minutesAgo)}` : friend.city}</small>
        </span>
        <span class="friend-row-state${friend.active ? " live" : ""}">${friend.active ? drinkIcon(friend.drink) : "·"}</span>
      </div>
    `).join("");
  }

  function renderHistory() {
    const seededCount = 12;
    $("#historyCount").textContent = String(seededCount + state.history.length);
    $$("#historyTimeline .history-live").forEach((entry) => entry.remove());
    if (!state.history.length) return;
    const generated = state.history.map((entry) => {
      const date = new Date(entry.createdAt);
      const dateLabel = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
      const timeLabel = new Intl.DateTimeFormat(dateLocale(), { hour: "2-digit", minute: "2-digit" }).format(date);
      return `<article class="history-live"><span class="history-cup">${drinkIcon(entry.drink || drinkForEmoji(entry.emoji))}</span><div><strong>${escapeHTML(entry.label)}</strong><small>${t("system.todayRecorded", { time: timeLabel })}</small></div><b>${dateLabel}</b></article>`;
    }).join("");
    const timeline = $("#historyTimeline");
    timeline.insertAdjacentHTML("afterbegin", generated);
  }

  function relativeTime(minutes) {
    if (minutes < 2) return t("system.justNow");
    if (minutes < 60) return t("system.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    return t("system.hoursAgo", { count: hours });
  }

  function openFriend(friend, moveMap = true) {
    state.currentFriend = friend;
    $("#friendAvatar").textContent = friend.initial;
    $("#friendAvatar").style.background = friend.color;
    $("#friendCup").innerHTML = drinkIcon(friend.drink);
    $("#friendName").textContent = friend.name;
    $("#friendPlace").textContent = `${friend.city} · ${friend.place || friend.country}`;
    $("#friendTime").textContent = relativeTime(friend.minutesAgo);
    if (moveMap && state.map && friend.lat && friend.lng) state.map.flyTo([friend.lat, friend.lng], Math.max(state.map.getZoom(), 5), { duration: 1.15 });
    openSheet("friendSheet");
  }

  function openSheet(id) {
    closeSheets(false);
    const sheet = document.getElementById(id);
    if (!sheet) return;
    if (id === "checkinSheet") syncCheckinSheet();
    sheet.hidden = false;
    $("#sheetBackdrop").hidden = false;
    document.body.classList.add("sheet-open");
    window.setTimeout(() => sheet.querySelector("button")?.focus({ preventScroll: true }), 80);
  }

  function closeSheets(hideBackdrop = true) {
    $$(".bottom-sheet").forEach((sheet) => { sheet.hidden = true; });
    if (hideBackdrop) $("#sheetBackdrop").hidden = true;
    document.body.classList.remove("sheet-open");
  }

  function syncCheckinSheet() {
    const current = state.checkin;
    $("#endCheckin").hidden = !current;
    $("#locationLabel").textContent = current ? current.label : t("checkin.locationTap");
    if (current) {
      selectDrink(current.drink, current.emoji);
      selectSegment($("#precisionPicker"), "precision", current.precision);
      state.precision = current.precision;
    }
  }

  function selectDrink(drink, emoji) {
    state.selectedDrink = drink;
    state.selectedEmoji = emoji;
    $$(".drink-option").forEach((option) => {
      const selected = option.dataset.drink === drink;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", selected ? "true" : "false");
    });
    $("#publishCheckin .button-cup").innerHTML = drinkIcon(drink);
    $("#cheersButton .cheers-cup").outerHTML = drinkIcon(drink, "cheers-cup");
  }

  function selectSegment(container, dataKey, value) {
    $$(`button[data-${dataKey}]`, container).forEach((button) => button.classList.toggle("selected", button.dataset[dataKey] === String(value)));
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(t("system.noGeolocation")));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (error) => {
        const messages = {
          1: t("system.locationDenied"),
          2: t("system.locationUnavailable"),
          3: t("system.locationTimeout")
        };
        reject(new Error(messages[error.code] || t("system.locationUnavailable")));
      }, { enableHighAccuracy: true, timeout: 14000, maximumAge: 60000 });
    });
  }

  async function reverseGeocode(lat, lng) {
    try {
      const acceptedLanguages = state.language === "zh-CN" ? "zh-CN,zh,en" : state.language === "sv" ? "sv,en" : "en";
      const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lng), zoom: "18", "accept-language": acceptedLanguages });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      if (!response.ok) throw new Error("reverse geocoding failed");
      const data = await response.json();
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality || address.county || t("system.currentLocation");
      const place = address.amenity || address.shop || address.tourism || address.road || data.name || city;
      return { city, place, country: address.country || "" };
    } catch {
      return { city: t("system.currentLocation"), place: t("system.currentLocation"), country: "" };
    }
  }

  async function publishCheckin() {
    const button = $("#publishCheckin");
    const original = button.innerHTML;
    button.disabled = true;
      button.innerHTML = `<span class="button-cup locating-pulse">⌖</span><span><strong>${t("system.locating")}</strong><small>${t("system.locatingOnce")}</small></span>`;
    try {
      const position = await getPosition();
      const exactLat = position.coords.latitude;
      const exactLng = position.coords.longitude;
      const locationInfo = await reverseGeocode(exactLat, exactLng);
      const cityOnly = state.precision === "city";
      const lat = cityOnly ? Number(exactLat.toFixed(1)) : Number(exactLat.toFixed(5));
      const lng = cityOnly ? Number(exactLng.toFixed(1)) : Number(exactLng.toFixed(5));
      const label = cityOnly ? locationInfo.city : `${locationInfo.place}, ${locationInfo.city}`;
      const now = Date.now();
      const checkin = {
        lat,
        lng,
        label,
        city: locationInfo.city,
        drink: state.selectedDrink,
        emoji: state.selectedEmoji,
        precision: state.precision,
        createdAt: now,
        expiresAt: now + state.hours * 60 * 60 * 1000
      };
      saveCheckin(checkin);
      saveHistory(checkin);
      addOwnMarker();
      updateLiveStatus();
      closeSheets();
      state.map?.flyTo([lat, lng], cityOnly ? 9 : 15, { duration: 1.4 });
      showToast(t("system.checkinToast", { emoji: state.selectedEmoji, place: label, hours: state.hours }));
      if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
    } catch (error) {
      showToast(error.message || t("system.locationFailed"), 4200);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      $("#publishCheckin .button-cup").innerHTML = drinkIcon(state.selectedDrink);
    }
  }

  function endCheckin() {
    saveCheckin(null);
    if (state.ownMarker) {
      state.ownMarker.remove();
      state.ownMarker = null;
    }
    updateLiveStatus();
    closeSheets();
    showToast(state.historyEnabled ? t("system.endSaved") : t("system.endDiscarded"));
  }

  function updateLiveStatus() {
    if (state.checkin && state.checkin.expiresAt <= Date.now()) {
      saveCheckin(null);
      if (state.ownMarker) state.ownMarker.remove();
      state.ownMarker = null;
    }
    const live = Boolean(state.checkin);
    $("#livePill").hidden = !live;
    $("#endCheckin").hidden = !live;
    $("#quickPrompt").textContent = live ? t("system.liveSomewhere") : t("quick.prompt");
    $("#cheersButton .cheers-label").textContent = live ? t("system.view") : t("quick.raise");
    if (live) {
      const remaining = Math.max(0, state.checkin.expiresAt - Date.now());
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.max(1, Math.floor((remaining % 3600000) / 60000));
      $("#liveTime").textContent = hours ? t("system.hourMinute", { hours, minutes }) : t("system.minute", { minutes });
      $("#locationLabel").textContent = state.checkin.label;
    } else {
      $("#locationLabel").textContent = t("checkin.locationTap");
    }
  }

  async function shareInvite() {
    const shareData = {
      title: t("system.inviteTitle"),
      text: t("system.inviteText"),
      url: INVITE_URL
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(INVITE_URL);
        showToast(t("system.inviteCopied"));
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast(t("system.shareFailed"));
    }
  }

  function playClinkSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      [1380, 1940].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * .025);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(.12 / (index + 1), now + .02 + index * .025);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .7);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * .025);
        oscillator.stop(now + .75);
      });
      window.setTimeout(() => context.close(), 1000);
    } catch {
      // Sound is a small enhancement; the visual response remains complete.
    }
  }

  function cloudClink() {
    if (!state.currentFriend) return;
    closeSheets();
    $("#clinkText").textContent = t("system.clinkWith", { name: state.currentFriend.name });
    $("#clinkScene").hidden = false;
    playClinkSound();
    if (navigator.vibrate) navigator.vibrate([30, 45, 80]);
    window.setTimeout(() => { $("#clinkScene").hidden = true; }, 2350);
  }

  function showToast(message, duration = 3000) {
    const toast = $("#toast");
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, duration);
  }

  function regenerateAvatar(origin = "profile") {
    state.avatarVariant = (state.avatarVariant + 1) % 3;
    const images = $$(".avatar-button img, .ai-avatar img, .onboarding-avatar img");
    images.forEach((image) => {
      image.classList.add("ai-generating");
      image.dataset.variant = String(state.avatarVariant);
    });
    const button = origin === "intro" ? $("#remixIntroAvatar") : $("#regenerateAvatar");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = t("system.avatarGenerating");
    window.setTimeout(() => {
      images.forEach((image) => image.classList.remove("ai-generating"));
      button.disabled = false;
      button.textContent = original;
      showToast(t("system.avatarGenerated"));
    }, 1250);
  }

  function setupInteractions() {
    $$('[data-open-sheet]').forEach((button) => button.addEventListener("click", () => openSheet(button.dataset.openSheet)));
    $$('[data-close-sheet]').forEach((button) => button.addEventListener("click", () => closeSheets()));
    $("#sheetBackdrop").addEventListener("click", () => closeSheets());
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSheets(); });

    $$(".drink-option").forEach((button) => button.addEventListener("click", () => selectDrink(button.dataset.drink, button.dataset.emoji)));
    $$("#precisionPicker button").forEach((button) => button.addEventListener("click", () => {
      state.precision = button.dataset.precision;
      selectSegment($("#precisionPicker"), "precision", state.precision);
    }));
    $$("#durationPicker button").forEach((button) => button.addEventListener("click", () => {
      state.hours = Number(button.dataset.hours);
      selectSegment($("#durationPicker"), "hours", state.hours);
    }));

    $("#publishCheckin").addEventListener("click", publishCheckin);
    $("#endCheckin").addEventListener("click", endCheckin);
    $("#clinkButton").addEventListener("click", cloudClink);
    $("#inviteButton").addEventListener("click", shareInvite);
    $("#themeButton").addEventListener("click", toggleTheme);
    $$("#languageOptions button").forEach((button) => button.addEventListener("click", () => {
      localStorage.setItem(LANGUAGE_KEY, button.dataset.language);
      applyLanguage(button.dataset.language, true);
    }));
    $("#regenerateAvatar").addEventListener("click", () => regenerateAvatar("profile"));
    $("#remixIntroAvatar").addEventListener("click", () => regenerateAvatar("intro"));
    $("#saveReport").addEventListener("click", () => showToast(t("system.reportSaved"), 4200));
    $("#historyToggle").addEventListener("change", (event) => {
      state.historyEnabled = event.target.checked;
      localStorage.setItem(HISTORY_ENABLED_KEY, String(state.historyEnabled));
      showToast(state.historyEnabled ? t("system.historyOn") : t("system.historyOff"));
    });

    $("#worldButton").addEventListener("click", () => state.map?.flyTo([20, 20], window.innerWidth < 620 ? 1.25 : 2, { duration: 1.3 }));
    $("#locateButton").addEventListener("click", async () => {
      if (state.checkin) {
        state.map?.flyTo([state.checkin.lat, state.checkin.lng], state.checkin.precision === "city" ? 9 : 15, { duration: 1.1 });
        return;
      }
      try {
        const position = await getPosition();
        state.map?.flyTo([position.coords.latitude, position.coords.longitude], 12, { duration: 1.1 });
        showToast(t("system.locateOnly"));
      } catch (error) {
        showToast(error.message, 4000);
      }
    });

    $("#enterApp").addEventListener("click", () => {
      localStorage.setItem(ONBOARDING_KEY, "1");
      $("#onboarding").classList.add("leaving");
      window.setTimeout(() => {
        $("#onboarding").hidden = true;
        state.map?.invalidateSize();
      }, 680);
    });

    $("#installButton").addEventListener("click", async () => {
      if (state.deferredInstall) {
        state.deferredInstall.prompt();
        await state.deferredInstall.userChoice;
        state.deferredInstall = null;
      } else {
        showToast(t("system.installHelp"), 4500);
      }
    });

    $("#clinkScene").addEventListener("click", () => { $("#clinkScene").hidden = true; });
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.deferredInstall = event;
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  function init() {
    if (!["auto", "day", "night"].includes(state.themeMode)) state.themeMode = "auto";
    if (!["auto", "zh-CN", "en", "sv"].includes(state.languageMode)) state.languageMode = "auto";
    state.language = resolveLanguage(state.languageMode);
    applyTheme(state.themeMode === "auto" ? automaticTheme() : state.themeMode);
    applyLanguage(state.languageMode);
    setupInteractions();
    initMap();
    updateLiveStatus();
    selectDrink(state.selectedDrink, state.selectedEmoji);
    $("#historyToggle").checked = state.historyEnabled;
    registerServiceWorker();

    if (localStorage.getItem(ONBOARDING_KEY) === "1" || new URLSearchParams(location.search).has("skipIntro")) {
      $("#onboarding").hidden = true;
    }
    if (new URLSearchParams(location.search).has("invite")) {
      window.setTimeout(() => showToast(t("system.inviteReceived"), 4200), 900);
    }
    window.setInterval(updateLiveStatus, 30000);
    window.setInterval(() => {
      if (state.themeMode === "auto") {
        const next = automaticTheme();
        if (next !== state.theme) applyTheme(next);
      }
    }, 300000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
