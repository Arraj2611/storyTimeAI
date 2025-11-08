import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendChatMessage } from '../services/geminiService';
import { ChatBubbleIcon, PaperAirplaneIcon, XCircleIcon } from './icons/Icons';
import LoadingSpinner from './LoadingSpinner';

const ChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'bot', text: "Hi there! I'm Sparky! You can ask me anything about the story." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async () => {
        if (!userInput.trim()) return;

        const newUserMessage: ChatMessage = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const botResponseText = await sendChatMessage(userInput);
            const newBotMessage: ChatMessage = { sender: 'bot', text: botResponseText };
            setMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = { sender: 'bot', text: "Uh oh! My circuits are fizzled. I can't talk right now." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-500 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-600 active:scale-90 transition-transform duration-200 z-40"
                aria-label="Open Chat"
            >
                <ChatBubbleIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md h-[70vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
                        <header className="p-4 bg-blue-500 text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold">Chat with Sparky</h3>
                            <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80">
                                <XCircleIcon className="w-7 h-7" />
                            </button>
                        </header>

                        <div className="flex-1 p-4 overflow-y-auto bg-blue-50">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex justify-start mb-3">
                                    <div className="max-w-[80%] p-3 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none">
                                        <div className="flex items-center gap-2">
                                            <LoadingSpinner className="w-5 h-5" />
                                            <span>Sparky is thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <footer className="p-3 border-t bg-white">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                                    placeholder="Ask a question..."
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !userInput.trim()}
                                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatBot;
