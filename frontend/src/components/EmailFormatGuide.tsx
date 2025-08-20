import React from 'react';

interface EmailFormatGuideProps {
  userType: 'student' | 'alumni' | 'faculty';
  className?: string;
}

const EmailFormatGuide: React.FC<EmailFormatGuideProps> = ({ userType, className = '' }) => {
  const getGuideContent = () => {
    switch (userType) {
      case 'student':
        return {
          title: '📧 Student Email Format',
          description: 'Students must use Kongu email address',
          format: 'name.yearDept@kongu.edu',
          examples: [
            'boobalanj.23aim@kongu.edu',
            'dhamodran.23cse@kongu.edu',
            'hariharan.22ece@kongu.edu'
          ],
          explanation: 'Format: FirstName.LastName + JoinYear(2 digits) + Department@kongu.edu'
        };
      
      case 'faculty':
        return {
          title: '📧 Faculty Email Format',
          description: 'Faculty must use Kongu email address',
          format: 'name.dept@kongu.edu',
          examples: [
            'boobalanj.aim@kongu.edu',
            'dhamodran.cse@kongu.edu',
            'hariharan.ece@kongu.edu'
          ],
          explanation: 'Format: FirstName.LastName + Department@kongu.edu (No year)'
        };
      
      case 'alumni':
        return {
          title: '📧 Alumni Email Format',
          description: 'Alumni can use any email provider',
          format: 'any@email.com',
          examples: [
            'boobalan@gmail.com',
            'dhamodran@yahoo.com',
            'hariharan@outlook.com'
          ],
          explanation: 'You can use Gmail, Yahoo, Outlook, or any other email service'
        };
      
      default:
        return null;
    }
  };

  const content = getGuideContent();
  if (!content) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-lg">📧</span>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-1">
            {content.title}
          </h4>
          
          <p className="text-blue-700 text-sm mb-2">
            {content.description}
          </p>
          
          <div className="bg-white border border-blue-200 rounded p-3 mb-2">
            <div className="text-xs text-blue-600 font-medium mb-1">Format:</div>
            <code className="text-blue-800 font-mono text-sm">
              {content.format}
            </code>
          </div>
          
          <div className="mb-2">
            <div className="text-xs text-blue-600 font-medium mb-1">Examples:</div>
            <div className="space-y-1">
              {content.examples.map((example, index) => (
                <div key={index} className="text-blue-800 font-mono text-sm">
                  {example}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-blue-600 text-xs">
            💡 {content.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailFormatGuide;
