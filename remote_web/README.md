# agri-weather-vnm
# 🌾 Ứng dụng Thời tiết Nông nghiệp

Ứng dụng dự báo thời tiết chuyên biệt cho canh tác, tích hợp AI chatbot và quản lý dữ liệu nông trại.

## 🎯 Tính năng chính

### 1. **Dự báo Thời tiết**
- Thời tiết hiện tại chi tiết
- Dự báo 5 ngày
- 10+ chỉ số quan trọng (nhiệt độ, độ ẩm, gió, mưa...)

### 2. **Hệ thống Cảnh báo Thông minh**
- ⚠️ Cảnh báo BÃO
- 🌧️ Cảnh báo MƯA LỚN
- 🌡️ Cảnh báo NẮNG NÓNG
- ❄️ Cảnh báo SƯƠNG GIÁ
- 💧 Cảnh báo ĐỘ ẨM CAO
- ✅ Thời tiết THUẬN LỢI

### 3. **Chatbot AI Nông nghiệp**
- Tư vấn canh tác dựa trên thời tiết
- Lịch phun thuốc, bón phân
- Phòng trừ sâu bệnh
- Gợi ý cây trồng phù hợp

### 4. **Quản lý Dữ liệu Nông trại**
- Danh sách cây trồng
- Nhật ký hoạt động canh tác
- Ghi chú quan sát
- Upload/Download file (JSON, CSV, TXT)
- Lưu trữ lâu dài

---

## 📁 Cấu trúc Project

```
src/
├── components/          # Các React components
│   ├── Header.jsx
│   ├── WeatherAlerts.jsx
│   ├── CurrentWeather.jsx
│   ├── WeatherDetails.jsx
│   ├── ForecastCard.jsx
│   ├── ForecastList.jsx
│   ├── Chatbot.jsx
│   ├── DataManager.jsx
│   ├── CropsList.jsx
│   ├── ActivitiesList.jsx
│   └── NotesList.jsx
│
├── hooks/               # Custom React hooks
│   ├── useWeather.js
│   ├── useFarmData.js
│   └── useChat.js
│
├── services/            # API calls
│   ├── weatherService.js
│   ├── chatService.js
│   └── storageService.js
│
├── utils/               # Helper functions
│   ├── weatherAnalyzer.js
│   ├── fileHandler.js
│   └── dateFormatter.js
│
├── constants/           # Constants & configs
│   └── constants.js
│
└── App.jsx             # Main component
```

---

## 🚀 Cài đặt

### 1. Clone project
```bash
git clone <repository-url>
cd agri-weather-app
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình API Key (Tùy chọn)
Mở file `src/constants/constants.js` và thay API key của bạn:
```javascript
export const API_CONFIG = {
  WEATHER_API_KEY: 'your-api-key-here',
  // ...
};
```

### 4. Chạy ứng dụng
```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:5173`

---

## 📖 Hướng dẫn sử dụng

### Tìm kiếm thời tiết
1. Nhập tên thành phố (VD: Hanoi, Manila, Bangkok)
2. Nhấn Enter hoặc click "Tìm kiếm"
3. Xem thời tiết và cảnh báo

### Sử dụng Chatbot
1. Click biểu tượng chat góc dưới phải
2. Hỏi về canh tác, thời tiết, sâu bệnh...
3. Nhận tư vấn từ AI

### Quản lý dữ liệu
1. Click "Quản lý dữ liệu" ở header
2. **Thêm cây trồng**: Click "+ Thêm cây"
3. **Ghi hoạt động**: Click "+ Thêm hoạt động"
4. **Upload file**: Click "Tải lên file"
   - JSON: Dữ liệu đã xuất
   - CSV: Nhật ký hoạt động
   - TXT: Ghi chú
5. **Download**: 
   - JSON: Toàn bộ dữ liệu
   - CSV: Nhật ký (mở bằng Excel)

---

## 🛠️ Công nghệ sử dụng

- **React 18**: UI framework
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **OpenWeatherMap API**: Dữ liệu thời tiết
- **Gemini AI API**: Chatbot
- **Window Storage API**: Lưu trữ dữ liệu

---

## 📝 Ví dụ file CSV để import

```csv
activity,date,weather
Phun thuốc,08/01/2026 14:30,28°C sunny
Bón phân,07/01/2026 09:00,25°C cloudy
Tưới nước,06/01/2026 17:00,30°C clear
```

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:
1. Fork project
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 📧 Liên hệ

Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue trên GitHub.

---

**Chúc bạn canh tác thuận lợi! 🌾✨**
