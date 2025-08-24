function initApp() {
  const weatherContainer = document.getElementById('weather-container');
  const newsContainer = document.getElementById('news-container');
  const mainInput = document.getElementById('search-input-main');
  const mainButton = document.getElementById('search-button-main');
  const mainSuggestions = document.getElementById('suggestions-container-main');
  const mainClearButton = document.getElementById('clear-button-main');
  const overlay = document.getElementById('search-overlay');
  const overlayInput = document.getElementById('search-input-overlay');
  const overlaySearchButton = document.getElementById('overlay-search-button');
  const cancelButton = document.getElementById('cancel-button');
  const overlaySuggestions = document.getElementById('suggestions-container-overlay');
  const overlayClearButton = document.getElementById('clear-button-overlay');
  const newsRssUrl = 'https://www.nhk.or.jp/rss/news/cat0.xml';
  const HISTORY_KEY = 'search-history';
  const HISTORY_LIMIT = 10;
  let lastScrollPosition = 0;
  const copyrightText = document.getElementById('copyright-text');
  const currentYear = new Date().getFullYear();
  copyrightText.textContent = `Copyright © ${currentYear} Portalite. All rights reserved.`;

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
      const r = await fetch(newsRssUrl);
      const txt = await r.text();
      const xml = new DOMParser().parseFromString(txt, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).map(item => {
        const title = item.querySelector('title')?.textContent;
        const description = item.querySelector('description')?.textContent;
        const link = item.querySelector('link')?.textContent;
        const pubDate = item.querySelector('pubDate')?.textContent;
        return {
          title,
          description,
          link,
          pubDate
        };
      }).filter(item => item.title && item.link && item.pubDate);
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      newsContainer.innerHTML = '';
      items.forEach(item => {
        let formattedDate = '';
        if (item.pubDate) {
          const d = new Date(item.pubDate);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          formattedDate = `${year}年${month}月${day}日 ${hours}:${minutes}`;
        }
        const a = document.createElement('a');
        a.href = item.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'news-item block transition-colors duration-300';
        a.innerHTML = `
          <p class="font-semibold text-lg sm:text-xl">${item.title}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${formattedDate}</p>
          ${item.description ? `<p class="text-base text-gray-600 dark:text-gray-400 mt-1">${item.description}</p>` : ''}
        `;
        newsContainer.appendChild(a);
      });
    } catch {}
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
  function renderSuggestions(list, container, isHistory = false) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
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
  function renderSearchHistory(container) {
    const history = getSearchHistory();
    renderSuggestions(history, container, true);
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
    renderSuggestions(suggestions, container);
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
  mainButton.addEventListener('click', () => doSearch(mainInput.value.trim()));
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
  overlaySearchButton.addEventListener('click', () => doSearch(overlayInput.value.trim()));
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
    window.scrollTo(0, lastScrollPosition);
  }
  window.addEventListener('resize', () => {
    toggleClearButton(mainInput.value, mainClearButton);
    toggleClearButton(overlayInput.value, overlayClearButton);
  });
  const fixedSearchWrapper = document.getElementById('fixed-search-wrapper');
  const mainSearchContainer = document.getElementById('search-container-wrapper');
  const fixedInput = document.getElementById('search-input-fixed');
  const fixedClearButton = document.getElementById('clear-button-fixed');
  const fixedButton = document.getElementById('search-button-fixed');
  function handleScroll() {
    if (window.innerWidth <= 768) {
      const containerTop = mainSearchContainer.getBoundingClientRect().top;
      if (containerTop <= 0) {
        fixedSearchWrapper.classList.add('is-visible');
      } else {
        fixedSearchWrapper.classList.remove('is-visible');
      }
    } else {
      fixedSearchWrapper.classList.remove('is-visible');
    }
  }
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleScroll);
  fixedInput.addEventListener('focus', () => {
    openMobileSearchOverlay(fixedInput.value);
  });
  fixedInput.addEventListener('input', (e) => {
    toggleClearButton(fixedInput.value, fixedClearButton);
  });
  fixedClearButton.addEventListener('click', () => {
    fixedInput.value = '';
    fixedInput.focus();
    toggleClearButton(fixedInput.value, fixedClearButton);
  });
  fixedButton.addEventListener('click', () => doSearch(fixedInput.value.trim()));
  toggleClearButton(mainInput.value, mainClearButton);
  fetchWeather();
  fetchNews();
  fetchAnniversaries();
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
