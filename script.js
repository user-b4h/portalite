function initApp() {
  const weatherContainer = document.getElementById('weather-container');
  const newsContainer = document.getElementById('news-container');
  const mainInput = document.getElementById('search-input-main');
  const mainSuggestions = document.getElementById('suggestions-container-main');
  const mainClearButton = document.getElementById('clear-button-main');
  const overlay = document.getElementById('search-overlay');
  const overlayInput = document.getElementById('search-input-overlay');
  const cancelButton = document.getElementById('cancel-button');
  const overlaySuggestions = document.getElementById('suggestions-container-overlay');
  const overlayClearButton = document.getElementById('clear-button-overlay');
  const newsRssUrl = 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRE5mTTJRU0FtVnVLQUFQAQ?hl=ja&gl=JP&ceid=JP:ja';
  const EARTHQUAKE_API_URL = 'https://api.p2pquake.net/v2/history?codes=551&limit=1';
  const HISTORY_KEY = 'search-history';
  const HISTORY_LIMIT = 20;
  const TRENDS_URL = 'https://trends.google.com/trending/rss?geo=JP';
  const CORS_PROXY = 'https://corsproxy.io/?url=';
  let trendsData = null;
  let lastScrollPosition = 0;
  const copyrightText = document.getElementById('copyright-text');
  const currentYear = new Date().getFullYear();
  copyrightText.innerHTML = `Updated on December 9, 2025<br>Copyright © ${currentYear} Portalite. All rights reserved.`;
  async function fetchWeather() {
    weatherContainer.innerHTML = '<div class="text-center col-span-3">天気情報を取得中...</div>';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      const cityCoordsResponse = await fetch('json/city_coords.json');
      const cityCoords = await cityCoordsResponse.json();
      let closestCity = null;
      let minDistance = Infinity;
      const DISTANCE_THRESHOLD_KM = 200;
      function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }
      for (const cityId in cityCoords) {
        const city = cityCoords[cityId];
        const distance = haversineDistance(userLat, userLon, city.lat, city.lon);
        if (distance < minDistance) {
          minDistance = distance;
          closestCity = {
            id: cityId,
            name: city.title,
            lat: city.lat,
            lon: city.lon
          };
        }
      }
      if (!closestCity || minDistance > DISTANCE_THRESHOLD_KM) {
        throw new Error('Distance too far or no closest city found, falling back to Sapporo.');
      }
      const weatherApiUrl = `https://weather.tsukumijima.net/api/forecast?city=${closestCity.id}`;
      const r = await fetch(weatherApiUrl);
      const data = await r.json();
      weatherContainer.innerHTML = '';
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      document.querySelector('#weather-container').previousElementSibling.textContent = `${closestCity.name}の天気`;
      data.forecasts.slice(0, 3).forEach(forecast => {
        const iconUrl = forecast.image.url;
        const forecastDate = new Date(forecast.date);
        const month = forecastDate.getMonth() + 1;
        const day = forecastDate.getDate();
        const weekday = weekdays[forecastDate.getDay()];
        const dateLabel = `${month}月${day}日(${weekday})`;
        const el = document.createElement('div');
        el.className = 'p-4 rounded-xl shadow-inner card';
        el.innerHTML = `
          <p class="text-lg sm:text-xl font-bold">${dateLabel}</p>
          <img src="${iconUrl}" alt="${forecast.telop}" class="w-16 h-16 mx-auto my-2" onerror="this.src='https://placehold.co/64x64/CCCCCC/FFFFFF?text=No+Icon';">
          <p class="text-base text-gray-500 dark:text-gray-400 mb-2">${forecast.telop}</p>
          <div class="flex justify-center items-center space-x-2 text-base">
            <span class="text-blue-500">最低: ${forecast.temperature.min?.celsius || '--'}°C</span>
            <span class="text-red-500">最高: ${forecast.temperature.max?.celsius || '--'}°C</span>
          </div>
        `;
        weatherContainer.appendChild(el);
      });
    } catch (error) {
      const sapporoCityId = '016010';
      const weatherApiUrl = `https://weather.tsukumijima.net/api/forecast?city=${sapporoCityId}`;
      try {
        const r = await fetch(weatherApiUrl);
        const data = await r.json();
        weatherContainer.innerHTML = '';
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        document.querySelector('#weather-container').previousElementSibling.textContent = `札幌の天気`;
        data.forecasts.slice(0, 3).forEach(forecast => {
          const iconUrl = forecast.image.url;
          const forecastDate = new Date(forecast.date);
          const month = forecastDate.getMonth() + 1;
          const day = forecastDate.getDate();
          const weekday = weekdays[forecastDate.getDay()];
          const dateLabel = `${month}月${day}日(${weekday})`;
          const el = document.createElement('div');
          el.className = 'p-4 rounded-xl shadow-inner card';
          el.innerHTML = `
            <p class="text-lg sm:text-xl font-bold">${dateLabel}</p>
            <img src="${iconUrl}" alt="${forecast.telop}" class="w-16 h-16 mx-auto my-2" onerror="this.src='https://placehold.co/64x64/CCCCCC/FFFFFF?text=No+Icon';">
            <p class="text-base text-gray-500 dark:text-gray-400 mb-2">${forecast.telop}</p>
            <div class="flex justify-center items-center space-x-2 text-base">
              <span class="text-blue-500">最低: ${forecast.temperature.min?.celsius || '--'}°C</span>
              <span class="text-red-500">最高: ${forecast.temperature.max?.celsius || '--'}°C</span>
            </div>
          `;
          weatherContainer.appendChild(el);
        });
      } catch (sapporoError) {
        weatherContainer.innerHTML = '<div class="text-center col-span-3 text-red-500">天気情報の取得に失敗しました。</div>';
      }
    }
  }
  async function fetchNews() {
    try {
      newsContainer.innerHTML = '<div class="text-center">ニュースを取得中...</div>';
      const r = await fetch(`${CORS_PROXY}${encodeURIComponent(newsRssUrl)}`);
      const txt = await r.text();
      const xml = new DOMParser().parseFromString(txt, 'text/xml');
      let items = Array.from(xml.querySelectorAll('item')).map(item => {
        let title = item.querySelector('title')?.textContent;
        const link = item.querySelector('link')?.textContent;
        const pubDate = item.querySelector('pubDate')?.textContent;
        const source = item.querySelector('source')?.textContent;
        if (title && source) {
            const suffix = ` - ${source}`;
            if (title.endsWith(suffix)) {
                title = title.substring(0, title.length - suffix.length);
            }
        }
        return {
          title,
          link,
          pubDate,
          source
        };
      }).filter(item => item.title && item.link && item.pubDate);
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      items = items.slice(0, 20);
      newsContainer.innerHTML = '';
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      items.forEach(item => {
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
        const sourceText = item.source ? `<span class="font-medium">${item.source}</span> / ` : '';
        const a = document.createElement('a');
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'news-item block transition-colors duration-300';
        a.innerHTML = `
          <p class="font-semibold text-lg sm:text-xl">${item.title}</p>
          <p class="text-base text-gray-500 dark:text-gray-400 mt-1">${sourceText}${formattedDate}</p>
        `;
        newsContainer.appendChild(a);
      });
    } catch {}
  }
  async function fetchEarthquakeData() {
    const earthquakeContainer = document.getElementById('earthquake-container');
    earthquakeContainer.innerHTML = '<div class="text-center">地震情報を取得中...</div>';
    const scaleMap = {
      10: '1', 20: '2', 30: '3', 40: '4', 
      45: '5弱', 50: '5強', 55: '6弱', 60: '6強', 
      70: '7'
    };
    try {
      const response = await fetch(EARTHQUAKE_API_URL);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      earthquakeContainer.innerHTML = '';
      if (data && data.length > 0) {
        const latestQuake = data[0];
        if (latestQuake.code !== 551) { 
             earthquakeContainer.innerHTML = '<div class="text-center">現在、最新の地震情報はありません。</div>';
             return;
        }
        const quakeData = latestQuake.earthquake;
        let timeStr = latestQuake.time; 
        
        timeStr = timeStr.replace(/\//g, '-'); 
        if (timeStr.includes(' ') && !timeStr.includes('T')) {
            timeStr = timeStr.replace(' ', 'T');
        }
        timeStr = timeStr.split(/[+Z.]/)[0];
        
        const d = new Date(timeStr);

        if (isNaN(d.getTime())) {
          earthquakeContainer.innerHTML = '<div class="text-center text-red-500">地震情報の発生日時を処理できませんでした。</div>';
          return;
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        const formattedDate = `${year}/${month}/${day} ${hour}:${minute}`;
        const magnitude = quakeData.hypocenter.magnitude || '不明'; 
        const hypocenter = quakeData.hypocenter.name || '不明';
        const maxScale = quakeData.maxScale;
        const maxSeismicIntensity = maxScale ? scaleMap[maxScale] || '不明' : '不明';
        
        const points = latestQuake.points || [];
        const shakenLocations = points
            .filter(p => p.scale > 0)
            .sort((a, b) => b.scale - a.scale)
            .map(p => `${p.addr} (震度${scaleMap[p.scale]})`)
            .join('、 ');

        const shakenLocationsHtml = shakenLocations 
            ? `<div class="text-sm text-gray-600 dark:text-gray-300 mt-2"><p class="font-bold mb-1">各地の震度:</p> <p>${shakenLocations}</p></div>`
            : '';

        const cardHtml = `
          <div class="earthquake-item p-4 rounded-xl shadow-inner card"> 
            <p class="font-bold text-xl sm:text-2xl mb-1">${hypocenter}で地震</p>
            <p class="text-lg text-red-600 dark:text-red-400 mb-2">最大震度: ${maxSeismicIntensity}</p>
            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-base text-gray-600 dark:text-gray-300">
              <span>M（規模）: ${magnitude}</span>
              <span class="mt-1 sm:mt-0">発生日時: ${formattedDate}</span>
            </div>
            ${shakenLocationsHtml} 
          </div>
        `;
        earthquakeContainer.innerHTML = cardHtml;
      } else {
        earthquakeContainer.innerHTML = '<div class="text-center">現在、最新の地震情報はありません。</div>';
      }
    } catch (error) {
      earthquakeContainer.innerHTML = '<div class="text-center text-red-500">地震情報の取得に失敗しました。</div>';
    }
  }
  async function fetchAnniversaries() {
    const anniversaryContainer = document.getElementById('anniversary-container');
    anniversaryContainer.innerHTML = '<div class="text-center">記念日情報を取得中...</div>';
    try {
      const response = await fetch('json/anniversary.json');
      const data = await response.json();
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const monthKey = `${month}月`;
      const dayKey = `${day}日`;
      anniversaryContainer.innerHTML = '';
      if (data[monthKey] && data[monthKey][dayKey]) {
        const anniversaries = data[monthKey][dayKey];
        const ul = document.createElement('ul');
        ul.className = 'list-disc list-inside';
        anniversaries.forEach(anniversary => {
          const li = document.createElement('li');
          li.textContent = anniversary;
          ul.appendChild(li);
        });
        anniversaryContainer.appendChild(ul);
      } else {
        anniversaryContainer.innerHTML = '<div class="text-center">今日は特別な記念日はありません。</div>';
      }
    } catch (error) {
      anniversaryContainer.innerHTML = '<div class="text-center text-red-500">記念日情報の取得に失敗しました。</div>';
    }
  }
  function jsonp(url, params = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_cb_' + Date.now();
      params.callback = callbackName;
      const query = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
      const fullUrl = url + (url.includes('?') ? '&' : '?') + query;
      const script = document.createElement('script');
      script.src = fullUrl;
      let timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeout);
      function cleanup() {
        clearTimeout(timer);
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP script error'));
      };
      document.body.appendChild(script);
    });
  }
  async function fetchGoogleSuggestionsJSONP(query) {
    if (!query) return [];
    const url = 'https://suggestqueries.google.com/complete/search';
    try {
      const data = await jsonp(url, {
        client: 'firefox',
        hl: 'ja',
        q: query
      }, 4000);
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1].map(item => typeof item === 'string' ? item : (Array.isArray(item) ? item[0] : String(item)));
      }
      return [];
    } catch {
      return [];
    }
  }
  async function fetchTrendsData() {
    try {
      const response = await fetch(`${CORS_PROXY}${encodeURIComponent(TRENDS_URL)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      trendsData = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 10).map(item => {
        const title = item.querySelector('title')?.textContent;
        const link = item.querySelector('link')?.textContent;
        return {
          title,
          link
        };
      });
      updateTrendsDisplay(overlaySuggestions);
      updateTrendsDisplay(mainSuggestions);
    } catch (error) {
      trendsData = null;
    }
  }
  function updateTrendsDisplay(container) {
    let trendsEl = container.querySelector('#trends-container');
    if (trendsEl && trendsData) {
      renderTrends(trendsData.slice(0, 10), trendsEl);
    }
  }
  function renderTrends(items, trendsEl) {
    trendsEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 mb-2 pl-2">現在のトレンド</p>';
    items.forEach((item, index) => {
      if (item.title && item.link) {
        const trendItem = document.createElement('div');
        trendItem.className = `p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 flex items-center`;
        if (index < items.length - 1) {
          trendItem.classList.add('border-b', 'border-gray-200', 'dark:border-gray-600');
        }
        trendItem.innerHTML = `<i class="fas fa-chart-line text-gray-400 mr-2"></i><span>${item.title}</span>`;
        trendItem.addEventListener('click', () => {
          doSearch(item.title);
        });
        trendsEl.appendChild(trendItem);
      }
    });
  }
  function renderSuggestions(list, container, isHistory = false, query = '') {
    container.innerHTML = '';
    if (list && list.length > 0) {
      list.forEach((s, index) => {
        const item = document.createElement('div');
        if (isHistory) {
          item.className = `p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 flex items-center justify-between group`;
          item.addEventListener('click', () => {
            if (container === overlaySuggestions) {
              overlayInput.value = s;
              toggleClearButton(overlayInput.value, overlayClearButton);
            } else {
              mainInput.value = s;
              toggleClearButton(mainInput.value, mainClearButton);
            }
            doSearch(s);
          });
          const searchIcon = document.createElement('div');
          searchIcon.className = 'flex items-center flex-grow';
          searchIcon.innerHTML = `<i class="fas fa-history text-gray-400 mr-2"></i><span>${s}</span>`;
          item.appendChild(searchIcon);
          const deleteButton = document.createElement('i');
          deleteButton.className = 'fas fa-times history-delete-button';
          deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSearchHistory(s);
            renderSearchHistory(container);
          });
          item.appendChild(deleteButton);
        } else {
          item.className = `p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 flex items-center`;
          item.innerHTML = `<i class="fas fa-search text-gray-400 mr-2"></i><span>${s}</span>`;
          item.addEventListener('click', () => {
            if (container === overlaySuggestions) {
              overlayInput.value = s;
              toggleClearButton(overlayInput.value, overlayClearButton);
            } else {
              mainInput.value = s;
              toggleClearButton(mainInput.value, mainClearButton);
            }
            doSearch(s);
          });
        }
        if (index < list.length - 1) {
          item.classList.add('border-b', 'border-gray-200', 'dark:border-gray-600');
        }
        container.appendChild(item);
      });
    }
    if (isHistory && list.length > 0) {
      const clearButtonWrapper = document.createElement('div');
      clearButtonWrapper.className = 'mt-2 px-2';
      const clearButton = document.createElement('button');
      clearButton.id = 'clear-all-history-button';
      clearButton.className = 'w-full p-2 text-sm text-center text-red-500 rounded-lg bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors';
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
      if (trendsData) {
        renderTrends(trendsData.slice(0, 10), trendsEl);
      } else {
        trendsEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 mb-2 pl-2">現在のトレンドを取得中...</p>';
      }
    }
    container.classList.remove('hidden');
    container.classList.add('no-pointer-events');
    setTimeout(() => {
      container.classList.remove('no-pointer-events');
    }, 100);
  }
  function getSearchHistory() {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }
  function saveSearchHistory(query) {
    if (!query) return;
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > HISTORY_LIMIT) {
      history = history.slice(0, HISTORY_LIMIT);
    }
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
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
  const onInput = debounce(async (evt, container) => {
    const q = evt.target.value.trim();
    if (!q) {
      renderSearchHistory(container);
      return;
    }
    const suggestions = await fetchGoogleSuggestionsJSONP(q);
    renderSuggestions(suggestions, container, false, q);
  }, 180);
  function toggleClearButton(query, clearButton) {
    if (query.length > 0) {
      clearButton.classList.remove('hidden');
    } else {
      clearButton.classList.add('hidden');
    }
  }
  function openMobileSearchOverlay(query = '') {
    lastScrollPosition = window.scrollY;
    document.body.style.top = `-${lastScrollPosition}px`;
    document.body.classList.add('no-scroll');
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
    overlayInput.value = query;
    if (query) {
      onInput({
        target: {
          value: query
        }
      }, overlaySuggestions);
    } else {
      renderSearchHistory(overlaySuggestions);
    }
    toggleClearButton(overlayInput.value, overlayClearButton);
    overlayInput.focus();
  }
  mainInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) {
      openMobileSearchOverlay(mainInput.value);
    } else {
      if (mainInput.value.trim() === '') {
        renderSearchHistory(mainSuggestions);
      }
    }
    toggleClearButton(mainInput.value, mainClearButton);
  });
  mainInput.addEventListener('blur', () => {
    if (window.innerWidth > 768) {
      mainSuggestions.classList.add('hidden');
      toggleClearButton(mainInput.value, mainClearButton);
    }
  });
  mainInput.addEventListener('input', (e) => {
    onInput(e, mainSuggestions);
    toggleClearButton(mainInput.value, mainClearButton);
  });
  mainSuggestions.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
  mainClearButton.addEventListener('click', () => {
    mainInput.value = '';
    if (window.innerWidth > 768) {
      mainInput.focus();
      mainSuggestions.classList.add('hidden');
    }
    toggleClearButton(mainInput.value, mainClearButton);
    renderSearchHistory(mainSuggestions);
  });
  overlayInput.addEventListener('focus', () => {
    if (overlayInput.value.trim() === '') {
      renderSearchHistory(overlaySuggestions);
    }
    toggleClearButton(overlayInput.value, overlayClearButton);
  });
  overlayInput.addEventListener('input', (e) => {
    onInput(e, overlaySuggestions);
    toggleClearButton(overlayInput.value, overlayClearButton);
  });
  overlaySuggestions.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
  cancelButton.addEventListener('click', closeOverlay);
  overlayClearButton.addEventListener('click', () => {
    overlayInput.value = '';
    overlayInput.focus();
    renderSearchHistory(overlaySuggestions);
    overlayClearButton.classList.add('hidden');
  });
  function closeOverlay() {
    overlay.style.display = 'none';
    mainInput.value = '';
    mainSuggestions.innerHTML = '';
    mainClearButton.classList.add('hidden');
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, lastScrollPosition);
  }
  window.addEventListener('resize', () => {
    toggleClearButton(mainInput.value, mainClearButton);
    toggleClearButton(overlayInput.value, overlayClearButton);
  });
  toggleClearButton(mainInput.value, mainClearButton);
  fetchWeather();
  fetchNews();
  fetchAnniversaries();
  fetchEarthquakeData();
  fetchTrendsData().then(() => {
    if (!mainSuggestions.classList.contains('hidden')) {
      renderSearchHistory(mainSuggestions);
    }
    if (!overlaySuggestions.classList.contains('hidden')) {
      renderSearchHistory(overlaySuggestions);
    }
  });
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
  function updateKanjiCharCount() {
    const len = kanjiTextarea.value.length;
  }
  kanjiButton.addEventListener('click', openKanjiOverlay);
  kanjiCancelButton.addEventListener('click', closeKanjiOverlay);
  kanjiTextarea.addEventListener('input', updateKanjiCharCount);
  kanjiClearButton.addEventListener('click', () => {
    kanjiTextarea.value = '';
    kanjiTextarea.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && kanjiOverlay.style.display === 'flex') {
      closeKanjiOverlay();
    }
  });
  function handleSearchSubmit(event) {
    event.preventDefault();
    const inputElement = event.target.querySelector('input[type="search"]');
    if (inputElement) {
      doSearch(inputElement.value.trim());
    }
  }
  const mainForm = document.getElementById('search-form-main');
  const overlayForm = document.getElementById('search-form-overlay');
  if (mainForm) {
    mainForm.addEventListener('submit', handleSearchSubmit);
  }
  if (overlayForm) {
    overlayForm.addEventListener('submit', handleSearchSubmit);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  const preloader = document.getElementById('preloader');
  const mainContent = document.getElementById('main-content');
  setTimeout(() => {
    preloader.style.opacity = '0';
    preloader.addEventListener('transitionend', () => {
      preloader.style.display = 'none';
      mainContent.classList.remove('hidden');
      mainContent.style.pointerEvents = 'auto';
    }, {
      once: true
    });
  }, 500);
});
