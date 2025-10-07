import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Plus, 
  Users, 
  Hash, 
  ArrowRight, 
  LogOut, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Clock,
  Search,
  Sparkles,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import { RecordingsTab } from '@/components/RecordingsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Room {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  participants: number;
  lastActivity: string;
  isActive: boolean;
  shareLink?: string;
}

const HomePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [roomCode, setRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('meetings');

  useEffect(() => {
    loadRecentRooms();
  }, []);

  const loadRecentRooms = async () => {
    try {
      const response = await fetch('/api/rooms/recent', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const rooms = await response.json();
        setRecentRooms(rooms);
      } else {
        setRecentRooms([
          { 
            id: '1', 
            code: 'meeting-123', 
            name: 'Team Standup', 
            createdBy: user?.id || '', 
            participants: 4, 
            lastActivity: '2 hours ago', 
            isActive: true 
          },
          { 
            id: '2', 
            code: 'project-abc', 
            name: 'Project Review', 
            createdBy: user?.id || '', 
            participants: 7, 
            lastActivity: 'Yesterday', 
            isActive: false 
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load recent rooms:', error);
    }
  };

  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/rooms/by-code/${encodeURIComponent(roomCode.trim())}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setError(errorData.details || 'Room not found. Please check the room code.');
        } else {
          setError('Failed to join room. Please try again.');
        }
        return;
      }
      
      const room = await response.json();
      
      const joinResponse = await fetch(`/api/rooms/${encodeURIComponent(roomCode.trim())}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!joinResponse.ok) {
        setError('Failed to join room. Please try again.');
        return;
      }
      
      toast({
        title: "Joined Room!",
        description: `Successfully joined "${room.name}"`,
      });
      
      setLocation(`/room/${roomCode.trim()}`);
    } catch (error) {
      console.error('Join room error:', error);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newRoomName.trim(),
          createdBy: user?.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      
      const room = await response.json();
      
      setCreatedRoom(room);
      setNewRoomName('');
      
      toast({
        title: "Room Created!",
        description: `Room "${room.name}" created successfully`,
      });
      
      loadRecentRooms();
    } catch (error) {
      console.error('Create room error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (roomCode: string) => {
    setLocation(`/room/${roomCode}`);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: `Failed to copy ${type.toLowerCase()}`,
        variant: "destructive",
      });
    });
  };

  const filteredRooms = recentRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    setLocation('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background animated-gradient-bg">
      {/* Header - Modern & Minimal */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="absolute inset-0 gradient-primary rounded-xl blur-lg opacity-50"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  <span className="text-gradient-primary">Video</span>
                  <span className="text-foreground">Connect</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Professional video meetings</p>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                    {user?.displayName ? getInitials(user.displayName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-foreground">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                  </div>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size={isMobile ? "icon" : "sm"}
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 bg-card/50 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="meetings" className="text-sm sm:text-base">
              <Video className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="recordings" className="text-sm sm:text-base">
              <Video className="w-4 h-4 mr-2" />
              Recordings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meetings" className="space-y-12 sm:space-y-16 lg:space-y-20">
        {/* Welcome Section - Modern Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 border border-primary/20">
            <Zap className="w-4 h-4 animate-pulse" />
            {isMobile ? "Growth Engine" : "First of its Kind Business Platform"}
          </div>
          
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 tracking-tight">
            Welcome back,{' '}
            <span className="text-gradient-primary">{user?.displayName}</span>
          </h2>
          
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {isMobile 
              ? "Connect, collaborate, and scale with cutting-edge tools."
              : "Your all-in-one platform for modern business communication. Connect, collaborate, and scale with cutting-edge AI-powered tools."
            }
          </p>
        </motion.div>

        {/* Quick Actions Grid - Modern Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20 sm:grid-cols-2"
        >
          {/* Join Room Card */}
          <Card className="relative overflow-hidden modern-card group">
            <CardHeader className="p-6 sm:p-8 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <ArrowRight className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl text-foreground font-bold mb-2">Join Room</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {isMobile ? "Enter room code" : "Enter a room code to join an existing meeting"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 pt-2">
              <form onSubmit={handleJoinExisting} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="roomCode" className="text-sm font-semibold">Room Code</Label>
                  <Input
                    id="roomCode"
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-base input-modern"
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 btn-primary text-primary-foreground font-semibold text-base shadow-lg"
                  disabled={isLoading || !roomCode.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-5 h-5" />
                      <span>Join Room</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Create Room Card */}
          <Card className="relative overflow-hidden modern-card group">
            <CardHeader className="p-6 sm:p-8 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl text-foreground font-bold mb-2">Create Room</CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {isMobile ? "Start new meeting" : "Start a new meeting and invite others"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 pt-2">
              {createdRoom ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5"
                >
                  <Alert className="bg-emerald-500/10 border-emerald-500/30 animate-in slide-in-from-top-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <AlertDescription>
                      <div className="space-y-4">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-base">
                          Room "{createdRoom.name}" created!
                        </p>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Room Code:</span>
                            <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                              {createdRoom.code}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(createdRoom.code, 'Room Code')}
                              className="h-8 px-3 hover:bg-emerald-500/10"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {createdRoom.shareLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(createdRoom.shareLink!, 'Share Link')}
                              className="justify-start hover:bg-emerald-500/10"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Copy Share Link
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button 
                            onClick={() => handleJoinRoom(createdRoom.code)} 
                            size="sm"
                            className="btn-primary text-primary-foreground shadow-lg"
                          >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Join Room
                          </Button>
                          <Button 
                            onClick={() => setCreatedRoom(null)} 
                            variant="outline" 
                            size="sm"
                          >
                            Create Another
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ) : (
                <form onSubmit={handleCreateNew} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="newRoomName" className="text-sm font-semibold">Room Name</Label>
                    <Input
                      id="newRoomName"
                      type="text"
                      placeholder="e.g., Team Meeting, Project Review"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 text-base input-modern"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 btn-primary text-primary-foreground font-semibold text-base shadow-lg"
                    disabled={isLoading || !newRoomName.trim()}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <span>Create & Join Room</span>
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Rooms Section - Modern List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="modern-card">
            <CardHeader className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3 text-foreground font-bold mb-2">
                    <Clock className="w-6 h-6 text-primary" />
                    Recent Rooms
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground">
                    {isMobile ? "Your recent calls" : "Quickly rejoin your recent video calls"}
                  </CardDescription>
                </div>
                
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 w-full sm:w-80 h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 pt-0">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm">
                    <Video className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                    {searchQuery ? 'No rooms found' : 'No recent rooms'}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                    {searchQuery 
                      ? 'Try adjusting your search terms' 
                      : 'Create your first room to get started'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-5">
                  {filteredRooms.map((room, index) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 sm:p-6 bg-card/50 rounded-xl border border-border/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 gap-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 gradient-primary rounded-xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <Hash className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-foreground text-base sm:text-lg truncate mb-1">{room.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="font-mono truncate">Code: {room.code}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{room.lastActivity}</span>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>{room.participants}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        {room.isActive && (
                          <Badge className="badge-modern">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
                            Active
                          </Badge>
                        )}
                        <Button 
                          onClick={() => handleJoinRoom(room.code)}
                          className="btn-primary text-primary-foreground shadow-lg"
                          size={isMobile ? "sm" : "default"}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Join
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
          </TabsContent>

          <TabsContent value="recordings">
            <RecordingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HomePage;