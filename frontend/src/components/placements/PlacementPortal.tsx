import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Calendar, MapPin, IndianRupee, Users, Star, Clock, CheckCircle, Plus, Loader2, Search, Filter, FileText, Trash2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Linkify from "@/components/ui/Linkify";
import ShareModal from "@/components/ui/ShareModal";
import { uploadResumeToCloudinary } from "@/services/cloudinary";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import api from "@/services/api";

interface PlacementExperience {
  _id?: string;
  studentName: string;
  company: string;
  position: string;
  interviewDate: string;
  rounds: string[];
  result: string;
  package: string;
  feedback: string;
  skills: string;
  resume?: string;
  batch: string;
  department?: string;
  createdAt?: string;
  // Enhanced fields
  companyType?: 'startup' | 'midsize' | 'enterprise' | 'government';
  companySize?: '1-50' | '51-200' | '201-1000' | '1000+';
  workMode?: 'on-site' | 'remote' | 'hybrid';
  location?: string;
  experienceRequired?: string;
  interviewDifficulty?: 'easy' | 'medium' | 'hard' | 'very-hard';
  preparationTime?: string;
  interviewDuration?: string;
  totalCandidates?: number;
  selectedCandidates?: number;
  selectionRate?: number;
  benefits?: string[];
  workCulture?: string;
  growthOpportunities?: string;
  challenges?: string;
  tips?: string;
  rating?: number;
  averageRating?: number;
  totalRatings?: number;
  student?: {
    _id: string;
    name: string;
    avatar: string;
    bio: string;
    batch: string;
    department: string;
    type: string;
  };
}

