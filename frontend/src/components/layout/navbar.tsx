import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/themes';
import { Moon, Sun, Zap, Globe2, Lock, ChevronDown, GitFork, Download, Share2, Menu, Rocket , AudioWaveform } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { ProPlanDialog } from '@/components/pro-plan-dialog';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { authAPI, userAPI } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSandpackContext } from '@/components/context/SandpackContext';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface NavbarProps {
  onMenuToggle: () => void;
  onAuthClick: () => void;
}

interface ProjectData {
  title?: string;
  visibility?: 'public' | 'private';
  version?: string;
}

interface CodeFile {
  name: string;
  content: string;
  _id: string;
}

interface UserProfile {
  name?: string;
  email?: string;
  profilePicture?: string;
  role?: string;
  subscriptionStatus?: string;
}

export function Navbar({ onMenuToggle, onAuthClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [projectData, setProjectData] = useState<ProjectData>({
    title: 'New Chat',
    visibility: 'public',
    version: 'v1.0'
  });
  const [projectExists, setProjectExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const { sandpackResult } = useSandpackContext();
  const navigate = useNavigate();

  

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchUserProfile();
      fetchProjectData();
    } else {
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  }, [searchParams]);

  const fetchUserProfile = async () => {
    setIsProfileLoading(true);
    try {
      const response = await userAPI.getProfile();
      if (response) {
        setUserProfile({
          name: response.user.name,
          email: response.user.email,
          profilePicture: response.user.profilePicture,
          role: response.user.role,
          subscriptionStatus: response.user.subscriptionStatus
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const fetchProjectData = async () => {
    const convId = searchParams.get('convId');
    if (!convId) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`/projects/${convId}/details`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setProjectData({
          title: data.title
            ? data.title.split(' ').slice(0, 7).join(' ') + (data.title.split(' ').length > 3 ? '...' : '')
            : 'New Project',
          visibility: data.visibility || 'public',
          version: data.version || 'v1.0'
        });
        setProjectExists(true);
      } else {
        setProjectExists(false);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      setProjectExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUserProfile(null);
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleVisibilityChange = async (visibility: 'public' | 'private') => {
    const convId = searchParams.get('convId');
    if (!convId || !projectExists) return;

    setIsUpdatingVisibility(true);
    try {
      if (visibility === 'private') {
        if (userProfile?.role !== 'premium' || userProfile?.subscriptionStatus !== 'paid') {
          setIsProDialogOpen(true);
          return;
        }
      }

      const response = await axios.put(
        `${API_URL}/projects/visibility/${convId}`,
        { visibility },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setProjectData(prev => ({
          ...prev,
          visibility
        }));
        toast.success(`Project is now ${visibility}`);
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleDownload = async () => {
    const convId = searchParams.get('convId');
    if (!convId || !projectExists) {
      toast.error('Project not found');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await axios.get(`/projects/${convId}/details`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success && response.data.data && response.data.data.Code) {
        const codeFiles: CodeFile[] = response.data.data.Code;
        const zip = new JSZip();
        
        codeFiles.forEach(file => {
          const filePath = file.name.startsWith('/') ? file.name.substring(1) : file.name;
          zip.file(filePath, file.content);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${projectData.title || 'project'}-code.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Project downloaded successfully');
      } else {
        toast.error('No code files found in the project');
      }
    } catch (error) {
      console.error('Error downloading project:', error);
      toast.error('Failed to download project');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeploy = () => {
    toast.success('Deployment started!', {
      icon: <Rocket className="w-5 h-5 text-blue-500" />,
    });
    window.open('https://'+sandpackResult?.sandboxId+'.csb.app')
  };

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">       
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMenuToggle}
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <Link to="/" 
            onClick={() => {
              navigate('/');
              window.location.reload();
            }}
            className="flex items-center gap-2">
              <AudioWaveform className="h-6 w-6 text-primary"/>
              <span className="text-lg font-semibold hidden sm:inline">Sonic</span>
            </Link>
          </div>

          {isAuthenticated && projectExists && (
            <div className="flex-1 flex items-center justify-center max-w-2xl mx-4">
              <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/50 rounded-full text-sm">
                <span className="font-medium truncate max-w-[120px] sm:max-w-none">
                  {isLoading ? 'Loading...' : `${projectData.title}`}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 gap-1 px-2"
                      disabled={isUpdatingVisibility}
                    >
                      {projectData.visibility === 'public' ? (
                        <Globe2 className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isUpdatingVisibility ? 'Updating...' : capitalizeFirstLetter(projectData.visibility || 'public')}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      className={projectData.visibility === 'public' ? 'bg-muted' : ''}
                      onClick={() => handleVisibilityChange('public')}
                      disabled={isUpdatingVisibility}
                    >
                      <Globe2 className="h-4 w-4 mr-2" />
                      Public
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className={`${projectData.visibility === 'private' ? 'bg-muted' : ''}`}
                      onClick={() => handleVisibilityChange('private')}
                      disabled={isUpdatingVisibility}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Private
                      {userProfile?.role !== 'premium' && (
                        <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-xs text-muted-foreground hidden sm:inline">{projectData.version}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                
                <Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8 relative group"
  title="Download Project"
  onClick={handleDownload}
  disabled={isDownloading || !projectExists}
>
  {isDownloading ? (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
  ) : (
    <>
      <Download className="h-4 w-4 transition-all group-hover:scale-110" />
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary/80 flex items-center justify-center">
        <span className="text-[8px] font-bold text-white">
          {projectExists ? '↓' : '!'}
        </span>
      </span>
    </>
  )}
</Button>
                
               
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1 px-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border-blue-300/30 dark:border-blue-500/30"
                  onClick={handleDeploy}
                  disabled={!projectExists}
                >
                  <Rocket className="h-4 w-4 text-blue-500" />
                  <span className="hidden sm:inline bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Deploy
                  </span>
                </Button>
                
                <Button
  asChild
  variant="ghost"
  size="sm"
  className="h-8 gap-1 px-3 hover:bg-accent/50"
  title="View Projects"
>
  <Link to="/projects" className="flex items-center">
    <GitFork className="h-4 w-4" />
    <span className="hidden sm:inline">Projects</span>
  </Link>
</Button>
                
                <Separator orientation="vertical" className="h-4 mx-1" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={userProfile?.profilePicture} 
                          referrerPolicy="no-referrer" 
                        />
                        <AvatarFallback>
                          {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{userProfile?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userProfile?.email || 'No email'}
                      </p>
                      {userProfile?.role === 'premium' && (
                        <p className="text-xs text-primary mt-1">
                          Premium Member
                        </p>
                      )}
                    </div>
                    <Separator className="my-1" />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="h-8 w-8"
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {!isAuthenticated && (
              <Button
                variant="default"
                onClick={onAuthClick}
                className="hidden sm:flex"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </nav>
      
      <ProPlanDialog 
        isOpen={isProDialogOpen} 
        onClose={() => setIsProDialogOpen(false)} 
      />
    </>
  );
}