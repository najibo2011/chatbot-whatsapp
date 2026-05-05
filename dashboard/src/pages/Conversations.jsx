import { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Shield, Trash2, MessageSquare } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api';

function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchConversations();

    socketRef.current = io('http://localhost:3001');
    socketRef.current.on('message:new', (msg) => {
      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === msg.conversationId
            ? { ...c, last_message: msg.content, last_message_at: msg.timestamp }
            : c
        );
        return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
      });

      // Update messages if viewing this conversation
      setSelectedConv(current => {
        if (current?.id === msg.conversationId) {
          setMessages(prev => [...prev, {
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp
          }]);
        }
        return current;
      });
    });

    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chats');
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    try {
      const { data } = await api.get(`/chats/${conv.id}/messages`);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    try {
      await api.post(`/chats/${selectedConv.id}/send`, { content: newMessage });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    try {
      await api.delete(`/chats/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (selectedConv?.id === id) {
        setSelectedConv(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSenderIcon = (sender) => {
    switch (sender) {
      case 'user': return <User className="w-4 h-4" />;
      case 'bot': return <Bot className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return null;
    }
  };

  const getSenderColor = (sender) => {
    switch (sender) {
      case 'user': return 'bg-gray-100 text-gray-800';
      case 'bot': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Conversation list */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Conversations</h3>
          <p className="text-sm text-gray-500">{conversations.length} conversation(s)</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              Aucune conversation
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition flex items-center justify-between group ${
                  selectedConv?.id === conv.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {conv.contact_name || conv.phone_number}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.last_message_at && new Date(conv.last_message_at).toLocaleString('fr')}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {selectedConv.contact_name || selectedConv.phone_number}
              </h3>
              <p className="text-sm text-gray-500">{selectedConv.phone_number}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${getSenderColor(msg.sender)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {getSenderIcon(msg.sender)}
                      <span className="text-xs font-medium opacity-70">
                        {msg.sender === 'user' ? 'Client' : msg.sender === 'bot' ? 'Bot IA' : 'Admin'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Envoyer un message en tant qu'admin..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Conversations;
