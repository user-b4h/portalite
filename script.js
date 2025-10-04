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
  const kanjiButton = document.getElementById('kanji-button');
  const kanjiOverlay = document.getElementById('kanji-overlay');
  const kanjiCancelButton = document.getElementById('kanji-cancel-button');
  const kanjiTextarea = document.getElementById('kanji-textarea');
  const kanjiCharCount = document.getElementById('kanji-char-count');
  const kanjiClearButton = document.getElementById('kanji-clear-button');
  const newsRssUrl = 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRE5mTTJRU0FtVnVLQUFQAQ?hl=ja&gl=JP&ceid=JP:ja';
  const HISTORY_KEY = 'search-history';
  const HISTORY_LIMIT = 10;
  const TRENDS_URL = 'https://trends.google.com/trending/rss?geo=JP';
  const CORS_PROXY = 'https://corsproxy.io/?url=';
  let trendsData = null;
  let lastScrollPosition = 0;
  const copyrightText = document.getElementById('copyright-text');
  const currentYear = new Date().getFullYear();
  copyrightText.textContent = `Copyright © ${currentYear} Portalite. All rights reserved.`;
  async function fetchWeather() {
    weatherContainer.innerHTML = '<div class="text-center col-span-3 text-gray-500 dark:text-gray-400">天気を読み込み中...</div>';
    try {
      const location = 'tokyo';
      const apiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=ja`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const temp = Math.round(data.main.temp);
      const icon = data.weather[0].icon;
      const description = data.weather[0].description;
      const weatherHtml = `
        <div class="flex items-center space-x-2">
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" class="w-12 h-12 flex-shrink-0">
          <div>
            <p class="text-2xl font-bold">${temp}°C</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${description}</p>
          </div>
        </div>
      `;
      weatherContainer.innerHTML = weatherHtml;
    } catch (error) {
      weatherContainer.innerHTML = '<div class="text-center col-span-3 text-red-500 dark:text-red-400">天気の取得に失敗しました。</div>';
    }
  }

  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = days[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日(${dayOfWeek}) ${hours}:${minutes}`;
  }

  async function fetchNews() {
    newsContainer.innerHTML = '<div class="text-center col-span-3 text-gray-500 dark:text-gray-400">ニュースを読み込み中...</div>';
    try {
      const response = await fetch(`${CORS_PROXY}${newsRssUrl}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const items = xmlDoc.querySelectorAll('item');
      if (items.length === 0) {
        newsContainer.innerHTML = '<div class="text-center col-span-3 text-gray-500 dark:text-gray-400">ニュースが見つかりませんでした。</div>';
        return;
      }
      let newsHtml = '';
      items.forEach((item) => {
        const title = item.querySelector('title').textContent;
        const link = item.querySelector('link').textContent;
        const pubDateText = item.querySelector('pubDate') ? item.querySelector('pubDate').textContent : '';
        const date = new Date(pubDateText);
        const formattedDate = formatDate(date);
        newsHtml += `
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="news-item block p-3 rounded-xl card hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <h4 class="font-semibold text-base mb-1">${title}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">${formattedDate}</p>
          </a>
        `;
      });
      newsContainer.innerHTML = newsHtml;
    } catch (error) {
      newsContainer.innerHTML = '<div class="text-center col-span-3 text-red-500 dark:text-red-400">ニュースの読み込み中にエラーが発生しました。</div>';
    }
  }

  function getSearchHistory() {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSearchHistory(query) {
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    history.unshift(query);
    history = history.slice(0, HISTORY_LIMIT);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
    }
  }

  function doSearch(query) {
    if (!query) return;
    saveSearchHistory(query);
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.location.href = url;
  }

  function renderSuggestions(inputElement, containerElement, query, showTrends = false) {
    const history = getSearchHistory();
    containerElement.innerHTML = '';
    const filteredHistory = history.filter(item => item.includes(query)).slice(0, 5);
    const historyTitle = document.createElement('h3');
    historyTitle.className = 'text-sm font-semibold text-gray-500 dark:text-gray-400 p-2 pt-0';
    historyTitle.textContent = '最近の検索';
    if (filteredHistory.length > 0) {
      containerElement.appendChild(historyTitle);
    }
    filteredHistory.forEach(item => {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'suggestion-item p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center';
      suggestionItem.innerHTML = `<i class="fas fa-history text-gray-400 dark:text-gray-500 mr-3"></i><span>${item}</span>`;
      suggestionItem.addEventListener('click', () => {
        inputElement.value = item;
        doSearch(item);
      });
      containerElement.appendChild(suggestionItem);
    });
    if (showTrends && trendsData && filteredHistory.length < 10) {
      const trendsTitle = document.createElement('h3');
      trendsTitle.className = 'text-sm font-semibold text-gray-500 dark:text-gray-400 p-2 pt-0 mt-2';
      trendsTitle.textContent = 'トレンド';
      if (trendsData.length > 0) {
        containerElement.appendChild(trendsTitle);
      }
      const trendsToShow = trendsData.slice(0, 10 - filteredHistory.length);
      trendsToShow.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center';
        suggestionItem.innerHTML = `<i class="fas fa-chart-line text-blue-500 mr-3"></i><span>${item}</span>`;
        suggestionItem.addEventListener('click', () => {
          inputElement.value = item;
          doSearch(item);
        });
        containerElement.appendChild(suggestionItem);
      });
    }
  }

  async function fetchTrends() {
    try {
      const response = await fetch(`${CORS_PROXY}${TRENDS_URL}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const items = xmlDoc.querySelectorAll('item');
      trendsData = Array.from(items).map(item => item.querySelector('title').textContent);
    } catch (error) {
      trendsData = [];
    }
  }

  function openSearchOverlay() {
    lastScrollPosition = window.scrollY;
    overlay.style.display = 'flex';
    overlayInput.focus();
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lastScrollPosition}px`;
    document.body.style.width = '100%';
    renderSuggestions(overlayInput, overlaySuggestions, overlayInput.value, true);
  }

  function closeSearchOverlay() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lastScrollPosition);
    overlayInput.value = '';
    overlaySuggestions.innerHTML = '';
    overlayClearButton.classList.add('hidden');
    mainInput.value = '';
    mainClearButton.classList.add('hidden');
    mainSuggestions.innerHTML = '';
  }

  function handleInput(inputElement, suggestionsContainer, clearButton, inOverlay = false) {
    const query = inputElement.value;
    if (query) {
      clearButton.classList.remove('hidden');
      renderSuggestions(inputElement, suggestionsContainer, query, inOverlay);
    } else {
      clearButton.classList.add('hidden');
      if (inOverlay) {
        renderSuggestions(inputElement, suggestionsContainer, query, true);
      } else {
        suggestionsContainer.innerHTML = '';
      }
    }
  }

  function openKanjiOverlay() {
    kanjiOverlay.style.display = 'flex';
    kanjiTextarea.focus();
    updateKanjiCharCount();
  }

  function closeKanjiOverlay() {
    kanjiOverlay.style.display = 'none';
  }

  function updateKanjiCharCount() {
    kanjiCharCount.textContent = kanjiTextarea.value.length;
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
  mainInput.addEventListener('focus', openSearchOverlay);
  overlayInput.addEventListener('input', () => handleInput(overlayInput, overlaySuggestions, overlayClearButton, true));
  cancelButton.addEventListener('click', closeSearchOverlay);
  overlayClearButton.addEventListener('click', () => {
    overlayInput.value = '';
    overlayInput.focus();
    overlayClearButton.classList.add('hidden');
    renderSuggestions(overlayInput, overlaySuggestions, '', true);
  });
  fetchWeather();
  fetchNews();
  fetchTrends();
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
    });
  }, 300);
});
