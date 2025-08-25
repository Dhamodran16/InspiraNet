import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const TermsPage = () => {
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
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                Terms and Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome to the KEC Alumni Network. These Terms and Conditions govern your use of our alumni network platform 
                and the services we provide. By accessing or using our platform, you agree to be bound by these terms.
              </p>
            </CardContent>
          </Card>

          {/* Acceptance of Terms */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Acceptance of Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                By accessing or using the KEC Alumni Network platform, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, 
                you must not use our platform.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                We reserve the right to modify these terms at any time. Continued use of the platform after changes 
                constitutes acceptance of the updated terms.
              </p>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Eligibility and Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                To use our platform, you must meet the following eligibility requirements:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li>Be a current student, alumni, or faculty member of Kongu Engineering College</li>
                <li>Be at least 18 years old or have parental consent</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
              <p className="text-sm sm:text-base text-gray-600">
                We reserve the right to verify your eligibility and may suspend or terminate accounts that violate these requirements.
              </p>
            </CardContent>
          </Card>

          {/* User Conduct */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                User Conduct and Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                As a user of our platform, you agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
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

          {/* Content Guidelines */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Content Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                When posting content on our platform, you must ensure that your content:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li>Is accurate, truthful, and not misleading</li>
                <li>Respects intellectual property rights</li>
                <li>Does not contain hate speech or discriminatory content</li>
                <li>Is not spam, advertising, or promotional without permission</li>
                <li>Does not contain personal information of others without consent</li>
                <li>Complies with all applicable laws and regulations</li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy and Data */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Privacy and Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                Your privacy is important to us. Our collection and use of your personal information is governed by our Privacy Policy, 
                which is incorporated into these Terms and Conditions by reference.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                By using our platform, you consent to the collection, use, and disclosure of your information as described in our Privacy Policy.
              </p>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Intellectual Property Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                The platform and its content are protected by intellectual property laws. You retain ownership of content you post, 
                but grant us a license to use, display, and distribute your content on the platform.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                You may not use our trademarks, logos, or other proprietary materials without our written permission.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                To the maximum extent permitted by law, KEC Alumni Network shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of the platform.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                Our total liability to you for any claims arising from these terms or your use of the platform shall not exceed 
                the amount you paid us, if any, in the twelve months preceding the claim.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Account Termination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                We may suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                Upon termination, your right to use the platform ceases immediately, and we may delete your account and related data.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="space-y-2 text-sm sm:text-base text-gray-600">
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

export default TermsPage;
