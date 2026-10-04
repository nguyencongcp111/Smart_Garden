import React from 'react';
import { MessageCircle, X, Send, Sprout, Sparkles, Loader2, Check } from 'lucide-react';

const DECISIONS = { applied: 'Đã áp dụng trên ESP32', reviewed: 'Đã mở cấu hình để bạn xem xét', rejected: 'Đã từ chối · Không thay đổi cấu hình', superseded: 'Đã có gợi ý mới hơn' };

export default function Chatbot({ isOpen, onToggle, messages, inputMessage, onInputChange, onSend, loading, chatEndRef, onRecommendation, contextKey, connected, autoSaving, plantName }) {
  return <>
    {!isOpen && <button onClick={onToggle} className="chat-launcher"><MessageCircle size={22} /><span>Trợ lý khu vườn</span><span className="chat-dot" /></button>}
    {isOpen && <section className="chat-window" role="dialog" aria-label="Trợ lý khu vườn">
      <header className="chat-header"><span className="chat-avatar"><Sprout size={25} /></span><div><h2>Trợ lý khu vườn</h2><p>{connected ? `Đã nhận cảm biến${plantName.trim() ? ` · ${plantName.trim()}` : ''}` : 'Kết nối ESP32 để nhận gợi ý tưới'}</p></div><button aria-label="Đóng trợ lý" onClick={onToggle}><X size={21} /></button></header>
      <div className="chat-messages" aria-live="polite">
        {messages.map((msg) => {
          const stale = msg.contextKey !== contextKey || !connected;
          const disabled = stale || autoSaving || loading || !!msg.decision;
          return <div key={msg.id} className={`chat-message ${msg.role}`}><div className="message-content">{msg.content}</div>
            {msg.recommendation && <div className="recommendation"><h3><Sparkles size={16} /> Cấu hình gợi ý</h3><div className="recommendation-values"><div><span>Bật tưới ≤</span><strong>{msg.recommendation.startPercent}%</strong></div><div><span>Dừng tưới ≥</span><strong>{msg.recommendation.stopPercent}%</strong></div><div><span>Tối đa</span><strong>{msg.recommendation.durationSec}s</strong></div></div><p className="helper-text">Chế độ tự động: {msg.recommendation.enabled ? 'Bật' : 'Tắt'}</p>
              {!msg.decision || msg.decision === 'saving' ? <><div className="recommendation-actions"><button className="primary-button" disabled={disabled} onClick={() => onRecommendation(msg, 'applied')}>{msg.decision === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Áp dụng ngay</button><button className="secondary-button" disabled={disabled} onClick={() => onRecommendation(msg, 'reviewed')}>Tôi sẽ xem xét</button><button className="text-button" disabled={autoSaving || loading} onClick={() => onRecommendation(msg, 'rejected')}>Từ chối</button></div>{stale && <p className="helper-text">Kết nối hoặc tên cây đã thay đổi. Hãy yêu cầu gợi ý mới.</p>}</> : <p className="decision-label">{DECISIONS[msg.decision]}</p>}
              {msg.actionError && <p className="form-error" role="alert">Chưa áp dụng được: {msg.actionError}</p>}
            </div>}
          </div>;
        })}
        {loading && <div className="chat-thinking" role="status"><Loader2 size={16} className="animate-spin" /> Đang lắng nghe khu vườn...</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-suggestions"><button disabled={loading || autoSaving} onClick={() => onSend('Hãy gợi ý các chỉ số tưới tự động dựa trên cảm biến hiện tại và tên cây của tôi.')}><Sparkles size={14} /> Gợi ý tưới tự động</button></div>
      <form className="chat-input" onSubmit={(event) => { event.preventDefault(); onSend(); }}><input aria-label="Tin nhắn cho trợ lý" value={inputMessage} onChange={(event) => onInputChange(event.target.value)} placeholder="Hỏi điều gì đó về cây của bạn..." disabled={loading || autoSaving} /><button className="primary-button" aria-label="Gửi tin nhắn" disabled={loading || autoSaving || !inputMessage.trim()}><Send size={18} /></button></form>
    </section>}
  </>;
}
