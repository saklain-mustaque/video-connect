import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Camera, 
  Mic, 
  Volume2, 
  Monitor, 
  Settings,
  Bell,
  Palette,
  Zap
} from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  // Video settings
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState("default");
  const [videoQuality, setVideoQuality] = useState("720p");
  
  // Audio settings
  const [micEnabled, setMicEnabled] = useState(true);
  const [selectedMic, setSelectedMic] = useState("default");
  const [selectedSpeaker, setSelectedSpeaker] = useState("default");
  const [volumeLevel, setVolumeLevel] = useState([75]);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  
  // General settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [screenShareAudio, setScreenShareAudio] = useState(true);
  const [autoJoinAudio, setAutoJoinAudio] = useState(true);
  const [theme, setTheme] = useState("system");

  const videoQualityOptions = [
    { value: "360p", label: "360p (Low)" },
    { value: "720p", label: "720p (HD)" },
    { value: "1080p", label: "1080p (Full HD)" }
  ];

  const themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" }
  ];

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Settings
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          data-testid="button-close-settings"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 space-y-6 overflow-auto">
        
        {/* Video Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Video</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="camera-toggle">Camera</Label>
              <Switch
                id="camera-toggle"
                checked={cameraEnabled}
                onCheckedChange={setCameraEnabled}
                data-testid="switch-camera"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Camera Device</Label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger data-testid="select-camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Camera</SelectItem>
                  <SelectItem value="camera1">Built-in Camera</SelectItem>
                  <SelectItem value="camera2">External Webcam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select value={videoQuality} onValueChange={setVideoQuality}>
                <SelectTrigger data-testid="select-video-quality">
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {videoQualityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Audio Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Audio</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="mic-toggle">Microphone</Label>
              <Switch
                id="mic-toggle"
                checked={micEnabled}
                onCheckedChange={setMicEnabled}
                data-testid="switch-microphone"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Microphone Device</Label>
              <Select value={selectedMic} onValueChange={setSelectedMic}>
                <SelectTrigger data-testid="select-microphone">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Microphone</SelectItem>
                  <SelectItem value="mic1">Built-in Microphone</SelectItem>
                  <SelectItem value="mic2">External Microphone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Speaker Device</Label>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger data-testid="select-speaker">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Speaker</SelectItem>
                  <SelectItem value="speaker1">Built-in Speakers</SelectItem>
                  <SelectItem value="speaker2">Headphones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Volume</Label>
                <Badge variant="secondary">{volumeLevel[0]}%</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4" />
                <Slider
                  value={volumeLevel}
                  onValueChange={setVolumeLevel}
                  max={100}
                  step={1}
                  className="flex-1"
                  data-testid="slider-volume"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="noise-cancellation">Noise Cancellation</Label>
              <Switch
                id="noise-cancellation"
                checked={noiseCancellation}
                onCheckedChange={setNoiseCancellation}
                data-testid="switch-noise-cancellation"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* General Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-medium">General</h3>
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Notifications</Label>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-join-audio">Auto-join with audio</Label>
              <Switch
                id="auto-join-audio"
                checked={autoJoinAudio}
                onCheckedChange={setAutoJoinAudio}
                data-testid="switch-auto-join-audio"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="screen-share-audio">Include audio in screen share</Label>
              <Switch
                id="screen-share-audio"
                checked={screenShareAudio}
                onCheckedChange={setScreenShareAudio}
                data-testid="switch-screen-share-audio"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger data-testid="select-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1" data-testid="button-save-settings">
            Save Settings
          </Button>
        </div>
        
        {/* Footer Info */}
        <div className="pt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Settings are applied immediately and saved locally
          </p>
        </div>
      </CardContent>
    </Card>
  );
}