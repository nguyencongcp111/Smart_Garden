// src/services/chatService.js

import { API_CONFIG } from '../constants/constants';

export const sendChatMessage = async (message, weatherData) => {
  let weatherContext = '';

  if (weatherData) {
    weatherContext = `
Thông tin thời tiết hiện tại tại ${weatherData.name}:
- Nhiệt độ: ${weatherData.main.temp}°C
- Độ ẩm: ${weatherData.main.humidity}%
- Tốc độ gió: ${weatherData.wind.speed} m/s
- Thời tiết: ${weatherData.weather[0].description}
- Lượng mưa: ${weatherData.rain?.['1h'] || 0} mm
`;
  }

  // Construct the URL path to match the proxy configuration
  // The proxy routes /api/gemini -> https://generativelanguage.googleapis.com
  const proxyUrl = `${API_CONFIG.GEMINI_API_URL}/${API_CONFIG.GEMINI_MODEL}:generateContent?key=${API_CONFIG.GEMINI_API_KEY}`;

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Bạn là trợ lý nông nghiệp thông minh. ${weatherContext}

Câu hỏi của nông dân: ${message}

Hãy trả lời ngắn gọn, thực tế và hữu ích. Tập trung vào:
- Lời khuyên canh tác phù hợp với thời tiết
- Cảnh báo rủi ro
- Thời điểm tốt nhất để thực hiện công việc
- Biện pháp phòng tránh sâu bệnh

Trả lời bằng tiếng Việt, giọng điệu thân thiện.`
        }]
      }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid API response format");
  }

  return data.candidates[0].content.parts[0].text;
};