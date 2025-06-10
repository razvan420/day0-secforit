import Link from 'next/link';

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: string;
  published: string;
  updated: string;
  source: string;
  link: string;
  cveId?: string;
  cvssScore?: number;
  vendor?: string;
  product?: string;
}

async function fetchLatestVulnerabilities(): Promise<Vulnerability[]> {
  try {
    // Fetch CISA KEV data
    const cisaResponse = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      next: { revalidate: 3600 }
    });
    
    let vulnerabilities: Vulnerability[] = [];
    
    if (cisaResponse.ok) {
      const cisaData = await cisaResponse.json();
      const cisaVulns = cisaData.vulnerabilities?.slice(0, 8).map((vuln: any) => ({
        id: vuln.cveID || `cisa-${Date.now()}-${Math.random()}`,
        title: vuln.vulnerabilityName || 'Unknown Vulnerability',
        description: vuln.shortDescription || 'No description available',
        severity: 'Critical',
        published: vuln.dateAdded,
        updated: vuln.dateAdded,
        source: 'CISA KEV',
        link: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
        cveId: vuln.cveID,
        product: vuln.product,
        vendor: vuln.vendorProject
      })) || [];
      
      vulnerabilities = [...vulnerabilities, ...cisaVulns];
    }

    // Fetch recent NVD data
    try {
      const nvdResponse = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=6&startIndex=0', {
        next: { revalidate: 3600 },
        headers: { 'User-Agent': 'ZeroDayRSSFeed/1.0' }
      });
      
      if (nvdResponse.ok) {
        const nvdData = await nvdResponse.json();
        const nvdVulns = nvdData.vulnerabilities?.slice(0, 6).map((item: any) => {
          const vuln = item.cve;
          const description = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available';
          const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                           vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
          
          return {
            id: vuln.id,
            title: vuln.id,
            description: description,
            severity: cvssScore >= 9 ? 'Critical' : cvssScore >= 7 ? 'High' : cvssScore >= 4 ? 'Medium' : 'Low',
            published: vuln.published,
            updated: vuln.lastModified,
            source: 'NVD',
            link: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
            cveId: vuln.id,
            cvssScore: cvssScore
          };
        }) || [];
        
        vulnerabilities = [...vulnerabilities, ...nvdVulns];
      }
    } catch (nvdError) {
      console.error('NVD fetch failed:', nvdError);
    }

    return vulnerabilities.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return [];
  }
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getSourceColor(source: string) {
  switch (source) {
    case 'CISA KEV': return 'bg-red-500';
    case 'NVD': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

export default async function Home() {
  const vulnerabilities = await fetchLatestVulnerabilities();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🛡️ Zero-Day Vulnerability Tracker
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Live CVE feed from CISA KEV and National Vulnerability Database
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Link 
              href="/dashboard"
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              📊 Dashboard
            </Link>
            <a 
              href="/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              📡 RSS Feed
            </a>
          </div>
        </div>

        {vulnerabilities.length > 0 ? (
          <>
            <div className="mb-6 text-center">
              <p className="text-gray-600">
                <span className="font-semibold text-red-600">{vulnerabilities.filter(v => v.source === 'CISA KEV').length}</span> CISA KEV vulnerabilities • 
                <span className="font-semibold text-blue-600 ml-2">{vulnerabilities.filter(v => v.source === 'NVD').length}</span> NVD recent CVEs
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {vulnerabilities.map((vuln) => (
                <div key={vuln.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getSourceColor(vuln.source)}`}></span>
                        <span className="text-sm font-medium text-gray-600">{vuln.source}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity}
                        {vuln.cvssScore && ` (${vuln.cvssScore})`}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {vuln.cveId && <span className="text-blue-600">{vuln.cveId}: </span>}
                      {vuln.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {vuln.description.length > 200 
                        ? `${vuln.description.substring(0, 200)}...` 
                        : vuln.description}
                    </p>
                    
                    {vuln.product && vuln.vendor && (
                      <div className="mb-3 text-sm">
                        <span className="text-gray-500">Product:</span> 
                        <span className="font-medium text-gray-700 ml-1">{vuln.vendor} {vuln.product}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Published: {new Date(vuln.published).toLocaleDateString()}
                      </div>
                      <a 
                        href={vuln.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Vulnerabilities Loaded</h2>
            <p className="text-gray-600 mb-4">Unable to fetch vulnerability data at this time.</p>
            <Link 
              href="/dashboard"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Try Dashboard
            </Link>
          </div>
        )}

        <div className="mt-12 bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔒 Trusted Data Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center mb-2">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <h3 className="font-semibold text-red-800">CISA KEV</h3>
              </div>
              <p className="text-sm text-red-600">Known Exploited Vulnerabilities - Actively exploited CVEs requiring immediate attention</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                <h3 className="font-semibold text-blue-800">NVD</h3>
              </div>
              <p className="text-sm text-blue-600">National Vulnerability Database - Comprehensive CVE database with CVSS scoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}