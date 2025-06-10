import { refreshVulnerabilityFeed, getVulnerabilityStats } from '../actions/vulnerability-actions';
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
  product?: string;
  vendor?: string;
  dueDate?: string;
}

async function fetchZeroDayVulnerabilities(): Promise<Vulnerability[]> {
  try {
    // Fetch CISA KEV - these are actively exploited (closest to zero-day)
    const cisaResponse = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      next: { revalidate: 1800 } // 30 min cache
    });
    
    let zeroDayVulns: Vulnerability[] = [];
    
    if (cisaResponse.ok) {
      const cisaData = await cisaResponse.json();
      
      // Filter for recent CISA KEV vulnerabilities (added in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentCisaVulns = cisaData.vulnerabilities
        ?.filter((vuln: any) => new Date(vuln.dateAdded) > thirtyDaysAgo)
        .slice(0, 15)
        .map((vuln: any) => ({
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
          vendor: vuln.vendorProject,
          dueDate: vuln.dueDate
        })) || [];
      
      zeroDayVulns = [...zeroDayVulns, ...recentCisaVulns];
    }

    // Fetch high-severity recent CVEs from NVD
    try {
      const nvdResponse = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10&startIndex=0', {
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'ZeroDayDashboard/1.0' }
      });
      
      if (nvdResponse.ok) {
        const nvdData = await nvdResponse.json();
        
        // Filter for high/critical severity recent CVEs
        const recentHighSeverity = nvdData.vulnerabilities
          ?.filter((item: any) => {
            const vuln = item.cve;
            const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                             vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
            
            const publishedDate = new Date(vuln.published);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            return cvssScore >= 7.0 && publishedDate > sevenDaysAgo;
          })
          .slice(0, 8)
          .map((item: any) => {
            const vuln = item.cve;
            const description = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available';
            const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                             vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
            
            return {
              id: vuln.id,
              title: vuln.id,
              description: description,
              severity: cvssScore >= 9 ? 'Critical' : 'High',
              published: vuln.published,
              updated: vuln.lastModified,
              source: 'NVD Recent',
              link: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
              cveId: vuln.id,
              cvssScore: cvssScore
            };
          }) || [];
        
        zeroDayVulns = [...zeroDayVulns, ...recentHighSeverity];
      }
    } catch (nvdError) {
      console.error('NVD fetch failed:', nvdError);
    }

    return zeroDayVulns.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    
  } catch (error) {
    console.error('Error fetching zero-day vulnerabilities:', error);
    return [];
  }
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-300';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getSourceBadgeColor(source: string) {
  switch (source) {
    case 'CISA KEV': return 'bg-red-500';
    case 'NVD Recent': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

export default async function Dashboard() {
  const stats = await getVulnerabilityStats();
  const zeroDayVulns = await fetchZeroDayVulnerabilities();
  
  async function handleRefresh() {
    'use server'
    await refreshVulnerabilityFeed();
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🛡️ Zero-Day Vulnerability Dashboard</h1>
        <Link 
          href="/"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total in Feed</h3>
          {stats.success ? (
            <p className="text-2xl font-bold text-blue-600">{stats.totalVulnerabilities}</p>
          ) : (
            <p className="text-red-500">Error</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">CISA KEV Recent</h3>
          <p className="text-2xl font-bold text-red-600">
            {zeroDayVulns.filter(v => v.source === 'CISA KEV').length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">High Severity Recent</h3>
          <p className="text-2xl font-bold text-orange-600">
            {zeroDayVulns.filter(v => v.source === 'NVD Recent').length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">RSS Feed</h3>
          <div className="flex gap-2 mt-2">
            <a 
              href="/rss" 
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
              target="_blank"
            >
              📡 View
            </a>
            <form action={handleRefresh} className="inline">
              <button 
                type="submit"
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              >
                🔄 Refresh
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Zero-Day Vulnerabilities from Trusted Sources */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">🚨 Recent Zero-Day & Critical Vulnerabilities</h2>
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
        
        {zeroDayVulns.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {zeroDayVulns.map((vuln) => (
              <div key={vuln.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${getSourceBadgeColor(vuln.source)}`}></span>
                      <span className="text-sm font-medium text-gray-600">{vuln.source}</span>
                      {vuln.source === 'CISA KEV'

                      }
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
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {vuln.description.length > 150 
                      ? `${vuln.description.substring(0, 150)}...` 
                      : vuln.description}
                  </p>
                  
                  {(vuln.product || vuln.vendor) && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-500">Affected:</span> 
                      <span className="font-medium text-gray-700">
                        {vuln.vendor && vuln.product ? `${vuln.vendor} ${vuln.product}` : vuln.vendor || vuln.product}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <div>
                      <span className="font-medium">Published:</span> {new Date(vuln.published).toLocaleDateString()}
                    </div>
                    {vuln.source === 'CISA KEV'}
                  </div>
                  
                  <div className="flex gap-2">
                    <a 
                      href={vuln.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      📄 View Details
                    </a>
                    {vuln.cveId && (
                      <a 
                        href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cveId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                      >
                        🔍 MITRE CVE
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🛡️</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Recent Zero-Day Vulnerabilities</h3>
            <p className="text-gray-500">Either there are no recent critical vulnerabilities, or the feeds are temporarily unavailable.</p>
          </div>
        )}
      </div>

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">ℹ️ About This Dashboard</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            <strong>CISA KEV:</strong> Known Exploited Vulnerabilities from CISA - these are actively being exploited in the wild
          </p>
          <p>
            <strong>NVD Recent:</strong> Recently published high/critical severity CVEs from the National Vulnerability Database
          </p>
          <p>
            <strong>Update Frequency:</strong> Data is cached for 30 minutes and refreshed automatically
          </p>
          <p>
            <strong>Sources:</strong> 
            <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" className="underline hover:text-blue-900 ml-1">
              CISA KEV Catalog
            </a>, 
            <a href="https://nvd.nist.gov/" target="_blank" className="underline hover:text-blue-900 ml-1">
              NVD API
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}