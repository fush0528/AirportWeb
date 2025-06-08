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

// 快取設定
let tokenCache = {
    access_token: null,
    expires_at: null
};

// 取得 TDX API Token
async function getAccessToken() {
    // 檢查快取是否有效
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

        // 更新快取
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
    try {
        const token = await getAccessToken();
        const response = await axios.get(`${TDX_API_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('API 請求失敗:', error);
        throw error;
    }
}

// 航班資訊 API 路由
app.get('/api/flights/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        // 取得即時航班資料（依照新版 API 規格）
        const flights = await fetchTDXApi(
            `/v2/Air/FIDS/Airport/Departure/${airport}?$top=30&$format=JSON`
        );
        res.json(flights);
    } catch (error) {
        console.error('航班資訊錯誤:', error);
        res.status(500).json({ 
            error: '無法取得航班資訊',
            details: error.message,
            response: error.response?.data
        });
    }
});

// 天氣資訊 API 路由
app.get('/api/weather/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        // 取得即時天氣資訊（依照新版 API 規格）
        const weather = await fetchTDXApi(
            `/v2/Air/METAR/Airport/${airport}?$format=JSON`
        );
        res.json(weather);
    } catch (error) {
        res.status(500).json({ error: '無法取得天氣資訊' });
    }
});

// 定期航班 API 路由
app.get('/api/schedule/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        // 取得定期航班資料（依照新版 API 規格）
        const schedule = await fetchTDXApi(
            `/v2/Air/Schedule/Departure/Airport/${airport}?$format=JSON`
        );
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: '無法取得定期航班資訊' });
    }
});

// 航空公司資訊 API 路由
app.get('/api/airlines/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        // 取得航空公司資訊（依照新版 API 規格）
        const airlines = await fetchTDXApi(
            `/v2/Air/Airline?$format=JSON`
        );
        res.json(airlines);
    } catch (error) {
        res.status(500).json({ error: '無法取得航空公司資訊' });
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
