import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Shield, Settings, Info } from 'lucide-react';
import CollegeHeader from '@/components/CollegeHeader';
import Footer from '@/components/Footer';

const CookiePolicyPage = () => {
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
                <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                Cookie Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-card">
              <p className="text-sm sm:text-base text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                This Cookie Policy explains how KEC Alumni Network uses cookies and similar technologies to recognize you 
                when you visit our platform. It explains what these technologies are and why we use them, as well as your 
                rights to control our use of them.
              </p>
            </CardContent>
          </Card>

          {/* What Are Cookies */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                Cookies are small data files that are placed on your computer or mobile device when you visit a website. 
                Cookies are widely used by website owners to make their websites work, or to work more efficiently, 
                as well as to provide reporting information.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                Cookies set by the website owner (in this case, KEC Alumni Network) are called "first-party cookies". 
                Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies 
                enable third-party features or functionality to be provided on or through the website.
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies We Use */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Types of Cookies We Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 bg-white">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Essential Cookies</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  These cookies are essential for the website to function and cannot be switched off in our systems. 
                  They are usually only set in response to actions made by you which amount to a request for services, 
                  such as setting your privacy preferences, logging in, or filling in forms.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 sm:ml-4 text-sm sm:text-base">
                  <li>Authentication cookies to keep you logged in</li>
                  <li>Security cookies to protect against fraud</li>
                  <li>Session cookies to maintain your session</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Analytics Cookies</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  These cookies allow us to count visits and traffic sources so we can measure and improve the performance 
                  of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 sm:ml-4 text-sm sm:text-base">
                  <li>Google Analytics cookies to understand usage patterns</li>
                  <li>Performance monitoring cookies</li>
                  <li>User behavior tracking cookies</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Preference Cookies</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  These cookies enable the website to provide enhanced functionality and personalization. 
                  They may be set by us or by third-party providers whose services we have added to our pages.
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2 sm:ml-4 text-sm sm:text-base">
                  <li>Theme preference cookies (dark/light mode)</li>
                  <li>Language preference cookies</li>
                  <li>Notification preference cookies</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How to Control Cookies */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                How to Control Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                You have several options for controlling cookies:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through their settings</li>
                <li><strong>Cookie Consent:</strong> We provide cookie consent options when you first visit our site</li>
                <li><strong>Third-Party Opt-Out:</strong> You can opt out of third-party cookies through their respective opt-out mechanisms</li>
                <li><strong>Delete Cookies:</strong> You can delete existing cookies through your browser settings</li>
              </ul>
              <p className="text-sm sm:text-base text-gray-600">
                Please note that disabling certain cookies may affect the functionality of our platform.
              </p>
            </CardContent>
          </Card>

          {/* Third-Party Cookies */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Third-Party Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                We may use third-party services that set their own cookies:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1.5 sm:space-y-2 ml-2 sm:ml-4 text-sm sm:text-base">
                <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                <li><strong>Cloudinary:</strong> For image hosting and optimization</li>
                <li><strong>Social Media:</strong> For social media integration and sharing features</li>
                <li><strong>Payment Processors:</strong> For secure payment processing (if applicable)</li>
              </ul>
              <p className="text-sm sm:text-base text-gray-600">
                These third-party services have their own privacy policies and cookie practices.
              </p>
            </CardContent>
          </Card>

          {/* Updates to This Policy */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Updates to This Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our platform.
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                The "Last updated" date at the top of this policy indicates when it was last revised.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-blue-800">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 bg-white">
              <p className="text-sm sm:text-base text-gray-600">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
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

export default CookiePolicyPage;