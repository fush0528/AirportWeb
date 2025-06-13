require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

// 檢查必要的環境變數
if (!process.env.TDX_CLIENT_ID || !process.env.TDX_CLIENT_SECRET) {
    console.error('錯誤：需要設定 TDX_CLIENT_ID 和 TDX_CLIENT_SECRET 環境變數');
    console.error('請參考 .env.example 檔案，建立 .env 檔案並設定正確的認證資訊');
    process.exit(1);
}

// TDX API 設定
const TDX_AUTH_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const TDX_API_URL = 'https://tdx.transportdata.tw/api/basic';
// 請在此處填入您在 TDX 平台註冊的 CLIENT_ID 和 CLIENT_SECRET
const CLIENT_ID = process.env.TDX_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.TDX_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 有效的機場代碼列表
const VALID_AIRPORTS = [
    'TPE', // 桃園國際機場
    'TSA', // 松山機場
    'KHH', // 高雄國際機場
    'RMQ', // 台中機場
    'MZG', // 馬公機場
    'HUN', // 花蓮機場
    'TTT', // 台東機場
    'PIF', // 屏東機場
    'KNH', // 金門機場
    'MFK'  // 馬祖機場
];

// 驗證機場代碼
function validateAirport(airport) {
    if (!VALID_AIRPORTS.includes(airport)) {
        throw new Error(`無效的機場代碼：${airport}。有效的機場代碼：${VALID_AIRPORTS.join(', ')}`);
    }
    return true;
}

// 快取設定
let tokenCache = {
    access_token: null,
    expires_at: null
};

// API 回應快取
const apiCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds in milliseconds

// 清除快取
function clearCache(endpoint) {
    if (endpoint) {
        apiCache.delete(endpoint);
    } else {
        apiCache.clear();
    }
}

// 獲取所有快取狀態
function getCacheStatus() {
    const status = {};
    apiCache.forEach((value, key) => {
        status[key] = {
            hasData: true,
            timestamp: value.timestamp,
            age: Date.now() - value.timestamp
        };
    });
    return status;
}

// 速率限制設定
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 30 * 1000; // 30 seconds in milliseconds

// 檢查並更新速率限制
function checkRateLimit(endpoint) {
    const now = Date.now();
    const lastCall = rateLimits.get(endpoint) || 0;
    
    if (now - lastCall < RATE_LIMIT_WINDOW) {
        return false;
    }
    
    rateLimits.set(endpoint, now);
    return true;
}

// 檢查快取
function getCachedResponse(endpoint) {
    const cached = apiCache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

// 設置快取
function setCachedResponse(endpoint, data) {
    apiCache.set(endpoint, {
        data: data,
        timestamp: Date.now()
    });
}

// 取得 TDX API Token
async function getAccessToken() {
    if (tokenCache.access_token && tokenCache.expires_at > Date.now()) {
        return tokenCache.access_token;
    }

    try {
        const response = await axios({
            method: 'post',
            url: TDX_AUTH_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            })
        });

        tokenCache = {
            access_token: response.data.access_token,
            expires_at: Date.now() + (response.data.expires_in * 1000)
        };

        return response.data.access_token;
    } catch (error) {
        console.error('取得 Token 失敗:', error);
        throw error;
    }
}

