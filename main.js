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
        if (data.status === 'error') {
            throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
        }
        return data.data; // 返回實際數據
    } catch (error) {
        console.error('API 請求錯誤:', error);
        throw error; // 向上傳遞錯誤
    }
}

// 航班資訊載入
async function loadFlightInfo(airportCode) {
    const flightData = document.getElementById('flight-data');
    flightData.innerHTML = '<tr><td colspan="6" class="loading">載入中...</td></tr>';

    try {
        const flights = await fetchTDXData(`/api/flights/${airportCode}`);
        if (flights) {
            updateFlightTable(flights);
        }
    } catch (error) {
        console.error('載入航班資訊失敗:', error);
        flightData.innerHTML = `<tr><td colspan="6" class="error">
            <div class="error-message">
                <p>無法載入航班資訊</p>
                <p class="error-details">${error.message}</p>
                <button onclick="loadFlightInfo('${airportCode}')" class="retry-btn">重試</button>
            </div>
        </td></tr>`;
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
            <td>${flight.FlightNumber || '--'}</td>
            <td>${flight.DepartureAirportID || '--'}</td>
            <td>${flight.ArrivalAirportID || '--'}</td>
            <td>${formatDateTime(flight.ScheduleDepartureTime) || '--'}</td>
            <td>${flight.Terminal || '--'} ${flight.Gate ? `Gate ${flight.Gate}` : ''}</td>
            <td>${flight.DepartureRemark || '--'}</td>
        </tr>
    `).join('');
}

// 格式化日期時間
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '--';
    const dt = new Date(dateTimeStr);
    return dt.toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// 天氣資訊載入
async function loadWeatherInfo(airportCode) {
    const weatherData = document.getElementById('weather-data');
    weatherData.innerHTML = '<div class="loading">載入中...</div>';

    try {
        const weather = await fetchTDXData(`/api/weather/${airportCode}`);
        if (weather) {
            updateWeatherCard(weather);
        }
    } catch (error) {
        console.error('載入天氣資訊失敗:', error);
        weatherData.innerHTML = `
            <div class="error-message">
                <p>無法載入天氣資訊</p>
                <p class="error-details">${error.message}</p>
                <button onclick="loadWeatherInfo('${airportCode}')" class="retry-btn">重試</button>
            </div>
        `;
    }
}

// 更新天氣資訊卡片
function updateWeatherCard(weather) {
    const weatherData = document.getElementById('weather-data');
    if (!weather || weather.length === 0) {
        weatherData.innerHTML = '無法取得天氣資訊';
        return;
    }

    const latestWeather = weather[0]; // 取得最新的天氣資訊
    weatherData.innerHTML = `
        <h4>${latestWeather.StationID} 機場天氣資訊</h4>
        <div class="weather-details">
            <p>METAR 報告: ${latestWeather.METAR || '--'}</p>
            <p>觀測時間: ${formatDateTime(latestWeather.ObservationTime) || '--'}</p>
        </div>
    `;
}

// 定期航班資訊載入
async function loadScheduleInfo(airportCode) {
    const scheduleData = document.getElementById('schedule-data');
    scheduleData.innerHTML = '<div class="loading">載入中...</div>';

    try {
        const schedule = await fetchTDXData(`/api/schedule/${airportCode}`);
        if (schedule) {
            updateScheduleInfo(schedule);
        }
    } catch (error) {
        console.error('載入定期航班資訊失敗:', error);
        scheduleData.innerHTML = `
            <div class="error-message">
                <p>無法載入定期航班資訊</p>
                <p class="error-details">${error.message}</p>
                <button onclick="loadScheduleInfo('${airportCode}')" class="retry-btn">重試</button>
            </div>
        `;
    }
}

// 更新定期航班資訊
function updateScheduleInfo(schedule) {
    const scheduleData = document.getElementById('schedule-data');
    if (!schedule || schedule.length === 0) {
        scheduleData.innerHTML = '目前沒有定期航班資訊';
        return;
    }

    scheduleData.innerHTML = `
        <table class="schedule-table">
            <thead>
                <tr>
                    <th>航班號碼</th>
                    <th>目的地</th>
                    <th>起飛時間</th>
                    <th>航空公司</th>
                    <th>班表週期</th>
                </tr>
            </thead>
            <tbody>
                ${schedule.map(flight => `
                    <tr>
                        <td>${flight.FlightNumber || '--'}</td>
                        <td>${flight.ArrivalAirportID || '--'}</td>
                        <td>${flight.DepartureTime || '--'}</td>
                        <td>${flight.AirlineID || '--'}</td>
                        <td>${flight.ServiceDay || '--'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// 航空公司資訊載入
async function loadAirlinesInfo(airportCode) {
    const airlinesData = document.getElementById('airlines-data');
    airlinesData.innerHTML = '載入中...';

    try {
        // 注意：航空公司 API 不需要 airportCode
        const airlines = await fetchTDXData('/api/airlines');
        if (airlines) {
            updateAirlinesInfo(airlines);
        }
    } catch (error) {
        console.error('載入航空公司資訊失敗:', error);
        airlinesData.innerHTML = `<div class="error-message">無法載入航空公司資訊: ${error.message}</div>`;
    }
}

// 更新航空公司資訊
function updateAirlinesInfo(airlines) {
    const airlinesData = document.getElementById('airlines-data');
    if (!airlines || airlines.length === 0) {
        airlinesData.innerHTML = '目前沒有航空公司資訊';
        return;
    }

    airlinesData.innerHTML = `
        <table class="airlines-table">
            <thead>
                <tr>
                    <th>航空公司代碼</th>
                    <th>航空公司名稱</th>
                    <th>IATA 代碼</th>
                    <th>ICAO 代碼</th>
                </tr>
            </thead>
            <tbody>
                ${airlines.map(airline => `
                    <tr>
                        <td>${airline.AirlineID || '--'}</td>
                        <td>${airline.AirlineName?.Zh_tw || '--'}</td>
                        <td>${airline.AirlineIATA || '--'}</td>
                        <td>${airline.AirlineICAO || '--'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
