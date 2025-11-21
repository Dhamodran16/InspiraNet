import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react'; // For the dropdown arrow

type CollegeHeaderProps = {
  centered?: boolean;
  showNav?: boolean;
};

const CollegeHeader: React.FC<CollegeHeaderProps> = ({ centered = false, showNav = true }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-100 dark:border-gray-800 py-4">
      <div className="container mx-auto px-4">
        {/* Centered Logo and College Info */}
        <div className="flex flex-col items-center justify-center text-center mb-4">
          <div className="flex items-center space-x-4 mb-2">
            <img src="/logo.png" alt="Kongu Engineering College Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-bold text-blue-800">KONGU ENGINEERING COLLEGE <span className="font-normal">(Autonomous)</span></h1>
              <p className="text-xs text-gray-600">Affiliated to Anna University | Accredited by NAAC with A++ Grade</p>
              <p className="text-xs text-gray-600">Perundurai Erode - 638060 Tamilnadu India</p>
            </div>
          </div>
        </div>

        {/* Centered Navigation Links */}
        {showNav && (
          <nav className="flex items-center justify-center space-x-6 flex-wrap">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium">Home</Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium">About Us</Link>
            <Link to="/programmes" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium">Programmes</Link>
            <Link to="/accreditation" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium">Accreditation</Link>
            <Link to="/placement" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium">Placement</Link>
            <Link to="/admission" className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium flex items-center">
              Admission 2025-26 <span className="ml-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">NEW</span>
            </Link>
            <Link to="/careers" className="text-gray-700 hover:text-blue-600 transition-colors text-sm font-medium flex items-center">
              Careers <ChevronDown className="ml-1 h-4 w-4" />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default CollegeHeader;