// API 請求輔助函數
async function fetchTDXApi(endpoint) {
    const cachedResponse = getCachedResponse(endpoint);
    if (cachedResponse) {
        console.log(`使用快取資料: ${endpoint}`);
        return cachedResponse;
    }

    if (!checkRateLimit(endpoint)) {
        console.log(`達到速率限制，請等待約 ${RATE_LIMIT_WINDOW/1000} 秒後再試: ${endpoint}`);
        throw new Error('達到速率限制，請稍後再試');
    }

    try {
        const token = await getAccessToken();
        const response = await axios.get(`${TDX_API_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.data) {
            throw new Error('API 回應格式錯誤: 無資料');
        }

        if (!Array.isArray(response.data)) {
            throw new Error('API 回應格式錯誤: 應為陣列格式');
        }
        
        setCachedResponse(endpoint, response.data);
        return response.data;
    } catch (error) {
        console.error('API 請求失敗:', error);
        if (error.response?.data) {
            error.message = `${error.message} - API回應: ${JSON.stringify(error.response.data)}`;
        }
        throw error;
    }
}

// 航班資訊（入境） API 路由
app.get('/api/flights/arrival/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const { limit = 30, lang = 'zh-TW' } = req.query;

        validateAirport(airport);
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1) {
            throw new Error('無效的資料筆數限制');
        }

        const flights = await fetchTDXApi(
            `/v2/Air/FIDS/Airport/Arrival/${airport}?` + 
            `$top=${limitNum}&` +
            `$format=JSON&` +
            `$orderby=ScheduleArrivalTime asc`
        );

        res.json({
            status: 'success',
            data: flights,
            updatedAt: new Date().toISOString(),
            params: { airport, limit: limitNum, lang }
        });
    } catch (error) {
        console.error('入境航班資訊錯誤:', error);
        res.status(error.response?.status || 500).json({
            status: 'error',
            error: '無法取得入境航班資訊',
            details: error.message
        });
    }
});

// 航班資訊（出境） API 路由
app.get('/api/flights/departure/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const { limit = 30, lang = 'zh-TW' } = req.query;

        validateAirport(airport);
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1) {
            throw new Error('無效的資料筆數限制');
        }

        const flights = await fetchTDXApi(
            `/v2/Air/FIDS/Airport/Departure/${airport}?` + 
            `$top=${limitNum}&` +
            `$format=JSON&` +
            `$orderby=ScheduleDepartureTime asc`
        );

        res.json({
            status: 'success',
            data: flights,
            updatedAt: new Date().toISOString(),
            params: { airport, limit: limitNum, lang }
        });
    } catch (error) {
        console.error('出境航班資訊錯誤:', error);
        res.status(error.response?.status || 500).json({
            status: 'error',
            error: '無法取得出境航班資訊',
            details: error.message
        });
    }
});

// 航班資訊（即時） API 路由
app.get('/api/flights/realtime/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const { limit = 30, lang = 'zh-TW' } = req.query;

        validateAirport(airport);
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1) {
            throw new Error('無效的資料筆數限制');
        }

        const [arrivals, departures] = await Promise.all([
            fetchTDXApi(
                `/v2/Air/FIDS/Airport/Arrival/${airport}?` + 
                `$top=${limitNum}&` +
                `$format=JSON&` +
                `$orderby=ScheduleArrivalTime asc`
            ),
            fetchTDXApi(
                `/v2/Air/FIDS/Airport/Departure/${airport}?` + 
                `$top=${limitNum}&` +
                `$format=JSON&` +
                `$orderby=ScheduleDepartureTime asc`
            )
        ]);

        res.json({
            status: 'success',
            data: {
                arrivals,
                departures
            },
            updatedAt: new Date().toISOString(),
            params: { airport, limit: limitNum, lang }
        });
    } catch (error) {
        console.error('即時航班資訊錯誤:', error);
        res.status(error.response?.status || 500).json({
            status: 'error',
            error: '無法取得即時航班資訊',
            details: error.message
        });
    }
});

// 快取狀態 API 路由
app.get('/api/cache/status', (req, res) => {
    res.json({
        status: 'success',
        data: getCacheStatus(),
        updatedAt: new Date().toISOString()
    });
});

// 清除快取 API 路由
app.get('/api/cache/clear', (req, res) => {
    const { endpoint } = req.query;
    clearCache(endpoint);
    res.json({
        status: 'success',
        message: endpoint ? `清除了 ${endpoint} 的快取` : '清除了所有快取',
        updatedAt: new Date().toISOString()
    });
});

// 天氣資訊 API 路由
app.get('/api/weather/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const { lang = 'zh-TW' } = req.query;

        validateAirport(airport);

        const weather = await fetchTDXApi(
            `/v2/Air/METAR/Airport/${airport}?` +
            `$format=JSON`
        );

        console.log('METAR API 回應:', JSON.stringify(weather, null, 2));

        if (weather && weather[0]) {
            console.log('Temperature:', weather[0].Temperature);
            console.log('WindDirection:', weather[0].WindDirection);
            console.log('WindSpeed:', weather[0].WindSpeed);
            console.log('DewPoint:', weather[0].DewPoint);
            console.log('Visibility:', weather[0].Visibility);
            console.log('Altimeter:', weather[0].Altimeter);
        }

        res.json({
            status: 'success',
            data: weather,
            updatedAt: new Date().toISOString(),
            params: {
                airport,
                lang
            }
        });
    } catch (error) {
        console.error('天氣資訊錯誤:', error);
        res.status(error.response?.status || 500).json({
            status: 'error',
            error: '無法取得天氣資訊',
            details: error.message,
            response: error.response?.data
        });
    }
});

// 航空公司資訊 API 路由
app.get('/api/airlines', async (req, res) => {
    try {
        const { lang = 'zh-TW' } = req.query;

        const airlines = await fetchTDXApi(
            `/v2/Air/Airline` +
            `?$format=JSON` +
            `&$select=AirlineID,AirlineName,AirlineIATA,AirlineICAO`
        );

        res.json({
            status: 'success',
            data: airlines,
            updatedAt: new Date().toISOString(),
            params: {
                lang
            }
        });
    } catch (error) {
        console.error('航空公司資訊錯誤:', error);
        res.status(error.response?.status || 500).json({
            status: 'error',
            error: '無法取得航空公司資訊',
            details: error.message,
            response: error.response?.data
        });
    }
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: '伺服器發生錯誤',
        message: err.message
    });
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`伺服器運行於 http://localhost:${port}`);
});
