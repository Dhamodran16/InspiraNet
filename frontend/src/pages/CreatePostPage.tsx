import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import postsApi, { CreatePostData } from '@/services/postsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Image, 
  Video, 
  FileText, 
  X, 
  Plus, 
  Calendar, 
  MapPin, 
  Building, 
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  ArrowUp
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [postType, setPostType] = useState<'general' | 'event' | 'job' | 'poll'>('general');
  
  // Separate content for each post type
  const [contentByType, setContentByType] = useState({
    general: '',
    event: '',
    job: '',
    poll: ''
  });
  
  const [media, setMedia] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: number }>({});
  const [imagePreviews, setImagePreviews] = useState<{ [key: string]: string }>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Event-specific fields
  const [eventDetails, setEventDetails] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    maxAttendees: '',
    attendanceMode: 'in-person' as 'in-person' | 'online' | 'hybrid'
  });
  
  // Job-specific fields
  const [jobDetails, setJobDetails] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time',
    description: '',
    requirements: [''],
    salary: '',
    applicationDeadline: ''
  });
  
  // Poll-specific fields
  const [pollDetails, setPollDetails] = useState({
    question: '',
    options: ['', ''],
    endDate: '',
    endTime: ''
  });

  // Clear content on page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      setContentByType({
        general: '',
        event: '',
        job: '',
        poll: ''
      });
      setMedia([]);
      setTags([]);
      setNewTag('');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // GSAP Animations
  useEffect(() => {
    if (containerRef.current) {
      // Initial page load animation
      gsap.fromTo(headerRef.current, 
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(formRef.current,
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: "power3.out" }
      );

      gsap.fromTo(sidebarRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, delay: 0.4, ease: "power3.out" }
      );

      // Parallax effect for header
      gsap.to(headerRef.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });

      // Stagger animation for form elements
      gsap.fromTo(".form-element",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.1, 
          delay: 0.6,
          ease: "power3.out"
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  // Animate post type change
  useEffect(() => {
    gsap.fromTo(".post-type-content",
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  }, [postType]);

  // Get current content for the selected post type
  const getCurrentContent = () => contentByType[postType];
  
  // Set content for the current post type
  const setCurrentContent = (value: string) => {
    setContentByType(prev => ({
      ...prev,
      [postType]: value
    }));
  };

  // Calculate form completion percentage
  const getFormCompletionPercentage = (): number => {
    let completed = 0;
    let total = 0;

    // Content is always required
    total += 1;
    if (getCurrentContent().trim()) completed += 1;

    // Type-specific requirements
    if (postType === 'event') {
      total += 4;
      if (eventDetails.title.trim()) completed += 1;
      if (eventDetails.date) completed += 1;
      if (eventDetails.time) completed += 1;
      if (eventDetails.location.trim()) completed += 1;
    } else if (postType === 'job') {
      total += 3;
      if (jobDetails.title.trim()) completed += 1;
      if (jobDetails.company.trim()) completed += 1;
      if (jobDetails.location.trim()) completed += 1;
    } else if (postType === 'poll') {
      total += 4;
      if (pollDetails.question.trim()) completed += 1;
      const validOptions = pollDetails.options.filter(opt => opt.trim());
      if (validOptions.length >= 2) completed += 1;
      if (pollDetails.endDate) completed += 1;
      if (pollDetails.endTime) completed += 1;
    }

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Check file count
    if (files.length + media.length > 5) {
      toast({
        title: "Too many files",
        description: "You can only upload up to 5 files.",
        variant: "destructive"
      });
      return;
    }

    // Validate file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `${oversizedFiles[0].name} is too large. Maximum file size is 10MB.`,
        variant: "destructive"
      });
      return;
    }

    // Validate file types
    const allowedTypes = ['image/', 'video/', 'application/pdf'];
    const invalidFiles = files.filter(file => 
      !allowedTypes.some(type => file.type.startsWith(type))
    );
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: `${invalidFiles[0].name} is not a supported file type. Please upload images, videos, or PDFs.`,
        variant: "destructive"
      });
      return;
    }

    // Simulate upload progress for each file
    files.forEach((file, index) => {
      const fileId = `${file.name}-${Date.now()}-${index}`;
      setUploadingFiles(prev => ({ ...prev, [fileId]: 0 }));
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadingFiles(prev => {
          const currentProgress = prev[fileId] || 0;
          if (currentProgress >= 100) {
            clearInterval(interval);
            return prev;
          }
          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 100);

      // Add file to media after "upload" completes
      setTimeout(() => {
        setMedia(prev => [...prev, file]);
        setUploadingFiles(prev => {
          const { [fileId]: removed, ...rest } = prev;
          return rest;
        });
        
        // Create image preview if it's an image
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreviews(prev => ({
              ...prev,
              [file.name]: e.target?.result as string
            }));
          };
          reader.readAsDataURL(file);
        }
        
        toast({
          title: "File uploaded successfully!",
          description: `${file.name} has been uploaded.`,
        });
      }, 1500);
    });
    
    // Animate new files
    gsap.fromTo(".file-item:last-child",
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  };

  const removeFile = (index: number) => {
    const fileToRemove = media[index];
    setMedia(prev => prev.filter((_, i) => i !== index));
    
    // Remove image preview if exists
    if (fileToRemove && imagePreviews[fileToRemove.name]) {
      setImagePreviews(prev => {
        const { [fileToRemove.name]: removed, ...rest } = prev;
        return rest;
      });
    }
    
    // Animate removal
    gsap.to(`.file-item:nth-child(${index + 1})`, {
      scale: 0,
      opacity: 0,
      duration: 0.3,
      ease: "back.in(1.7)",
      onComplete: () => {
        setMedia(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
      
      // Animate new tag
      gsap.fromTo(".tag-item:last-child",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
      );
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const addJobRequirement = () => {
    setJobDetails(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateJobRequirement = (index: number, value: string) => {
    setJobDetails(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeJobRequirement = (index: number) => {
    setJobDetails(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addPollOption = () => {
    setPollDetails(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updatePollOption = (index: number, value: string) => {
    setPollDetails(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removePollOption = (index: number) => {
    if (pollDetails.options.length > 2) {
      setPollDetails(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = (): boolean => {
    // Content validation
    if (!getCurrentContent().trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post.",
        variant: "destructive"
      });
      return false;
    }

    // Tags validation (mandatory)
    if (!tags || tags.length === 0) {
      toast({
        title: "Tags required",
        description: "Please add at least one tag to your post.",
        variant: "destructive"
      });
      return false;
    }

    // Content length validation
    if (getCurrentContent().length > 2000) {
      toast({
        title: "Content too long",
        description: "Please keep your post under 2000 characters.",
        variant: "destructive"
      });
      return false;
    }

    // Event validation
    if (postType === 'event') {
      if (!eventDetails.title.trim()) {
        toast({
          title: "Event title required",
          description: "Please enter an event title.",
          variant: "destructive"
        });
        return false;
      }
      if (!eventDetails.date) {
        toast({
          title: "Event date required",
          description: "Please select an event date.",
          variant: "destructive"
        });
        return false;
      }
      if (!eventDetails.time) {
        toast({
          title: "Event time required",
          description: "Please select an event time.",
          variant: "destructive"
        });
        return false;
      }
      if (!eventDetails.location.trim()) {
        toast({
          title: "Event location required",
          description: "Please enter the event location.",
          variant: "destructive"
        });
        return false;
      }
    }

    // Job validation
    if (postType === 'job') {
      if (!jobDetails.title.trim()) {
        toast({
          title: "Job title required",
          description: "Please enter a job title.",
          variant: "destructive"
        });
        return false;
      }
      if (!jobDetails.company.trim()) {
        toast({
          title: "Company name required",
          description: "Please enter the company name.",
          variant: "destructive"
        });
        return false;
      }
      if (!jobDetails.location.trim()) {
        toast({
          title: "Job location required",
          description: "Please enter the job location.",
          variant: "destructive"
        });
        return false;
      }
    }

    // Poll validation
    if (postType === 'poll') {
      if (!pollDetails.question.trim()) {
        toast({
          title: "Poll question required",
          description: "Please enter a poll question.",
          variant: "destructive"
        });
        return false;
      }
      const validOptions = pollDetails.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast({
          title: "Poll options required",
          description: "Please provide at least 2 poll options.",
          variant: "destructive"
        });
        return false;
      }
      if (!pollDetails.endDate) {
        toast({
          title: "Poll end date required",
          description: "Please select a poll end date.",
          variant: "destructive"
        });
        return false;
      }
      if (!pollDetails.endTime) {
        toast({
          title: "Poll end time required",
          description: "Please select a poll end time.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    // Loading animation
    gsap.to(".submit-button", {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    try {
      const postData: CreatePostData = {
        content: getCurrentContent().trim(),
        postType,
        media: media.length > 0 ? media : undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      if (postType === 'event') {
        postData.eventDetails = {
          title: eventDetails.title,
          date: `${eventDetails.date} ${eventDetails.time}`,
          location: eventDetails.location,
          description: eventDetails.description
        };
      }

      if (postType === 'job') {
        postData.jobDetails = {
          title: jobDetails.title,
          company: jobDetails.company,
          location: jobDetails.location,
          type: jobDetails.type,
          description: jobDetails.description,
          requirements: jobDetails.requirements.filter(req => req.trim()),
          salary: jobDetails.salary,
          applicationDeadline: jobDetails.applicationDeadline
        };
      }

      if (postType === 'poll') {
        // Combine date and time for endDate
        const endDateTime = pollDetails.endDate && pollDetails.endTime 
          ? `${pollDetails.endDate} ${pollDetails.endTime}`
          : pollDetails.endDate;
        
        postData.pollDetails = {
          question: pollDetails.question,
          options: pollDetails.options.filter(opt => opt.trim()),
          endDate: endDateTime
        };
      }

      await postsApi.createPost(postData);
      
      // Success animation
      gsap.to(".success-animation", {
        scale: 1.2,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: "power2.out"
      });
      
      toast({
        title: "🎉 Post created successfully!",
        description: `Your ${postType} post has been shared with the network.`,
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error creating post",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <FileText className="h-5 w-5" />;
      case 'event':
        return <Calendar className="h-5 w-5" />;
      case 'job':
        return <Building className="h-5 w-5" />;
      case 'poll':
        return <Users className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'bg-blue-500';
      case 'event':
        return 'bg-green-500';
      case 'job':
        return 'bg-purple-500';
      case 'poll':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Fixed Header */}
        <div ref={headerRef} className="mb-6 sticky top-0 z-10 bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-100/95 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-sm rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm w-full sm:w-auto justify-center sm:justify-start"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create Your Post
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                Share your thoughts, experiences, or opportunities with the KEC Alumni Network
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Form */}
          <div ref={formRef} className="lg:col-span-3">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl create-post-scroll">
              <CardHeader className="pb-6">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xl sm:text-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getPostTypeColor(postType)} text-white`}>
                      {getPostTypeIcon(postType)}
                    </div>
                    <span>Create {postType.charAt(0).toUpperCase() + postType.slice(1)} Post</span>
                  </div>
                  <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">
                {/* Post Type Selector */}
                <div className="form-element space-y-3">
                  <Label className="text-lg font-semibold">Choose Post Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { value: 'general', label: 'General', icon: FileText, color: 'blue', desc: 'Share updates & thoughts' },
                      { value: 'event', label: 'Event', icon: Calendar, color: 'green', desc: 'Organize meetups' },
                      { value: 'job', label: 'Job', icon: Building, color: 'purple', desc: 'Share opportunities' },
                      { value: 'poll', label: 'Poll', icon: Users, color: 'orange', desc: 'Gather opinions' }
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = postType === type.value;
                      return (
                        <div
                          key={type.value}
                          onClick={() => setPostType(type.value as any)}
                          className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                            isSelected
                              ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20 shadow-lg`
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2 relative z-10">
                            <div className={`p-3 rounded-lg transition-all duration-300 ${isSelected ? `bg-${type.color}-500 scale-110` : 'bg-slate-100 dark:bg-slate-700 group-hover:scale-105'}`}>
                              <Icon className={`h-6 w-6 transition-colors ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                            </div>
                            <div className="text-center">
                              <span className={`font-semibold text-sm block transition-colors duration-300 ${isSelected ? `text-${type.color}-700 dark:text-${type.color}-300` : 'text-slate-700 dark:text-slate-300'}`}>
                                {type.label}
                              </span>
                              <span className={`text-xs transition-colors duration-300 ${isSelected ? `text-${type.color}-600 dark:text-${type.color}-400` : 'text-slate-500 dark:text-slate-400'}`}>
                                {type.desc}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-${type.color}-500/10 to-${type.color}-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="form-element space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Share your thoughts
                  </Label>
                  <div className="relative group">
                                         <Textarea
                       placeholder="What's on your mind? Share your ideas, experiences, or announcements..."
                       value={getCurrentContent()}
                       onChange={(e) => setCurrentContent(e.target.value)}
                       className="min-h-[150px] text-lg resize-none border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 group-hover:border-blue-300 dark:group-hover:border-blue-500 shadow-sm group-hover:shadow-md"
                     />
                                         <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <div className="flex items-center gap-1 text-xs text-slate-400">
                         <Target className="h-3 w-3" />
                         <span>{getCurrentContent().length}/2000</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Make it engaging and meaningful for your network</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Content length indicator */}
                      <div className={`flex items-center gap-1 text-xs ${
                        getCurrentContent().length > 1800 
                          ? 'text-red-600 dark:text-red-400' 
                          : getCurrentContent().length > 1500 
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span>{getCurrentContent().length}/2000</span>
                      </div>
                      
                      {/* Ready to post indicator */}
                      {getCurrentContent().length > 0 && getCurrentContent().length <= 2000 && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          <span>Ready to post</span>
                        </div>
                      )}
                      
                      {/* Content too long warning */}
                      {getCurrentContent().length > 2000 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          <span>Too long</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Type-specific forms */}
                <div className="post-type-content">
                  <Tabs value={postType} className="w-full">
                    <TabsContent value="event" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="font-semibold">Event Title *</Label>
                          <Input
                            placeholder="Enter event title"
                            value={eventDetails.title}
                            onChange={(e) => setEventDetails(prev => ({ ...prev, title: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Date *</Label>
                          <Input
                            type="date"
                            value={eventDetails.date}
                            onChange={(e) => setEventDetails(prev => ({ ...prev, date: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Time *</Label>
                          <Input
                            type="time"
                            value={eventDetails.time}
                            onChange={(e) => setEventDetails(prev => ({ ...prev, time: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Location *</Label>
                          <Input
                            placeholder="Event location"
                            value={eventDetails.location}
                            onChange={(e) => setEventDetails(prev => ({ ...prev, location: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-semibold">Event Description</Label>
                        <Textarea
                          placeholder="Tell people about your event..."
                          value={eventDetails.description}
                          onChange={(e) => setEventDetails(prev => ({ ...prev, description: e.target.value }))}
                          className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="font-semibold">Max Attendees</Label>
                          <Input
                            type="number"
                            placeholder="Maximum attendees"
                            value={eventDetails.maxAttendees}
                            onChange={(e) => setEventDetails(prev => ({ ...prev, maxAttendees: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Attendance Mode</Label>
                          <Select 
                            value={eventDetails.attendanceMode} 
                            onValueChange={(value: any) => setEventDetails(prev => ({ ...prev, attendanceMode: value }))}
                          >
                            <SelectTrigger className="border-2 border-slate-200 dark:border-slate-700 focus:border-green-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in-person">In Person</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="job" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="font-semibold">Job Title *</Label>
                          <Input
                            placeholder="e.g., Software Engineer"
                            value={jobDetails.title}
                            onChange={(e) => setJobDetails(prev => ({ ...prev, title: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Company *</Label>
                          <Input
                            placeholder="Company name"
                            value={jobDetails.company}
                            onChange={(e) => setJobDetails(prev => ({ ...prev, company: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Location *</Label>
                          <Input
                            placeholder="Job location"
                            value={jobDetails.location}
                            onChange={(e) => setJobDetails(prev => ({ ...prev, location: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Job Type</Label>
                          <Select 
                            value={jobDetails.type} 
                            onValueChange={(value) => setJobDetails(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full-time">Full Time</SelectItem>
                              <SelectItem value="part-time">Part Time</SelectItem>
                              <SelectItem value="internship">Internship</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-semibold">Job Description</Label>
                        <Textarea
                          placeholder="Describe the role and responsibilities..."
                          value={jobDetails.description}
                          onChange={(e) => setJobDetails(prev => ({ ...prev, description: e.target.value }))}
                          className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="font-semibold">Salary Range</Label>
                          <Input
                            placeholder="e.g., $80,000 - $120,000"
                            value={jobDetails.salary}
                            onChange={(e) => setJobDetails(prev => ({ ...prev, salary: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">Application Deadline</Label>
                          <Input
                            type="date"
                            value={jobDetails.applicationDeadline}
                            onChange={(e) => setJobDetails(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-semibold">Requirements</Label>
                        {jobDetails.requirements.map((req, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="Requirement"
                              value={req}
                              onChange={(e) => updateJobRequirement(index, e.target.value)}
                              className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeJobRequirement(index)}
                              disabled={jobDetails.requirements.length === 1}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addJobRequirement}
                          className="mt-2 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Requirement
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="poll" className="space-y-6">
                      <div className="space-y-3">
                        <Label className="font-semibold">Poll Question *</Label>
                        <Input
                          placeholder="What would you like to ask your network?"
                          value={pollDetails.question}
                          onChange={(e) => setPollDetails(prev => ({ ...prev, question: e.target.value }))}
                          className="border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-semibold">Poll Options *</Label>
                        {pollDetails.options.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => updatePollOption(index, e.target.value)}
                              className="border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removePollOption(index)}
                              disabled={pollDetails.options.length === 2}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addPollOption}
                          className="mt-2 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="font-semibold">End Date *</Label>
                          <Input
                            type="date"
                            value={pollDetails.endDate}
                            onChange={(e) => setPollDetails(prev => ({ ...prev, endDate: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-semibold">End Time *</Label>
                          <Input
                            type="time"
                            value={pollDetails.endTime}
                            onChange={(e) => setPollDetails(prev => ({ ...prev, endTime: e.target.value }))}
                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:bg-slate-800 dark:text-white dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Media Upload */}
                <div className="form-element space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Image className="h-5 w-5 text-blue-500" />
                    Add Media (Optional)
                  </Label>
                                     <div 
                     className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-400 transition-all duration-300 group cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                     onDragOver={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                     }}
                     onDragLeave={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                     }}
                     onDrop={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-900/20');
                       const files = Array.from(e.dataTransfer.files);
                       if (files.length > 0) {
                         const event = { target: { files } } as any;
                         handleFileSelect(event);
                       }
                     }}
                   >
                     <input
                       ref={fileInputRef}
                       type="file"
                       multiple
                       accept="image/*,video/*,.pdf"
                       onChange={handleFileSelect}
                       className="hidden"
                     />
                     <div onClick={() => fileInputRef.current?.click()}>
                      <div className="mb-4 flex justify-center">
                        <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform duration-300">
                          <Image className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="mb-4 hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105"
                      >
                        <Image className="h-5 w-5 mr-2" />
                        Choose Files
                      </Button>
                      <p className="text-sm text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        Upload images, videos, or PDFs (max 5 files, 10MB each)
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Drag and drop files here or click to browse
                      </p>
                    </div>
                  </div>
                                     {/* Uploading Files */}
                   {Object.keys(uploadingFiles).length > 0 && (
                     <div className="space-y-3">
                       <Label className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                         Uploading Files...
                       </Label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {Object.entries(uploadingFiles).map(([fileId, progress]) => (
                           <div key={fileId} className="file-item flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                             <div className="flex items-center gap-3 flex-1 min-w-0">
                               <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                               </div>
                               <div className="min-w-0 flex-1">
                                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                   {fileId.split('-')[0]}
                                 </p>
                                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                   <div
                                     className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                     style={{ width: `${progress}%` }}
                                   />
                                 </div>
                                 <p className="text-xs text-slate-500 mt-1">{progress}% uploaded</p>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Uploaded Files */}
                   {media.length > 0 && (
                     <div className="space-y-3">
                       <Label className="flex items-center gap-2">
                         <CheckCircle className="h-4 w-4 text-green-500" />
                         Uploaded Files ({media.length}/5)
                       </Label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {media.map((file, index) => (
                           <div key={index} className="file-item flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:shadow-md transition-all duration-300">
                             <div className="flex items-center gap-3 flex-1 min-w-0">
                               {file.type.startsWith('image/') && imagePreviews[file.name] ? (
                                 <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-green-200 dark:border-green-800">
                                   <img 
                                     src={imagePreviews[file.name]} 
                                     alt={file.name}
                                     className="w-full h-full object-cover"
                                   />
                                 </div>
                               ) : (
                                 <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                   {file.type.startsWith('image/') ? (
                                     <Image className="h-4 w-4 text-green-600 dark:text-green-400" />
                                   ) : file.type.startsWith('video/') ? (
                                     <Video className="h-4 w-4 text-green-600 dark:text-green-400" />
                                   ) : (
                                     <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                   )}
                                 </div>
                               )}
                               <div className="min-w-0 flex-1">
                                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                                 <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                 <div className="flex items-center gap-1 mt-1">
                                   <CheckCircle className="h-3 w-3 text-green-500" />
                                   <span className="text-xs text-green-600 dark:text-green-400">Uploaded</span>
                                 </div>
                               </div>
                             </div>
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => removeFile(index)}
                               className="hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                             >
                               <X className="h-4 w-4" />
                             </Button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                </div>

                {/* Tags */}
                <div className="form-element space-y-3">
                  <Label className="text-lg font-semibold">Add Tags <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500"
                    />
                    <Button type="button" variant="outline" onClick={addTag} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="tag-item flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1 hover:bg-blue-200 dark:hover:bg-blue-800"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                     <Button
                     type="button"
                     onClick={handleSubmit}
                     disabled={isLoading || getFormCompletionPercentage() < 100 || getCurrentContent().length > 2000}
                     className="submit-button flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                   >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    {isLoading ? (
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        <span>Creating Post...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 relative z-10">
                        <Sparkles className="h-6 w-6 animate-pulse" />
                        <span>Create Post</span>
                        <div className="hidden group-hover:block animate-bounce">
                          <Zap className="h-5 w-5" />
                        </div>
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 hover:scale-105"
                  >
                    Cancel
                  </Button>
                </div>
                
                {/* Progress Indicator */}
                                 <div className="mt-4 space-y-2">
                   <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                     <span>Post Progress</span>
                     <span>{getFormCompletionPercentage()}% Complete</span>
                   </div>
                   <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                     <div 
                       className={`h-2 rounded-full transition-all duration-500 ${
                         getFormCompletionPercentage() === 100
                           ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                           : getFormCompletionPercentage() > 50
                             ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                             : 'bg-gradient-to-r from-slate-400 to-slate-500'
                       }`}
                       style={{ width: `${getFormCompletionPercentage()}%` }}
                     ></div>
                   </div>
                 </div>

                 {/* Mobile Progress Status */}
                 <div className="lg:hidden mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Post Status</span>
                     <CheckCircle className="h-4 w-4 text-green-500" />
                   </div>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-600 dark:text-slate-400">Content</span>
                       <div className={`w-3 h-3 rounded-full ${getCurrentContent().trim() ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-600 dark:text-slate-400">Media</span>
                       <div className={`w-3 h-3 rounded-full ${media.length > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-600 dark:text-slate-400">Tags</span>
                       <div className={`w-3 h-3 rounded-full ${tags.length > 0 ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                     </div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div ref={sidebarRef} className="lg:col-span-1 space-y-4 lg:space-y-6 create-post-scroll">
            {/* User Info */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hidden lg:block">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500 animate-pulse" />
                  Posting as
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{user?.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hidden lg:block">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Posting Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <p>Keep content respectful and professional</p>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <p>Use relevant tags for better visibility</p>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <p>Include helpful details for events and jobs</p>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                    <p>Ensure all required fields are filled</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hidden lg:block">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Engagement Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-200">
                    <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p>Ask questions to encourage interaction</p>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-200">
                    <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p>Share personal experiences and insights</p>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-200">
                    <Target className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <p>Use relevant hashtags and mentions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="backdrop-blur-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hidden lg:block">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Post Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                                     <div className="flex items-center justify-between">
                     <span className="text-sm text-slate-600 dark:text-slate-400">Content</span>
                     <div className={`w-3 h-3 rounded-full ${getCurrentContent().trim() ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                   </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Media</span>
                    <div className={`w-3 h-3 rounded-full ${media.length > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Tags</span>
                    <div className={`w-3 h-3 rounded-full ${tags.length > 0 ? 'bg-purple-500' : 'bg-slate-300'}`}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
            size="sm"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
