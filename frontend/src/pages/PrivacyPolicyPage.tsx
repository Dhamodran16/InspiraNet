import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Lock, Users, Database } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <CollegeHeader />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-blue-800">
                <Shield className="h-6 w-6 text-blue-600" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-gray-600">
                At KEC Alumni Network, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our alumni network platform.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Database className="h-5 w-5 text-blue-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Personal Information</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Name, email address, and contact information</li>
                  <li>Academic information (department, batch, graduation year)</li>
                  <li>Professional information (company, designation, experience)</li>
                  <li>Profile pictures and biographical information</li>
                  <li>Skills, interests, and career preferences</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Usage Information</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Login times and session duration</li>
                  <li>Pages visited and features used</li>
                  <li>Messages sent and received</li>
                  <li>Posts created and interactions</li>
                  <li>Search queries and preferences</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Eye className="h-5 w-5 text-blue-600" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>To provide and maintain our alumni network platform</li>
                <li>To facilitate connections between alumni members</li>
                <li>To send notifications about events, opportunities, and updates</li>
                <li>To improve our services and user experience</li>
                <li>To ensure platform security and prevent fraud</li>
                <li>To comply with legal obligations and enforce our terms</li>
              </ul>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5 text-blue-600" />
                Information Sharing and Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>With other alumni members:</strong> Your profile information is visible to other registered alumni based on your privacy settings</li>
                <li><strong>Service providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform</li>
                <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition, your information may be transferred to the new entity</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Lock className="h-5 w-5 text-blue-600" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We implement appropriate technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure hosting and infrastructure</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5 text-blue-600" />
                Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Privacy Settings:</strong> Control who can see your profile and information</li>
                <li><strong>Communication Preferences:</strong> Opt out of certain communications</li>
              </ul>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Lock className="h-5 w-5 text-blue-600" />
                Cookies and Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Essential cookies:</strong> Required for basic platform functionality</li>
                <li><strong>Analytics cookies:</strong> Help us understand how users interact with our platform</li>
                <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Security cookies:</strong> Help protect against fraud and unauthorized access</li>
              </ul>
              <p className="text-gray-600">
                You can control cookie settings through your browser preferences.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5 text-blue-600" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@kec.edu<br />
                  <strong>Phone:</strong> +91-422-2574077<br />
                  <strong>Address:</strong> Kongu Engineering College, Perundurai, Erode - 638060, Tamil Nadu, India
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
