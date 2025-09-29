import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserAuthProps {
  onLogin: (username: string, displayName: string, userId?: string) => void;
}

export default function UserAuth({ onLogin }: UserAuthProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      // First check if username already exists
      const checkResponse = await fetch(`/api/users/by-username/${encodeURIComponent(username.trim())}`);
      
      if (checkResponse.ok) {
        // User already exists
        setError("Username already exists. Please choose a different username.");
        setIsLoading(false);
        return;
      }
      
      // Create new user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const userData = await response.json();
      console.log('User created successfully:', userData);
      
      onLogin(username.trim(), displayName.trim(), userData.id);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
            <Video className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to VideoConnect</CardTitle>
          <CardDescription>
            Join secure video calls with real-time chat and file sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="How others will see you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-testid="input-displayname"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !username.trim() || !displayName.trim()}
              data-testid="button-login"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Joining...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Join VideoConnect
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}