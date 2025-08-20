import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Shield, Settings, Info } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const CookiePolicyPage = () => {
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
                <Cookie className="h-6 w-6 text-blue-600" />
                Cookie Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-gray-600">
                This Cookie Policy explains how KEC Alumni Network uses cookies and similar technologies to recognize you 
                when you visit our platform. It explains what these technologies are and why we use them, as well as your 
                rights to control our use of them.
              </p>
            </CardContent>
          </Card>

          {/* What Are Cookies */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Info className="h-5 w-5 text-blue-600" />
                What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Cookies are small data files that are placed on your computer or mobile device when you visit a website. 
                Cookies are widely used by website owners to make their websites work, or to work more efficiently, 
                as well as to provide reporting information.
              </p>
              <p className="text-gray-600">
                Cookies set by the website owner (in this case, KEC Alumni Network) are called "first-party cookies". 
                Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies 
                enable third-party features or functionality to be provided on or through the website.
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies We Use */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Settings className="h-5 w-5 text-blue-600" />
                Types of Cookies We Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Essential Cookies</h4>
                <p className="text-gray-600 mb-4">
                  These cookies are essential for the website to function and cannot be switched off in our systems. 
                  They are usually only set in response to actions made by you which amount to a request for services, 
                  such as setting your privacy preferences, logging in, or filling in forms.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Authentication cookies to keep you logged in</li>
                  <li>Security cookies to protect against fraud</li>
                  <li>Session cookies to maintain your session</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h4>
                <p className="text-gray-600 mb-4">
                  These cookies allow us to count visits and traffic sources so we can measure and improve the performance 
                  of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Google Analytics cookies to understand usage patterns</li>
                  <li>Performance monitoring cookies</li>
                  <li>User behavior tracking cookies</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Preference Cookies</h4>
                <p className="text-gray-600 mb-4">
                  These cookies enable the website to provide enhanced functionality and personalization. 
                  They may be set by us or by third-party providers whose services we have added to our pages.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Theme preference cookies (dark/light mode)</li>
                  <li>Language preference cookies</li>
                  <li>Notification preference cookies</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How to Control Cookies */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5 text-blue-600" />
                How to Control Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You have several options to control cookies:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through their settings</li>
                <li><strong>Cookie Consent:</strong> We provide cookie consent options when you first visit our site</li>
                <li><strong>Third-Party Opt-Out:</strong> You can opt out of third-party cookies through their respective opt-out mechanisms</li>
                <li><strong>Contact Us:</strong> You can contact us to request changes to your cookie preferences</li>
              </ul>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Disabling certain cookies may affect the functionality of our platform. 
                  Essential cookies cannot be disabled as they are necessary for basic site functionality.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Third-Party Cookies */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Info className="h-5 w-5 text-blue-600" />
                Third-Party Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We may use third-party services that set their own cookies:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                <li><strong>Cloudinary:</strong> For image and file upload services</li>
                <li><strong>Social Media:</strong> For social media integration and sharing features</li>
                <li><strong>Payment Processors:</strong> For any payment-related services (if applicable)</li>
              </ul>
              <p className="text-gray-600">
                These third-party services have their own privacy policies and cookie practices. 
                We encourage you to review their policies for more information.
              </p>
            </CardContent>
          </Card>

          {/* Updates to Policy */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Settings className="h-5 w-5 text-blue-600" />
                Updates to This Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We will notify you of any material changes by posting the new Cookie Policy on this page.
              </p>
              <p className="text-gray-600">
                Your continued use of our platform after any changes to this Cookie Policy constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="h-5 w-5 text-blue-600" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                If you have any questions about our use of cookies, please contact us:
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

export default CookiePolicyPage;
