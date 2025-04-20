import { Bot, User, Heart, Download, Star, FileText, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import { useTheme } from '@/lib/themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtendedMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: string[];
  fileDescriptions?: Record<string, string>;
  type?: number; // 0 = default, 1 = project creation
  title?: string;
  filePaths?: string[];
  projectDetails?: {
    filePaths?: string[];
    Code?: Array<{
      name: string;
      content: string;
    }>;
  };
}

interface ChatMessageProps {
  message: ExtendedMessage;
  isAssistant: boolean;
  isLiked: boolean;
  handleLike: () => void;
  imageDescriptions: Record<string, string>;
  onAddToFavicon?: (url: string, description?: string) => void;
}

export function ChatMessage({
  message,
  isAssistant,
  isLiked,
  handleLike,
  imageDescriptions,
  onAddToFavicon,
}: ChatMessageProps) {
  const { theme } = useTheme();
  const uniqueImageUrls = Array.from(
    new Set(message.attachments?.filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || [])
  ));

  const messageType = message.type ?? 0;

  const allSteps = [
    { label: "Create initial files", done: false },
    { label: "Install dependencies", done: false },
    { label: "Create", code: "App.js", done: false },
    { label: "Create", code: "styles.css", done: false },
    { label: "Create", code: "/src/pages/Home.js", done: false },
    { label: "Create", code: "/src/components/Navbar.js", done: false },
    { label: "Create", code: "/src/components/Footer.js", done: false },
  ];

  const [visibleSteps, setVisibleSteps] = useState<typeof allSteps>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (messageType !== 1) return;

    const timer = setInterval(() => {
      if (currentStepIndex < allSteps.length) {
        setVisibleSteps(prev => [
          ...prev,
          { ...allSteps[currentStepIndex], done: true }
        ]);
        setCurrentStepIndex(prev => prev + 1);
      } else {
        clearInterval(timer);
      }
    }, 500 + Math.random() * 500); // Random delay between 0.5-1 second

    return () => clearInterval(timer);
  }, [currentStepIndex, messageType]);

  return (
    <div className={`flex gap-4 p-4 ${isAssistant ? 'bg-muted/50' : ''} group`}>
      <div className="h-8 w-8 rounded-full bg-primary/10 p-1 text-primary flex items-center justify-center flex-shrink-0">
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-medium">
            {isAssistant ? 'Assistant' : 'You'}
          </div>
          <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isAssistant && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike message' : 'Like message'}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        
        {messageType === 1 ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            
            {message.title && (
              <h2 className="text-lg font-semibold mt-2">Making {message.title}</h2>
            )}
            {message.projectDetails?.description && (
              <p className="text-sm text-muted-foreground">{message.projectDetails.description}</p>
            )}
            
            {message.projectDetails?.features && message.projectDetails.features.length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-medium mb-2">Features:</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.projectDetails.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle 
                        size={16} 
                        className={
                          theme === 'dark' ? 'text-green-400' : 
                          theme === 'fivcon' ? 'text-yellow-400' : 
                          'text-green-600'
                        } 
                      />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <ul className="space-y-3 text-sm mt-4">
              <AnimatePresence>
                {visibleSteps.map((step, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3"
                  >
                    {step.done ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <CheckCircle 
                          size={16} 
                          className={
                            theme === 'dark' ? 'text-green-400' : 
                            theme === 'fivcon' ? 'text-yellow-400' : 
                            'text-green-600'
                          } 
                        />
                      </motion.div>
                    ) : (
                      <Circle 
                        size={16} 
                        className={
                          theme === 'dark' ? 'text-gray-400' : 
                          theme === 'fivcon' ? 'text-gray-300' : 
                          'text-gray-500'
                        } 
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="leading-tight">{step.label}</span>
                      {step.code && (
                        <motion.code
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className={`
                            ${
                              step.done ? 
                                (theme === 'dark' ? 'bg-gray-700 text-gray-300' : 
                                 theme === 'fivcon' ? 'bg-yellow-900/50 text-yellow-200' : 
                                 'bg-gray-200 text-gray-800') : 
                                (theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 
                                 theme === 'fivcon' ? 'bg-purple-900/50 text-purple-300' : 
                                 'bg-blue-100 text-blue-800')
                            }
                            text-xs p-1 rounded mt-0.5 transition-all font-mono
                          `}
                        >
                         {step.code}
                        </motion.code>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
              
              {currentStepIndex >= allSteps.length && (
                <motion.li 
                  className="ml-7 mt-2 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.code 
                    className={`
                      ${
                        theme === 'dark' ? 'bg-gray-700 text-red-400' : 
                        theme === 'fivcon' ? 'bg-yellow-900/50 text-red-300' : 
                        'bg-gray-200 text-red-600'
                      }
                      p-1.5 rounded-md text-sm font-mono
                    `}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                  >
                    npm install
                  </motion.code>
                </motion.li>
              )}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {isAssistant ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        )}
        
        {uniqueImageUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uniqueImageUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative group/image border rounded-md overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img 
                    src={url} 
                    alt={`Uploaded content ${index + 1}`}
                    className="w-full h-full object-contain max-h-64"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Could not load image
                  </div>
                </div>
                
                <div className="p-2 bg-background/90 border-t">
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {imageDescriptions[url] || 'No description added'}
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 bg-background/80 hover:bg-background"
                    onClick={() => window.open(url, '_blank')}
                    aria-label="Download image"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {onAddToFavicon && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-background/80 hover:bg-background"
                      onClick={() => onAddToFavicon(url, imageDescriptions[url])}
                      aria-label="Set as favicon"
                      title="Set as favicon"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}