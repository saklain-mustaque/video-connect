import React, { useState, useRef, useEffect } from "react";
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
  onClose: () => void;
}

export default function ChatPanel({ roomId, userId, userName, onClose }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const room = useRoomContext();
  
  // Use LiveKit data channel for real-time messaging
  const { send: sendDataMessage } = useDataChannel('chat', (data) => {
    try {
      const messageData = JSON.parse(new TextDecoder().decode(data.payload));
      if (messageData.type === 'chat' && messageData.userId !== userId) {
        // Only add messages from other participants to avoid duplication
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
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => msg.id === messageData.id);
          if (!exists) {
            return [...prev, newMessage];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to parse received message:', error);
    }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load initial messages from backend when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/messages`);
        if (response.ok) {
          const backendMessages = await response.json();
          // Convert backend messages to frontend format with proper timestamp conversion
          const convertedMessages = backendMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp), // Ensure timestamp is a Date object
          }));
          setMessages(convertedMessages);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    loadMessages();
  }, [roomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !sendDataMessage) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      userId,
      userName,
      content: message.trim(),
      type: 'text',
      timestamp: new Date(),
    };

    // Add to local state immediately (local echo)
    setMessages(prev => [...prev, newMessage]);
    
    setMessage(""); // Clear input immediately for better UX
    
    // Send via LiveKit data channel to all participants
    try {
      const messageData = {
        type: 'chat',
        id: newMessage.id,
        userId: newMessage.userId,
        userName: newMessage.userName,
        content: newMessage.content,
        messageType: newMessage.type,
        timestamp: newMessage.timestamp.toISOString(),
      };
      
      await sendDataMessage(new TextEncoder().encode(JSON.stringify(messageData)), {
        reliable: true,
      });
      
      // Also persist to backend (async, don't block UI)
      fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.content,
          type: newMessage.type,
          userId: newMessage.userId,
          userName: newMessage.userName,
        }),
      }).catch(error => {
        console.error('Failed to persist message to backend:', error);
        // Could add a retry mechanism or show error notification here
      });
      
      console.log('Message sent via LiveKit:', newMessage);
    } catch (error) {
      console.error('Failed to send message via LiveKit:', error);
      // Could show error notification to user here
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
    setIsUploading(true);
    
    files.forEach(async (file) => {
      const messageId = Date.now().toString() + Math.random();
      const fileType = file.type || 'application/octet-stream';
      const isImage = fileType.startsWith('image/');
      
      // Add initial message with upload progress
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
      
      setMessages(prev => [...prev, uploadMessage]);
      
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(async () => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setIsUploading(false);
          
          // Update message to remove progress
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, uploadProgress: undefined }
                : msg
            )
          );
          
          // Send file message via LiveKit data channel
          if (sendDataMessage) {
            try {
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
              
              await sendDataMessage(new TextEncoder().encode(JSON.stringify(fileMessageData)), {
                reliable: true,
              });
              
              console.log('File message sent via LiveKit:', file.name);
            } catch (error) {
              console.error('Failed to send file message:', error);
            }
          }
          
          console.log('File uploaded:', file.name);
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
    });
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (msgUserId: string) => msgUserId === userId;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg">Chat</CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          data-testid="button-close-chat"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
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
                        <p className="text-sm" data-testid={`message-${msg.id}`}>{msg.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {React.createElement(getFileIcon(msg.fileType || ''), { className: "w-4 h-4" })}
                            <div className="flex-1">
                              <span className="text-sm font-medium">{msg.fileName || msg.content}</span>
                              {msg.fileSize && (
                                <p className="text-xs opacity-70">{formatFileSize(msg.fileSize)}</p>
                              )}
                            </div>
                            {msg.uploadProgress === undefined && (
                              <Button variant="ghost" size="icon" className="w-6 h-6">
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

        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={handleMediaUpload}
                disabled={isUploading}
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
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              data-testid="button-emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button 
              type="submit" 
              disabled={!message.trim()}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          {/* Hidden file input */}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}