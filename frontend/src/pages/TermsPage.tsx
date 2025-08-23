import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <CollegeHeader showNav={false} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-blue-800">
                <FileText className="h-6 w-6 text-blue-600" />
                Terms and Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-gray-600">
                Welcome to the KEC Alumni Network. These Terms and Conditions govern your use of our alumni network platform 
                and the services we provide. By accessing or using our platform, you agree to be bound by these terms.
              </p>
            </CardContent>
          </Card>

          {/* Acceptance of Terms */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                By accessing or using the KEC Alumni Network platform, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, 
                you must not use our platform.
              </p>
              <p className="text-gray-600">
                We reserve the right to modify these terms at any time. Continued use of the platform after changes 
                constitutes acceptance of the updated terms.
              </p>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5 text-blue-600" />
                Eligibility and Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To use our platform, you must meet the following eligibility requirements:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Be a current student, alumni, or faculty member of Kongu Engineering College</li>
                <li>Be at least 18 years old or have parental consent</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
              <p className="text-gray-600">
                We reserve the right to verify your eligibility and may suspend or terminate accounts that violate these requirements.
              </p>
            </CardContent>
          </Card>

          {/* User Conduct */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5 text-blue-600" />
                User Conduct and Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                As a user of our platform, you agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Use the platform for lawful purposes only</li>
                <li>Respect the privacy and rights of other users</li>
                <li>Not engage in harassment, discrimination, or abusive behavior</li>
                <li>Not post false, misleading, or inappropriate content</li>
                <li>Not attempt to gain unauthorized access to the platform</li>
                <li>Not use the platform for commercial purposes without permission</li>
                <li>Report any violations or suspicious activity</li>
              </ul>
            </CardContent>
          </Card>

          {/* Prohibited Activities */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Prohibited Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                The following activities are strictly prohibited:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Sharing personal information of other users without consent</li>
                <li>Posting spam, advertisements, or promotional content</li>
                <li>Creating fake accounts or impersonating others</li>
                <li>Attempting to hack or compromise platform security</li>
                <li>Using automated tools to access the platform</li>
                <li>Violating intellectual property rights</li>
                <li>Engaging in any illegal activities</li>
              </ul>
            </CardContent>
          </Card>

          {/* Content Guidelines */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="h-5 w-5 text-blue-600" />
                Content Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                When posting content on our platform, you must ensure:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Content is accurate, relevant, and appropriate</li>
                <li>You have the right to share the content</li>
                <li>Content does not violate any laws or regulations</li>
                <li>Content is not offensive, discriminatory, or harmful</li>
                <li>You respect copyright and intellectual property rights</li>
                <li>Content is not spam or promotional without permission</li>
              </ul>
              <p className="text-gray-600">
                We reserve the right to remove any content that violates these guidelines.
              </p>
            </CardContent>
          </Card>

          {/* Privacy and Data */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5 text-blue-600" />
                Privacy and Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Your privacy is important to us. Our data collection and usage practices are governed by our Privacy Policy, 
                which is incorporated into these Terms and Conditions by reference.
              </p>
              <p className="text-gray-600">
                By using our platform, you consent to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>The collection and processing of your personal information</li>
                <li>The sharing of your profile information with other alumni members</li>
                <li>Receiving communications related to platform updates and events</li>
                <li>The use of cookies and similar technologies</li>
              </ul>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="h-5 w-5 text-blue-600" />
                Intellectual Property Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                The KEC Alumni Network platform and its content are protected by intellectual property laws:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Platform design, code, and functionality are owned by KEC</li>
                <li>You retain ownership of content you post</li>
                <li>You grant us a license to use your content for platform purposes</li>
                <li>You may not copy, modify, or distribute platform content without permission</li>
                <li>Respect the intellectual property rights of other users</li>
              </ul>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>We provide the platform "as is" without warranties</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you paid for our services</li>
                <li>We are not responsible for user-generated content</li>
                <li>We do not guarantee uninterrupted or error-free service</li>
              </ul>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Account Termination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We may terminate or suspend your account at any time for:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Violation of these Terms and Conditions</li>
                <li>Fraudulent or illegal activities</li>
                <li>Inappropriate behavior or content</li>
                <li>Extended periods of inactivity</li>
                <li>At your request</li>
              </ul>
              <p className="text-gray-600">
                Upon termination, your access to the platform will be revoked, and we may delete your account data 
                in accordance with our Privacy Policy.
              </p>
            </CardContent>
          </Card>


        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsPage;
