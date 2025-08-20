import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Shield, AlertTriangle, CheckCircle, XCircle, Filter, Settings, Eye, EyeOff, Ban, Flag } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import api from '../services/api';

interface ContentFilter {
  id: string;
  type: 'keyword' | 'regex' | 'ai';
  pattern: string;
  action: 'block' | 'flag' | 'review';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  createdBy: string;
}

interface ModerationRule {
  id: string;
  name: string;
  description: string;
  type: 'post' | 'comment' | 'message' | 'profile';
  conditions: {
    field: string;
    operator: 'contains' | 'equals' | 'regex' | 'length';
    value: string | number;
  }[];
  action: 'block' | 'flag' | 'review' | 'auto-approve';
  enabled: boolean;
  priority: number;
}

interface FlaggedContent {
  id: string;
  contentType: 'post' | 'comment' | 'message' | 'profile';
  contentId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  flaggedBy: string;
  flaggedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  action?: 'approved' | 'removed' | 'warned';
  notes?: string;
}

const ContentModeration: React.FC = () => {
  const [filters, setFilters] = useState<ContentFilter[]>([]);
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<ContentFilter>>({});
  const [newRule, setNewRule] = useState<Partial<ModerationRule>>({});
  const [moderationSettings, setModerationSettings] = useState({
    autoModeration: true,
    aiModeration: false,
    userReporting: true,
    adminReview: true,
    contentFiltering: 'moderate',
    profanityFilter: true,
    spamDetection: true,
    imageModeration: false
  });

  useEffect(() => {
    loadFilters();
    loadRules();
    loadFlaggedContent();
    loadModerationSettings();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await api.get('/moderation/filters');
      if (response.data.success) {
        setFilters(response.data.filters);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadRules = async () => {
    try {
      const response = await api.get('/moderation/rules');
      if (response.data.success) {
        setRules(response.data.rules);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const loadFlaggedContent = async () => {
    try {
      const response = await api.get('/moderation/flagged');
      if (response.data.success) {
        setFlaggedContent(response.data.flaggedContent);
      }
    } catch (error) {
      console.error('Error loading flagged content:', error);
    }
  };

  const loadModerationSettings = async () => {
    try {
      const response = await api.get('/moderation/settings');
      if (response.data.success) {
        setModerationSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    }
  };

  const addFilter = async () => {
    try {
      const response = await api.post('/moderation/filters', newFilter);
      if (response.data.success) {
        setFilters(prev => [...prev, response.data.filter]);
        setNewFilter({});
        setShowAddFilter(false);
        toast({
          title: "Success",
          description: "Content filter added successfully",
        });
      }
    } catch (error) {
      console.error('Error adding filter:', error);
      toast({
        title: "Error",
        description: "Failed to add filter",
        variant: "destructive",
      });
    }
  };

  const addRule = async () => {
    try {
      const response = await api.post('/moderation/rules', newRule);
      if (response.data.success) {
        setRules(prev => [...prev, response.data.rule]);
        setNewRule({});
        setShowAddRule(false);
        toast({
          title: "Success",
          description: "Moderation rule added successfully",
        });
      }
    } catch (error) {
      console.error('Error adding rule:', error);
      toast({
        title: "Error",
        description: "Failed to add rule",
        variant: "destructive",
      });
    }
  };

  const toggleFilter = async (filterId: string, enabled: boolean) => {
    try {
      await api.put(`/moderation/filters/${filterId}`, { enabled });
      setFilters(prev => prev.map(f => 
        f.id === filterId ? { ...f, enabled } : f
      ));
    } catch (error) {
      console.error('Error toggling filter:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await api.put(`/moderation/rules/${ruleId}`, { enabled });
      setRules(prev => prev.map(r => 
        r.id === ruleId ? { ...r, enabled } : r
      ));
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteFilter = async (filterId: string) => {
    try {
      await api.delete(`/moderation/filters/${filterId}`);
      setFilters(prev => prev.filter(f => f.id !== filterId));
      toast({
        title: "Success",
        description: "Filter deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast({
        title: "Error",
        description: "Failed to delete filter",
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      await api.delete(`/moderation/rules/${ruleId}`);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const reviewFlaggedContent = async (flaggedId: string, action: string, notes?: string) => {
    try {
      const response = await api.put(`/moderation/flagged/${flaggedId}`, {
        action,
        notes,
        reviewedBy: 'current-user-id', // This should come from auth context
        reviewedAt: new Date().toISOString()
      });

      if (response.data.success) {
        setFlaggedContent(prev => prev.map(f => 
          f.id === flaggedId 
            ? { ...f, status: 'reviewed', action: action as any, notes, reviewedAt: new Date().toISOString() }
            : f
        ));
        
        toast({
          title: "Success",
          description: `Content ${action} successfully`,
        });
      }
    } catch (error) {
      console.error('Error reviewing flagged content:', error);
      toast({
        title: "Error",
        description: "Failed to review content",
        variant: "destructive",
      });
    }
  };

  const updateModerationSettings = async (updates: Partial<typeof moderationSettings>) => {
    try {
      const response = await api.put('/moderation/settings', updates);
      if (response.data.success) {
        setModerationSettings(prev => ({ ...prev, ...updates }));
        toast({
          title: "Success",
          description: "Moderation settings updated",
        });
      }
    } catch (error) {
      console.error('Error updating moderation settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Content Moderation</h1>
            <p className="text-muted-foreground">
              Manage content filters, rules, and flagged content
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {flaggedContent.filter(f => f.status === 'pending').length} pending review
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="filters">Content Filters</TabsTrigger>
          <TabsTrigger value="rules">Moderation Rules</TabsTrigger>
          <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Content Filters</h3>
            <Button onClick={() => setShowAddFilter(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>

          {showAddFilter && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Filter Type</Label>
                    <Select
                      value={newFilter.type}
                      onValueChange={(value) => setNewFilter(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyword">Keyword</SelectItem>
                        <SelectItem value="regex">Regex Pattern</SelectItem>
                        <SelectItem value="ai">AI Detection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Action</Label>
                    <Select
                      value={newFilter.action}
                      onValueChange={(value) => setNewFilter(prev => ({ ...prev, action: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Pattern/Keywords</Label>
                    <Input
                      value={newFilter.pattern || ''}
                      onChange={(e) => setNewFilter(prev => ({ ...prev, pattern: e.target.value }))}
                      placeholder="Enter pattern or keywords"
                    />
                  </div>
                  
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={newFilter.severity}
                      onValueChange={(value) => setNewFilter(prev => ({ ...prev, severity: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddFilter(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addFilter}>
                    Add Filter
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filters.map((filter) => (
              <Card key={filter.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={filter.enabled}
                          onCheckedChange={(enabled) => toggleFilter(filter.id, enabled)}
                        />
                        <Label>{filter.enabled ? 'Enabled' : 'Disabled'}</Label>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{filter.type}</span>
                          <Badge variant="outline">{filter.action}</Badge>
                          <Badge className={getSeverityColor(filter.severity)}>
                            {filter.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pattern: {filter.pattern}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFilter(filter.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Moderation Rules</h3>
            <Button onClick={() => setShowAddRule(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {showAddRule && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={newRule.name || ''}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <Label>Content Type</Label>
                    <Select
                      value={newRule.type}
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="comment">Comment</SelectItem>
                        <SelectItem value="message">Message</SelectItem>
                        <SelectItem value="profile">Profile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Action</Label>
                    <Select
                      value={newRule.action}
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, action: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="auto-approve">Auto-approve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={newRule.priority || 1}
                      onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label>Description</Label>
                  <Textarea
                    value={newRule.description || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the rule and its purpose"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddRule(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addRule}>
                    Add Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                        />
                        <Label>{rule.enabled ? 'Enabled' : 'Disabled'}</Label>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{rule.name}</span>
                          <Badge variant="outline">{rule.type}</Badge>
                          <Badge variant="outline">{rule.action}</Badge>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          <h3 className="text-lg font-medium">Flagged Content</h3>
          
          <div className="grid gap-4">
            {flaggedContent.map((flagged) => (
              <Card key={flagged.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getSeverityColor(flagged.severity)}>
                          {flagged.severity}
                        </Badge>
                        <Badge className={getStatusColor(flagged.status)}>
                          {flagged.status}
                        </Badge>
                        <Badge variant="outline">{flagged.contentType}</Badge>
                      </div>
                      
                      <p className="font-medium mb-1">Reason: {flagged.reason}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Flagged by: {flagged.flaggedBy} • {new Date(flagged.flaggedAt).toLocaleDateString()}
                      </p>
                      
                      {flagged.notes && (
                        <p className="text-sm bg-muted p-2 rounded">
                          <strong>Notes:</strong> {flagged.notes}
                        </p>
                      )}
                    </div>
                    
                    {flagged.status === 'pending' && (
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reviewFlaggedContent(flagged.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reviewFlaggedContent(flagged.id, 'removed')}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reviewFlaggedContent(flagged.id, 'warned')}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Warn
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <h3 className="text-lg font-medium">Moderation Settings</h3>
          
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">General Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically apply filters and rules to new content
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.autoModeration}
                    onCheckedChange={(checked) => updateModerationSettings({ autoModeration: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Use AI to detect inappropriate content
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.aiModeration}
                    onCheckedChange={(checked) => updateModerationSettings({ aiModeration: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>User Reporting</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to report inappropriate content
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.userReporting}
                    onCheckedChange={(checked) => updateModerationSettings({ userReporting: checked })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Content Filtering</h4>
                
                <div>
                  <Label>Filtering Level</Label>
                  <Select
                    value={moderationSettings.contentFiltering}
                    onValueChange={(value) => updateModerationSettings({ contentFiltering: value })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Strict</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="lenient">Lenient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Profanity Filter</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter out profane language
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.profanityFilter}
                    onCheckedChange={(checked) => updateModerationSettings({ profanityFilter: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Spam Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and prevent spam content
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.spamDetection}
                    onCheckedChange={(checked) => updateModerationSettings({ spamDetection: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Image Moderation</Label>
                    <p className="text-sm text-muted-foreground">
                      Scan images for inappropriate content
                    </p>
                  </div>
                  <Switch
                    checked={moderationSettings.imageModeration}
                    onCheckedChange={(checked) => updateModerationSettings({ imageModeration: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentModeration;
