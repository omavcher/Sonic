import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/lib/themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Mail, Shield, CreditCard, LogOut, Upload, Edit, FileCode, Palette, ListChecks, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { authAPI, userAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  tokens: number;
  subscriptionEndDate: string;
  projects: Array<{
    _id: string;
    conversationId: string;
    title: string;
    thumbnail?: string;
    createdAt: string;
  }>;
}

interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  features: string[];
  visibility: string;
  mainColorTheme: string;
  secondaryColorTheme: string;
  files: Array<{
    path: string;
    features: string[];
    _id: string;
  }>;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp: string;
    _id: string;
  }>;
  Code: Array<{
    name: string;
    content: string;
    _id: string;
  }>;
  createdAt: string;
}

const CLOUDINARY_CLOUD_NAME = 'dg9qjhpsc';
const CLOUDINARY_UPLOAD_PRESET = 'om_def';
const CLOUDINARY_PROJECT_THUMBNAILS_FOLDER = 'project_thumbnails';

export function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profilePicture: ''
  });
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    mainColorTheme: '',
    secondaryColorTheme: ''
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    productUpdates: true,
    securityAlerts: true
  });

  const uploadToCloudinary = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setIsUploading(true);
        const file = e.target.files[0];
        const imageUrl = await uploadToCloudinary(file, 'profile_pictures');
        setFormData(prev => ({ ...prev, profilePicture: imageUrl }));
        toast.success('Profile image uploaded successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setIsThumbnailUploading(true);
        const file = e.target.files[0];
        const imageUrl = await uploadToCloudinary(file, CLOUDINARY_PROJECT_THUMBNAILS_FOLDER);
        setProjectFormData(prev => ({ ...prev, thumbnail: imageUrl }));
        toast.success('Thumbnail uploaded successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload thumbnail');
      } finally {
        setIsThumbnailUploading(false);
      }
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleTriggerThumbnailInput = () => {
    thumbnailInputRef.current?.click();
  };

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await userAPI.getProfile();
      if (response?.success && response.user) {
        setUser(response.user);
        setFormData({
          name: response.user.name,
          email: response.user.email,
          profilePicture: response.user.profilePicture || ''
        });
        setNotificationPrefs({
          productUpdates: true,
          securityAlerts: true
        });
      }
    } catch (error) {
      toast.error('Failed to load profile data');
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      setProjectsLoading(true);
      const response = await userAPI.getProject(projectId);
      if (response?.success && response.data) {
        setActiveProject(response.data);
        setProjectFormData({
          title: response.data.title,
          description: response.data.description,
          thumbnail: response.data.thumbnail || '',
          mainColorTheme: response.data.mainColorTheme,
          secondaryColorTheme: response.data.secondaryColorTheme
        });
        setIsEditDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load project details');
      console.error('Error fetching project:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProjectFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNotificationPrefChange = (type: 'productUpdates' | 'securityAlerts') => {
    const newPrefs = {
      ...notificationPrefs,
      [type]: !notificationPrefs[type]
    };
    setNotificationPrefs(newPrefs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const response = await userAPI.updateProfile({
        name: formData.name,
        profilePicture: formData.profilePicture,
        notificationPreferences: notificationPrefs
      });
      
      if (response?.success) {
        setUser(prev => prev ? {
          ...prev,
          name: formData.name,
          profilePicture: formData.profilePicture,
          notificationPreferences: notificationPrefs
        } : null);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    
    try {
      setProjectsLoading(true);
      const response = await userAPI.updateProject(activeProject.id, {
        title: projectFormData.title,
        description: projectFormData.description,
        thumbnail: projectFormData.thumbnail,
        mainColorTheme: projectFormData.mainColorTheme,
        secondaryColorTheme: projectFormData.secondaryColorTheme
      });
      
      if (response?.success) {
        toast.success('Project updated successfully');
        setIsEditDialogOpen(false);
        fetchUserProfile(); // Refresh the project list
      }
    } catch (error) {
      toast.error('Failed to update project');
      console.error('Error updating project:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load profile data</p>
      </div>
    );
  }

  // Format dates for display
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const lastLogin = user?.lastLogin 
    ? new Date(user.lastLogin).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : 'Never';

  const subscriptionEndDate = new Date(user.subscriptionEndDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="py-6 space-y-6">
      {/* User Profile Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 md:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50 p-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.profilePicture} />
                  <AvatarFallback>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {user.role.toUpperCase()} USER
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span>{joinedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last login</span>
                <span>{lastLogin}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subscription</span>
                <span>{user.subscriptionStatus === 'paid' ? 'Active' : 'Inactive'}</span>
              </div>
              {user.subscriptionStatus === 'paid' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Renews on</span>
                  <span>{subscriptionEndDate}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available tokens</span>
                <span>{user.tokens}</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full gap-2 mt-4"
                onClick={handleLogout}
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        disabled 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={formData.profilePicture} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading || isLoading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTriggerFileInput}
                          disabled={isUploading || isLoading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG up to 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    type="button"
                    disabled={isLoading || isUploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    type="submit"
                    disabled={isLoading || isUploading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTheme('light')}
                    disabled={isLoading}
                  >
                    Light
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTheme('dark')}
                    disabled={isLoading}
                  >
                    Dark
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <Label>Email Notifications</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Product updates</h4>
                      <p className="text-sm text-muted-foreground">
                        News about new features and improvements
                      </p>
                    </div>
                    <Button 
                      variant={notificationPrefs.productUpdates ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleNotificationPrefChange('productUpdates')}
                      disabled={isLoading}
                    >
                      {notificationPrefs.productUpdates ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Security alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Important security notifications
                      </p>
                    </div>
                    <Button 
                      variant={notificationPrefs.securityAlerts ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => handleNotificationPrefChange('securityAlerts')}
                      disabled={isLoading}
                    >
                      {notificationPrefs.securityAlerts ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects Section */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base">Your Projects ({user.projects.length})</CardTitle>
          <CardDescription>All your created projects are listed here</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {user.projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              You don't have any projects yet
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {user.projects.map(project => (
                <Card key={project.conversationId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{project.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => fetchProjectDetails(project.conversationId)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>
                      Created: {new Date(project.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => fetchProjectDetails(project.conversationId)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {activeProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Project: {activeProject.title}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleProjectUpdate} className="space-y-4">
                {/* Thumbnail Upload Section */}
                <div className="space-y-2">
                  <Label>Project Thumbnail</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-md border overflow-hidden">
                      {projectFormData.thumbnail ? (
                        <img 
                          src={projectFormData.thumbnail} 
                          alt="Project thumbnail" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={thumbnailInputRef}
                        onChange={handleThumbnailChange}
                        accept="image/*"
                        className="hidden"
                        disabled={isThumbnailUploading || projectsLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerThumbnailInput}
                        disabled={isThumbnailUploading || projectsLoading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isThumbnailUploading ? 'Uploading...' : 'Upload Thumbnail'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Square image recommended (1:1 aspect ratio)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={projectFormData.title}
                      onChange={handleProjectInputChange}
                      disabled={projectsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={activeProject.visibility === 'public' ? 'default' : 'secondary'}>
                        {activeProject.visibility === 'public' ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectFormData.description}
                    onChange={handleProjectInputChange}
                    disabled={projectsLoading}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mainColorTheme">
                      <span className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Main Color
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="mainColorTheme"
                        value={projectFormData.mainColorTheme}
                        onChange={handleProjectInputChange}
                        disabled={projectsLoading}
                      />
                      <div 
                        className="h-10 w-10 rounded-md border"
                        style={{ backgroundColor: projectFormData.mainColorTheme }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColorTheme">
                      <span className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Secondary Color
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondaryColorTheme"
                        value={projectFormData.secondaryColorTheme}
                        onChange={handleProjectInputChange}
                        disabled={projectsLoading}
                      />
                      <div 
                        className="h-10 w-10 rounded-md border"
                        style={{ backgroundColor: projectFormData.secondaryColorTheme }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={projectsLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={projectsLoading || isThumbnailUploading}
                  >
                    {projectsLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}