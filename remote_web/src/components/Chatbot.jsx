// src/components/Chatbot.jsx

import React from 'react';
import { MessageCircle, X, Send, Sprout } from 'lucide-react';
import { SAMPLE_QUESTIONS } from '../constants/constants';

const Chatbot = ({ isOpen, onToggle, messages, inputMessage, onInputChange, onSend, loading, chatEndRef }) => {
  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 w-16 h-16 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 transition flex items-center justify-center z-40"
        >
          <MessageCircle className="w-8 h-8" />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="bg-green-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6" />
              <div>
                <div className="font-bold">Trợ lý Nông nghiệp</div>
                <div className="text-xs text-green-100">Hỏi đáp về canh tác</div>
              </div>
            </div>
            <button onClick={onToggle} className="hover:bg-green-700 rounded-lg p-1">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-green-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Sample Questions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 space-y-2">
              <div className="text-xs text-gray-500 mb-2">Câu hỏi gợi ý:</div>
              {SAMPLE_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => onSend(question)}
                  className="w-full text-left text-sm p-2 bg-green-50 hover:bg-green-100 rounded-lg text-gray-700 transition"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSend()}
                placeholder="Nhập câu hỏi..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-green-500"
                disabled={loading}
              />
              <button
                onClick={() => onSend()}
                disabled={loading || !inputMessage.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;