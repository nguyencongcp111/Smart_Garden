import { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../services/chatService';

let nextMessageId = 0;
const createMessageId = () => `message-${Date.now()}-${++nextMessageId}`;

export const useChat = (context) => {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: 'Chào bạn, mình là trợ lý khu vườn. Kết nối ESP32 và nhập tên cây (nếu có), mình sẽ dựa vào cảm biến để gợi ý ngưỡng độ ẩm và thời gian tưới phù hợp.' }]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, loading]);

  const sendMessage = async (messageText = inputMessage) => {
    if (typeof messageText !== 'string' || !messageText.trim() || pending.current) return;
    pending.current = true;
    const requestContext = { ...context };
    const history = messages.filter((item) => item.id !== 'welcome').slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { id: createMessageId(), role: 'user', content: messageText }]);
    setInputMessage('');
    setLoading(true);
    try {
      const reply = await sendChatMessage(messageText, requestContext, history);
      setMessages((prev) => [...prev.map((item) => reply.recommendation && item.recommendation && !item.decision ? { ...item, decision: 'superseded' } : item), { id: createMessageId(), role: 'assistant', ...reply, contextKey: requestContext.contextKey }]);
    } catch (error) {
      const detail = (error.message || 'Có lỗi kết nối').replace(/[.!?\s]+$/, '');
      setMessages((prev) => [...prev, { id: createMessageId(), role: 'assistant', content: `Chưa thể nhận gợi ý: ${detail}. Bạn có thể thử lại.` }]);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };
  const updateRecommendation = (id, changes) => setMessages((prev) => prev.map((item) => item.id === id ? { ...item, ...changes } : item));
  return { messages, inputMessage, setInputMessage, loading, sendMessage, chatEndRef, updateRecommendation };
};
