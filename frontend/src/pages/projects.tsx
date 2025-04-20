import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ChevronUp, Mail, Github, Clock, Sparkles } from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/themes';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
  id: string;
  thumbnail: string;
  title: string;
  description: string;
  features: string[];
  mainColorTheme: string;
  secondaryColorTheme: string;
  createdAt: string;
  chai_count: number;
}

interface ProjectDetails extends Project {
  files: Array<{
    path: string;
    description: string;
    features: string[];
  }>;
  Code: Array<{
    name: string;
    content: string;
  }>;
  chatHistory: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  ownerProjects: Project[];
}

const categories = [
  'All', 'AI', 'Developer Tool', 'E-commerce', 'Education', 
  'Entertainment', 'Finance', 'Health', 'Productivity', 'Social', 'Utility'
];

const timeFilters = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
];

export function ProjectsPage() {
  const [timeFilter, setTimeFilter] = useState('week');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [upvotingProjects, setUpvotingProjects] = useState<Set<string>>(new Set());
  const { theme } = useTheme();
  const navigate = useNavigate();

  const shuffledProjects = useMemo(() => {
    const interval = setInterval(() => {
      setProjects(prev => [...prev]);
    }, 10 * 60 * 1000);

    const now = new Date();
    const seed = now.getHours();
    const random = (max: number) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };

    return [...projects].sort(() => random(3) - 1);
  }, [projects]);

  useEffect(() => {
    fetchProjects();
    return () => clearInterval(shuffledProjects as unknown as number);
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/projects/public`);
      if (response.data.success) {
        setProjects(response.data.data);
      } else {
        toast.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectDetails = async (id: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await axios.get(`/projects/${id}/details`);
      if (response.data.success) {
        setSelectedProject(response.data.data);
        navigate(`/projects/${id}`);
      } else {
        toast.error('Failed to fetch project details');
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      toast.error('Failed to fetch project details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleUpvote = async (projectId: string) => {
    if (upvotingProjects.has(projectId)) return;

    try {
      setUpvotingProjects(prev => new Set(prev).add(projectId));
      
      // Optimistically update the UI
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, chai_count: project.chai_count + 1 } 
            : project
        )
      );
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => 
          prev ? { ...prev, chai_count: prev.chai_count + 1 } : null
        );
      }

      await axios.post(`/projects/${projectId}/upvote`);
      toast.success('Thanks for the chai! ☕');
      
      // Refresh data after a short delay to ensure sync with server
      setTimeout(() => {
        fetchProjects();
        if (selectedProject) {
          fetchProjectDetails(selectedProject.id);
        }
      }, 2000);
    } catch (error) {
      // Rollback on error
      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, chai_count: Math.max(0, project.chai_count - 1) } 
            : project
        )
      );
      
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => 
          prev ? { ...prev, chai_count: Math.max(0, prev.chai_count - 1) } : null
        );
      }

      console.error('Error upvoting project:', error);
      toast.error('Failed to upvote project');
    } finally {
      setUpvotingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const filteredProjects = useMemo(() => {
    let filtered = shuffledProjects;
    
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      if (timeFilter === 'today') {
        cutoff.setDate(now.getDate() - 1);
      } else if (timeFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (timeFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (timeFilter === 'year') {
        cutoff.setFullYear(now.getFullYear() - 1);
      }
      
      filtered = filtered.filter(project => {
        const projectDate = new Date(project.createdAt);
        return projectDate >= cutoff;
      });
    }
    
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(project => 
        project.features.some(feat => 
          feat.toLowerCase().includes(categoryFilter.toLowerCase()))
      );
    }
    
    return filtered;
  }, [shuffledProjects, timeFilter, categoryFilter]);

  const topProjects = useMemo(() => {
    return [...filteredProjects]
      .sort((a, b) => b.chai_count - a.chai_count)
      .slice(0, 3);
  }, [filteredProjects]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {!selectedProject ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              Discover Projects
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              Explore amazing projects built by the community. Order refreshes every 10 minutes.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={categoryFilter === category ? 'default' : 'secondary'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <SelectValue placeholder="Filter by time" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {timeFilters.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Top Projects */}
          {filteredProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">Top Projects</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {topProjects.map((project) => (
                  <ProjectCard 
                    key={project.id}
                    project={project}
                    onUpvote={handleUpvote}
                    onViewDetails={fetchProjectDetails}
                    featured
                    isUpvoting={upvotingProjects.has(project.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Projects */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Projects ({filteredProjects.length})</h2>
            <div className="grid gap-4">
              {isLoading ? (
                Array(8).fill(0).map((_, index) => (
                  <ProjectCardSkeleton key={index} />
                ))
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onUpvote={handleUpvote}
                    onViewDetails={fetchProjectDetails}
                    isUpvoting={upvotingProjects.has(project.id)}
                  />
                ))
              ) : (
                <div className="text-center py-12 col-span-full">
                  <h3 className="text-xl font-medium mb-2">No projects found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ProjectDetailsView 
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
            navigate('/projects');
          }}
          onUpvote={handleUpvote}
          isLoading={isLoadingDetails}
          isUpvoting={upvotingProjects.has(selectedProject.id)}
        />
      )}
    </div>
  );
}

function ProjectRow({ 
  project, 
  onUpvote, 
  onViewDetails,
  isUpvoting
}: { 
  project: Project;
  onUpvote: (id: string) => void;
  onViewDetails: (id: string) => void;
  isUpvoting: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-all">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/5 p-4">
          {project.thumbnail && (
            <div 
              className="w-full h-32 rounded-md overflow-hidden cursor-pointer bg-muted"
              onClick={() => onViewDetails(project.id)}
            >
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
        </div>
        
        <div className="md:w-3/5 p-4 flex flex-col">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-lg">{project.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {project.description}
            </p>
            <div className="flex gap-2 flex-wrap">
              {project.features.slice(0, 4).map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs truncate">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </div>
        
        <div className="md:w-1/5 p-4 flex flex-col items-end justify-between">
          <button 
            onClick={() => onUpvote(project.id)}
            disabled={isUpvoting}
            className={`flex items-center gap-1 group rounded-full p-2 transition-colors ${
              isUpvoting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'
            }`}
          >
            <img 
              src="https://static.vecteezy.com/system/resources/previews/045/357/215/large_2x/indian-chai-tea-in-glass-cups-free-png.png" 
              alt="Upvote with chai" 
              className={`h-5 w-5 object-contain transition-transform ${
                isUpvoting ? 'animate-pulse' : 'group-hover:scale-110'
              }`}
            />
            <span className="font-medium">{project.chai_count}</span>
          </button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(project.id)}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ProjectCard({ 
  project, 
  onUpvote, 
  onViewDetails,
  featured = false,
  isUpvoting
}: { 
  project: Project;
  onUpvote: (id: string) => void;
  onViewDetails: (id: string) => void;
  featured?: boolean;
  isUpvoting: boolean;
}) {
  return (
    <Card className={`hover:shadow-lg transition-all h-full flex flex-col ${featured ? 'border-primary/30 shadow-md' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          </div>
          {featured && (
            <Badge variant="default" className="flex items-center gap-1 whitespace-nowrap">
              <ChevronUp className="h-4 w-4" />
              Top Project
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <div className="flex gap-2 flex-wrap mb-3">
          {project.features.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="secondary" className="truncate max-w-[120px]">
              {feature}
            </Badge>
          ))}
        </div>
        {project.thumbnail && (
          <div 
            className="w-full h-48 rounded-md overflow-hidden mb-3 cursor-pointer bg-muted"
            onClick={() => onViewDetails(project.id)}
          >
            <img
              src={project.thumbnail}
              alt={project.title}
              className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-0">
        <button 
          onClick={() => onUpvote(project.id)}
          disabled={isUpvoting}
          className={`flex items-center gap-1 group rounded-full p-2 transition-colors ${
            isUpvoting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'
          }`}
        >
          <img 
            src="https://static.vecteezy.com/system/resources/previews/045/357/215/large_2x/indian-chai-tea-in-glass-cups-free-png.png" 
            alt="Upvote with chai" 
            className={`h-5 w-5 object-contain transition-transform ${
              isUpvoting ? 'animate-pulse' : 'group-hover:scale-110'
            }`}
          />
          <span className="font-medium">{project.chai_count}</span>
        </button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewDetails(project.id)}
          className="hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProjectDetailsView({ 
  project, 
  onBack, 
  onUpvote,
  isLoading,
  isUpvoting
}: { 
  project: ProjectDetails | null;
  onBack: () => void;
  onUpvote: (id: string) => void;
  isLoading: boolean;
  isUpvoting: boolean;
}) {
  if (!project) return null;

  return (
    <div className="flex flex-col gap-8">
      <Button 
        variant="ghost" 
        className="w-fit -ml-2" 
        onClick={onBack}
      >
        ← Back to all projects
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <p className="text-lg text-muted-foreground">{project.description}</p>
              
              <div className="flex gap-2 flex-wrap">
                {project.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-sm">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {project.thumbnail && (
              <div className="rounded-xl overflow-hidden border bg-muted aspect-video w-full flex items-center justify-center">
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">About this project</h2>
              <div className="prose dark:prose-invert max-w-none">
                {project.chatHistory
                  .filter(msg => msg.role === 'model')
                  .map((msg, idx) => (
                    <p key={idx}>{msg.content}</p>
                  ))}
              </div>
            </div>

            {project.files.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Project Structure</h2>
                <div className="rounded-lg border bg-card p-4">
                  <ul className="space-y-2">
                    {project.files.map((file, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-muted-foreground">-</span>
                        <div>
                          <p className="font-medium">{file.path}</p>
                          {file.description && (
                            <p className="text-sm text-muted-foreground">{file.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 space-y-4 sticky top-4">
              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => onUpvote(project.id)}
                  disabled={isUpvoting}
                  className={`flex flex-col items-center p-4 rounded-lg border transition-colors w-full hover:shadow-sm ${
                    isUpvoting 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <img 
                    src="https://static.vecteezy.com/system/resources/previews/045/357/215/large_2x/indian-chai-tea-in-glass-cups-free-png.png" 
                    alt="Upvote with chai" 
                    className={`h-16 w-16 object-contain transition-transform ${
                      isUpvoting ? 'animate-pulse' : 'hover:scale-105'
                    }`}
                  />
                  <span className="font-medium mt-2">Buy me a chai</span>
                  <span className="text-sm text-muted-foreground">{project.chai_count} chais received</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </CardHeader>
      <CardContent className="pb-3 flex-1">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="w-full h-48 rounded-md" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );
}