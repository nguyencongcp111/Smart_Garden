# Đưa Smart Garden lên Vercel

Project đã có frontend Vite và ba Vercel Functions trong `api/`. ESP32 gửi HTTPS ra Internet, không cần mở cổng router, IP public, hay máy tính chạy cùng Wi-Fi. ESP32 vẫn cần một mạng Wi-Fi có Internet (có thể dùng hotspot điện thoại); điện thoại xem web có thể dùng 4G/5G ở nơi khác.

## 1. Chuẩn bị tài khoản và kho dữ liệu

1. Tạo tài khoản [Vercel](https://vercel.com/signup) và [Upstash](https://console.upstash.com/).
2. Trong Upstash, tạo một Redis database và lấy `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` ở phần REST API. Chọn khu vực phù hợp với nơi dùng vườn.
3. Chạy `npm run cloud:credentials` trong thư mục `remote_web`. Lệnh tạo tệp `cloud-credentials.json`, gồm ID mặc định `garden-01` và hai mã ngẫu nhiên riêng biệt. Tệp được Git và Vercel bỏ qua; chương trình không in mã ra log. Lệnh từ chối ghi đè tệp đã có.
4. `deviceToken` chỉ nạp vào ESP32. `webToken` chỉ nhập trên giao diện web. ID là tên nhận diện, không phải mật khẩu. Không gửi khóa Redis hoặc khóa Gemini vào firmware/trình duyệt.

## 2. Tạo project Vercel

Đưa mã nguồn lên repository Git của bạn, rồi chọn **Add New → Project → Import Git Repository** trong Vercel. Nếu repository chứa cả SmartGarden, đặt **Root Directory** là `remote_web`. Framework: **Vite**; Build: `npm run build`; Output: `dist`; Node: **22.x**. `vercel.json` đã cấu hình sẵn các mục này.

Tại Environment Variables, thêm cho môi trường **Production** và **Preview**:

| Biến | Giá trị |
| --- | --- |
| `WEATHER_API_KEY` | Khóa OpenWeather của bạn |
| `GEMINI_API_KEY` | Khóa Gemini của bạn |
| `UPSTASH_REDIS_REST_URL` | URL REST database Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST database Upstash |
| `GARDEN_DEVICES_JSON` | Toàn bộ JSON trong `cloud-credentials.json`, có thể thu gọn một dòng |

Các biến này nằm trên máy chủ, **không đặt tiền tố `VITE_`**. Có thể dùng lại giá trị các khóa dịch vụ hiện đang có trong `.env` nhưng nhập dưới tên mới. Nếu đổi biến sau khi deploy, chọn Redeploy.

Chọn **Deploy** rồi lấy domain Production, ví dụ `https://smart-garden-demo.vercel.app`. ESP32 cần gọi được domain này mà không bị trang đăng nhập Vercel/Deployment Protection chặn. Dùng URL Production công khai; chỉ mở quyền truy cập deployment cần dùng, API thiết bị vẫn kiểm tra token riêng.

Không upload thư mục `dist` đơn lẻ: phải deploy cả mã nguồn để Vercel tạo các Functions. Các thư mục báo cáo Word, ảnh kiểm tra tài liệu và firmware đã được loại khỏi gói deploy qua `.vercelignore`.

## 3. Nạp firmware cloud

Sketch hoàn chỉnh nằm tại `firmware/smart_garden_cloud/smart_garden_cloud.ino`; sketch gốc `smart_garden_phase3` được giữ để dùng LAN/quay lại phiên bản trước. Bản cloud giữ GPIO4/34/26, ngưỡng 30/70%, cảm biến đọc mỗi 2 giây, relay active LOW, giới hạn an toàn 10 phút và cơ chế chặn thủ công khi auto bật.

1. Arduino IDE: cài **esp32 by Espressif Systems**, **DHT sensor library**, **Adafruit Unified Sensor**, và **ArduinoJson 7**. Chọn board ESP32 của bạn.
2. Copy `arduino_secret.h.example` thành `arduino_secret.h`, điền Wi-Fi tại vườn.
3. Copy `cloud_config.h.example` thành `cloud_config.h`, điền:
   - `CLOUD_BASE_URL`: domain HTTPS Production, **không có dấu `/` ở cuối**.
   - `CLOUD_DEVICE_ID`: `garden-01`, trùng JSON trên Vercel.
   - `CLOUD_DEVICE_TOKEN`: `deviceToken` trong tệp cấu hình vừa tạo.
4. Nạp sketch, mở Serial Monitor 115200. Log in ID thiết bị và mã HTTP khi có lỗi, không in token.
5. Chứng chỉ gốc Let's Encrypt ISRG Root X1 và Google GTS Root R1/R4 đã có trong `cloud_ca.h`. Firmware xác minh TLS, đồng bộ thời gian qua NTP trước khi gọi HTTPS. Nếu domain sau này đổi nhà cung cấp chứng chỉ, cập nhật đúng root CA; không tắt kiểm tra chứng chỉ.

HTTPS chạy trong tác vụ FreeRTOS riêng. Vòng điều khiển gốc đọc số đo, áp dụng lệnh và tự tắt bơm qua hàng đợi; mất Internet không ngăn thuật toán tưới tại ESP32. Cấu hình tưới vẫn ở RAM theo thiết kế hiện tại, nên khởi động lại sẽ về mặc định. Phiên khởi động mới hủy lệnh cloud cũ.

## 4. Kết nối web và thử khác mạng

1. Mở domain Vercel. Chế độ mặc định của bản deploy là **Internet · ID thiết bị**.
2. Nhập `webToken` vào **Mã truy cập web**, nhập `garden-01` rồi **Kết nối**. Mã chỉ giữ trong bộ nhớ phiên đang mở, không lưu vào localStorage hay URL.
3. Đợi ESP32 đồng bộ lần đầu (khoảng 10–20 giây sau khi Wi-Fi/NTP sẵn sàng).
4. Tìm khu vực để thử OpenWeather; hỏi chatbot để thử Gemini. Giữ nguyên ba lựa chọn áp dụng/xem xét/từ chối.
5. Tắt auto rồi thử bơm thủ công với thời gian ngắn. Web chỉ báo thành công sau khi ESP32 gửi xác nhận kết quả thực hiện. Một lệnh thường cần 10–25 giây, tùy Internet; lệnh chờ hết hạn sau 35 giây. Không gửi lệnh mới trong lúc chờ.
6. Cho ESP32 ở Wi-Fi tại vườn và dùng điện thoại qua dữ liệu di động để kiểm tra mục tiêu khác mạng.
7. Ngắt Internet tại ESP32: sau tối đa 45 giây kể từ lần đồng bộ thành công, web báo offline và không cho gửi lệnh. Tưới tại ESP32 vẫn hoạt động. Lệnh đã hết hạn không được thực hiện khi thiết bị online lại.

## 5. Chạy tại máy để sửa giao diện

Copy `.env.example` thành `.env.local`, điền cùng các biến máy chủ, sau đó `npm install` và `npm run dev`. Vite dùng cùng handler với Vercel cho `/api/device`, `/api/weather` và Gemini. Có thể chọn **Internet · ID thiết bị** để thử cloud ngay trên máy.

Chế độ **Wi-Fi nội bộ · IP** vẫn hoạt động khi dùng website HTTP tại máy. Bản HTTPS trên Vercel dùng ID cloud để tránh trình duyệt chặn HTTP đến ESP32.

Nếu chưa thiết lập Redis, Vite dev/preview vẫn gọi thời tiết và chatbot với khóa dịch vụ hiện có; giới hạn tần suất được giữ tạm trong bộ nhớ tại máy. Kết nối thiết bị qua cloud và bản Production Vercel luôn cần Redis. Không có số đo cloud giả thay thế cho kho dữ liệu chưa cấu hình.

## Lỗi thường gặp

| Hiện tượng | Cần kiểm tra |
| --- | --- |
| Chưa cấu hình kho dữ liệu cloud | Hai biến Upstash và Redeploy |
| ID/mã truy cập không đúng | webToken trên web, deviceToken trên ESP32, ID trong JSON |
| ESP32 chưa online | Wi-Fi/Internet, nguồn, domain Production, NTP, token |
| Cloud HTTP 401 | Token ESP32 không đúng hoặc Deployment Protection đang chặn |
| HTTP âm trên Serial | DNS/Internet/NTP/chứng chỉ TLS |
| HTTP 400 | Dữ liệu/configuration không hợp lệ; giữ ngưỡng 0–100, start < stop, thời gian 1–600 giây |
| Lệnh hết hạn/chưa xác nhận | Kiểm tra trạng thái bơm thực tế trước khi gửi lại; mạng có thể mất sau khi lệnh đã thực hiện |
| Quá nhiều yêu cầu dịch vụ | Giới hạn mỗi IP: Gemini 10/phút, OpenWeather 30/phút |

Bản tạm dành cho số lượng thiết bị nhỏ, có ID và token cơ bản, chưa có tài khoản người dùng hay phân quyền nhiều thành viên. Không lưu lịch sử dài hạn: cloud chỉ giữ số đo gần nhất, một lệnh đang chờ và kết quả gần nhất, tự hết hạn bản ghi sau 24 giờ không đồng bộ. Polling ESP32 10 giây tạo khoảng 8.640 lần đồng bộ/ngày/thiết bị; Redis cần khoảng hai thao tác/lần đồng bộ, chưa tính web và lệnh. Theo dõi quota/gói dịch vụ và tăng khoảng đồng bộ nếu cần giảm sử dụng.

## Kiểm tra mã nguồn

`npm test` kiểm tra điều khiển cũ, xử lý lỗi chatbot, quyền token, offline, xác nhận lệnh, hết hạn, reboot và cập nhật đồng thời. `npm run build` tạo frontend Production; `npm run check:secrets` kiểm tra các khóa đã cấu hình không nằm trong bundle. Firmware đã biên dịch đạt với board `esp32:esp32:esp32`, core 3.3.12, ArduinoJson 7.4.3. Kiểm tra thực tế Internet/ESP32 cần hoàn thành sau khi đã tạo Vercel, Redis và nạp board.

Tài liệu chính thức: [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Upstash REST API](https://upstash.com/docs/redis/features/restapi), [Gemini API](https://ai.google.dev/api).
