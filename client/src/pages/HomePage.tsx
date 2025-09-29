import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Calendar,
  Settings,
  Search,
  Sparkles,
  Zap,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';

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
  
  const [roomCode, setRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load recent rooms on mount
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
        // Mock data for development
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
          },
          { 
            id: '3', 
            code: 'quick-chat', 
            name: 'Quick Chat', 
            createdBy: user?.id || '', 
            participants: 2, 
            lastActivity: '3 days ago', 
            isActive: false 
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load recent rooms:', error);
      // Use mock data on error
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
        },
      ]);
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
      
      // Join the room
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
      
      // Navigate to room
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
      
      // Reload recent rooms
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  VideoConnect
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
                    {user?.displayName ? getInitials(user.displayName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user?.displayName}</p>
                  <p className="text-xs text-gray-500">@{user?.username}</p>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.displayName}</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Ready to connect? Join an existing room or create a new one to start your next video collaboration.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          {/* Join Room Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/30 border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Join Room</CardTitle>
                  <CardDescription>Enter a room code to join an existing meeting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinExisting} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="roomCode">Room Code</Label>
                  <Input
                    id="roomCode"
                    type="text"
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="bg-white/50 dark:bg-gray-800/50"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={isLoading || !roomCode.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Join Room
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Create Room Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-900 dark:to-purple-950/30 border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Create Room</CardTitle>
                  <CardDescription>Start a new meeting and invite others</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {createdRoom ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <p className="font-semibold text-green-800 dark:text-green-200">
                          Room "{createdRoom.name}" created successfully!
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-700 dark:text-green-300">Room Code:</span>
                          <Badge variant="secondary" className="font-mono">
                            {createdRoom.code}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(createdRoom.code, 'Room Code')}
                            className="h-6 px-2"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {createdRoom.shareLink && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-700 dark:text-green-300">Share Link:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(createdRoom.shareLink!, 'Share Link')}
                              className="text-xs h-6 px-2"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            onClick={() => handleJoinRoom(createdRoom.code)} 
                            size="sm"
                            className="bg-gradient-to-r from-green-600 to-green-700"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
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
                <form onSubmit={handleCreateNew} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newRoomName">Room Name</Label>
                    <Input
                      id="newRoomName"
                      type="text"
                      placeholder="Give your room a name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="bg-white/50 dark:bg-gray-800/50"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    disabled={isLoading || !newRoomName.trim()}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create & Join Room
                      </div>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Recent Rooms
                  </CardTitle>
                  <CardDescription>Quickly rejoin your recent video calls</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-white/50 dark:bg-gray-800/50"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRooms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchQuery ? 'No rooms found' : 'No recent rooms'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery 
                      ? 'Try adjusting your search terms' 
                      : 'Create your first room to get started'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRooms.map((room, index) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span>Code: {room.code}</span>
                            <span>•</span>
                            <span>{room.lastActivity}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{room.participants}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.isActive && (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                            Active
                          </Badge>
                        )}
                        <Button 
                          onClick={() => handleJoinRoom(room.code)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
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
      </main>
    </div>
  );
};

export default HomePage;
