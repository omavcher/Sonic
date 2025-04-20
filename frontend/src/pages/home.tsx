import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Message, GeneratedFiles } from '@/lib/types';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatMessage } from '@/components/chat/chat-message';
import { CodeEditor } from '@/components/editor/code-editor';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Bot, User, Heart, Download, Star, FileText, CheckCircle, Circle } from "lucide-react";
import { ProPlanDialog } from '@/components/pro-plan-dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ExtendedMessage extends Message {
  fileDescriptions?: Record<string, string>;
  type?: number;
  title?: string;
  filePaths?: string[];
}

const initialFiles = [ 
  {
    name: '/public/index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Made By Sonic</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
  },
  {
    name: '/package.json',
    content: `{
  "name": "my-app made by sonic",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "serve": "vite preview"
  },
  "dependencies": {
   "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-scripts": "^5.0.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.0.0",
    "uuid4": "^2.0.3",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7",
    "lucide-react": "^0.469.0",
    "react-router-dom": "^7.1.1",
    "firebase": "^11.1.0",
    "@google/generative-ai": "^0.21.0",
    "date-fns": "^4.1.0",
    "react-chartjs-2": "^5.3.0",
    "chart.js": "^4.4.7"
  }
}`
  }
];

const promptTags = [
  "Create a blog website",
  "Make a todo web app",
  "Build a weather app",
  "Create an e-commerce site",
  "Make a chat application",
  "Build a portfolio website",
  "Create a recipe app",
  "Make a fitness tracker"
];

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function HomePage() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [files, setFiles] = useState<GeneratedFiles>({ files: initialFiles });
  const [isLoading, setIsLoading] = useState(false);
  const [likedMessages, setLikedMessages] = useState<Record<number, boolean>>({});
  const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const urlConvId = searchParams.get('convId');
    if (urlConvId) {
      setConversationId(urlConvId);
      loadConversation(urlConvId);
    } else if (messages.length === 0) {
      const newConvId = generateUUID();
      setConversationId(newConvId);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('convId', newConvId);
      setSearchParams(newSearchParams);
    }
  }, [searchParams, messages.length, setSearchParams]);

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/projects/chat/${convId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        const chatHistory = response.data.data.chatHistory || [];
        const formattedMessages = chatHistory.map((msg: any) => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content,
          timestamp: msg.timestamp,
          ...(msg.type && { type: msg.type }),
          ...(msg.title && { title: msg.title }),
          ...(msg.filePaths && { filePaths: msg.filePaths })
        }));
        
        setMessages(formattedMessages);

        if (response.data.data.Code && response.data.data.Code.length > 0) {
          const mergedFiles = mergeFiles(initialFiles, response.data.data.Code);
          setFiles({ files: mergedFiles });
        }

        setHasSubmitted(formattedMessages.length > 0);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error(`${error.response.data.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const mergeFiles = (existingFiles: any[], newFiles: any[]) => {
    const fileMap = new Map<string, any>();
    existingFiles.forEach(file => fileMap.set(file.name, file));
    newFiles.forEach(file => fileMap.set(file.name, file));
    return Array.from(fileMap.values());
  };

  const handleSubmit = async (content: string, uploadedFiles?: { url: string; description?: string }[]) => {
    if (!content.trim() && !uploadedFiles?.length) return;
    
    setIsLoading(true);
    setHasSubmitted(true);
    
    try {
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = generateUUID();
        setConversationId(currentConvId);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('convId', currentConvId);
        setSearchParams(newSearchParams);
      }

      if (uploadedFiles) {
        const newDescriptions = { ...imageDescriptions };
        uploadedFiles.forEach(file => {
          if (file.description) {
            newDescriptions[file.url] = file.description;
          }
        });
        setImageDescriptions(newDescriptions);
      }

      // Create and add user message immediately
      const newUserMessage: ExtendedMessage = {
        role: 'user',
        content,
        ...(uploadedFiles && uploadedFiles.length > 0 && { 
          attachments: uploadedFiles.map(file => file.url),
          fileDescriptions: uploadedFiles.reduce((acc, file) => {
            if (file.description) {
              acc[file.url] = file.description;
            }
            return acc;
          }, {} as Record<string, string>)
        })
      };
      
      // Add loading message
      const loadingMessage: ExtendedMessage = {
        role: 'assistant',
        content: 'Thinking...',
        type: 0
      };

      setMessages(prev => [...prev, newUserMessage, loadingMessage]);

      const apiMessages = [...messages, newUserMessage].map(msg => {
        let combinedContent = msg.content || '';
        
        if (msg.attachments && msg.attachments.length > 0) {
          const attachmentsText = msg.attachments.map(url => {
            const description = msg.fileDescriptions?.[url] || 'No description';
            return `[Image: ${url} - Use This Img: ${description}]`;
          }).join('\n');
          
          combinedContent += `\n${attachmentsText}`;
        }
        setInputValue('');

        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          content: combinedContent.trim()
        };
      });

      // First send the message to AI
      const aiResponse = await axios.post(`${API_URL}/ai/chat`, { 
        messages: apiMessages,
        conversationId: currentConvId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Then fetch the updated conversation
      const convResponse = await axios.get(`${API_URL}/projects/chat/${currentConvId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (convResponse.data.success) {
        const chatHistory = convResponse.data.data.chatHistory || [];
        const formattedMessages = chatHistory.map((msg: any) => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content,
          timestamp: msg.timestamp,
          ...(msg.type && { type: msg.type }),
          ...(msg.title && { title: msg.title }),
          ...(msg.filePaths && { filePaths: msg.filePaths })
        }));
        
        setMessages(formattedMessages);

        if (convResponse.data.data.Code && convResponse.data.data.Code.length > 0) {
          const mergedFiles = mergeFiles(files.files, convResponse.data.data.Code);
          setFiles({ files: mergedFiles });
        }

        if (aiResponse.data.data.type === 1 && aiResponse.data.data.title) {
          const titleSlug = aiResponse.data.data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set('project', encodeURIComponent(titleSlug));
          setSearchParams(newSearchParams);
        }
      }
    } catch (error) {
     if(error.response.data.error === 'token_over' ){
      toast.error('Insufficient tokens to use AI feature');
      setIsProDialogOpen(true);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        newMessages.push({
          role: 'assistant',
          content: 'Sorry, Insufficient tokens to use AI feature. Buy our plans'
        });
        return newMessages;
      });

     }else{
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        newMessages.push({
          role: 'assistant',
          content: error.response.data.error,
        });
        return newMessages;
      });
     }
      // Remove loading message and show error
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleTagClick = (tag: string) => {
    setInputValue(tag);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleLike = (index: number) => {
    setLikedMessages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAddToFavicon = (url: string, description?: string) => {
    console.log('Adding to favicon:', url, description);
  };

  return (
    <div className="h-[calc(100vh-5rem)] overflow-hidden">
      {isMobile ? (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto scrollbar-hide">
            <div className="flex flex-col">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={index}
                  message={message}
                  isAssistant={message.role === 'assistant'}
                  isLiked={likedMessages[index] || false}
                  handleLike={() => handleLike(index)}
                  imageDescriptions={{
                    ...imageDescriptions,
                    ...(message.fileDescriptions || {})
                  }}
                  onAddToFavicon={handleAddToFavicon}
                />
              ))}
              {isLoading && (
                <div className="flex gap-4 p-4 bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 p-1 text-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">Assistant</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <ChatInput 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
            inputRef={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={40} minSize={30} className="h-full">
            <div className="h-full flex flex-col rounded-none">
              {hasSubmitted ? (
                <>
                  <div className="flex-1 overflow-auto scrollbar-hide">
                    <div className="flex flex-col">
                      {messages.map((message, index) => (
                        <ChatMessage 
                          key={index}
                          message={message}
                          isAssistant={message.role === 'assistant'}
                          isLiked={likedMessages[index] || false}
                          handleLike={() => handleLike(index)}
                          imageDescriptions={{
                            ...imageDescriptions,
                            ...(message.fileDescriptions || {})
                          }}
                          onAddToFavicon={handleAddToFavicon}
                        />
                      ))}
                      {isLoading && (
                        <div className="flex gap-4 p-4 bg-muted/50">
                          <div className="h-8 w-8 rounded-full bg-primary/10 p-1 text-primary flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium">Assistant</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-75" />
                              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce delay-150" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  <ChatInput 
                    onSubmit={handleSubmit} 
                    isLoading={isLoading} 
                    inputRef={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <div className="w-full max-w-2xl space-y-8">
                    <div className="text-center space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight">What do you want to build?</h1>
                      <p className="text-muted-foreground">
                        Prompt, run, edit, and deploy full-stack web and mobile apps.
                      </p>
                    </div>
                    
                    <ChatInput 
                      onSubmit={handleSubmit} 
                      isLoading={isLoading} 
                      inputRef={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full"
                    />
                    
                    <div className="flex flex-wrap justify-center gap-2">
                      {promptTags.map((tag) => (
                        <Button
                          key={tag}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => handleTagClick(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
          
          {hasSubmitted && (
            <ResizablePanel defaultSize={60} minSize={40}>
              <CodeEditor files={files.files} />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      )}
      <ProPlanDialog 
        isOpen={isProDialogOpen} 
        onClose={() => setIsProDialogOpen(false)} 
      />
    </div>
  );
}