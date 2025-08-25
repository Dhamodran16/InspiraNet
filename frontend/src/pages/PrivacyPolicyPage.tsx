import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, Lock, Users, Database } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <CollegeHeader showNav={false} />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Introduction */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-blue-800 dark:text-blue-400">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                At KEC Alumni Network, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our alumni network platform.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Personal Information</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 sm:ml-4 text-sm sm:text-base">
                  <li>Name, email address, and contact information</li>
                  <li>Academic information (department, batch, graduation year)</li>
                  <li>Professional information (company, designation, experience)</li>
                  <li>Profile pictures and biographical information</li>
                  <li>Skills, interests, and career preferences</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Usage Information</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 sm:ml-4 text-sm sm:text-base">
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
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
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
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                Information Sharing and Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li><strong>With other alumni members:</strong> Your profile information is visible to other registered alumni based on your privacy settings</li>
                <li><strong>Service providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform</li>
                <li><strong>Legal requirements:</strong> We may disclose information when required by law or to protect our rights and safety</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition, your information may be transferred to the new entity</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, 
                alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection practices</li>
                <li>Incident response and breach notification procedures</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                Your Privacy Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
                <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800 dark:text-blue-400">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-2 text-sm sm:text-base text-muted-foreground">
                <p><strong>Email:</strong> alumni@kec.edu</p>
                <p><strong>Address:</strong> Kongu Engineering College, Perundurai, Erode - 638060, Tamil Nadu, India</p>
                <p><strong>Phone:</strong> +91-4294-226565</p>
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