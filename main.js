// 全域變數
let currentAirport = null;

// DOM 元素
const airportButtons = document.querySelectorAll('.airport-btn');
const functionSection = document.querySelector('.function-selection');
const functionButtons = document.querySelectorAll('.function-btn');
const displaySections = document.querySelectorAll('.info-display');

// 機場選擇事件處理
airportButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 重置其他按鈕的狀態
        airportButtons.forEach(btn => btn.classList.remove('active'));
        // 設置當前按鈕為活動狀態
        button.classList.add('active');
        // 儲存當前選擇的機場代碼
        currentAirport = button.dataset.iata;
        // 顯示功能選單
        functionSection.style.display = 'block';
        // 隱藏所有資訊顯示區域
        hideAllDisplays();
    });
});

// 功能按鈕事件處理
functionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const functionType = button.dataset.function;
        hideAllDisplays();
        showFunctionDisplay(functionType);
        
        // 根據功能類型載入對應資料
        switch(functionType) {
            case 'flight-info':
                loadFlightInfo(currentAirport);
                break;
            case 'weather':
                loadWeatherInfo(currentAirport);
                break;
            case 'schedule':
                loadScheduleInfo(currentAirport);
                break;
            case 'airlines':
                loadAirlinesInfo(currentAirport);
                break;
        }
    });
});

// 隱藏所有資訊顯示區域
function hideAllDisplays() {
    displaySections.forEach(section => {
        section.style.display = 'none';
    });
}

// 顯示特定功能的資訊區域
function showFunctionDisplay(functionType) {
    const displayArea = document.getElementById(`${functionType}-display`);
    if (displayArea) {
        displayArea.style.display = 'block';
    }
}

// API 請求處理函數
async function fetchTDXData(endpoint) {
    try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    } catch (error) {
        console.error('API 請求錯誤:', error);
        return null;
    }
}

// 航班資訊載入
async function loadFlightInfo(airportCode) {
    const flightData = document.getElementById('flight-data');
    flightData.innerHTML = '<tr><td colspan="6">載入中...</td></tr>';

    try {
        // TODO: 實作 TDX API 航班資訊請求
        const flights = await fetchTDXData(`/api/flights/${airportCode}`);
        if (flights) {
            updateFlightTable(flights);
        }
    } catch (error) {
        flightData.innerHTML = '<tr><td colspan="6">無法載入航班資訊</td></tr>';
    }
}

// 更新航班表格
function updateFlightTable(flights) {
    const flightData = document.getElementById('flight-data');
    if (!flights || flights.length === 0) {
        flightData.innerHTML = '<tr><td colspan="6">目前沒有航班資訊</td></tr>';
        return;
    }

    flightData.innerHTML = flights.map(flight => `
        <tr>
            <td>${flight.flightNumber}</td>
            <td>${flight.departure}</td>
            <td>${flight.destination}</td>
            <td>${flight.scheduledTime}</td>
            <td>${flight.terminal}</td>
            <td>${flight.status}</td>
        </tr>
    `).join('');
}

// 天氣資訊載入
async function loadWeatherInfo(airportCode) {
    const weatherData = document.getElementById('weather-data');
    weatherData.innerHTML = '載入中...';

    try {
        // TODO: 實作 TDX API 天氣資訊請求
        const weather = await fetchTDXData(`/api/weather/${airportCode}`);
        if (weather) {
            updateWeatherCard(weather);
        }
    } catch (error) {
        weatherData.innerHTML = '無法載入天氣資訊';
    }
}

// 更新天氣資訊卡片
function updateWeatherCard(weather) {
    const weatherData = document.getElementById('weather-data');
    if (!weather) {
        weatherData.innerHTML = '無法取得天氣資訊';
        return;
    }

    weatherData.innerHTML = `
        <h4>${weather.location}</h4>
        <div class="weather-details">
            <p>溫度: ${weather.temperature}°C</p>
            <p>濕度: ${weather.humidity}%</p>
            <p>天氣狀況: ${weather.description}</p>
        </div>
    `;
}

// 定期航班資訊載入
async function loadScheduleInfo(airportCode) {
    const scheduleData = document.getElementById('schedule-data');
    scheduleData.innerHTML = '載入中...';

    try {
        // TODO: 實作 TDX API 定期航班資訊請求
        const schedule = await fetchTDXData(`/api/schedule/${airportCode}`);
        if (schedule) {
            updateScheduleInfo(schedule);
        }
    } catch (error) {
        scheduleData.innerHTML = '無法載入定期航班資訊';
    }
}

// 更新定期航班資訊
function updateScheduleInfo(schedule) {
    const scheduleData = document.getElementById('schedule-data');
    if (!schedule || schedule.length === 0) {
        scheduleData.innerHTML = '目前沒有定期航班資訊';
        return;
    }

    // TODO: 實作定期航班資訊顯示邏輯
}

// 航空公司資訊載入
async function loadAirlinesInfo(airportCode) {
    const airlinesData = document.getElementById('airlines-data');
    airlinesData.innerHTML = '載入中...';

    try {
        // TODO: 實作 TDX API 航空公司資訊請求
        const airlines = await fetchTDXData(`/api/airlines/${airportCode}`);
        if (airlines) {
            updateAirlinesInfo(airlines);
        }
    } catch (error) {
        airlinesData.innerHTML = '無法載入航空公司資訊';
    }
}

// 更新航空公司資訊
function updateAirlinesInfo(airlines) {
    const airlinesData = document.getElementById('airlines-data');
    if (!airlines || airlines.length === 0) {
        airlinesData.innerHTML = '目前沒有航空公司資訊';
        return;
    }

    // TODO: 實作航空公司資訊顯示邏輯
}
