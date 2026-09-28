// src/hooks/useChat.js

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../services/chatService';

export const useChat = (weather) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý nông nghiệp của bạn. Tôi có thể giúp bạn về: dự báo thời tiết, lịch gieo trồng, phòng trừ sâu bệnh, và các cảnh báo thời tiết. Bạn cần hỗ trợ gì?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(messageText, weather);
      const assistantMessage = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Lỗi chatbot:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Xin lỗi, tôi gặp sự cố: ${error.message || JSON.stringify(error)}. Vui lòng thử lại sau.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    inputMessage,
    setInputMessage,
    loading,
    sendMessage,
    chatEndRef
  };
};