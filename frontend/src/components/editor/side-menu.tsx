import { 
  MessageSquare, 
  Gift, 
  Settings, 
  HelpCircle, 
  CreditCard, 
  Users, 
  LogOut,
  X,
  Zap,
  Info,
  ChevronRight,
  BadgeCheck,
  Shield,
  FileText,
  Mail,
  Twitter,
  Github,
  Check,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { authAPI, userAPI } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTheme } from '@/lib/themes';
import { toast } from 'react-hot-toast';


interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthClick: () => void;
}

interface UserProject {
  _id: string;
  conversationId: string;
  title: string;
  createdAt: string;
}

interface UserProfile {
  _id?: string;
  name?: string;
  email?: string;
  profilePicture?: string;
  subscriptionStatus?: string;
  projects?: UserProject[];
  tokens?: number;
  notificationPreferences?: {
    productUpdates: boolean;
    securityAlerts: boolean;
  };
}

import axios from '@/lib/axios'
import { ProPlanDialog } from '../pro-plan-dialog';

export function SideMenu({ isOpen, onClose , onAuthClick}: SideMenuProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);

  // Dialog states
  const [showTokensDialog, setShowTokensDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPayments = async () => {
      if (!token) return;
  
      try {
        setIsLoading(true);
        const response = await axios.get(`/users/payments`);
        if (response.data.success) {
          setPayments(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch payments", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchPayments();
  }, [token]);
  

  // Filter projects based on search query
  const filteredProjects = (projects: UserProject[] = []) => {
    if (!searchQuery) return projects;
    return projects.filter(project => 
      project.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Group projects by date
  const groupProjectsByDate = (projects: UserProject[] = []) => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return filteredProjects(projects).reduce((acc, project) => {
      const projectDate = new Date(project.createdAt);
      let dateGroup = 'Older';
      
      if (projectDate.toDateString() === now.toDateString()) {
        dateGroup = 'Today';
      } else if (projectDate > thirtyDaysAgo) {
        dateGroup = 'Last 30 Days';
      }

      if (!acc[dateGroup]) {
        acc[dateGroup] = [];
      }
      acc[dateGroup].push(project);
      return acc;
    }, {} as Record<string, UserProject[]>);
  };

  const groupedProjects = groupProjectsByDate(userProfile?.projects);

  // Check authentication and fetch profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchUserProfile();
    } else {
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response?.success && response.user) {
        setUserProfile({
          _id: response.user._id,
          name: response.user.name,
          email: response.user.email,
          profilePicture: response.user.profilePicture,
          subscriptionStatus: response.user.role,
          projects: response.user.projects || [],
          tokens: response.user.tokens || 0,
          notificationPreferences: response.user.notificationPreferences || {
            productUpdates: true,
            securityAlerts: true
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUserProfile(null);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    onClose();
    navigate('/');
  };

  const handleProjectClick = (conversationId: string) => {
    navigate(`/?convId=${conversationId}`);
    onClose();
  };

  const handleClaimTokens = async () => {
    try {
      setIsLoading(true);
      const response = await userAPI.claimDailyTokens();
      if (response?.success) {
        toast.success('50 tokens added to your account!');
        setUserProfile(prev => prev ? {
          ...prev,
          tokens: (prev.tokens || 0) + 50
        } : null);
        setShowTokensDialog(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to claim tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNotificationPrefs = async (type: 'productUpdates' | 'securityAlerts') => {
    if (!userProfile) return;
    
    const newPrefs = {
      ...userProfile.notificationPreferences,
      [type]: !userProfile.notificationPreferences?.[type]
    };

    try {
      setIsLoading(true);
      const response = await userAPI.updateProfile({
        notificationPreferences: newPrefs
      });
      
      if (response?.success) {
        setUserProfile(prev => prev ? {
          ...prev,
          notificationPreferences: newPrefs
        } : null);
        toast.success('Notification preferences updated');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    toast.success(`Theme set to ${newTheme}`);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sideMenuRef.current && !sideMenuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleRestrictedFeatureClick = () => {
    setShowLoginPrompt(true);
  };

  return (
    <>
      <div
        ref={sideMenuRef}
        className={cn(
          "fixed left-0 top-0 bottom-0 w-72 bg-background border-r z-50",
          "transform transition-transform duration-300 ease-in-out",
          "shadow-lg",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex h-full flex-col">
          {/* Header section */}
          <div className="p-4 space-y-4 border-b">
            <Button 
              className="w-full justify-start gap-2" 
              variant="default"
              onClick={() => {
                setActiveChat(null);
                onClose();
                navigate('/');
                window.location.reload();
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Start new chat
            </Button>
            {isAuthenticated && (
              <Input 
                type="search" 
                placeholder="Search chats..." 
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}
          </div>

          {/* Project list section */}
          {isAuthenticated ? (
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-6">
                {Object.entries(groupedProjects).map(([date, dateProjects]) => (
                  <div key={date} className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground px-2">
                      {date}
                    </h3>
                    <div className="space-y-1">
                      {dateProjects.map((project) => (
                        <Button
                          key={project._id}
                          variant={activeChat === project.conversationId ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start font-normal",
                            "text-left truncate px-2",
                            "hover:bg-accent/50"
                          )}
                          onClick={() => {
                            setActiveChat(project.conversationId);
                            handleProjectClick(project.conversationId);
                          }}
                        >
                          <span className="truncate">{project.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sign in to access your chat history
                </p>
                <Button 
                  size="sm" 
                  onClick={onAuthClick}
                  className="mt-2"
                >
                  Sign In
                </Button>
              </div>
            </div>
          )}

          {/* Bottom menu section */}
          <div className="p-4 space-y-2 border-t">
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowTokensDialog(true)}
                >
                  <Gift className="h-4 w-4" />
                  Get free tokens
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowHelpDialog(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help Center
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowSubscriptionDialog(true)}
                >
                  <CreditCard className="h-4 w-4" />
                  My Subscription
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={handleRestrictedFeatureClick}
                >
                  <Gift className="h-4 w-4" />
                  Get free tokens
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={handleRestrictedFeatureClick}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowHelpDialog(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help Center
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={handleRestrictedFeatureClick}
                >
                  <CreditCard className="h-4 w-4" />
                  My Subscription
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2 text-primary"
                  onClick={onAuthClick}
                >
                  <LogOut className="h-4 w-4" />
                  Sign In
                </Button>
              </>
            )}
          </div>

          {/* User profile section */}
          {isAuthenticated && userProfile && (
            <Link to='/profile' className="border-t p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage 
                    src={userProfile.profilePicture} 
                    referrerPolicy="no-referrer" 
                  />
                  <AvatarFallback>
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {userProfile.name || userProfile.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile.tokens || 0} tokens • {userProfile.subscriptionStatus 
                      ? userProfile.subscriptionStatus.charAt(0).toUpperCase() + 
                        userProfile.subscriptionStatus.slice(1).toLowerCase() + ' Plan'
                      : 'Personal Plan'}
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sign In Required
            </DialogTitle>
            <DialogDescription>
              This feature is only available to signed-in users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Please sign in or create an account to access this feature and enjoy all the benefits of our service.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => {
              setShowLoginPrompt(false);
              onAuthClick();
            }}>
              Sign In Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tokens Dialog */}
      <Dialog open={showTokensDialog} onOpenChange={setShowTokensDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Free Tokens
            </DialogTitle>
            <DialogDescription>
              Earn free tokens to continue using our service
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Your Token Balance</h3>
                  <p className="text-2xl font-bold">
                    {userProfile?.tokens || 0} <span className="text-sm text-muted-foreground">tokens</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Ways to earn free tokens:</h4>
              <div className="space-y-2">
                {[
                  { 
                    title: "Daily Login", 
                    description: "Get 50 tokens every day you log in",
                    tokens: "+50"
                  },
                  { 
                    title: "Refer a Friend", 
                    description: "Earn 200 tokens for each friend who signs up",
                    tokens: "+200"
                  },
                  { 
                    title: "Complete Survey", 
                    description: "Take a quick survey to earn 100 tokens",
                    tokens: "+100"
                  },
                  { 
                    title: "Watch Tutorial", 
                    description: "Watch our getting started guide for 75 tokens",
                    tokens: "+75"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 hover:bg-accent/50 rounded-lg transition-colors">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium">{item.title}</h5>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-primary font-medium">
                      {item.tokens}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokensDialog(false)}>
              Close
            </Button>
            <Button onClick={handleClaimTokens} disabled={isLoading}>
              <Gift className="h-4 w-4 mr-2" />
              {isLoading ? 'Claiming...' : 'Claim Daily Tokens'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Customize your experience and preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Appearance</h4>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span>Theme</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleUpdateTheme('light')}
                  >
                    Light
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleUpdateTheme('dark')}
                  >
                    Dark
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Notifications</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <span>Product Updates</span>
                  </div>
                  <Button 
                    variant={userProfile?.notificationPreferences?.productUpdates ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleUpdateNotificationPrefs('productUpdates')}
                    disabled={isLoading}
                  >
                    {userProfile?.notificationPreferences?.productUpdates ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span>Security Alerts</span>
                  </div>
                  <Button 
                    variant={userProfile?.notificationPreferences?.securityAlerts ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleUpdateNotificationPrefs('securityAlerts')}
                    disabled={isLoading}
                  >
                    {userProfile?.notificationPreferences?.securityAlerts ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Advanced</h4>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span>Export Data</span>
                </div>
                <Button variant="outline" size="sm">
                  Download
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button disabled={isLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Center Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-blue-500" />
              Help Center
            </DialogTitle>
            <DialogDescription>
              Find answers to common questions and get support
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h4 className="font-medium">Our Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "AI-powered web development tool",
                  "Edit, and deploy full-stack",
                  "Many AI generative tools",
                  "No local setup is needed.",
                  "Your Productivity Partner",
                  "Indie Deovolper"
                ].map((topic, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="justify-between"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Contact Support</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium">Email Us</h5>
                    <p className="text-sm text-muted-foreground">
                      omawchar07@gmail.com
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Twitter className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium">Tweet Us</h5>
                    <p className="text-sm text-muted-foreground">
                    @omawchar07
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHelpDialog(false)}>
              Close
            </Button>
            <Button
  onClick={() => {
    window.open('https://mail.google.com/mail/?view=cm&fs=1&to=omawchar07@gmail.com', '_blank');
  }}
>
  <Mail className="h-4 w-4 mr-2" />
  Contact Support
</Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
<Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
  <DialogContent className="max-w-md rounded-lg">
    <DialogHeader className="space-y-1">
      <div className="flex items-center gap-3">
        <BadgeCheck className="h-6 w-6 text-primary" />
        <div>
          <DialogTitle className="text-2xl font-semibold">My Subscription</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Manage your current plan and billing
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>

    <div className="space-y-5 py-2">
      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">Current Plan</p>
          <p className="text-xl font-bold">
            {`${(userProfile?.subscriptionStatus || 'free')[0].toUpperCase()}${(userProfile?.subscriptionStatus || 'free').slice(1)}`} Plan
          </p>
        </div>
      </div>

      {/* Plan Benefits */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plan Benefits</h4>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {[
            "Unlimited projects",
            "Priority support",
            "Advanced analytics",
            "Custom domains",
            "Team access",
            "API access"
          ].map((benefit, index) => (
            <li key={index} className="flex items-start gap-2 p-2 hover:bg-accent/50 rounded-md transition-colors">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Billing Information */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Billing</h4>
        <div className="p-4 border rounded-xl bg-background flex justify-between items-center">
          <div>
            <p className="text-sm font-medium flex items-center gap-1">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Razorpay
            </p>
            {payments?.payment?.paymentDate &&
              payments?.user?.subscriptionEndDate &&
              payments?.payment?.amount && (
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(payments.payment.paymentDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })} 
                  <span className="mx-1">To</span>
                  {new Date(payments.user.subscriptionEndDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })} 
                  <span className="mx-1">·</span>
                  <span className="font-medium">Rs {payments.payment.amount}</span>
                </p>
            )}
          </div>
        </div>
      </div>
    </div>

    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
      <Button 
        variant="outline" 
        size="default"
        onClick={() => setShowSubscriptionDialog(false)} 
        className="w-full"
      >
        Close
      </Button>

      <Button
        className="w-full"
        onClick={() => {
          setIsProDialogOpen(true);
          setShowSubscriptionDialog(false);
        }}
              >
        <Mail className="h-4 w-4 mr-2" />
        Subscribe
       </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>



<ProPlanDialog 
        isOpen={isProDialogOpen} 
        onClose={() => setIsProDialogOpen(false)} 
      />
    </>
  );
}