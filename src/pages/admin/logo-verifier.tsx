//src/pages/admin/logo-verifier.tsx
import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase'; // Adjust path to your supabase client

// Admin check component (following your pattern from other admin pages)
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Replace with your actual admin email
  const ADMIN_EMAIL = 'adamkiil@outlook.com';
  
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-red-400">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export function LogoVerifierPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<Record<number, string>>({});
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch companies and URLs from Supabase
  useEffect(() => {
    fetchCompaniesData();
  }, []);

  const fetchCompaniesData = async () => {
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('company_id, tsx_code, company_name, name_alt')
        .order('company_id');

      if (companiesError) throw companiesError;

      // Fetch URLs
      const { data: urlsData, error: urlsError } = await supabase
        .from('company_urls')
        .select('company_id, url')
        .eq('url_type', 'website');

      if (urlsError) throw urlsError;

      // Combine data
      const combinedData = companiesData.map(company => {
        const urlInfo = urlsData.find(u => u.company_id === company.company_id);
        return {
          ...company,
          logo_url: `https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`,
          website_url: urlInfo?.url || `https://example.com/company${company.company_id}`
        };
      });

      setCompanies(combinedData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.tsx_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !showOnlyUnverified || verificationStatus[company.company_id] !== 'verified';
    return matchesSearch && matchesFilter;
  });

  const currentCompany = filteredCompanies[currentIndex];

  const handleVerification = async (status: string) => {
    if (!currentCompany) return;
    
    setVerificationStatus(prev => ({
      ...prev,
      [currentCompany.company_id]: status
    }));
    
    // If marked as incorrect, rename the file in Supabase
    if (status === 'incorrect') {
      setIsProcessing(true);
      try {
        // Call Supabase Edge Function to rename the file
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rename-logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            companyId: currentCompany.company_id,
            oldPath: `logos/${currentCompany.company_id}.png`,
            newPath: `logos/${currentCompany.company_id}_i.png`
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to rename logo');
        }
        
        // Update the local state to reflect the new URL
        setCompanies(prev => prev.map(company => 
          company.company_id === currentCompany.company_id
            ? { ...company, logo_url: company.logo_url.replace('.png', '_i.png') }
            : company
        ));
        
        console.log(`Renamed logo for company ${currentCompany.company_id} to ${currentCompany.company_id}_i.png`);
      } catch (error) {
        console.error('Error renaming logo:', error);
        alert('Failed to rename logo file. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
    
    // Auto-advance to next company
    if (currentIndex < filteredCompanies.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const navigateToCompany = (index: number) => {
    if (index >= 0 && index < filteredCompanies.length) {
      setCurrentIndex(index);
    }
  };

  const getVerificationStats = () => {
    const verified = Object.values(verificationStatus).filter(status => status === 'verified').length;
    const incorrect = Object.values(verificationStatus).filter(status => status === 'incorrect').length;
    const flagged = Object.values(verificationStatus).filter(status => status === 'flagged').length;
    const total = companies.length;
    const remaining = total - verified - incorrect - flagged;
    
    return { verified, incorrect, flagged, total, remaining };
  };

  const stats = getVerificationStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading companies...</p>
        </div>
      </div>
    );
  }

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-white">
        <div className="text-center">
          <p className="text-xl mb-4">No companies found</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
          >
            Clear Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminOnly>
      <div className="min-h-screen">
        {/* Header */}
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-white">Company Logo Verification Tool</h1>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm font-semibold">Total</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-green-900/50 p-4 rounded-lg">
              <div className="text-green-400 text-sm font-semibold">Verified</div>
              <div className="text-2xl font-bold text-green-400">{stats.verified}</div>
            </div>
            <div className="bg-red-900/50 p-4 rounded-lg">
              <div className="text-red-400 text-sm font-semibold">Incorrect</div>
              <div className="text-2xl font-bold text-red-400">{stats.incorrect}</div>
            </div>
            <div className="bg-yellow-900/50 p-4 rounded-lg">
              <div className="text-yellow-400 text-sm font-semibold">Flagged</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.flagged}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm font-semibold">Remaining</div>
              <div className="text-2xl font-bold text-white">{stats.remaining}</div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-4 items-center mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by company name or TSX code..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentIndex(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer text-white">
              <input
                type="checkbox"
                checked={showOnlyUnverified}
                onChange={(e) => {
                  setShowOnlyUnverified(e.target.checked);
                  setCurrentIndex(0);
                }}
                className="rounded"
              />
              <span>Show only unverified</span>
            </label>
          </div>

          {/* Company Info */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{currentCompany.company_name}</h2>
                <p className="text-gray-400">TSX: {currentCompany.tsx_code} | ID: {currentCompany.company_id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  {currentIndex + 1} of {filteredCompanies.length}
                </span>
                <button
                  onClick={() => navigateToCompany(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigateToCompany(currentIndex + 1)}
                  disabled={currentIndex === filteredCompanies.length - 1}
                  className="p-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Verification Status */}
            {verificationStatus[currentCompany.company_id] && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                verificationStatus[currentCompany.company_id] === 'verified' ? 'bg-green-900/50 text-green-400' :
                verificationStatus[currentCompany.company_id] === 'incorrect' ? 'bg-red-900/50 text-red-400' :
                'bg-yellow-900/50 text-yellow-400'
              }`}>
                {verificationStatus[currentCompany.company_id] === 'verified' && <CheckCircle className="h-5 w-5" />}
                {verificationStatus[currentCompany.company_id] === 'incorrect' && <XCircle className="h-5 w-5" />}
                {verificationStatus[currentCompany.company_id] === 'flagged' && <AlertCircle className="h-5 w-5" />}
                <span className="capitalize">{verificationStatus[currentCompany.company_id]}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleVerification('verified')}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                <CheckCircle className="h-5 w-5" />
                Logo Correct
              </button>
              <button
                onClick={() => handleVerification('incorrect')}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Renaming...
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Logo Incorrect
                  </>
                )}
              </button>
              <button
                onClick={() => handleVerification('flagged')}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                <AlertCircle className="h-5 w-5" />
                Flag for Review
              </button>
            </div>
          </div>

          {/* Logo and Website Display */}
          <div className="grid grid-cols-2 gap-6">
            {/* Logo Display */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Database Logo</h3>
              <div className="bg-white rounded-lg p-8 flex items-center justify-center" style={{ minHeight: '400px' }}>
                <img
                  src={currentCompany.logo_url}
                  alt={`${currentCompany.company_name} logo`}
                  className="max-w-full max-h-96 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2UwZTBlMCIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIExvZ28gRm91bmQ8L3RleHQ+Cjwvc3ZnPg==';
                  }}
                />
              </div>
              <div className="mt-3 text-sm text-gray-400 break-all">
                {currentCompany.logo_url}
              </div>
            </div>

            {/* Website Display */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Company Website</h3>
                <a
                  href={currentCompany.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Website
                </a>
              </div>
              <div className="bg-gray-700 rounded-lg flex items-center justify-center" style={{ height: '600px' }}>
                <div className="text-center">
                  <ExternalLink className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-300 mb-4">Click "Open Website" to view in a new tab</p>
                  <p className="text-gray-400 text-sm mb-2">Website URL:</p>
                  <p className="text-cyan-400 break-all px-4">{currentCompany.website_url}</p>
                  <div className="mt-6 p-4 bg-gray-800 rounded-lg text-left">
                    <p className="text-gray-300 text-sm mb-2">Tips for verification:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Open website in new tab</li>
                      <li>• Look for logo in header/footer</li>
                      <li>• Compare with database logo on the left</li>
                      <li>• Check if colors/design match</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Results */}
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <button
              onClick={() => {
                const results = companies.map(company => ({
                  company_id: company.company_id,
                  company_name: company.company_name,
                  tsx_code: company.tsx_code,
                  verification_status: verificationStatus[company.company_id] || 'unverified'
                }));
                
                const dataStr = JSON.stringify(results, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = `logo-verification-${new Date().toISOString().split('T')[0]}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium"
            >
              Export Verification Results
            </button>
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}