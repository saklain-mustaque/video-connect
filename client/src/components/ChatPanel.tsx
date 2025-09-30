import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Send, X, File, Image, Smile, Paperclip, Download, MessageSquare } from "lucide-react";
import { useDataChannel, useRoomContext } from '@livekit/components-react';
import { DataPacket_Kind } from 'livekit-client';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'file' | 'image';
  timestamp: Date;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadProgress?: number;
}

interface ChatPanelProps {
  roomId: string;
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onNewMessage?: (count: number) => void;
}

export default function ChatPanel({ roomId, userId, userName, isOpen, onClose, onNewMessage }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [actualRoomId, setActualRoomId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const room = useRoomContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);
  
  // Handle incoming messages via LiveKit data channel
  const handleIncomingMessage = useCallback((data: any) => {
    try {
      const messageData = JSON.parse(new TextDecoder().decode(data.payload));
      
      // Only process chat messages from other users
      if (messageData.type === 'chat' && messageData.userId !== userId) {
        const newMessage: Message = {
          id: messageData.id,
          userId: messageData.userId,
          userName: messageData.userName,
          content: messageData.content,
          type: messageData.messageType || 'text',
          timestamp: new Date(messageData.timestamp),
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          fileType: messageData.fileType,
        };
        
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === messageData.id);
          if (!exists) {
            const newMessages = [...prev, newMessage];
            
            // If chat is not open, increment unread count
            if (!isOpen) {
              setUnreadCount(count => count + 1);
            }
            
            // Notify parent component
            if (onNewMessage) {
              onNewMessage(newMessages.length);
            }
            
            return newMessages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to parse received message:', error);
    }
  }, [userId, isOpen, onNewMessage]);
  
  // Use LiveKit data channel for real-time messaging
  const { send: sendDataMessage } = useDataChannel('chat', handleIncomingMessage);
  
  // Reset unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
  
  // Get actual room UUID from room code
  useEffect(() => {
    const fetchRoomId = async () => {
      try {
        const response = await fetch(`/api/rooms/by-code/${roomId}`);
        if (response.ok) {
          const roomData = await response.json();
          setActualRoomId(roomData.id);
          console.log(`✅ Room code ${roomId} maps to UUID: ${roomData.id}`);
        } else {
          console.error('❌ Failed to fetch room data:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to fetch room ID:', error);
      }
    };
    
    fetchRoomId();
  }, [roomId]);

  // Load messages from backend when actualRoomId is available
  useEffect(() => {
    if (!actualRoomId) return;
    
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        console.log(`🔄 Loading messages for room: ${actualRoomId}`);
        const response = await fetch(`/api/rooms/${actualRoomId}/messages`);
        
        if (response.ok) {
          const backendMessages = await response.json();
          const convertedMessages = backendMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          
          setMessages(convertedMessages);
          lastMessageCountRef.current = convertedMessages.length;
          console.log(`✅ Loaded ${convertedMessages.length} messages from backend`);
        } else {
          console.error('❌ Failed to load messages:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to load messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    loadMessages();
  }, [actualRoomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const persistMessageToBackend = async (messageData: any) => {
    if (!actualRoomId) {
      console.error('❌ Cannot persist message: actualRoomId is null');
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${actualRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageData.content,
          type: messageData.type,
          userId: messageData.userId,
          userName: messageData.userName,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          fileType: messageData.fileType,
        }),
      });
      
      if (response.ok) {
        console.log('✅ Message persisted to backend');
      } else {
        console.error('❌ Failed to persist message to backend:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to persist message to backend:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sendDataMessage || !actualRoomId) return;

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: Message = {
      id: messageId,
      userId,
      userName,
      content: message.trim(),
      type: 'text',
      timestamp: new Date(),
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    try {
      // Prepare message data for LiveKit
      const messageData = {
        type: 'chat',
        id: newMessage.id,
        userId: newMessage.userId,
        userName: newMessage.userName,
        content: newMessage.content,
        messageType: newMessage.type,
        timestamp: newMessage.timestamp.toISOString(),
      };
      
      // Send via LiveKit data channel
      await sendDataMessage(new TextEncoder().encode(JSON.stringify(messageData)), {
        reliable: true,
      });
      
      console.log('✅ Message sent via LiveKit:', newMessage.content);
      
      // Persist to backend (don't await to keep UI responsive)
      persistMessageToBackend({
        content: newMessage.content,
        type: newMessage.type,
        userId: newMessage.userId,
        userName: newMessage.userName,
      });
      
    } catch (error) {
      console.error('❌ Failed to send message via LiveKit:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return Image;
    return File;
  };

  const handleMediaUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    if (!actualRoomId || !sendDataMessage) return;
    
    setIsUploading(true);
    
    for (const file of files) {
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileType = file.type || 'application/octet-stream';
      const isImage = fileType.startsWith('image/');
      
      const uploadMessage: Message = {
        id: messageId,
        userId,
        userName,
        content: file.name,
        type: isImage ? 'image' : 'file',
        timestamp: new Date(),
        fileName: file.name,
        fileSize: file.size,
        fileType,
        uploadProgress: 0,
      };
      
      // Add upload message with progress
      setMessages(prev => [...prev, uploadMessage]);
      
      // Simulate upload progress (replace with actual upload logic)
      let progress = 0;
      const interval = setInterval(async () => {
        progress += Math.random() * 20;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setIsUploading(false);
          
          // Remove progress indicator
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, uploadProgress: undefined }
                : msg
            )
          );
          
          try {
            // Prepare file message data
            const fileMessageData = {
              type: 'chat',
              id: messageId,
              userId,
              userName,
              content: file.name,
              messageType: isImage ? 'image' : 'file',
              timestamp: new Date().toISOString(),
              fileName: file.name,
              fileSize: file.size,
              fileType,
            };
            
            // Send via LiveKit
            await sendDataMessage(new TextEncoder().encode(JSON.stringify(fileMessageData)), {
              reliable: true,
            });
            
            console.log('✅ File message sent via LiveKit:', file.name);
            
            // Persist to backend
            persistMessageToBackend({
              content: file.name,
              type: isImage ? 'image' : 'file',
              userId,
              userName,
              fileName: file.name,
              fileSize: file.size,
              fileType,
            });
            
          } catch (error) {
            console.error('❌ Failed to send file message:', error);
          }
        }
        
        // Update progress
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, uploadProgress: progress }
              : msg
          )
        );
      }, 200);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (msgUserId: string) => msgUserId === userId;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">Chat</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          data-testid="button-close-chat"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        <ScrollArea className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-sm">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${isOwnMessage(msg.userId) ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isOwnMessage(msg.userId) ? 'order-2' : 'order-1'}`}>
                    {!isOwnMessage(msg.userId) && (
                      <p className="text-xs text-muted-foreground mb-1 px-3">
                        {msg.userName}
                      </p>
                    )}
                    
                    <div className={`rounded-lg p-3 ${
                      isOwnMessage(msg.userId) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {msg.type === 'text' ? (
                        <p className="text-sm break-words" data-testid={`message-${msg.id}`}>{msg.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {React.createElement(getFileIcon(msg.fileType || ''), { className: "w-4 h-4" })}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">{msg.fileName || msg.content}</span>
                              {msg.fileSize && (
                                <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>
                              )}
                            </div>
                            {msg.uploadProgress === undefined && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-6 h-6 flex-shrink-0"
                                title="Download file"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {msg.uploadProgress !== undefined && (
                            <div className="space-y-1">
                              <Progress value={msg.uploadProgress} className="h-1" />
                              <p className="text-xs opacity-70">Uploading... {Math.round(msg.uploadProgress)}%</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        isOwnMessage(msg.userId) 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={handleMediaUpload}
                disabled={isUploading || !actualRoomId}
                data-testid="button-media-upload"
                title="Upload media"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                data-testid="input-chat-message"
                disabled={!actualRoomId}
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              data-testid="button-emoji"
              disabled={!actualRoomId}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button 
              type="submit" 
              disabled={!message.trim() || !actualRoomId}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Room: {roomId}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {messages.length} messages
            </span>
            {!actualRoomId && (
              <Badge variant="destructive" className="text-xs">
                Connecting...
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
