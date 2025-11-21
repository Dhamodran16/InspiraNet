import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileDisplay from '../components/profile/ProfileDisplay';
import { Button } from '../components/ui/button';
import { Edit } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <Button
            onClick={() => navigate('/profile/edit')}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        {/* Profile Content */}
        <div>
          <ProfileDisplay 
            isOwnProfile={true} 
            onEdit={() => navigate('/profile/edit')} 
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;




