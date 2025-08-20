import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, X, Upload } from 'lucide-react';
import api from '@/services/api';

interface ProfileFormProps {
  onSave?: () => void;
  onCancel?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onSave, onCancel }) => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: {
      college: user?.email?.college || '',
      personal: user?.email?.personal || ''
    },
    department: user?.department || '',
    batch: user?.batch || '',
    avatar: user?.avatar || ''
  });

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.put('/api/users/profile', formData);
      
      if (response.data.success) {
        updateUser(response.data.user);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully!",
        });
        onSave?.();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={formData.avatar} />
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          Edit Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={formData.avatar} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="college-email">College Email</Label>
              <Input
                id="college-email"
                type="email"
                value={formData.email.college}
                onChange={(e) => handleInputChange('email.college', e.target.value)}
                placeholder="college@example.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-email">Personal Email</Label>
              <Input
                id="personal-email"
                type="email"
                value={formData.email.personal}
                onChange={(e) => handleInputChange('email.personal', e.target.value)}
                placeholder="personal@example.com"
              />
            </div>
          </div>

          {/* Department and Batch */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch">Batch/Year</Label>
              <Input
                id="batch"
                value={formData.batch}
                onChange={(e) => handleInputChange('batch', e.target.value)}
                placeholder="2020"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileForm;
