# 台灣機場資訊系統 (Taiwan Airport Information System)

這是一個使用 TDX API 開發的台灣機場資訊系統，提供即時航班資訊、天氣狀況、定期航班時刻表等功能。

## 功能特點

- 即時航班資訊查詢
- 機場天氣資訊顯示
- 定期航班時刻表查詢
- 航空公司資訊查詢
- 支援多個主要機場（桃園、松山、高雄、台中等）

## 技術實現

- 前端：HTML5, CSS3, JavaScript (原生)
- 後端：Node.js, Express.js
- API：運輸資料流通服務平臺 (TDX) API
- 資料快取：記憶體快取
- 速率限制：基於時間窗口的請求限制

## 系統需求

- Node.js 14.0 或以上版本
- 有效的 TDX API 存取憑證

## 安裝說明

1. 複製專案：
   ```bash
   git clone https://github.com/fush0528/AirportWeb.git
   cd AirportWeb
   ```

2. 安裝相依套件：
   ```bash
   npm install
   ```

3. 設定環境變數：
   - 複製 `.env.example` 為 `.env`
   - 填入您的 TDX API 憑證資訊：
     ```
     TDX_CLIENT_ID=您的客戶端ID
     TDX_CLIENT_SECRET=您的客戶端密碼
     ```

4. 啟動服務：
   ```bash
   node server.js
   ```

5. 開啟瀏覽器訪問：
   ```
   http://localhost:3000
   ```

## API 端點

| 端點 | 說明 | 參數 |
|------|------|------|
| /api/flights/:airport | 取得即時航班資訊 | airport: 機場代碼 |
| /api/weather/:airport | 取得機場天氣資訊 | airport: 機場代碼 |
| /api/schedule/:airport | 取得定期航班資訊 | airport: 機場代碼 |
| /api/airlines | 取得航空公司資訊 | 無 |

## 速率限制

- 每個 API 端點每 30 秒限制呼叫一次
- 使用記憶體快取儲存回應，以減少 API 呼叫次數
- 快取時間為 30 秒

## 錯誤處理

系統實作了完整的錯誤處理機制：
- API 錯誤回應處理
- 速率限制提示
- 網路連線錯誤處理
- 使用者友善的錯誤訊息

## 支援的機場

- TPE：桃園國際機場
- TSA：台北松山機場
- KHH：高雄國際機場
- RMQ：台中機場
- MZG：馬公機場
- HUN：花蓮機場
- TTT：台東機場
- PIF：屏東機場
- KNH：金門機場
- MFK：馬祖機場

## 更新日誌

### 2025/6/19
- 修正國際航空定期時刻表 API 端點路徑
- 修正資料過濾條件中的日期欄位名稱
- 優化介面：調整選單寬度和顏色方案
- 更新標題區塊樣式和文字顏色

## 授權條款

MIT License

## 作者

fush0528
