import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import '../styles/Chat.css';

const Chat = ({ roomId, participants }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join room
    newSocket.emit('join_room', roomId);

    // Load existing messages
    fetchMessages();

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
  }, [socket]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      roomId,
      message: newMessage,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat Room</h3>
        <div className="participants">
          {participants.map((participant, index) => (
            <span key={index} className="participant-badge">
              {participant.name} ({participant.role})
            </span>
          ))}
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`}
          >
            <div className="message-header">
              <span className="sender-name">{message.sender_name}</span>
              <span className={`sender-role role-${message.sender_role}`}>
                {message.sender_role}
              </span>
            </div>
            <div className="message-content">{message.message}</div>
            <div className="message-timestamp">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat; 