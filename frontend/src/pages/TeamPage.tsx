import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const TeamPage = () => {
  const staffMembers = [
    {
      name: "Mrs.Senthilvadivu K",
      role: "Assistant Professor",
      subRole: "Staff Incharge",
      phone: "9500785698",
      email: "senthilvadivu.ai@kongu.edu"
    }
  ];

  const studentMembers = [
    {
      name: "Dhanashri R",
      rollNumber: "23ALR017",
      role: "Web Developer",
      phone: "6374564418",
      email: "dhanashrir2006@gmail.com"
    },
    {
      name: "Dhamodraprasath CM",
      rollNumber: "23ALR016",
      role: "Web Developer",
      phone: "9363116156",
      email: "dhamodran17@gmail.com"
    },
    {
      name: "Boobalan J",
      rollNumber: "23ALR010",
      role: "Web Developer",
      phone: "9360516153",
      email: "boobalan25012006@gmail.com"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <CollegeHeader showNav={false} />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Page Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Beyond Bonds</h1>
          <p className="text-lg text-gray-600">Development Team</p>
        </div>

        {/* Staff Members Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-blue-800 text-center mb-8">STAFF MEMBERS</h2>
          <div className="flex justify-center">
            {staffMembers.map((member, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 border border-gray-200">
                <CardHeader className="text-center pb-3">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-bold text-blue-800">{member.name}</CardTitle>
                  <p className="text-sm text-gray-700">{member.role}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-left px-6 pb-6">
                  {member.subRole && (
                    <p className="text-sm text-green-700 font-semibold">{member.subRole}</p>
                  )}
                  {member.phone && (
                    <p className="text-sm text-gray-700">{member.phone}</p>
                  )}
                  {member.email && (
                    <p className="text-sm text-gray-700">{member.email}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Student Members Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-blue-800 text-center mb-8">STUDENT MEMBERS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentMembers.map((member, index) => (
              <Card key={index} className="transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100 hover:-translate-y-1">
                <CardHeader className="text-center pb-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-lg font-bold text-blue-800">{member.name}</CardTitle>
                  <p className="text-sm text-gray-700">Roll No: {member.rollNumber}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-left px-6 pb-6">
                  <p className="text-sm text-green-700 font-semibold">{member.role}</p>
                  {member.phone && (
                    <p className="text-sm text-gray-700">{member.phone}</p>
                  )}
                  {member.email && (
                    <p className="text-sm text-gray-700">{member.email}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TeamPage;