export default function PlacementPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterCompanyType, setFilterCompanyType] = useState("");
  const [filterPackage, setFilterPackage] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isRating, setIsRating] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shareData, setShareData] = useState<{ url: string; title: string; text: string; imageUrl?: string } | null>(null);
  const [sharingExperienceId, setSharingExperienceId] = useState<string | null>(null);

  const [newExperience, setNewExperience] = useState<PlacementExperience>({
    studentName: user?.name || "",
    company: "",
    position: "",
    rounds: [],
    interviewDate: new Date().toISOString().split('T')[0],
    result: "",
    package: "",
    feedback: "",
    skills: "",
    resume: undefined,
    batch: user?.studentInfo?.batch || user?.batch || "2024",
    department: user?.department || user?.studentInfo?.department || "",
    // Enhanced fields
    companyType: "enterprise",
    companySize: "1000+",
    workMode: "on-site",
    location: "",
    experienceRequired: "",
    interviewDifficulty: "medium",
    preparationTime: "",
    interviewDuration: "",
    totalCandidates: 0,
    selectedCandidates: 0,
    selectionRate: 0,
    benefits: [],
    growthOpportunities: "",
    challenges: "",
    tips: "",
    rating: 5
  });

  const [interviewHistory, setInterviewHistory] = useState<PlacementExperience[]>([]);

  useEffect(() => {
    loadPlacementExperiences();
  }, []);

  // Handle Deep Linking - scroll to specific experience
  useEffect(() => {
    if (interviewHistory.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const experienceId = params.get('id');
      if (experienceId) {
        setTimeout(() => {
          const element = document.getElementById(`experience-${experienceId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-glow-active');
            setTimeout(() => {
              element.classList.remove('highlight-glow-active');
            }, 5000);
          }
        }, 800);
      }
    }
  }, [interviewHistory.length]);

  // Real-time filtering - trigger when any filter changes
  useEffect(() => {
    // This will trigger re-render with filtered results
    // The filtering logic is already in the render function
  }, [searchTerm, filterCompany, filterResult, filterCompanyType, filterPackage, filterBatch]);

  const loadPlacementExperiences = async () => {
    try {
      setIsLoading(true);
      // Load from MongoDB via API
      const response = await api.get('/api/placements');

      if (response.data) {
        const data = response.data;
        setInterviewHistory(data.experiences || []);
      } else {
        console.error('Failed to load placement experiences');
        setInterviewHistory([]);
      }
    } catch (error) {
      console.error('Error loading placement experiences:', error);
      toast({
        title: "Error",
        description: "Failed to load placement experiences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?._id) {
      toast({
        title: "Error",
        description: "Please log in to add your experience",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const experienceData: PlacementExperience = {
        ...newExperience,
        studentName: newExperience.studentName || user.name,
        batch: newExperience.batch || user.studentInfo?.batch || user.batch || "2024",
        department: newExperience.department ||
          user.department ||
          user.studentInfo?.department ||
          user.facultyInfo?.department ||
          "Unknown Department",
        rounds: newExperience.rounds,
        interviewDate: newExperience.interviewDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save to MongoDB via API
      const response = await api.post('/api/placements', experienceData);

      if (response.data) {
        const savedExperience = response.data;
        setInterviewHistory(prev => [savedExperience.experience, ...prev]);
      } else {
        throw new Error('Failed to save experience to database');
      }

      setShowAddExperience(false);
      setNewExperience({
        studentName: user.name || "",
        company: "",
        position: "",
        rounds: [],
        interviewDate: new Date().toISOString().split('T')[0],
        result: "",
        package: "",
        feedback: "",
        skills: "",
        resume: undefined,
        batch: user.batch || "",
        department: user.department || user.studentInfo?.department || ""
      });

      toast({
        title: "Experience Added!",
        description: "Your interview experience has been successfully added.",
      });
    } catch (error) {
      console.error('Error adding experience:', error);
      toast({
        title: "Error",
        description: "Failed to add experience. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExperience = async (experienceId: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/placements/${experienceId}`);
      setInterviewHistory(prev => prev.filter(exp => exp._id !== experienceId));
      setDeleteConfirmId(null);
      toast({
        title: "Success",
        description: "Experience deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting experience:', error);
      toast({
        title: "Error",
        description: "Failed to delete experience",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (experienceId: string, rating: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to rate experiences",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRating(experienceId);
      const response = await api.post(`/api/placements/${experienceId}/rate`, { rating });

      if (response.data) {
        setInterviewHistory(prev => prev.map(exp =>
          exp._id === experienceId
            ? { ...exp, averageRating: response.data.averageRating, totalRatings: response.data.totalRatings }
            : exp
        ));

        toast({
          title: "Rating Submitted",
          description: "Thank you for your feedback!",
        });
      }
    } catch (error) {
      console.error('Error rating experience:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setIsRating(null);
    }
  };

  const handleShare = (experience: PlacementExperience) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/placements/${experience._id}`;
    const shareTitle = `Interview Experience at ${experience.company}`;
    const shareText = `${experience.student?.name || experience.studentName} shared their ${experience.position} interview experience at ${experience.company} — Result: ${experience.result}. Check it out on InspiraNet!`;

    // Glow the card being shared
    setSharingExperienceId(experience._id || null);
    setShareData({
      url: shareUrl,
      title: shareTitle,
      text: shareText
    });
  };

  const handleShareClose = () => {
    setSharingExperienceId(null);
    setShareData(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link Copied!",
      description: "The shareable link has been copied to your clipboard.",
    });
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const resumeUrl = await uploadResumeToCloudinary(file);
      setNewExperience(prev => ({
        ...prev,
        resume: resumeUrl
      }));

      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been uploaded and saved.",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredAndSortedExperiences = interviewHistory
    .filter(experience => {
      // Search filter
      const matchesSearch = !searchTerm ||
        experience.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        experience.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        experience.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        experience.skills.toLowerCase().includes(searchTerm.toLowerCase());

      // Company filter
      const matchesCompany = !filterCompany ||
        experience.company.toLowerCase().includes(filterCompany.toLowerCase());

      // Result filter
      const matchesResult = !filterResult ||
        experience.result.toLowerCase() === filterResult.toLowerCase();

      // Company type filter
      const matchesCompanyType = !filterCompanyType ||
        experience.companyType === filterCompanyType;

      // Package filter
      const matchesPackage = !filterPackage ||
        experience.package.toLowerCase().includes(filterPackage.toLowerCase());

      // Batch filter
      const matchesBatch = !filterBatch ||
        experience.batch === filterBatch;

      return matchesSearch && matchesCompany && matchesResult &&
        matchesCompanyType && matchesPackage && matchesBatch;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime();
          break;
        case 'package':
          const aPackage = parseFloat(a.package.replace(/[^\d.]/g, '')) || 0;
          const bPackage = parseFloat(b.package.replace(/[^\d.]/g, '')) || 0;
          comparison = aPackage - bPackage;
          break;
        case 'company':
          comparison = a.company.localeCompare(b.company);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getUniqueCompanies = () => {
    const companies = interviewHistory.map(exp => exp.company);
    return [...new Set(companies)];
  };

  const getUniqueResults = () => {
    const results = interviewHistory.map(exp => exp.result);
    return [...new Set(results)];
  };

  const getUniqueBatches = () => {
    const batches = interviewHistory.map(exp => exp.batch);
    return [...new Set(batches)].sort();
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Placement Experience Portal
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Explore interview experiences and success stories from fellow alumni
        </p>
      </div>

      {/* Enhanced Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by company, position, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company-filter">Company</Label>
              <select
                id="company-filter"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
              >
                <option value="">All Companies</option>
                {getUniqueCompanies().map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="result-filter">Result</Label>
              <select
                id="result-filter"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
              >
                <option value="">All Results</option>
                {getUniqueResults().map(result => (
                  <option key={result} value={result}>{result}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="company-type-filter">Company Type</Label>
              <select
                id="company-type-filter"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={filterCompanyType}
                onChange={(e) => setFilterCompanyType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="startup">Startup</option>
                <option value="midsize">Midsize</option>
                <option value="enterprise">Enterprise</option>
                <option value="government">Government</option>
              </select>
            </div>
            <div>
              <Label htmlFor="batch-filter">Batch</Label>
              <select
                id="batch-filter"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={filterBatch || ''}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {getUniqueBatches().map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="package-filter">Package Range</Label>
              <Input
                id="package-filter"
                placeholder="e.g., 15 LPA"
                value={filterPackage}
                onChange={(e) => setFilterPackage(e.target.value)}
              />
            </div>
          </div>

          {/* Sorting and Clear Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sort-by">Sort By</Label>
              <select
                id="sort-by"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Interview Date</option>
                <option value="package">Package</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sort-order">Order</Label>
              <select
                id="sort-order"
                className="w-full p-2 border rounded-md bg-background text-foreground border-border"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCompany("");
                  setFilterResult("");
                  setFilterCompanyType("");
                  setFilterPackage("");
                  setFilterBatch("");
                }}
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience Display Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Interview Experiences
              </CardTitle>
              <CardDescription>
                Learn from previous interview experiences and success stories
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddExperience(true)} disabled={!user} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedExperiences.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No experiences found</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchTerm || filterCompany || filterResult || filterCompanyType || filterPackage || filterBatch
                  ? "Try adjusting your search or filters"
                  : "Be the first to share your interview experience!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedExperiences.map((record) => (
                <Card
                  key={record._id}
                  id={`experience-${record._id}`}
                  className={`p-3 sm:p-4 overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-all duration-500 rounded-xl ${sharingExperienceId === record._id ? 'highlight-glow-active' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        {record.student?.avatar ? (
                          <AvatarImage src={record.student.avatar} alt={record.student.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                          {(record.student?.name || record.studentName)?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-xl text-foreground leading-tight">
                          {record.student?.name || record.studentName}
                        </h3>
                        {record.student?.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px] sm:max-w-[250px] mb-0.5 italic">
                            {record.student.bio}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider h-5 px-1.5 shrink-0">
                            Batch {record.student?.batch || record.batch}
                          </Badge>
                          {(record.student?.department || record.department) && (
                            <span className="opacity-80 leading-tight">
                              {record.student?.department || record.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-3 border-t sm:border-0 pt-3 sm:pt-0">
                      <div className="flex flex-col items-start sm:items-end">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 cursor-pointer transition-all hover:scale-110 ${star <= Math.round(record.averageRating || record.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                                } ${isRating === record._id ? "opacity-30" : ""}`}
                              onClick={() => record._id && handleRate(record._id, star)}
                            />
                          ))}
                          {isRating === record._id && <Loader2 className="h-3 w-3 animate-spin ml-1 text-muted-foreground" />}
                        </div>
                        {(record.totalRatings || 0) > 1 && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {record.totalRatings} ratings • {record.averageRating?.toFixed(1)} avg
                          </span>
                        )}
                      </div>
                      <Badge className={record.result === "Selected" ? "bg-green-600 hover:bg-green-700" : "bg-gray-500"}>
                        {record.result === "Selected" ? (
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        ) : null}
                        {record.result}
                      </Badge>
                      {user?._id === record.student?._id && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(record)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Share Experience"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => record._id && setDeleteConfirmId(record._id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete Experience"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) || (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(record)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Share Experience"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>



                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-muted/10 p-3 rounded-lg border border-primary/5">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">{record.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">{record.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">
                        {record.interviewDate ? record.interviewDate.split('T')[0] : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-primary">{record.package}</span>
                    </div>
                  </div>

                  {/* Enhanced Information Grid */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3.5 bg-muted/20 border border-muted rounded-xl bg-gradient-to-br from-muted/30 to-transparent">
                    {record.companyType && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Company Type</span>
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-primary/60" />
                          <Badge variant="secondary" className="text-xs py-0 h-5">
                            {record.companyType}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {record.workMode && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Work Mode</span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-primary/60" />
                          <Badge variant="secondary" className="text-xs py-0 h-5">
                            {record.workMode}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {record.interviewDifficulty && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Difficulty</span>
                        <div className="flex items-center gap-2">
                          <Star className="h-3.5 w-3.5 text-primary/60" />
                          <Badge
                            variant={record.interviewDifficulty === 'easy' ? 'secondary' :
                              record.interviewDifficulty === 'medium' ? 'default' :
                                'destructive'}
                            className="text-xs py-0 h-5"
                          >
                            {record.interviewDifficulty}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {record.location && (
                      <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Location</span>
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary/60" />
                          <span className="truncate">{record.location}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <h4 className="font-medium mb-2">Interview Rounds:</h4>
                    <div className="flex flex-wrap gap-1">
                      {record.rounds.map((round, index) => (
                        <Badge key={index} variant="outline">
                          {round}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {record.skills && (
                    <div className="mb-3">
                      <h4 className="font-medium mb-1">Skills Required:</h4>
                      <p className="text-sm text-muted-foreground">{record.skills}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-1">Feedback:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      <Linkify text={record.feedback} />
                    </p>
                  </div>

                  {/* Additional Useful Information */}
                  {(record.benefits?.length || record.workCulture || record.growthOpportunities || record.challenges || record.tips) && (
                    <div className="mt-4 p-2.5 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                      <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">Additional Insights</h4>
                      <div className="space-y-2">
                        {record.benefits && record.benefits.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Benefits: </span>
                            <span className="text-xs text-muted-foreground">{record.benefits.join(', ')}</span>
                          </div>
                        )}
                        {record.workCulture && (
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Work Culture: </span>
                            <span className="text-xs text-muted-foreground">{record.workCulture}</span>
                          </div>
                        )}
                        {record.growthOpportunities && (
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Growth: </span>
                            <span className="text-xs text-muted-foreground">{record.growthOpportunities}</span>
                          </div>
                        )}
                        {record.challenges && (
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Challenges: </span>
                            <span className="text-xs text-muted-foreground">{record.challenges}</span>
                          </div>
                        )}
                        {record.tips && (
                          <div>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Tips: </span>
                            <span className="text-xs text-muted-foreground">{record.tips}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attached Files Display - Icon Only */}
                  {record.resume && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Attachments
                      </h4>
                      <div
                        onClick={() => record.resume && setSelectedFile(record.resume)}
                        className="inline-flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group w-full sm:w-auto"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">View Attached File</span>
                          <span className="text-[10px] text-muted-foreground uppercase opacity-70">
                            {record.resume.split('.').pop()?.toUpperCase() || 'DOCUMENT'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
          }
        </CardContent >
      </Card >

      {/* Add Experience Dialog */}
      {
        showAddExperience && (
          <Dialog open={showAddExperience} onOpenChange={setShowAddExperience}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl">Add Interview Experience</DialogTitle>
                <CardDescription>Share your journey and help others succeed</CardDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                <form onSubmit={handleAddExperience} className="space-y-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 p-4 bg-muted/30 rounded-xl border border-muted ring-offset-background transition-colors focus-within:bg-muted/50">
                      <Label className="text-base font-semibold mb-3 block">Overall Rating</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-10 w-10 cursor-pointer transition-all hover:scale-110 active:scale-95 ${star <= (newExperience.rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-200"
                              }`}
                            onClick={() => setNewExperience(prev => ({ ...prev, rating: star }))}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="e.g. Google, Microsoft"
                        className="h-11"
                        required
                        value={newExperience.company}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interviewDate">Interview Date</Label>
                      <Input
                        id="interviewDate"
                        type="date"
                        className="h-11"
                        required
                        value={newExperience.interviewDate}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, interviewDate: e.target.value }))}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="position">Position / Role</Label>
                      <Input
                        id="position"
                        placeholder="e.g. Software Engineer, Associate Product Manager"
                        className="h-11"
                        required
                        value={newExperience.position}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rounds">Interview Rounds</Label>
                    <Input
                      id="rounds"
                      placeholder="e.g. OA, Technical Round 1, System Design, HR"
                      className="h-11"
                      required
                      value={newExperience.rounds.join(', ')}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, rounds: e.target.value.split(',').map(r => r.trim()) }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="result">Status / Result</Label>
                      <select
                        id="result"
                        className="w-full h-11 px-3 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        required
                        value={newExperience.result}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, result: e.target.value }))}
                      >
                        <option value="">Select Result</option>
                        <option value="Selected">Selected</option>
                        <option value="Not Selected">Not Selected</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="package">Annual Package</Label>
                      <Input
                        id="package"
                        placeholder="e.g. ₹15 LPA"
                        className="h-11"
                        value={newExperience.package}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, package: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Key Skills Evaluated</Label>
                    <Textarea
                      id="skills"
                      placeholder="e.g. Data Structures, React, Node.js, Problem Solving"
                      className="min-h-[80px]"
                      value={newExperience.skills}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, skills: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedback">Detailed Experience & Tips</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Share your preparation strategy, questions asked, and advice for juniors..."
                      required
                      className="min-h-[150px]"
                      value={newExperience.feedback}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, feedback: e.target.value }))}
                    />
                  </div>

                  <div className="p-4 bg-muted/20 border border-dashed border-muted rounded-xl">
                    <Label htmlFor="resume" className="mb-2 block">Upload Reference / Resume (Optional)</Label>
                    <Input
                      id="resume"
                      type="file"
                      className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleResumeUpload}
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground font-medium">Processing file...</span>
                      </div>
                    )}
                    {newExperience.resume && (
                      <p className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> File attached successfully
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background/80 backdrop-blur-sm mt-4">
                    <Button type="submit" className="flex-1 h-12 text-base shadow-lg" disabled={isLoading || isUploading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Posting...
                        </>
                      ) : (
                        'Post Experience'
                      )}
                    </Button>
                    <Button type="button" variant="outline" className="h-12 px-8" onClick={() => setShowAddExperience(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      {/* File Viewer Modal */}
      {
        selectedFile && (
          <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
            <DialogContent className="max-w-6xl w-[95vw] h-[90vh] md:h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-4 sm:p-5 border-b bg-background/95 backdrop-blur shrink-0">
                <DialogTitle className="flex justify-between items-center text-lg sm:text-xl font-bold">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>File Preview</span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-hidden p-2 sm:p-6 flex items-center justify-center bg-slate-900/5 dark:bg-slate-50/5 relative">
                {selectedFile.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? (
                  <img
                    src={selectedFile}
                    alt="Attachment preview"
                    className="max-w-full max-h-full object-contain shadow-2xl rounded-md transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full relative rounded-lg overflow-hidden border shadow-inner bg-white">
                    <iframe
                      src={selectedFile}
                      title="Document Preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t bg-background flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <p className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">
                  {selectedFile}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedFile, '_blank')}
                    className="flex-1 sm:flex-none"
                  >
                    Open in New Tab
                  </Button>
                  <Button
                    onClick={() => setSelectedFile(null)}
                    className="flex-1 sm:flex-none shadow-lg"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
              <Trash2 className="h-5 w-5" />
              Delete Experience
            </DialogTitle>
            <CardDescription className="pt-2 text-base">
              Are you sure you want to delete this placement experience? This action cannot be undone and the post will be removed forever.
            </CardDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="px-6">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteExperience(deleteConfirmId)}
              disabled={isLoading}
              className="px-6"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Share Modal */}
      <ShareModal
        open={!!shareData}
        onClose={handleShareClose}
        shareData={shareData}
      />
    </div >
  );
}
