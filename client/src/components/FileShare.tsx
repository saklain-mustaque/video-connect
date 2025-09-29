import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  Upload, 
  File, 
  Image, 
  FileText, 
  Download, 
  Trash2,
  Plus
} from "lucide-react";
import { useDataChannel } from '@livekit/components-react';

interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: Date;
  url?: string;
}

interface FileShareProps {
  roomId: string;
  userName?: string;
  onClose: () => void;
}

export default function FileShare({ roomId, userName = 'You', onClose }: FileShareProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  
  // Use LiveKit data channel for real-time file sharing notifications
  const { send: sendFileNotification } = useDataChannel('files', (data) => {
    try {
      const fileData = JSON.parse(new TextDecoder().decode(data.payload));
      if (fileData.type === 'file_shared') {
        const newFile: SharedFile = {
          id: fileData.id,
          name: fileData.name,
          size: fileData.size,
          type: fileData.fileType,
          uploadedBy: fileData.uploadedBy,
          uploadedAt: new Date(fileData.uploadedAt),
          url: fileData.url,
        };
        
        setSharedFiles(prev => {
          // Check if file already exists to prevent duplicates
          const exists = prev.some(file => file.id === fileData.id);
          if (!exists) {
            return [newFile, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to parse file notification:', error);
    }
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load existing files when component mounts
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/files`);
        if (response.ok) {
          const existingFiles = await response.json();
          const convertedFiles = existingFiles.map((file: any) => ({
            ...file,
            uploadedAt: new Date(file.uploadedAt),
          }));
          setSharedFiles(convertedFiles);
        }
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };
    
    loadFiles();
  }, [roomId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      console.log('File upload started:', { fileId, fileName: file.name, size: file.size });
      
      // Initialize progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadedBy', userName);
        
        // Upload file to backend
        const response = await fetch(`/api/rooms/${roomId}/files`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const uploadedFile = await response.json();
        
        // Add to shared files list
        const newFile: SharedFile = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type,
          uploadedBy: uploadedFile.uploadedBy,
          uploadedAt: new Date(uploadedFile.uploadedAt),
          url: uploadedFile.url,
        };
        
        setSharedFiles(prev => [newFile, ...prev]);
        
        // Notify other participants via LiveKit data channel
        if (sendFileNotification) {
          const fileNotification = {
            type: 'file_shared',
            id: newFile.id,
            name: newFile.name,
            size: newFile.size,
            fileType: newFile.type,
            uploadedBy: newFile.uploadedBy,
            uploadedAt: newFile.uploadedAt.toISOString(),
            url: newFile.url,
          };
          
          await sendFileNotification(new TextEncoder().encode(JSON.stringify(fileNotification)), {
            reliable: true,
          });
        }
        
        console.log('File upload completed:', newFile);
      } catch (error) {
        console.error('File upload failed:', error);
        // Could show error notification to user here
      } finally {
        // Remove progress indicator
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[fileId];
          return updated;
        });
      }
    }
  };

  const handleDownload = (file: SharedFile) => {
    console.log('Download triggered for file:', file.name);
    if (file.url) {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (fileId: string) => {
    console.log('Delete triggered for file:', fileId);
    setSharedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg">File Sharing</CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          data-testid="button-close-file-share"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Drop files here to share</p>
          <p className="text-xs text-muted-foreground mb-3">
            Or click to browse files
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-browse-files"
          >
            <Plus className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Uploading...</h3>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Uploading file...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ))}
          </div>
        )}

        {/* Shared Files */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Shared Files</h3>
            <Badge variant="secondary" className="text-xs">
              {sharedFiles.length} files
            </Badge>
          </div>
          
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {sharedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <File className="w-8 h-8 mb-2" />
                  <p className="text-sm">No files shared yet</p>
                  <p className="text-xs">Upload files to share with participants</p>
                </div>
              ) : (
                sharedFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover-elevate">
                      <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                        <FileIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`file-name-${file.id}`}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploadedBy}</span>
                          <span>•</span>
                          <span>{formatTime(file.uploadedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => handleDownload(file)}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        {file.uploadedBy === 'You' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(file.id)}
                            data-testid={`button-delete-${file.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Files are shared with all participants in this room
          </p>
          <Badge variant="outline" className="mt-1 text-xs">
            Room: {roomId}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}