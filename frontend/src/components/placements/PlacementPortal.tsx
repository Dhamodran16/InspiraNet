import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Calendar, MapPin, DollarSign, Users, Star, Clock, CheckCircle, Plus, Loader2, Search, Filter, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { uploadResumeToCloudinary } from "@/services/cloudinary";
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
  
  const [newExperience, setNewExperience] = useState<PlacementExperience>({
    studentName: user?.name || "",
    company: "",
    position: "",
    rounds: [],
    interviewDate: "",
    result: "",
    package: "",
    feedback: "",
    skills: "",
    resume: undefined,
    batch: user?.batch || "",
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
    workCulture: "",
    growthOpportunities: "",
    challenges: "",
    tips: ""
  });

  const [interviewHistory, setInterviewHistory] = useState<PlacementExperience[]>([]);

  useEffect(() => {
    loadPlacementExperiences();
  }, []);

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
        studentName: user.name,
        batch: user.batch || "2024",
        department: user.department || 
                   user.studentInfo?.department || 
                   user.facultyInfo?.department || 
                   "Unknown Department",
        rounds: newExperience.rounds,
        interviewDate: new Date().toISOString().split('T')[0],
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
        studentName: user.name,
        company: "",
        position: "",
        rounds: [],
        interviewDate: "",
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">Placement</h1>
        <p className="text-lg text-muted-foreground">
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Interview Experiences
              </CardTitle>
              <CardDescription>
                Learn from previous interview experiences and success stories
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddExperience(true)} disabled={!user}>
              <Plus className="h-4 w-4 mr-2" />
              Add Experience
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedExperiences.length === 0 ? (
            <div className="text-center py-12">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No experiences found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCompany || filterResult || filterCompanyType || filterPackage || filterBatch
                  ? "Try adjusting your search or filters" 
                  : "Be the first to share your interview experience!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedExperiences.map((record) => (
                <Card key={record._id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{record.studentName}</h3>
                      <p className="text-sm text-muted-foreground">Batch {record.batch}</p>
                      {record.department && (
                        <p className="text-sm text-muted-foreground">{record.department}</p>
                      )}
                    </div>
                    <Badge variant={record.result === "Selected" ? "default" : "secondary"}>
                      {record.result === "Selected" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : null}
                      {record.result}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{record.company}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{record.position}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{record.interviewDate}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{record.package}</span>
                    </div>
                  </div>

                  {/* Enhanced Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 bg-muted/30 rounded-lg">
                    {record.companyType && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {record.companyType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Company Type</span>
                      </div>
                    )}
                    {record.workMode && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {record.workMode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Work Mode</span>
                      </div>
                    )}
                    {record.interviewDifficulty && (
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={record.interviewDifficulty === 'easy' ? 'default' : 
                                 record.interviewDifficulty === 'medium' ? 'secondary' :
                                 record.interviewDifficulty === 'hard' ? 'destructive' : 'destructive'}
                          className="text-xs"
                        >
                          {record.interviewDifficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Difficulty</span>
                      </div>
                    )}
                    {record.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{record.location}</span>
                      </div>
                    )}
                    {record.experienceRequired && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{record.experienceRequired}</span>
                      </div>
                    )}
                    {record.selectionRate && (
                      <div className="flex items-center space-x-2">
                        <Star className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{record.selectionRate}% selection rate</span>
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
                    <p className="text-sm text-muted-foreground">{record.feedback}</p>
                  </div>

                  {/* Additional Useful Information */}
                  {(record.benefits?.length || record.workCulture || record.growthOpportunities || record.challenges || record.tips) && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
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
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Experience Dialog */}
      {showAddExperience && (
        <Dialog open={showAddExperience} onOpenChange={setShowAddExperience}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Interview Experience</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAddExperience} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input 
                    id="company" 
                    placeholder="Company name" 
                    required
                    value={newExperience.company}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input 
                    id="position" 
                    placeholder="Job position" 
                    required
                    value={newExperience.position}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, position: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="rounds">Interview Rounds</Label>
                <Input 
                  id="rounds" 
                  placeholder="e.g., Technical, HR, System Design" 
                  required
                  value={newExperience.rounds.join(', ')}
                  onChange={(e) => setNewExperience(prev => ({ ...prev, rounds: e.target.value.split(',').map(r => r.trim()) }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="result">Result</Label>
                  <select
                    id="result"
                    className="w-full p-2 border rounded-md"
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
                <div>
                  <Label htmlFor="package">Package</Label>
                  <Input 
                    id="package" 
                    placeholder="e.g., ₹15 LPA" 
                    value={newExperience.package}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, package: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="skills">Skills Required</Label>
                <Textarea 
                  id="skills" 
                  placeholder="List the skills that were important" 
                  value={newExperience.skills}
                  onChange={(e) => setNewExperience(prev => ({ ...prev, skills: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="feedback">Feedback & Experience</Label>
                <Textarea 
                  id="feedback" 
                  placeholder="Share your interview experience and tips" 
                  required
                  value={newExperience.feedback}
                  onChange={(e) => setNewExperience(prev => ({ ...prev, feedback: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="resume">Resume (Optional)</Label>
                <Input 
                  id="resume" 
                  type="file" 
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
                  onChange={handleResumeUpload}
                />
                {isUploading && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading resume...</span>
                  </div>
                )}
                {newExperience.resume && (
                  <p className="text-sm text-green-600 mt-1">✓ Resume uploaded successfully</p>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Experience'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddExperience(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
