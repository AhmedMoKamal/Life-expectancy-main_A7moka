import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        { sender: "ai", text: "Hello! I am your AI Health Data Consultant. How can I assist you today? 🩺📊" }
    ]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const newMessages = [...messages, { sender: "user", text: inputText }];
        setMessages(newMessages);
        setInputText("");
        setIsLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: inputText }),
            });

            const data = await response.json();

            setMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
        } catch (error) {
            setMessages((prev) => [...prev, { sender: "ai", text: "Sorry, the server is currently down or there is a connection error. ❌" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button className="chat-button" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "✖" : "💬"}
            </button>

            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        AI Consultant ✨
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.sender}`}>
                                {/* This line what will translate the formatting */}
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}
                    </div>

                    <div className="chat-input-area">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask the consultant here..."
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Chatbot;