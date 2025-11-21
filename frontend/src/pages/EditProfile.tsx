import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Building } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const EditProfile = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CollegeHeader />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-blue-800">
                <User className="h-6 w-6 text-blue-600" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">
                This page is under development. Profile editing functionality will be available soon.
              </p>
              
              <div className="flex justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default EditProfile;
