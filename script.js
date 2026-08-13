function initApp() {
  const weatherContainer = document.getElementById('weather-container');
  const roomTempContainer = document.getElementById('room-temp-container');
  const ROOM_TEMP_API_URL = 'https://temp.user-x45.workers.dev/';
  const newsContainer = document.getElementById('news-container');
  const mainInput = document.getElementById('search-input-main');
  const mainSuggestions = document.getElementById('suggestions-container-main');
  const mainClearButton = document.getElementById('clear-button-main');
  const qrScanButtonMain = document.getElementById('qr-scan-button-main');
  const overlay = document.getElementById('search-overlay');
  const overlayInput = document.getElementById('search-input-overlay');
  const cancelButton = document.getElementById('cancel-button');
  const overlaySuggestions = document.getElementById('suggestions-container-overlay');
  const overlayClearButton = document.getElementById('clear-button-overlay');
  const stickySearchBar = document.getElementById('sticky-search-bar');
  const stickyInput = document.getElementById('search-input-sticky');
  const searchWrapper = document.getElementById('search-container-wrapper');
  const newsRssUrl = 'https://feed.mdpr.jp/rss/export/mdpr-entertainment.xml';
  const HISTORY_KEY = 'search-history';
  const HISTORY_LIMIT = 20;
  const TRENDS_URL = 'https://trends.google.com/trending/rss?geo=JP';
  const CORS_PROXY = 'https://cors-proxy.user-x45.workers.dev/?url=';
  let trendsData = null;
  let lastScrollPosition = 0;
  const copyrightText = document.getElementById('copyright-text');
  const currentYear = new Date().getFullYear();
  copyrightText.textContent = `© 2025 - ${currentYear} Portalite`;
  const THEME_KEY = 'portalite-theme';
  const themeSwatches = document.querySelectorAll('.theme-swatch');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeSwatches.forEach(sw => sw.classList.toggle('selected', sw.dataset.theme === theme));
  }
  applyTheme(localStorage.getItem(THEME_KEY) || 'blue');

  const COLOR_MODE_KEY = 'portalite-color-mode';
  const colorModeOptions = document.querySelectorAll('.color-mode-option');
  function applyColorMode(mode) {
    if (mode === 'light' || mode === 'dark') document.documentElement.setAttribute('data-color-mode', mode);
    else document.documentElement.removeAttribute('data-color-mode');
    localStorage.setItem(COLOR_MODE_KEY, mode);
    colorModeOptions.forEach(opt => opt.classList.toggle('selected', opt.dataset.colorMode === mode));
  }
  applyColorMode(localStorage.getItem(COLOR_MODE_KEY) || 'system');

  const FONT_SIZE_KEY = 'portalite-font-size';
  const FONT_SIZE_DEFAULT = 'default';
  const fontSizeOptions = document.querySelectorAll('.font-size-option');
  function applyFontSize(size) {
    if (size === 'default') document.documentElement.removeAttribute('data-font-size');
    else document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem(FONT_SIZE_KEY, size);
    fontSizeOptions.forEach(opt => opt.classList.toggle('selected', opt.dataset.fontSize === size));
  }
  applyFontSize(localStorage.getItem(FONT_SIZE_KEY) || FONT_SIZE_DEFAULT);
  fontSizeOptions.forEach(opt => {
    opt.addEventListener('click', () => { applyFontSize(opt.dataset.fontSize); });
  });

  function showLoading(container, message = '読み込み中...') {
    container.innerHTML = `<div class="flex flex-col items-center justify-center py-8"><div class="loading-spinner"></div><p class="mt-3 md-on-surface-variant">${message}</p></div>`;
  }

  function showError(container, message, retryCallback) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center py-8 md-error-text"><i class="fas fa-exclamation-circle text-3xl mb-2"></i><p class="text-center">${message}</p><button class="retry-button mt-3">再試行</button></div>`;
    const retryBtn = container.querySelector('.retry-button');
    if (retryBtn && retryCallback) retryBtn.addEventListener('click', retryCallback);
  }

  async function fetchWithRetry(fn, container, loadingMsg, errorMsg, maxRetries = 2, retryDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        showLoading(container, loadingMsg);
        const result = await fn();
        if (result === false) throw new Error('fetch failed');
        return true;
      } catch (error) {
        if (attempt === maxRetries) {
          showError(container, errorMsg, () => fetchWithRetry(fn, container, loadingMsg, errorMsg, maxRetries, retryDelay));
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    return false;
  }

  async function fetchOgpImageWithRetry(url, maxRetries = 2, retryDelay = 800) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch('https://ogp-scanner.kunon.jp/v2/ogp_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (!data.success) throw new Error('OGP fetch failed');
        const ogImage = data.result?.ogp?.['og:image']?.[0];
        const twitterImage = data.result?.twitter?.['twitter:image']?.[0];
        const imageUrl = ogImage || twitterImage || null;
        if (imageUrl) {
          await new Promise((resolve, reject) => {
            const testImg = new Image();
            testImg.onload = () => resolve();
            testImg.onerror = () => reject(new Error('Image load failed'));
            testImg.src = imageUrl;
          });
          return imageUrl;
        }
        throw new Error('No image found');
      } catch (error) {
        if (attempt === maxRetries) return null;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    return null;
  }

  const WMO_WEATHER = {
    0: { label: '快晴', icon: 'fa-sun', night: 'fa-moon', color: '#f59e0b', nightColor: '#94a3b8' },
    1: { label: '晴れ', icon: 'fa-sun', night: 'fa-moon', color: '#f59e0b', nightColor: '#94a3b8' },
    2: { label: '一部曇り', icon: 'fa-cloud-sun', night: 'fa-cloud-moon', color: '#f59e0b', nightColor: '#94a3b8' },
    3: { label: '曇り', icon: 'fa-cloud', night: 'fa-cloud', color: '#94a3b8', nightColor: '#94a3b8' },
    45: { label: '霧', icon: 'fa-smog', night: 'fa-smog', color: '#9ca3af', nightColor: '#9ca3af' },
    48: { label: '霧氷', icon: 'fa-smog', night: 'fa-smog', color: '#9ca3af', nightColor: '#9ca3af' },
    51: { label: '弱い霧雨', icon: 'fa-cloud-rain', night: 'fa-cloud-rain', color: '#3b82f6', nightColor: '#3b82f6' },
    53: { label: '霧雨', icon: 'fa-cloud-rain', night: 'fa-cloud-rain', color: '#3b82f6', nightColor: '#3b82f6' },
    55: { label: '強い霧雨', icon: 'fa-cloud-rain', night: 'fa-cloud-rain', color: '#3b82f6', nightColor: '#3b82f6' },
    56: { label: '着氷性の霧雨', icon: 'fa-cloud-rain', night: 'fa-cloud-rain', color: '#3b82f6', nightColor: '#3b82f6' },
    57: { label: '強い着氷性の霧雨', icon: 'fa-cloud-rain', night: 'fa-cloud-rain', color: '#3b82f6', nightColor: '#3b82f6' },
    61: { label: '弱い雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    63: { label: '雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    65: { label: '強い雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    66: { label: '着氷性の雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    67: { label: '強い着氷性の雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    71: { label: '弱い雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    73: { label: '雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    75: { label: '強い雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    77: { label: '霧雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    80: { label: 'にわか雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    81: { label: 'にわか雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    82: { label: '激しいにわか雨', icon: 'fa-cloud-showers-heavy', night: 'fa-cloud-showers-heavy', color: '#2563eb', nightColor: '#2563eb' },
    85: { label: 'にわか雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    86: { label: '激しいにわか雪', icon: 'fa-snowflake', night: 'fa-snowflake', color: '#38bdf8', nightColor: '#38bdf8' },
    95: { label: '雷雨', icon: 'fa-bolt', night: 'fa-bolt', color: '#a855f7', nightColor: '#a855f7' },
    96: { label: '雷雨(ひょう)', icon: 'fa-bolt', night: 'fa-bolt', color: '#a855f7', nightColor: '#a855f7' },
    99: { label: '雷雨(ひょう)', icon: 'fa-bolt', night: 'fa-bolt', color: '#a855f7', nightColor: '#a855f7' }
  };

  function getWeatherInfo(code, isDay) {
    const entry = WMO_WEATHER[code] || { label: '不明', icon: 'fa-question', night: 'fa-question', color: '#94a3b8', nightColor: '#94a3b8' };
    return { label: entry.label, icon: isDay ? entry.icon : entry.night, color: isDay ? entry.color : entry.nightColor };
  }

  async function fetchWeather() {
    return fetchWithRetry(async () => {
      const cityCoordsResponse = await fetch('json/city_coords.json');
      const cityCoords = await cityCoordsResponse.json();
      const sapporoEntry = cityCoords.find(([title]) => title === '札幌');
      let cityLabel = sapporoEntry ? sapporoEntry[0] : '札幌';
      let lat = sapporoEntry ? sapporoEntry[1] : 43.0618;
      let lon = sapporoEntry ? sapporoEntry[2] : 141.3545;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        let closestCity = null;
        let minDistance = Infinity;
        const DISTANCE_THRESHOLD_KM = 200;
        function haversineDistance(lat1, lon1, lat2, lon2) {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }
        for (const [title, cityLat, cityLon] of cityCoords) {
          const distance = haversineDistance(userLat, userLon, cityLat, cityLon);
          if (distance < minDistance) { minDistance = distance; closestCity = { name: title, lat: cityLat, lon: cityLon }; }
        }
        if (closestCity && minDistance <= DISTANCE_THRESHOLD_KM) {
          cityLabel = closestCity.name;
          lat = closestCity.lat;
          lon = closestCity.lon;
        }
      } catch {
      }

      const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=7`;
      const r = await fetch(weatherApiUrl);
      const data = await r.json();
      weatherContainer.className = 'space-y-5';
      weatherContainer.innerHTML = '';
      document.querySelector('#weather-container').previousElementSibling.textContent = `${cityLabel}の天気`;

      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

      const current = data.current;
      const currentInfo = getWeatherInfo(current.weather_code, current.is_day === 1);
      const currentEl = document.createElement('div');
      currentEl.className = 'weather-current';
      currentEl.innerHTML = `<i class="fas ${currentInfo.icon} weather-current-icon" style="color:${currentInfo.color}"></i><div class="weather-current-temp">${Math.round(current.temperature_2m)}°C</div><div class="weather-current-label">${currentInfo.label}</div>`;
      weatherContainer.appendChild(currentEl);

      const now = new Date();
      const hourlyStartIndex = data.hourly.time.findIndex(t => new Date(t) >= now);
      const startIdx = hourlyStartIndex === -1 ? 0 : hourlyStartIndex;
      const hourlyEl = document.createElement('div');
      hourlyEl.className = 'weather-hourly-scroll';
      for (let i = startIdx; i < startIdx + 24 && i < data.hourly.time.length; i++) {
        const hourDate = new Date(data.hourly.time[i]);
        const hourInfo = getWeatherInfo(data.hourly.weather_code[i], hourDate.getHours() >= 6 && hourDate.getHours() < 18);
        const hourLabel = i === startIdx ? '現在' : `${hourDate.getHours()}時`;
        const card = document.createElement('div');
        card.className = 'weather-hourly-item';
        card.innerHTML = `<p class="weather-hourly-time">${hourLabel}</p><i class="fas ${hourInfo.icon} weather-hourly-icon" style="color:${hourInfo.color}"></i><p class="weather-hourly-temp">${Math.round(data.hourly.temperature_2m[i])}°C</p>`;
        hourlyEl.appendChild(card);
      }
      weatherContainer.appendChild(hourlyEl);

      const dailyEl = document.createElement('div');
      dailyEl.className = 'weather-daily-list';
      data.daily.time.forEach((dateStr, i) => {
        const dayDate = new Date(dateStr);
        const dayInfo = getWeatherInfo(data.daily.weather_code[i], true);
        const dateLabel = i === 0 ? '今日' : `${dayDate.getDate()}日（${weekdays[dayDate.getDay()]}）`;
        const row = document.createElement('div');
        row.className = 'weather-daily-item';
        row.innerHTML = `<span class="weather-daily-date">${dateLabel}</span><i class="fas ${dayInfo.icon} weather-daily-icon" style="color:${dayInfo.color}"></i><span class="weather-daily-label">${dayInfo.label}</span><span class="weather-daily-temps"><span class="md-tertiary-text">${Math.round(data.daily.temperature_2m_min[i])}°C</span> / <span class="md-error-text">${Math.round(data.daily.temperature_2m_max[i])}°C</span></span>`;
        dailyEl.appendChild(row);
      });
      weatherContainer.appendChild(dailyEl);

      return true;
    }, weatherContainer, '天気情報を取得中...', '天気情報の取得に失敗しました。', 2, 1500);
  }

  const AIRCON_MODE_LABELS = { auto: '自動', blow: '送風', cool: '冷房', dry: '除湿', warm: '暖房' };

  async function fetchRoomTemp() {
    return fetchWithRetry(async () => {
      const r = await fetch(ROOM_TEMP_API_URL);
      const data = await r.json();
      if (!data.success || !data.devices || data.devices.length === 0) throw new Error('room temp fetch failed');
      roomTempContainer.innerHTML = '';
      data.devices.forEach(device => {
        const updated = device.updated_at ? new Date(device.updated_at) : null;
        const timeLabel = updated ? `${String(updated.getHours()).padStart(2, '0')}:${String(updated.getMinutes()).padStart(2, '0')}時点` : '';
        const el = document.createElement('div');
        el.className = 'md-tile';
        el.innerHTML = `<p class="md-title-medium">${device.name}</p><p class="text-3xl font-bold accent-text my-2">${device.temperature !== null ? device.temperature + '°C' : '--'}</p><p class="text-sm md-on-surface-variant">${timeLabel}</p>`;
        roomTempContainer.appendChild(el);
      });
      if (Array.isArray(data.aircons)) {
        data.aircons.forEach(aircon => {
          const el = document.createElement('div');
          el.className = 'md-tile';
          const statusLabel = aircon.on ? 'オン' : 'オフ';
          const modeLabel = aircon.on ? (AIRCON_MODE_LABELS[aircon.mode] ?? aircon.mode ?? '--') : '';
          const tempLabel = aircon.on && aircon.temp !== null && aircon.temp !== '' ? `${aircon.temp}°C` : '';
          const detailLabel = aircon.on ? [modeLabel, tempLabel].filter(Boolean).join(' / ') : '';
          el.innerHTML = `<p class="md-title-medium">${aircon.name}</p><p class="text-3xl font-bold accent-text my-2">${statusLabel}</p><p class="text-sm md-on-surface-variant">${detailLabel}</p>`;
          roomTempContainer.appendChild(el);
        });
      }
      return true;
    }, roomTempContainer, '室温情報を取得中...', '室温情報の取得に失敗しました。', 2, 1500);
  }

  async function fetchNews() {
    return fetchWithRetry(async () => {
      const r = await fetch(`${CORS_PROXY}${encodeURIComponent(newsRssUrl)}`);
      const txt = await r.text();
      const xml = new DOMParser().parseFromString(txt, 'text/xml');
      let items = Array.from(xml.querySelectorAll('item')).map(item => {
        let title = item.querySelector('title')?.textContent;
        const link = item.querySelector('link')?.textContent;
        const pubDate = item.querySelector('pubDate')?.textContent;
        let source = item.querySelector('source')?.textContent;
        let description = item.querySelector('description')?.textContent || '';
        if (title) {
          const lastParenMatch = title.match(/\(([^()]+)\)$/);
          if (lastParenMatch) { source = lastParenMatch[1]; title = title.substring(0, lastParenMatch.index).trim(); }
        }
        if (title && source) { const suffix = ` - ${source}`; if (title.endsWith(suffix)) title = title.substring(0, title.length - suffix.length); }
        description = description.replace(/^【[^】]*＝\d{4}\/\d{1,2}\/\d{1,2}】/, '').trim();
        return { title, link, pubDate, source, description };
      }).filter(item => item.title && item.link && item.pubDate);
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      items = items.slice(0, 20);
      newsContainer.innerHTML = '';
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      for (const item of items) {
        let formattedDate = '';
        if (item.pubDate) {
          const d = new Date(item.pubDate);
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const weekday = weekdays[d.getDay()];
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          formattedDate = `${month}月${day}日(${weekday}) ${hours}:${minutes}`;
        }
        const a = document.createElement('a');
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.referrerPolicy = 'no-referrer';
        a.className = 'news-item block transition-colors duration-300';
        const innerWrapper = document.createElement('div');
        innerWrapper.className = 'news-item-inner';
        const ogpImageContainer = document.createElement('div');
        ogpImageContainer.className = 'news-ogp-image-container';
        innerWrapper.appendChild(ogpImageContainer);
        const textContent = document.createElement('div');
        textContent.className = 'news-text-content';
        textContent.innerHTML = `<p class="md-title-medium">${item.title}</p><p class="text-base md-on-surface-variant mt-1 line-clamp-3">${item.description}</p><p class="text-sm md-on-surface-variant mt-1">${formattedDate}</p>`;
        innerWrapper.appendChild(textContent);
        a.appendChild(innerWrapper);
        newsContainer.appendChild(a);
        (async () => {
          const imageUrl = await fetchOgpImageWithRetry(item.link, 2, 800);
          if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = item.title;
            img.className = 'news-ogp-image';
            img.referrerPolicy = 'no-referrer';
            img.onerror = () => { if (ogpImageContainer.parentNode) ogpImageContainer.remove(); };
            ogpImageContainer.appendChild(img);
          } else {
            if (ogpImageContainer.parentNode) ogpImageContainer.remove();
          }
        })();
      }
      return true;
    }, newsContainer, 'ニュースを取得中...', 'ニュースの取得に失敗しました。', 2, 1500);
  }

  async function fetchAnniversaries() {
    return fetchWithRetry(async () => {
      const response = await fetch('json/anniversary.json');
      const data = await response.json();
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const monthKey = `${month}月`;
      const dayKey = `${day}日`;
      const anniversaryContainer = document.getElementById('anniversary-container');
      anniversaryContainer.innerHTML = '';
      if (data[monthKey] && data[monthKey][dayKey]) {
        const anniversaries = data[monthKey][dayKey];
        const ul = document.createElement('ul');
        ul.className = 'list-disc list-inside';
        anniversaries.forEach(anniversary => { const li = document.createElement('li'); li.textContent = anniversary; ul.appendChild(li); });
        anniversaryContainer.appendChild(ul);
      } else {
        anniversaryContainer.innerHTML = '<div class="text-center">今日は特別な記念日はありません。</div>';
      }
      return true;
    }, document.getElementById('anniversary-container'), '記念日情報を取得中...', '記念日情報の取得に失敗しました。', 2, 1000);
  }

  function jsonp(url, params = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_cb_' + Date.now();
      params.callback = callbackName;
      const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
      const fullUrl = url + (url.includes('?') ? '&' : '?') + query;
      const script = document.createElement('script');
      script.src = fullUrl;
      let timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, timeout);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      window[callbackName] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('JSONP script error')); };
      document.body.appendChild(script);
    });
  }

  async function fetchGoogleSuggestionsJSONP(query) {
    if (!query) return [];
    const url = 'https://suggestqueries.google.com/complete/search';
    try {
      const data = await jsonp(url, { client: 'firefox', hl: 'ja', q: query }, 4000);
      if (Array.isArray(data) && Array.isArray(data[1])) return data[1].map(item => typeof item === 'string' ? item : (Array.isArray(item) ? item[0] : String(item)));
      return [];
    } catch { return []; }
  }

  async function fetchTrendsData() {
    try {
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(TRENDS_URL)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      trendsData = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 10).map(item => ({ title: item.querySelector('title')?.textContent, link: item.querySelector('link')?.textContent }));
      updateTrendsDisplay(overlaySuggestions);
      updateTrendsDisplay(mainSuggestions);
    } catch (error) { trendsData = null; }
  }

  function updateTrendsDisplay(container) {
    let trendsEl = container.querySelector('#trends-container');
    if (trendsEl && trendsData) renderTrends(trendsData.slice(0, 10), trendsEl);
  }

  function renderTrends(items, trendsEl) {
    trendsEl.innerHTML = '<p class="text-sm md-on-surface-variant mb-2 pl-2">現在のトレンド</p>';
    items.forEach((item, index) => {
      if (item.title && item.link) {
        const trendItem = document.createElement('div');
        trendItem.className = `p-2 cursor-pointer md-state-hover md-suggestion-item transition-colors duration-150 flex items-center`;
        if (index < items.length - 1) trendItem.classList.add('md-outline-divider');
        trendItem.innerHTML = `<i class="fas fa-chart-line md-on-surface-variant mr-2"></i><span>${item.title}</span>`;
        trendItem.addEventListener('click', () => { doSearch(item.title); });
        trendsEl.appendChild(trendItem);
      }
    });
  }

  function renderSuggestions(list, container, isHistory = false, query = '', calcResult = null) {
    container.innerHTML = '';
    if (calcResult !== null) {
      const calcItem = document.createElement('div');
      calcItem.className = 'p-2 cursor-pointer md-state-hover md-suggestion-item transition-colors duration-150 flex items-center font-semibold';
      calcItem.innerHTML = `<i class="fas fa-equals md-on-surface-variant mr-2"></i><span>= ${calcResult}</span>`;
      calcItem.addEventListener('click', () => {
        if (container === overlaySuggestions) { overlayInput.value = String(calcResult); toggleClearButton(overlayInput.value, overlayClearButton); }
        else { mainInput.value = String(calcResult); toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); }
        doSearch(String(calcResult));
      });
      container.appendChild(calcItem);
    }
    const filteredList = calcResult !== null ? list.filter(s => s.trim() !== `= ${calcResult}`) : list;
    if (filteredList && filteredList.length > 0) {
      filteredList.forEach((s, index) => {
        const item = document.createElement('div');
        if (isHistory) {
          item.className = `p-2 cursor-pointer md-state-hover md-suggestion-item transition-colors duration-150 flex items-center justify-between group`;
          item.addEventListener('click', () => {
            if (container === overlaySuggestions) { overlayInput.value = s; toggleClearButton(overlayInput.value, overlayClearButton); }
            else { mainInput.value = s; toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); }
            doSearch(s);
          });
          const searchIcon = document.createElement('div');
          searchIcon.className = 'flex items-center flex-grow';
          searchIcon.innerHTML = `<i class="fas fa-history md-on-surface-variant mr-2"></i><span>${s}</span>`;
          item.appendChild(searchIcon);
          const deleteButton = document.createElement('i');
          deleteButton.className = 'fas fa-times history-delete-button';
          deleteButton.addEventListener('click', (e) => { e.stopPropagation(); deleteSearchHistory(s); renderSearchHistory(container); });
          item.appendChild(deleteButton);
        } else {
          item.className = `p-2 cursor-pointer md-state-hover md-suggestion-item transition-colors duration-150 flex items-center`;
          item.innerHTML = `<i class="fas fa-search md-on-surface-variant mr-2"></i><span>${s}</span>`;
          item.addEventListener('click', () => {
            if (container === overlaySuggestions) { overlayInput.value = s; toggleClearButton(overlayInput.value, overlayClearButton); }
            else { mainInput.value = s; toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); }
            doSearch(s);
          });
        }
        if (index < filteredList.length - 1) item.classList.add('md-outline-divider');
        container.appendChild(item);
      });
    }
    if (isHistory && filteredList.length > 0) {
      const clearButtonWrapper = document.createElement('div');
      clearButtonWrapper.className = 'mt-2 px-2';
      const clearButton = document.createElement('button');
      clearButton.id = 'clear-all-history-button';
      clearButton.className = 'w-full p-2 text-sm text-center rounded-full transition-colors';
      clearButton.textContent = '検索履歴をすべて消去';
      clearButton.addEventListener('click', clearAllSearchHistory);
      clearButtonWrapper.appendChild(clearButton);
      container.appendChild(clearButtonWrapper);
    }
    if (query === '') {
      const trendsEl = document.createElement('div');
      trendsEl.id = 'trends-container';
      trendsEl.className = 'pt-2';
      container.appendChild(trendsEl);
      if (trendsData) renderTrends(trendsData.slice(0, 10), trendsEl);
      else trendsEl.innerHTML = '<p class="text-sm md-on-surface-variant mb-2 pl-2">現在のトレンドを取得中...</p>';
    }
    container.classList.remove('hidden');
    container.classList.add('no-pointer-events');
    setTimeout(() => { container.classList.remove('no-pointer-events'); }, 100);
  }

  function getSearchHistory() {
    try { const history = localStorage.getItem(HISTORY_KEY); return history ? JSON.parse(history) : []; } catch { return []; }
  }
  function saveSearchHistory(query) {
    if (!query) return;
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
  function deleteSearchHistory(queryToDelete) {
    let history = getSearchHistory();
    history = history.filter(item => item !== queryToDelete);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
  function clearAllSearchHistory() {
    if (window.confirm("検索履歴をすべて消去してよろしいですか？")) {
      localStorage.removeItem(HISTORY_KEY);
      renderSearchHistory(mainSuggestions);
      renderSearchHistory(overlaySuggestions);
      mainSuggestions.classList.add('hidden');
      overlaySuggestions.classList.add('hidden');
    }
  }
  function renderSearchHistory(container) {
    const history = getSearchHistory();
    const inputElement = (container === mainSuggestions) ? mainInput : overlayInput;
    renderSuggestions(history, container, true, inputElement.value.trim());
  }
  function doSearch(q) {
    if (!q) return;
    saveSearchHistory(q);
    window.open(`https://search.yahoo.co.jp/search?p=${encodeURIComponent(q)}`, '_blank');
    closeOverlay();
    mainSuggestions.classList.add('hidden');
  }
  function debounce(fn, wait = 200) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
  function evaluateCalculation(query) {
    let sanitized = query.trim().replace(/=+$/, '').trim();
    sanitized = sanitized.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '');
    if (!sanitized) return null;
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return null;
    if (!/[+\-*/]/.test(sanitized.replace(/^-/, ''))) return null;
    if (/[+\-*/.]{2,}|[+\-*/.]$/.test(sanitized)) return null;
    try {
      const result = Function(`"use strict";return (${sanitized})`)();
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Number.isInteger(result) ? result : Math.round(result * 1e6) / 1e6;
    } catch { return null; }
  }
  const onInput = debounce(async (evt, container) => {
    const q = evt.target.value.trim();
    if (!q) { renderSearchHistory(container); return; }
    const calcResult = evaluateCalculation(q);
    const suggestions = await fetchGoogleSuggestionsJSONP(q);
    renderSuggestions(suggestions, container, false, q, calcResult);
  }, 180);
  function toggleClearButton(query, clearButton, qrButton) {
    if (query.length > 0) {
      clearButton.classList.remove('hidden');
      if (qrButton) qrButton.classList.add('hidden');
    } else {
      clearButton.classList.add('hidden');
      if (qrButton) qrButton.classList.remove('hidden');
    }
  }
  function openMobileSearchOverlay(query = '') {
    lastScrollPosition = window.scrollY;
    document.body.style.top = `-${lastScrollPosition}px`;
    document.body.classList.add('no-scroll');
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
    overlayInput.value = query;
    if (query) onInput({ target: { value: query } }, overlaySuggestions);
    else renderSearchHistory(overlaySuggestions);
    toggleClearButton(overlayInput.value, overlayClearButton);
    overlayInput.focus();
  }
  mainInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) openMobileSearchOverlay(mainInput.value);
    else { if (mainInput.value.trim() === '') renderSearchHistory(mainSuggestions); }
    toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain);
  });
  mainInput.addEventListener('blur', () => { if (window.innerWidth > 768) { mainSuggestions.classList.add('hidden'); toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); } });
  mainInput.addEventListener('input', (e) => { onInput(e, mainSuggestions); toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); });
  mainSuggestions.addEventListener('mousedown', (e) => { e.preventDefault(); });
  mainClearButton.addEventListener('click', () => {
    mainInput.value = '';
    if (window.innerWidth > 768) { mainInput.focus(); mainSuggestions.classList.add('hidden'); }
    toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain);
    renderSearchHistory(mainSuggestions);
  });
  overlayInput.addEventListener('focus', () => { if (overlayInput.value.trim() === '') renderSearchHistory(overlaySuggestions); toggleClearButton(overlayInput.value, overlayClearButton); });
  overlayInput.addEventListener('input', (e) => { onInput(e, overlaySuggestions); toggleClearButton(overlayInput.value, overlayClearButton); });
  overlaySuggestions.addEventListener('mousedown', (e) => { e.preventDefault(); });
  cancelButton.addEventListener('click', closeOverlay);
  overlayClearButton.addEventListener('click', () => { overlayInput.value = ''; overlayInput.focus(); renderSearchHistory(overlaySuggestions); overlayClearButton.classList.add('hidden'); });
  function closeOverlay() {
    overlay.style.display = 'none';
    mainInput.value = '';
    mainSuggestions.innerHTML = '';
    mainClearButton.classList.add('hidden');
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, lastScrollPosition);
  }
  window.addEventListener('resize', () => { toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain); toggleClearButton(overlayInput.value, overlayClearButton); });
  toggleClearButton(mainInput.value, mainClearButton, qrScanButtonMain);

  const searchWrapperObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) stickySearchBar.classList.add('visible');
      else stickySearchBar.classList.remove('visible');
    });
  }, { threshold: 0 });
  searchWrapperObserver.observe(searchWrapper);
  stickyInput.addEventListener('click', () => { openMobileSearchOverlay(mainInput.value); });

  fetchAnniversaries();
  fetchRoomTemp();
  fetchWeather();
  fetchNews();
  fetchTrendsData().then(() => {
    if (!mainSuggestions.classList.contains('hidden')) renderSearchHistory(mainSuggestions);
    if (!overlaySuggestions.classList.contains('hidden')) renderSearchHistory(overlaySuggestions);
  });

  const qrScanButtonSticky = document.getElementById('qr-scan-button-sticky');
  const qrOverlay = document.getElementById('qr-overlay');
  const qrCancelButton = document.getElementById('qr-cancel-button');
  const qrScanSection = document.getElementById('qr-scan-section');
  const qrResultSection = document.getElementById('qr-result-section');
  const qrResultText = document.getElementById('qr-result-text');
  const qrResultCancel = document.getElementById('qr-result-cancel');
  const qrResultOpen = document.getElementById('qr-result-open');
  const qrVideo = document.getElementById('qr-video');
  const qrCanvas = document.getElementById('qr-canvas');
  const qrStatus = document.getElementById('qr-status');
  let qrStream = null;
  let qrScanning = false;
  let qrPendingValue = null;
  let qrBarcodeDetector = null;
  let qrJsQrLoadPromise = null;
  if ('BarcodeDetector' in window) {
    try { qrBarcodeDetector = new BarcodeDetector({ formats: ['qr_code'] }); } catch { qrBarcodeDetector = null; }
  }
  function loadJsQR() {
    if (window.jsQR) return Promise.resolve();
    if (qrJsQrLoadPromise) return qrJsQrLoadPromise;
    qrJsQrLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload = () => resolve();
      script.onerror = () => { qrJsQrLoadPromise = null; reject(new Error('jsQR load failed')); };
      document.head.appendChild(script);
    });
    return qrJsQrLoadPromise;
  }
  function isLikelyUrl(text) {
    try { new URL(text); return true; } catch { return /^[\w-]+(\.[\w-]+)+(\/[^\s]*)?$/i.test(text); }
  }
  function normalizeUrl(text) {
    try { return new URL(text).href; } catch { return `https://${text}`; }
  }
  function handleQrResult(result) {
    if (!result) return;
    const value = result.trim();
    if (!value) return;
    stopCamera();
    qrPendingValue = value;
    qrResultText.textContent = value;
    qrScanSection.classList.add('hidden');
    qrResultSection.classList.remove('hidden');
  }
  function openPendingResult() {
    if (!qrPendingValue) return;
    const value = qrPendingValue;
    stopQrScan();
    if (isLikelyUrl(value)) window.open(normalizeUrl(value), '_blank', 'noopener,noreferrer');
    else doSearch(value);
  }
  async function startQrScan() {
    qrPendingValue = null;
    qrResultSection.classList.add('hidden');
    qrScanSection.classList.remove('hidden');
    if (!window.isSecureContext) {
      qrVideo.classList.add('hidden');
      qrStatus.textContent = 'カメラの利用にはHTTPS接続が必要です。';
      qrOverlay.style.display = 'flex';
      qrOverlay.classList.remove('hidden');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      qrVideo.classList.add('hidden');
      qrStatus.textContent = 'このブラウザはカメラ機能に対応していません。';
      qrOverlay.style.display = 'flex';
      qrOverlay.classList.remove('hidden');
      return;
    }
    qrStatus.textContent = 'カメラを起動しています...';
    qrOverlay.style.display = 'flex';
    qrOverlay.classList.remove('hidden');
    if (!qrBarcodeDetector) {
      try { await loadJsQR(); } catch {
        qrStatus.textContent = 'QR読み取りライブラリの読み込みに失敗しました。通信環境をご確認ください。';
        return;
      }
    }
    qrVideo.classList.remove('hidden');
    try {
      qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (error) {
      stopQrScan();
      alert('カメラへのアクセスが許可されていないため、QRコードを読み取れません。ブラウザの設定でカメラへのアクセスを許可してから、もう一度お試しください。');
      return;
    }
    const onReady = () => {
      qrVideo.play().catch(() => {});
      if (qrScanning) return;
      qrScanning = true;
      qrStatus.textContent = 'QRコードにカメラを向けてください';
      requestAnimationFrame(scanQrFrame);
    };
    qrVideo.addEventListener('loadedmetadata', onReady, { once: true });
    qrVideo.srcObject = qrStream;
    if (qrVideo.readyState >= 1) onReady();
  }
  function stopCamera() {
    qrScanning = false;
    if (qrStream) { qrStream.getTracks().forEach(track => track.stop()); qrStream = null; }
    qrVideo.srcObject = null;
  }
  function stopQrScan() {
    stopCamera();
    qrPendingValue = null;
    qrOverlay.style.display = 'none';
    qrOverlay.classList.add('hidden');
  }
  async function scanQrFrame() {
    if (!qrScanning) return;
    if (qrVideo.readyState >= qrVideo.HAVE_CURRENT_DATA && qrVideo.videoWidth > 0) {
      if (qrBarcodeDetector) {
        try {
          const barcodes = await qrBarcodeDetector.detect(qrVideo);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) { handleQrResult(barcodes[0].rawValue); return; }
        } catch { qrBarcodeDetector = null; }
      } else if (window.jsQR) {
        qrCanvas.width = qrVideo.videoWidth;
        qrCanvas.height = qrVideo.videoHeight;
        const ctx = qrCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
        const imageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) { handleQrResult(code.data); return; }
      }
    }
    if (qrScanning) requestAnimationFrame(scanQrFrame);
  }
  if (qrScanButtonMain) qrScanButtonMain.addEventListener('click', (e) => { e.stopPropagation(); startQrScan(); });
  if (qrScanButtonSticky) qrScanButtonSticky.addEventListener('click', (e) => { e.stopPropagation(); startQrScan(); });
  qrCancelButton.addEventListener('click', stopQrScan);
  qrResultCancel.addEventListener('click', stopQrScan);
  qrResultOpen.addEventListener('click', openPendingResult);
  qrOverlay.addEventListener('click', (e) => { if (e.target === qrOverlay) stopQrScan(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && qrOverlay.style.display === 'flex') stopQrScan(); });

  const kanjiButton = document.getElementById('kanji-check-button');
  const kanjiOverlay = document.getElementById('kanji-overlay');
  const kanjiCancelButton = document.getElementById('kanji-cancel-button');
  const kanjiTextarea = document.getElementById('kanji-textarea');
  const kanjiClearButton = document.getElementById('kanji-clear-button');
  let lastScrollPositionKanji = 0;
  function openKanjiOverlay() {
    lastScrollPositionKanji = window.scrollY;
    document.body.style.top = `-${lastScrollPositionKanji}px`;
    document.body.classList.add('no-scroll');
    kanjiOverlay.style.display = 'flex';
    kanjiOverlay.classList.remove('hidden');
    kanjiTextarea.focus();
  }
  function closeKanjiOverlay() {
    kanjiOverlay.style.display = 'none';
    kanjiTextarea.value = '';
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, lastScrollPositionKanji);
  }
  kanjiButton.addEventListener('click', openKanjiOverlay);
  kanjiCancelButton.addEventListener('click', closeKanjiOverlay);
  kanjiClearButton.addEventListener('click', () => { kanjiTextarea.value = ''; kanjiTextarea.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && kanjiOverlay.style.display === 'flex') closeKanjiOverlay();
    if (e.key === 'Escape' && settingsOverlay.style.display === 'flex') closeSettingsOverlay();
  });
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsCancelButton = document.getElementById('settings-cancel-button');
  function openSettingsOverlay() {
    settingsOverlay.style.display = 'flex';
    settingsOverlay.classList.remove('hidden');
  }
  function closeSettingsOverlay() {
    settingsOverlay.style.display = 'none';
    settingsOverlay.classList.add('hidden');
  }
  settingsCancelButton.addEventListener('click', closeSettingsOverlay);
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettingsOverlay(); });
  themeSwatches.forEach(sw => {
    sw.addEventListener('click', () => { applyTheme(sw.dataset.theme); });
  });
  colorModeOptions.forEach(opt => {
    opt.addEventListener('click', () => { applyColorMode(opt.dataset.colorMode); });
  });
  function handleSearchSubmit(event) {
    event.preventDefault();
    const inputElement = event.target.querySelector('input[type="search"]');
    if (inputElement) doSearch(inputElement.value.trim());
  }
  const mainForm = document.getElementById('search-form-main');
  const overlayForm = document.getElementById('search-form-overlay');
  if (mainForm) mainForm.addEventListener('submit', handleSearchSubmit);
  if (overlayForm) overlayForm.addEventListener('submit', handleSearchSubmit);

  const bottomMenuItems = document.querySelectorAll('.bottom-menu-item');
  bottomMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.bottomAction;
      if (action === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
      else if (action === 'search') openMobileSearchOverlay();
      else if (action === 'weather') weatherContainer.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (action === 'news') newsContainer.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (action === 'settings') openSettingsOverlay();
    });
  });
}
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initApp();
  const preloader = document.getElementById('preloader');
  const mainContent = document.getElementById('main-content');
  setTimeout(() => {
    preloader.style.opacity = '0';
    preloader.addEventListener('transitionend', () => {
      preloader.style.display = 'none';
      mainContent.classList.remove('hidden');
      mainContent.style.pointerEvents = 'auto';
      window.scrollTo(0, 0);
    }, { once: true });
  }, 500);
});
