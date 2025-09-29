import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Plus, Users, Hash, ArrowRight, LogOut, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomSelectorProps {
  userId: string;
  username: string;
  displayName: string;
  onJoinRoom: (roomCode: string, roomName?: string) => void;
  onLogout: () => void;
}

export default function RoomSelector({ userId, username, displayName, onJoinRoom, onLogout }: RoomSelectorProps) {
  const [roomCode, setRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdRoom, setCreatedRoom] = useState<{code: string, name: string, shareLink: string} | null>(null);
  const { toast } = useToast();

  // Mock recent rooms data
  const recentRooms = [
    { code: "meeting-123", name: "Team Standup", lastJoined: "2 hours ago", participants: 4 },
    { code: "project-abc", name: "Project Review", lastJoined: "Yesterday", participants: 7 },
    { code: "quick-chat", name: "Quick Chat", lastJoined: "3 days ago", participants: 2 },
  ];

  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Check if room exists and is active
      const response = await fetch(`/api/rooms/by-code/${encodeURIComponent(roomCode.trim())}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setError(errorData.details || "Room not found. Please check the room code.");
        } else {
          setError("Failed to join room. Please try again.");
        }
        return;
      }
      
      const room = await response.json();
      
      // Join the room (this marks it as active)
      const joinResponse = await fetch(`/api/rooms/${encodeURIComponent(roomCode.trim())}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!joinResponse.ok) {
        setError("Failed to join room. Please try again.");
        return;
      }
      
      console.log('Joining room:', room);
      
      toast({
        title: "Joined Room!",
        description: `Successfully joined "${room.name}"`,
      });
      
      onJoinRoom(roomCode.trim(), room.name);
    } catch (error) {
      console.error('Join room error:', error);
      setError("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // Create room
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          createdBy: userId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      
      const room = await response.json();
      console.log('Room created:', room);
      
      // Show the created room details for sharing
      setCreatedRoom({
        code: room.code,
        name: room.name,
        shareLink: room.shareLink
      });
      
      toast({
        title: "Room Created!",
        description: `Room "${room.name}" created with code: ${room.code}`,
      });
      
      // Reset form
      setNewRoomName("");
    } catch (error) {
      console.error('Create room error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRecent = (code: string, name: string) => {
    console.log('Join recent room triggered', { code, name });
    onJoinRoom(code, name);
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

  const joinCreatedRoom = () => {
    if (createdRoom) {
      onJoinRoom(createdRoom.code, createdRoom.name);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
            <Video className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-semibold">VideoConnect</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span>Welcome back, {displayName}</span>
            <Badge variant="secondary" className="text-xs">@{username}</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>

        {/* Room Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Join or Create a Room</CardTitle>
            <CardDescription>
              Connect with others through secure video calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="join" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">Join Room</TabsTrigger>
                <TabsTrigger value="create">Create Room</TabsTrigger>
              </TabsList>
              
              <TabsContent value="join" className="space-y-4">
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
                      data-testid="input-room-code"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || !roomCode.trim()}
                    data-testid="button-join-room"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
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
              </TabsContent>
              
              <TabsContent value="create" className="space-y-4">
                <form onSubmit={handleCreateNew} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {createdRoom && (
                    <Alert>
                      <Video className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold">Room "{createdRoom.name}" created successfully!</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Room Code:</span>
                            <Badge variant="secondary">{createdRoom.code}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(createdRoom.code, 'Room Code')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">Share Link:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(createdRoom.shareLink, 'Share Link')}
                              className="text-xs"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button onClick={joinCreatedRoom} size="sm">
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
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="newRoomName">Room Name</Label>
                    <Input
                      id="newRoomName"
                      type="text"
                      placeholder="Give your room a name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      data-testid="input-new-room-name"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || !newRoomName.trim()}
                    data-testid="button-create-room"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Rooms</CardTitle>
            <CardDescription>Quickly rejoin your recent video calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRooms.map((room) => (
                <div key={room.code} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                      <Hash className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-room-name-${room.code}`}>{room.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Code: {room.code}</span>
                        <span>•</span>
                        <span>{room.lastJoined}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {room.participants}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleJoinRecent(room.code, room.name)}
                      data-testid={`button-join-recent-${room.code}`}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}