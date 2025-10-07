import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Send, X, File, Image, Smile, Paperclip, Download, MessageSquare, Users, User} from "lucide-react";
import { useDataChannel, useRoomContext, useParticipants } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from 'livekit-client';

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
  recipientId?: string; // undefined means broadcast to everyone
  recipientName?: string;
  isPrivate?: boolean;
}

interface ChatPanelProps {
  roomId: string;
  userId: string;
  userName: string;
  isOpen?: boolean;
  onClose: () => void;
  onNewMessage?: (count: number) => void;
}

export default function EnhancedChatPanel({ roomId, userId, userName, isOpen = true, onClose, onNewMessage }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [actualRoomId, setActualRoomId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("everyone"); // "everyone" or participant ID
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("Everyone");
  
  const room = useRoomContext();
  const participants = useParticipants();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);
  
  // Filter messages based on recipient (show broadcast and private messages to/from current user)
  const visibleMessages = messages.filter(msg => {
    // Show broadcast messages to everyone
    if (!msg.recipientId) return true;
    
    // Show private messages where current user is sender or recipient
    return msg.userId === userId || msg.recipientId === userId;
  });

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const handleIncomingMessage = useCallback((data: any) => {
    try {
      const messageData = JSON.parse(new TextDecoder().decode(data.payload));
      
      if (messageData.type === 'chat') {
        // Only process messages that are not from current user
        if (messageData.userId === userId) return;
        
        // Check if this is a private message meant for current user
        const isForMe = !messageData.recipientId || messageData.recipientId === userId;
        
        if (isForMe) {
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
            recipientId: messageData.recipientId,
            recipientName: messageData.recipientName,
            isPrivate: !!messageData.recipientId,
          };
          
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === messageData.id);
            if (!exists) {
              const newMessages = [...prev, newMessage];
              
              if (!isOpen) {
                setUnreadCount(count => count + 1);
              }
              
              if (onNewMessage) {
                onNewMessage(newMessages.length);
              }
              
              return newMessages;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse received message:', error);
    }
  }, [userId, isOpen, onNewMessage]);
  
  const { send: sendDataMessage } = useDataChannel('chat', handleIncomingMessage);
  
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
  
  useEffect(() => {
    const fetchRoomId = async () => {
      try {
        const response = await fetch(`/api/rooms/by-code/${roomId}`, {
          credentials: 'include',
        });
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

  useEffect(() => {
    if (!actualRoomId) return;
    
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        console.log(`🔄 Loading messages for room: ${actualRoomId}`);
        const response = await fetch(`/api/rooms/${actualRoomId}/messages`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const backendMessages = await response.json();
          const convertedMessages = backendMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            isPrivate: !!msg.recipientId,
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
  }, [visibleMessages]);

  const persistMessageToBackend = async (messageData: any) => {
    if (!actualRoomId) {
      console.error('❌ Cannot persist message: actualRoomId is null');
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${actualRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: messageData.content,
          type: messageData.type,
          userName: messageData.userName,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          fileType: messageData.fileType,
          recipientId: messageData.recipientId,
          recipientName: messageData.recipientName,
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
    const isPrivate = selectedRecipient !== "everyone";
    
    const newMessage: Message = {
      id: messageId,
      userId,
      userName,
      content: message.trim(),
      type: 'text',
      timestamp: new Date(),
      recipientId: isPrivate ? selectedRecipient : undefined,
      recipientName: isPrivate ? selectedRecipientName : undefined,
      isPrivate,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    
    try {
      const messageData = {
        type: 'chat',
        id: newMessage.id,
        userId: newMessage.userId,
        userName: newMessage.userName,
        content: newMessage.content,
        messageType: newMessage.type,
        timestamp: newMessage.timestamp.toISOString(),
        recipientId: newMessage.recipientId,
        recipientName: newMessage.recipientName,
      };
      
      await sendDataMessage(new TextEncoder().encode(JSON.stringify(messageData)), {
        reliable: true,
      });
      
      console.log('✅ Message sent via LiveKit:', newMessage.content);
      
      persistMessageToBackend({
        content: newMessage.content,
        type: newMessage.type,
        userName: newMessage.userName,
        recipientId: newMessage.recipientId,
        recipientName: newMessage.recipientName,
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
    const isPrivate = selectedRecipient !== "everyone";
    
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
        recipientId: isPrivate ? selectedRecipient : undefined,
        recipientName: isPrivate ? selectedRecipientName : undefined,
        isPrivate,
      };
      
      setMessages(prev => [...prev, uploadMessage]);
      
      let progress = 0;
      const interval = setInterval(async () => {
        progress += Math.random() * 20;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setIsUploading(false);
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, uploadProgress: undefined }
                : msg
            )
          );
          
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
              recipientId: uploadMessage.recipientId,
              recipientName: uploadMessage.recipientName,
            };
            
            await sendDataMessage(new TextEncoder().encode(JSON.stringify(fileMessageData)), {
              reliable: true,
            });
            
            console.log('✅ File message sent via LiveKit:', file.name);
            
            persistMessageToBackend({
              content: file.name,
              type: isImage ? 'image' : 'file',
              userName,
              fileName: file.name,
              fileSize: file.size,
              fileType,
              recipientId: uploadMessage.recipientId,
              recipientName: uploadMessage.recipientName,
            });
            
          } catch (error) {
            console.error('❌ Failed to send file message:', error);
          }
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, uploadProgress: progress }
              : msg
          )
        );
      }, 200);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (msgUserId: string) => msgUserId === userId;

  // Get list of other participants (excluding self)
  const otherParticipants = participants.filter(p => p.identity !== userId);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none overflow-hidden modern-card">
      {/* Modern Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 border-b bg-card/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Chat</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs mt-1">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          data-testid="button-close-chat"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Recipient Selector */}
        <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Send to:</span>
            <Select 
              value={selectedRecipient} 
              onValueChange={(value) => {
                setSelectedRecipient(value);
                if (value === "everyone") {
                  setSelectedRecipientName("Everyone");
                } else {
                  const participant = participants.find(p => p.identity === value);
                  setSelectedRecipientName(participant?.name || participant?.identity || "Unknown");
                }
              }}
            >
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Everyone</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Broadcast
                    </Badge>
                  </div>
                </SelectItem>
                {otherParticipants.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    {otherParticipants.map((participant) => (
                      <SelectItem key={participant.identity} value={participant.identity}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-xs gradient-primary text-white">
                              {getInitials(participant.name || participant.identity)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{participant.name || participant.identity}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            Private
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedRecipient !== "everyone" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <Badge variant="secondary" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Private chat with {selectedRecipientName}
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-4">
            {isLoadingMessages ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-32 text-muted-foreground"
              >
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg mb-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-medium">Loading messages...</p>
              </motion.div>
            ) : visibleMessages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-48 text-muted-foreground"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <p className="text-base font-semibold mb-1">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {visibleMessages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${isOwnMessage(msg.userId) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isOwnMessage(msg.userId) ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-3">
                        {!isOwnMessage(msg.userId) && (
                          <>
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[10px] gradient-primary text-white">
                                {getInitials(msg.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-muted-foreground">
                              {msg.userName}
                            </p>
                          </>
                        )}
                        {msg.isPrivate && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <User className="w-2.5 h-2.5 mr-0.5" />
                            {isOwnMessage(msg.userId) ? `To ${msg.recipientName}` : 'Private'}
                          </Badge>
                        )}
                      </div>
                      
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className={`rounded-2xl p-3.5 shadow-sm backdrop-blur-sm ${
                          isOwnMessage(msg.userId) 
                            ? msg.isPrivate
                              ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                              : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                            : msg.isPrivate
                              ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                              : 'bg-card border border-border'
                        }`}
                      >
                        {msg.type === 'text' ? (
                          <p className="text-sm break-words leading-relaxed" data-testid={`message-${msg.id}`}>
                            {msg.content}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {React.createElement(getFileIcon(msg.fileType || ''), { 
                                className: `w-4 h-4 ${isOwnMessage(msg.userId) ? 'text-white' : 'text-primary'}` 
                              })}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium truncate block">
                                  {msg.fileName || msg.content}
                                </span>
                                {msg.fileSize && (
                                  <p className={`text-xs ${
                                    isOwnMessage(msg.userId) ? 'text-white/70' : 'text-muted-foreground'
                                  }`}>
                                    {formatFileSize(msg.fileSize)}
                                  </p>
                                )}
                              </div>
                              {msg.uploadProgress === undefined && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={`w-7 h-7 flex-shrink-0 ${
                                    isOwnMessage(msg.userId) 
                                      ? 'hover:bg-white/20 text-white' 
                                      : 'hover:bg-primary/10 text-primary'
                                  }`}
                                  title="Download file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                            {msg.uploadProgress !== undefined && (
                              <div className="space-y-1">
                                <Progress value={msg.uploadProgress} className="h-1.5" />
                                <p className={`text-xs ${
                                  isOwnMessage(msg.userId) ? 'text-white/70' : 'text-muted-foreground'
                                }`}>
                                  Uploading... {Math.round(msg.uploadProgress)}%
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className={`text-xs mt-1.5 ${
                          isOwnMessage(msg.userId) 
                            ? 'text-white/60' 
                            : 'text-muted-foreground'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Modern Input Area */}
        <div className="p-4 sm:p-6 border-t bg-card/50 backdrop-blur-xl flex-shrink-0">
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={handleMediaUpload}
                disabled={isUploading || !actualRoomId}
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200 flex-shrink-0"
                data-testid="button-media-upload"
                title="Upload media"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder={selectedRecipient === "everyone" ? "Message everyone..." : `Message ${selectedRecipientName}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-11 !bg-card !text-foreground border-input focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 pr-20 input-modern"
                  style={{ 
                    color: 'hsl(var(--foreground)) !important',
                    backgroundColor: 'hsl(var(--card)) !important',
                    WebkitTextFillColor: 'hsl(var(--foreground))',
                    caretColor: 'hsl(var(--foreground))',
                    opacity: '1'
                  }}
                  data-testid="input-chat-message"
                  disabled={!actualRoomId}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                    data-testid="button-emoji"
                    disabled={!actualRoomId}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={!message.trim() || !actualRoomId}
                className="btn-primary h-11 px-4 sm:px-6 text-white shadow-lg flex-shrink-0"
                data-testid="button-send-message"
                title="Send message"
              >
                <Send className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                Room: {roomId}
              </Badge>
              <span>•</span>
              <span>{visibleMessages.length} messages</span>
              {selectedRecipient !== "everyone" && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    <User className="w-2.5 h-2.5 mr-1" />
                    Private Mode
                  </Badge>
                </>
              )}
              {!actualRoomId && (
                <>
                  <span>•</span>
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    Connecting...
                  </Badge>
                </>
              )}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
