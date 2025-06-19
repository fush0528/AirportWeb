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
        airportButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentAirport = button.dataset.iata;
        functionSection.style.display = 'block';
        hideAllDisplays();
    });
});

// 功能按鈕事件處理
functionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const functionType = button.dataset.function;
        hideAllDisplays();
        showFunctionDisplay(functionType);
        
        switch(functionType) {
            case 'arrival':
                loadArrivalFlights(currentAirport);
                break;
            case 'departure':
                loadDepartureFlights(currentAirport);
                break;
            case 'realtime':
                loadRealtimeFlights(currentAirport);
                break;
            case 'weather':
                loadWeatherInfo(currentAirport);
                break;
            case 'airlines':
                loadAirlinesInfo();
                break;
            case 'schedule':
                loadFlightSchedule(currentAirport);
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

// 載入國際航空定期時刻表
async function loadFlightSchedule(airportCode) {
    const scheduleData = document.getElementById('schedule-data');
    scheduleData.innerHTML = '<tr><td colspan="7" class="loading">載入中...</td></tr>';

    try {
        const schedules = await fetchTDXData(`/api/flights/schedule/${airportCode}`);
        if (!schedules || schedules.length === 0) {
            scheduleData.innerHTML = '<tr><td colspan="7">目前沒有航班時刻表資訊</td></tr>';
            return;
        }

        const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

        scheduleData.innerHTML = schedules.map(flight => {
            // 轉換班期資訊
            const serviceDays = flight.ServiceDay
                .map((active, index) => active ? weekDays[index] : null)
                .filter(day => day !== null)
                .join('、');

            return `
            <tr>
                <td>${flight.AirlineIATA || flight.AirlineID || ''}</td>
                <td>${flight.FlightNumber || ''}</td>
                <td>${flight.DepartureAirportID || ''}</td>
                <td>${flight.ArrivalAirportID || ''}</td>
                <td>${serviceDays || ''}</td>
                <td>${flight.DepartureTime || ''}</td>
                <td>${flight.ArrivalTime || ''}</td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('載入航班時刻表失敗:', error);
        scheduleData.innerHTML = `
            <tr><td colspan="7" class="error">
                <div class="error-message">
                    <p>無法載入航班時刻表資訊</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="loadFlightSchedule('${airportCode}')" class="retry-btn">重試</button>
                </div>
            </td></tr>`;
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
        return data.data;
    } catch (error) {
        console.error('API 請求錯誤:', error);
        throw error;
    }
}

// 格式化日期時間
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const dt = new Date(dateTimeStr);
    return dt.toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// 航班資訊共用函數
function createFlightRow(flight, isArrival = false) {
    const terminalGate = flight.Terminal ? 
        `${flight.Terminal}${flight.Gate ? ` / Gate ${flight.Gate}` : ''}` : '';
    
    return `
        <tr>
            <td>${flight.FlightNumber || ''}</td>
            <td>${isArrival ? (flight.DepartureAirportID || '') : (flight.ArrivalAirportID || '')}</td>
            <td>${formatDateTime(isArrival ? flight.ScheduleArrivalTime : flight.ScheduleDepartureTime) || ''}</td>
            <td>${terminalGate}</td>
            <td>${isArrival ? (flight.ArrivalRemark || '') : (flight.DepartureRemark || '')}</td>
        </tr>
    `;
}

// 載入入境航班資訊
async function loadArrivalFlights(airportCode) {
    const arrivalData = document.getElementById('arrival-data');
    arrivalData.innerHTML = '<tr><td colspan="5" class="loading">載入中...</td></tr>';

    try {
        const flights = await fetchTDXData(`/api/flights/arrival/${airportCode}`);
        if (!flights || flights.length === 0) {
            arrivalData.innerHTML = '<tr><td colspan="5">目前沒有入境航班資訊</td></tr>';
            return;
        }
        arrivalData.innerHTML = flights.map(flight => createFlightRow(flight, true)).join('');
    } catch (error) {
        console.error('載入入境航班資訊失敗:', error);
        arrivalData.innerHTML = `
            <tr><td colspan="5" class="error">
                <div class="error-message">
                    <p>無法載入入境航班資訊</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="loadArrivalFlights('${airportCode}')" class="retry-btn">重試</button>
                </div>
            </td></tr>`;
    }
}

// 載入出境航班資訊
async function loadDepartureFlights(airportCode) {
    const departureData = document.getElementById('departure-data');
    departureData.innerHTML = '<tr><td colspan="5" class="loading">載入中...</td></tr>';

    try {
        const flights = await fetchTDXData(`/api/flights/departure/${airportCode}`);
        if (!flights || flights.length === 0) {
            departureData.innerHTML = '<tr><td colspan="5">目前沒有出境航班資訊</td></tr>';
            return;
        }
        departureData.innerHTML = flights.map(flight => createFlightRow(flight, false)).join('');
    } catch (error) {
        console.error('載入出境航班資訊失敗:', error);
        departureData.innerHTML = `
            <tr><td colspan="5" class="error">
                <div class="error-message">
                    <p>無法載入出境航班資訊</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="loadDepartureFlights('${airportCode}')" class="retry-btn">重試</button>
                </div>
            </td></tr>`;
    }
}

// 載入即時航班資訊
async function loadRealtimeFlights(airportCode) {
    const arrivalData = document.getElementById('realtime-arrival-data');
    const departureData = document.getElementById('realtime-departure-data');
    
    arrivalData.innerHTML = '<tr><td colspan="5" class="loading">載入中...</td></tr>';
    departureData.innerHTML = '<tr><td colspan="5" class="loading">載入中...</td></tr>';

    try {
        const flights = await fetchTDXData(`/api/flights/realtime/${airportCode}`);
        
        // 更新入境航班
        if (!flights.arrivals || flights.arrivals.length === 0) {
            arrivalData.innerHTML = '<tr><td colspan="5">目前沒有入境航班資訊</td></tr>';
        } else {
            arrivalData.innerHTML = flights.arrivals.map(flight => createFlightRow(flight, true)).join('');
        }

        // 更新出境航班
        if (!flights.departures || flights.departures.length === 0) {
            departureData.innerHTML = '<tr><td colspan="5">目前沒有出境航班資訊</td></tr>';
        } else {
            departureData.innerHTML = flights.departures.map(flight => createFlightRow(flight, false)).join('');
        }
    } catch (error) {
        console.error('載入即時航班資訊失敗:', error);
        const errorHtml = `
            <tr><td colspan="5" class="error">
                <div class="error-message">
                    <p>無法載入航班資訊</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="loadRealtimeFlights('${airportCode}')" class="retry-btn">重試</button>
                </div>
            </td></tr>`;
        arrivalData.innerHTML = errorHtml;
        departureData.innerHTML = errorHtml;
    }
}

// 載入天氣資訊
async function loadWeatherInfo(airportCode) {
    const weatherData = document.getElementById('weather-data');
    weatherData.innerHTML = '<div class="loading">載入中...</div>';

    try {
        const weather = await fetchTDXData(`/api/weather/${airportCode}`);
        if (!weather || weather.length === 0) {
            weatherData.innerHTML = '無法取得天氣資訊';
            return;
        }

        const latestWeather = weather[0];
        weatherData.innerHTML = `
            <div class="weather-card">
                <h4>${latestWeather.StationID || ''} 機場天氣資訊</h4>
                <div class="weather-details">
                    <div class="weather-info">
                        <p><strong>觀測時間:</strong> ${formatDateTime(latestWeather.ObservationTime) || ''}</p>
                        <p><strong>溫度:</strong> ${latestWeather.Temperature?.Value ? `${latestWeather.Temperature.Value}°C` : ''}</p>
                        <p><strong>風向:</strong> ${latestWeather.WindDirection?.Value ? `${latestWeather.WindDirection.Value}°` : ''}</p>
                        <p><strong>風速:</strong> ${latestWeather.WindSpeed?.Value ? `${latestWeather.WindSpeed.Value} 節` : ''}</p>
                        <p><strong>能見度:</strong> ${latestWeather.Visibility?.Value ? `${latestWeather.Visibility.Value} 公尺` : ''}</p>
                    </div>
                </div>
                <div class="update-time">
                    <small>更新時間: ${formatDateTime(new Date())}</small>
                </div>
            </div>
        `;
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

// 載入航空公司資訊
async function loadAirlinesInfo() {
    const airlinesData = document.getElementById('airlines-data');
    airlinesData.innerHTML = '載入中...';

    try {
        const airlines = await fetchTDXData('/api/airlines');
        if (!airlines || airlines.length === 0) {
            airlinesData.innerHTML = '目前沒有航空公司資訊';
            return;
        }

        const filteredAirlines = airlines.filter(airline => 
            airline.AirlineID || 
            (airline.AirlineName && (typeof airline.AirlineName === 'object' ? airline.AirlineName.Zh_tw : airline.AirlineName)) ||
            airline.AirlineIATA ||
            airline.AirlineICAO
        );

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
                    ${filteredAirlines.map(airline => {
                        const airlineName = typeof airline.AirlineName === 'object' 
                            ? airline.AirlineName.Zh_tw || ''
                            : airline.AirlineName || '';
                        return `
                        <tr>
                            <td>${airline.AirlineID || ''}</td>
                            <td>${airlineName}</td>
                            <td>${airline.AirlineIATA || ''}</td>
                            <td>${airline.AirlineICAO || ''}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('載入航空公司資訊失敗:', error);
        airlinesData.innerHTML = `
            <div class="error-message">
                無法載入航空公司資訊: ${error.message}
                <button onclick="loadAirlinesInfo()" class="retry-btn">重試</button>
            </div>`;
    }
}
