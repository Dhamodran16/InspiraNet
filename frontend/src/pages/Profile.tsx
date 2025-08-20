import React, { useState } from 'react';
import ProfileForm from '../components/profile/ProfileForm';
import ProfileDisplay from '../components/profile/ProfileDisplay';
import { Button } from '../components/ui/button';
import { Edit, Eye } from 'lucide-react';

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            {isEditing ? (
              <>
                <Eye className="h-4 w-4" />
                View Profile
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        {/* Profile Content */}
        <div className="overflow-y-auto">
          {isEditing ? (
            <ProfileForm />
          ) : (
            <ProfileDisplay 
              isOwnProfile={true} 
              onEdit={() => setIsEditing(true)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;




