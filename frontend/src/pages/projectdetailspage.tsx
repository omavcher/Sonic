import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Github, Clock, Sparkles, ChevronUp } from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture: string;
  projects: Array<{
    _id: string;
    title: string;
    createdAt: string;
    conversationId: string;
  }>;
  role: string;
  subscriptionStatus: string;
  tokens: number;
  lastLogin: string;
}

interface Project {
  _id: string;
  owner: string;
  title: string;
  description: string;
  thumbnail: string;
  features: string[];
  mainColorTheme: string;
  secondaryColorTheme: string;
  chai_count: number;
  files: Array<{
    path: string;
    description?: string;
    features?: string[];
  }>;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  Code: Array<{
    name: string;
    content: string;
  }>;
  createdAt: string;
}

export function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchProjectAndUser = async () => {
      try {
        setIsLoading(true);
        
        // Fetch project details
        const projectResponse = await axios.get(`/projects/${id}/details`);
        if (projectResponse.data.success) {
          setProject(projectResponse.data.data);
          
          // Fetch user details
          const userResponse = await axios.get(`/users/profile`);
          if (userResponse.data.success) {
            setUser(userResponse.data.user);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load project details');
      } finally {
        setIsLoading(false);
        setIsLoadingUser(false);
      }
    };

    fetchProjectAndUser();
  }, [id]);

  const handleUpvote = async () => {
    if (!project) return;
    
    try {
      // Optimistic update
      setProject(prev => prev ? { ...prev, chai_count: prev.chai_count + 1 } : null);
      
      await axios.post(`/projects/${id}/upvote`);
      toast.success('Thanks for the chai! ☕');
      
      // Refresh after a delay
      setTimeout(() => {
        axios.get(`/projects/${id}/details`)
          .then(response => {
            if (response.data.success) {
              setProject(response.data.data);
            }
          });
      }, 2000);
    } catch (error) {
      // Rollback on error
      setProject(prev => prev ? { ...prev, chai_count: Math.max(0, prev.chai_count - 1) } : null);
      console.error('Error upvoting project:', error);
      toast.error('Failed to upvote project');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <Button variant="ghost" className="w-fit -ml-2 mb-4 sm:mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
        </Button>
        
        <div className="space-y-4">
          <Skeleton className="h-6 sm:h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-4">
            <Skeleton className="h-48 sm:h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <Button variant="ghost" className="w-fit -ml-2 mb-4 sm:mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
        </Button>
        
        <div className="text-center py-8 sm:py-12">
          <h3 className="text-lg sm:text-xl font-medium mb-2">Project not found</h3>
          <p className="text-sm sm:text-base text-muted-foreground">The project you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
      <Button variant="ghost" className="w-fit -ml-2 mb-4 sm:mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
      </Button>

      <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Header */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold">{project.title}</h1>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm sm:text-base">{project.chai_count}</span>
                <img 
                  src="https://static.vecteezy.com/system/resources/previews/045/357/215/large_2x/indian-chai-tea-in-glass-cups-free-png.png" 
                  alt="Chai count" 
                  className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                />
              </div>
            </div>
            
            <p className="text-base sm:text-lg text-muted-foreground">{project.description}</p>
            
            <div className="flex gap-2 flex-wrap">
              {project.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs sm:text-sm">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project Thumbnail */}
          {project.thumbnail && (
            <div className="rounded-xl overflow-hidden border bg-muted w-full">
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-auto object-contain aspect-video"
                loading="lazy"
              />
            </div>
          )}

          {/* Project Structure */}
          {project.files.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">Project Structure</h2>
              <div className="rounded-lg border bg-card p-4">
                <ul className="space-y-2">
                  {project.files.map((file, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-muted-foreground">-</span>
                      <div>
                        <p className="font-medium text-sm sm:text-base">{file.path}</p>
                        {file.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground">{file.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Code Preview */}
          {project.Code.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-semibold">Code Preview</h2>
              <div className="rounded-lg border bg-card p-4">
                <div className="space-y-6">
                  {project.Code.slice(0, 3).map((code, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="font-medium text-sm sm:text-base">{code.name}</h3>
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs sm:text-sm">
                        <code>{code.content}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Profile */}
          <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              {isLoadingUser ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : user ? (
                <>
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                      <AvatarImage src={user.profilePicture} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center w-full">
                      <h3 className="font-medium text-base sm:text-lg">{user.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{user.email}</p>
                      
                      <div className="flex justify-center gap-4 mt-3">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 text-xs sm:text-sm">
                        <p className="text-muted-foreground">
                          Last active: {new Date(user.lastLogin).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {user.projects.length > 1 && (
                    <div className="w-full space-y-3 mt-4">
                      <h4 className="font-medium text-sm border-b pb-2">Other Projects ({user.projects.length - 1})</h4>
                      <div className="space-y-2">
                        {user.projects
                          .filter(p => p.conversationId !== id)
                          .slice(0, 3)
                          .map(project => (
                            <Card 
                              key={project.conversationId} 
                              className="p-3 hover:bg-secondary cursor-pointer transition-colors"
                              onClick={() => navigate(`/projects/${project.conversationId}`)}
                            >
                              <CardHeader className="p-0">
                                <CardTitle className="text-sm font-medium">{project.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="p-0">
                                <p className="text-xs text-muted-foreground">
                                  Created: {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                      {user.projects.length > 4 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs mt-2"
                          onClick={() => navigate(`/users/${user._id}`)}
                        >
                          View all projects
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">User information not available</p>
              )}
            </div>
          </div>

          {/* Support Project */}
          <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleUpvote}
                className="flex flex-col items-center p-4 rounded-lg border hover:bg-secondary transition-colors w-full hover:shadow-sm"
              >
                <img 
                  src="https://static.vecteezy.com/system/resources/previews/045/357/215/large_2x/indian-chai-tea-in-glass-cups-free-png.png" 
                  alt="Upvote with chai" 
                  className="h-12 w-12 sm:h-16 sm:w-16 object-contain hover:scale-105 transition-transform"
                />
                <span className="font-medium mt-2 text-sm sm:text-base">Give the user some chai</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{project.chai_count} chais received</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}