import { useState, useRef, KeyboardEvent, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, Upload, Plus, Loader2 } from 'lucide-react';
import { useTheme } from '@/lib/themes';

interface ChatInputProps {
  onSubmit: (message: string, files?: { url: string; description?: string }[]) => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

const MAX_INITIAL_UPLOADS = 3;
const MAX_FILE_UPLOADS = 4;
const ACCEPTED_FILE_TYPES = 'image/*,.png,.jpg,.jpeg,.gif,.webp';
const CLOUDINARY_UPLOAD_PRESET = 'om_def';
const CLOUDINARY_CLOUD_NAME = 'dg9qjhpsc';

export function ChatInput({ 
  onSubmit, 
  isLoading, 
  inputRef: externalInputRef,
  value: externalValue,
  onChange: externalOnChange,
  className 
}: ChatInputProps) {
  const { theme } = useTheme();
  const [files, setFiles] = useState<File[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [initialUploadComplete, setInitialUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const [internalValue, setInternalValue] = useState('');
  const value = externalValue !== undefined ? externalValue : internalValue;
  
  const setValue = (newValue: string) => {
    if (externalOnChange) {
      externalOnChange({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
    } else {
      setInternalValue(newValue);
    }
  };

  const borderColor = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const dragActiveBg = theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10';
  const textColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const mutedTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const cardBg = theme === 'dark' ? 'bg-gray-800/50' : 'bg-white';

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'chat_uploads');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      
      if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!value.trim() && files.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      const uploadedFiles: { url: string; description?: string }[] = [];
      
      for (const file of files) {
        try {
          const url = await uploadToCloudinary(file);
          uploadedFiles.push({
            url,
            description: fileDescriptions[file.name] || ''
          });
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw error;
        }
      }
      
      await onSubmit(value, uploadedFiles.length > 0 ? uploadedFiles : undefined);
      setValue('');
      setFiles([]);
      setFileDescriptions({});
      setInitialUploadComplete(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isUploading && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const validateFiles = (newFiles: File[]): boolean => {
    const maxAllowed = initialUploadComplete ? MAX_FILE_UPLOADS : MAX_INITIAL_UPLOADS;
    
    if (newFiles.length + files.length > maxAllowed) {
      setUploadError(`You can only upload ${maxAllowed} file${maxAllowed === 3 ? '' : 's'} initially`);
      return false;
    }
    
    const invalidFiles = newFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      return !file.type.startsWith('image/') && !validExtensions.includes(extension || '');
    });
    
    if (invalidFiles.length > 0) {
      setUploadError(`Invalid file type: ${invalidFiles[0].name}. Only images are allowed.`);
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files);
      if (!validateFiles(newFiles)) return;
      
      const filesToAdd = newFiles.slice(0, (initialUploadComplete ? MAX_FILE_UPLOADS : MAX_INITIAL_UPLOADS) - files.length);
      setFiles(prev => [...prev, ...filesToAdd]);
      
      if (!initialUploadComplete && filesToAdd.length > 0) {
        setInitialUploadComplete(true);
      }
      
      const newDescriptions = {...fileDescriptions};
      filesToAdd.forEach(file => {
        if (!newDescriptions[file.name]) {
          newDescriptions[file.name] = '';
        }
      });
      setFileDescriptions(newDescriptions);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
    const newDescriptions = {...fileDescriptions};
    delete newDescriptions[fileName];
    setFileDescriptions(newDescriptions);
    setUploadError(null);
    if (files.length <= 1) {
      setInitialUploadComplete(false);
    }
  };

  const updateFileDescription = (fileName: string, description: string) => {
    setFileDescriptions(prev => ({
      ...prev,
      [fileName]: description
    }));
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files?.length) {
      handleFileChange({
        target: { files: e.dataTransfer.files }
      } as ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div 
      className={`flex flex-col gap-3 ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={`absolute inset-0 ${dragActiveBg} border-2 border-dashed border-primary rounded-md flex items-center justify-center z-10`}>
          <div className={`text-center p-4 ${cardBg} rounded-md shadow-lg`}>
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className={`font-medium ${textColor}`}>Drop images to upload</p>
            <p className={`text-sm ${mutedTextColor}`}>
              {initialUploadComplete ? 
                `${MAX_FILE_UPLOADS - files.length} files remaining` : 
                'Upload 1 file initially'}
            </p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className={`text-xs ${mutedTextColor} self-end m-2`}>
          {files.length}/{initialUploadComplete ? MAX_FILE_UPLOADS : MAX_INITIAL_UPLOADS} files
        </div>
      )}

      {uploadError && (
        <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">
          {uploadError}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          {files.map((file) => (
            <div key={file.name} className={`flex flex-col gap-2 border ${borderColor} rounded-md p-3 ${cardBg} shadow-sm`}>
              <div className="flex items-start gap-3">
                <div className="relative h-20 w-20 rounded-md overflow-hidden border flex-shrink-0">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    className="object-cover h-full w-full"
                  />
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${textColor} truncate max-w-[180px]`}>
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-destructive p-1 hover:bg-destructive/10 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <textarea
                    value={fileDescriptions[file.name] || ''}
                    onChange={(e) => updateFileDescription(file.name, e.target.value)}
                    placeholder="Describe this image for better AI understanding..."
                    className={`text-xs w-full p-2 border ${borderColor} rounded resize-none focus:ring-2 focus:ring-primary/50 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-white'}`}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 p-2 items-end">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`What do you want to build ?`}
          className={`min-h-[60px] border-color-black flex-1 resize-none ${theme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}
          disabled={isUploading || isLoading}
        />
        
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10"
            disabled={files.length >= (initialUploadComplete ? MAX_FILE_UPLOADS : MAX_INITIAL_UPLOADS) || isUploading || isLoading}
            title="Upload images"
          >
            <Plus className="h-4 w-4" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              disabled={files.length >= (initialUploadComplete ? MAX_FILE_UPLOADS : MAX_INITIAL_UPLOADS) || isUploading || isLoading}
            />
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={isLoading || isUploading || (!value.trim() && files.length === 0)}
            className="h-10 w-10"
            title="Send message"
          >
            {isUploading || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}