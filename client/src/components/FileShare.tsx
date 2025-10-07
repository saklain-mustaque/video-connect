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
  Plus,
  Share2,
  Cloud,
  CheckCircle
} from "lucide-react";
import { useDataChannel } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const getFileColor = (type: string) => {
    if (type.startsWith('image/')) return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (type.includes('pdf')) return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
    if (type.includes('document')) return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20';
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
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadedBy', userName);
        
        const response = await fetch(`/api/rooms/${roomId}/files`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const uploadedFile = await response.json();
        
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
      } finally {
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
    <Card className="h-full flex flex-col border-0 rounded-none modern-card">
      {/* Modern Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 border-b bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">File Sharing</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sharedFiles.length} {sharedFiles.length === 1 ? 'file' : 'files'} shared
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 flex-shrink-0"
          data-testid="button-close-file-share"
          aria-label="Close file sharing panel"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 overflow-hidden">
        {/* Modern Upload Area */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
              : 'border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50'
          } backdrop-blur-sm cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-base font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isDragging 
              ? 'Release to upload' 
              : 'Drag and drop files here, or click to browse'
            }
          </p>
          <Button 
            variant="outline" 
            size="sm"
            className="pointer-events-none"
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
        </motion.div>

        {/* Upload Progress */}
        <AnimatePresence>
          {Object.keys(uploadProgress).length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Uploading...</h3>
              </div>
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading file...</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shared Files List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <File className="w-4 h-4 text-primary" />
              Shared Files
            </h3>
            {sharedFiles.length > 0 && (
              <Badge variant="secondary" className="badge-modern">
                {sharedFiles.length}
              </Badge>
            )}
          </div>
          
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              {sharedFiles.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                    <File className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-base font-semibold mb-1">No files shared yet</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Upload files to share with all participants in this room
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {sharedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    const colorClass = getFileColor(file.type);
                    
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center gap-3 p-4 border rounded-xl hover:shadow-md transition-all duration-300 bg-card/50 border-border/50 hover:border-primary/30 backdrop-blur-sm"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass} border`}>
                          <FileIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate mb-1" data-testid={`file-name-${file.id}`}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-medium">{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.uploadedBy}</span>
                            <span>•</span>
                            <span>{formatTime(file.uploadedAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleDownload(file)}
                            data-testid={`button-download-${file.id}`}
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          {file.uploadedBy === userName && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-9 h-9 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                              onClick={() => handleDelete(file.id)}
                              data-testid={`button-delete-${file.id}`}
                              title="Delete file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-4 border-t"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <p>Files are shared with all participants in this room</p>
          </div>
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              Room: {roomId}
            </Badge>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
