# Smart Garden · ESP32 + Vercel

Giao diện hai khu vực: thời tiết OpenWeather bên trái; cảm biến, bơm, cấu hình tưới và chatbot Gemini bên phải. Web hỗ trợ kết nối Internet bằng ID thiết bị và kết nối LAN bằng IP khi phát triển tại máy.

## Triển khai Internet

Đọc [hướng dẫn thiết lập Vercel, Upstash và ESP32](docs/VERCEL_SETUP.md). Các tệp cấu hình deploy đã có trong `vercel.json`; không cần đổi sang Next.js.

```text
ESP32 tại vườn ── HTTPS ──► API Vercel ◄── HTTPS ── Web/điện thoại
                               │
                            Upstash Redis
                               │
                       Gemini / OpenWeather
```

ESP32 chủ động đồng bộ mỗi 10 giây, gửi cảm biến và nhận lệnh. Redis lưu trạng thái gần nhất, một lệnh chờ và xác nhận. Website dùng ID như `garden-01` cùng mã truy cập web, không cần cùng Wi-Fi với ESP32. Các khóa Gemini/OpenWeather/Redis chỉ nằm trên máy chủ. Khóa nạp vào ESP32 khác với mã dùng trên website.

## Phạm vi giữ nguyên

- Đọc DHT11 GPIO4 và Soil Moisture GPIO34; relay GPIO26 active LOW.
- Vòng đọc 2 giây, thuật toán tưới theo hai ngưỡng, tưới thủ công và giới hạn bơm 10 phút.
- Kiểm tra ngưỡng 0–100%, start < stop, thời gian 1–600 giây.
- Chatbot nhận số đo/tên cây và hiển thị ba lựa chọn **Áp dụng ngay / Tôi sẽ xem xét / Từ chối**. Chỉ báo đã lưu khi ESP32 xác nhận giá trị thực hiện.
- Các endpoint LAN `/status`, `/sensors`, `/relay`, `/auto` được giữ trong firmware.

Bản firmware cloud hoàn chỉnh ở `firmware/smart_garden_cloud`. HTTPS chạy trong tác vụ riêng, trao đổi qua hàng đợi để không chặn vòng tưới gốc. Sketch gốc ở thư mục bên cạnh `smart_garden_phase3` được giữ nguyên. Khởi động lại về cấu hình mặc định theo thiết kế hiện tại.

## Chạy tại máy

```sh
npm install
npm run cloud:credentials
npm run dev
```

Copy `.env.example` thành `.env.local` và điền các biến máy chủ. `cloud-credentials.json` được tạo một lần, chứa ID và hai token ngẫu nhiên; chương trình không ghi đè tệp có sẵn. Chọn Internet để dùng cloud, hoặc Wi-Fi nội bộ để gọi IP trong mạng LAN. Bản Production HTTPS mặc định dùng Internet.

Mã cũ `VITE_GEMINI_API_KEY`/`VITE_WEATHER_API_KEY` chỉ được Vite đọc ở máy chủ để hỗ trợ chuyển đổi tại máy; trên Vercel đặt tên mới `GEMINI_API_KEY`/`WEATHER_API_KEY` và Redeploy. Frontend không đưa khóa vào request hay bundle.

## API cloud

| Endpoint | Người gọi | Chức năng |
| --- | --- | --- |
| `POST /api/device?action=sync&id=...` | ESP32 + deviceToken | Gửi cảm biến/xác nhận; nhận lệnh |
| `GET /api/device?action=status&id=...` | Web + webToken | Kiểm tra ID và online |
| `GET /api/device?action=sensors&id=...` | Web + webToken | Đọc số đo mới nhất |
| `POST /api/device?action=command&id=...` | Web + webToken | Tạo lệnh relay hoặc cấu hình auto |
| `GET /api/device?action=result&id=...&command=...` | Web + webToken | Đợi xác nhận thực hiện |
| `POST /api/gemini/v1beta/models/gemini-2.5-flash:generateContent` | Web | Gọi Gemini qua máy chủ |
| `GET /api/weather?endpoint=weather&q=...` | Web | Thời tiết hiện tại |
| `GET /api/weather?endpoint=forecast&q=...` | Web | Dự báo |

Token thiết bị được gửi bằng `Authorization: Bearer ...`, không đưa vào URL. Dữ liệu hơn 45 giây không đồng bộ sẽ được coi offline. Lệnh chờ hết hạn sau 35 giây và gắn với phiên khởi động; không thực hiện lại khi thiết bị khởi động lại hoặc kết nối sau thời hạn. Chỉ một lệnh đang chờ trên mỗi thiết bị để tránh ghi đè. Chưa có tài khoản người dùng và lịch sử dài hạn trong bản tạm này.

## Kiểm tra

```sh
npm test
npm run build
```

Kiểm tra tự động bao gồm hợp đồng dữ liệu cũ, gợi ý AI, lỗi JSON/rỗng, xác nhận cấu hình, token hai vai trò, offline, lệnh hết hạn, reboot và cập nhật đồng thời. Vite dev/preview và Vercel dùng chung API handler. Việc thử cảm biến và bơm qua Internet cần tài khoản cloud đã thiết lập và firmware đã nạp lên board.
