import { refreshVulnerabilityFeed, getVulnerabilityStats } from './actions/vulnerability-actions';
import Image from 'next/image';

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
  epssScore?: number;
  product?: string;
  vendor?: string;
  exploitAvailable?: boolean;
}

async function fetchLatestVulnerabilities(): Promise<Vulnerability[]> {
  try {
    // Fetch CISA KEV data
    const cisaResponse = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      next: { revalidate: 1800 } // 30 min cache
    });
    
    let vulnerabilities: Vulnerability[] = [];
    
    if (cisaResponse.ok) {
      const cisaData = await cisaResponse.json();
      
      // Get recent CISA KEV (last 45 days)
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      
      const cisaVulns = cisaData.vulnerabilities
        ?.filter((vuln: any) => new Date(vuln.dateAdded) > fortyFiveDaysAgo)
        .slice(0, 12)
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
          exploitAvailable: true
        })) || [];
      
      vulnerabilities = [...vulnerabilities, ...cisaVulns];
    }

    // Fetch recent high-severity NVD data
    try {
      const nvdResponse = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=15&startIndex=0', {
        next: { revalidate: 1800 },
        headers: { 'User-Agent': 'ZeroDayTracker/1.0' }
      });
      
      if (nvdResponse.ok) {
        const nvdData = await nvdResponse.json();
        
        // Filter for high/critical severity recent CVEs
        const nvdVulns = nvdData.vulnerabilities
          ?.filter((item: any) => {
            const vuln = item.cve;
            const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                             vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
            
            const publishedDate = new Date(vuln.published);
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            
            return cvssScore >= 7.0 && publishedDate > tenDaysAgo;
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
              severity: cvssScore >= 9 ? 'Critical' : cvssScore >= 7 ? 'High' : cvssScore >= 4 ? 'Medium' : 'Low',
              published: vuln.published,
              updated: vuln.lastModified,
              source: 'NVD',
              link: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
              cveId: vuln.id,
              cvssScore: cvssScore,
              exploitAvailable: false
            };
          }) || [];
        
        vulnerabilities = [...vulnerabilities, ...nvdVulns];
      }
    } catch (nvdError) {
      console.error('NVD fetch failed:', nvdError);
    }

    // Fetch GitHub Security Advisories
    try {
      const githubResponse = await fetch('https://api.github.com/advisories?per_page=10&sort=published&direction=desc', {
        next: { revalidate: 1800 },
        headers: { 
          'User-Agent': 'ZeroDayTracker/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        
        const githubVulns = githubData
          ?.filter((advisory: any) => advisory.severity === 'critical' || advisory.severity === 'high')
          .slice(0, 5)
          .map((advisory: any) => ({
            id: advisory.ghsa_id,
            title: advisory.summary,
            description: advisory.description || 'No description available',
            severity: advisory.severity === 'critical' ? 'Critical' : 'High',
            published: advisory.published_at,
            updated: advisory.updated_at,
            source: 'GitHub Security',
            link: advisory.html_url,
            cveId: advisory.cve_id,
            exploitAvailable: false
          })) || [];
        
        vulnerabilities = [...vulnerabilities, ...githubVulns];
      }
    } catch (githubError) {
      console.error('GitHub fetch failed:', githubError);
    }

return vulnerabilities.sort((a, b) => {
  // Parse dates as UTC explicitly
  const parseUTC = (dateStr: string) => {
    if (dateStr.includes('T') && !dateStr.includes('Z')) {
      return new Date(dateStr + 'Z').getTime();
    }
    return new Date(dateStr).getTime();
  };
  
  return parseUTC(b.published) - parseUTC(a.published);
});    
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return [];
  }
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical': return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-200';
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200';
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200';
    case 'low': return 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200';
  }
}

function getSourceBadge(source: string) {
  switch (source) {
    case 'CISA KEV': 
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm';
    case 'NVD': 
      return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm';
    case 'GitHub Security':
      return 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-sm';
    default: 
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm';
  }
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
}

// SECFORIT Logo Component
function SecforitLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      {/* Laptop with Lock Icon - SVG representation of your logo */}
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Laptop Screen */}
        <rect x="20" y="25" width="60" height="40" rx="4" stroke="#10b981" strokeWidth="2" fill="#000000"/>
        
        {/* Binary Code Pattern */}
        <text x="25" y="35" fontSize="4" fill="#10b981" fontFamily="monospace">101</text>
        <text x="25" y="42" fontSize="4" fill="#10b981" fontFamily="monospace">110101</text>
        <text x="25" y="49" fontSize="4" fill="#10b981" fontFamily="monospace">010101</text>
        <text x="25" y="56" fontSize="4" fill="#10b981" fontFamily="monospace">...</text>
        
        {/* Laptop Base */}
        <path d="M15 65 L85 65 L90 75 L10 75 Z" fill="#10b981" stroke="#10b981" strokeWidth="1"/>
        
        {/* Lock Icon */}
        <circle cx="70" cy="20" r="12" fill="#000000" stroke="#10b981" strokeWidth="2"/>
        <rect x="65" y="18" width="10" height="8" rx="1" fill="#10b981"/>
        <path d="M67 18 V15 A3 3 0 0 1 73 15 V18" stroke="#000000" strokeWidth="1.5" fill="none"/>
      </svg>
    </div>
  );
}

// Component for rendering vulnerability cards
function VulnerabilityCard({ vuln }: { vuln: Vulnerability }) {
  return (
    <article className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-green-500/20 shadow-lg hover:shadow-xl hover:border-green-500/40 transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSourceBadge(vuln.source)}`}>
              {vuln.source}
            </span>
            {vuln.source === 'CISA KEV' && (
              <span className="px-2 py-1 text-xs font-medium bg-red-900/50 text-red-300 rounded-full border border-red-500/50">
                ACTIVELY EXPLOITED
              </span>
            )}
            {vuln.exploitAvailable && vuln.source !== 'CISA KEV' && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-900/50 text-purple-300 rounded-full border border-purple-500/50">
                EXPLOIT AVAILABLE
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSeverityColor(vuln.severity)}`}>
              {vuln.severity}
              {vuln.cvssScore && ` (${vuln.cvssScore})`}
            </span>
            {vuln.epssScore && (
              <span className="px-2 py-1 text-xs bg-indigo-900/50 text-indigo-300 rounded-full border border-indigo-500/50">
                EPSS: {(vuln.epssScore * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-green-100 mb-3 leading-tight">
          {vuln.cveId && (
            <span className="text-green-400 font-mono text-sm mr-2">{vuln.cveId}</span>
          )}
          <span>{vuln.title}</span>
        </h3>
        
        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          {vuln.description.length > 180 
            ? `${vuln.description.substring(0, 180)}...` 
            : vuln.description}
        </p>
        
        {/* Product Info */}
        {(vuln.product || vuln.vendor) && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="text-xs text-green-400 uppercase tracking-wide font-medium mb-1">Affected Product</div>
            <div className="font-medium text-gray-200">
              {vuln.vendor && vuln.product ? `${vuln.vendor} ${vuln.product}` : vuln.product || vuln.vendor}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
          <div className="text-xs text-green-400/60 font-mono">
            {formatTimeAgo(vuln.published)}
          </div>
          <a 
            href={vuln.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
          >
            Technical Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

// Component for section header with category info
function CategoryHeader({ title, description, count, icon, bgColor, borderColor }: {
  title: string;
  description: string;
  count: number;
  icon: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`${bgColor} backdrop-blur-sm rounded-xl border ${borderColor} shadow-lg p-6 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-gray-300 text-sm">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-sm text-gray-300">findings</div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const vulnerabilities = await fetchLatestVulnerabilities();
  
  // Separate vulnerabilities by source for better threat analysis
  const cisaVulns = vulnerabilities.filter(v => v.source === 'CISA KEV');
  const nvdVulns = vulnerabilities.filter(v => v.source === 'NVD');
  const githubVulns = vulnerabilities.filter(v => v.source === 'GitHub Security');
  
  const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;
  const exploitedCount = vulnerabilities.filter(v => v.exploitAvailable).length;
  
  async function handleRefresh() {
    'use server'
    await refreshVulnerabilityFeed();
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header with SECFORIT Branding */}
      <header className="border-b border-green-500/20 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* SECFORIT Logo */}
              <SecforitLogo className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  SECFORIT
                </h1>
                <p className="text-sm text-green-300/80 font-mono tracking-wider">
                  BREAK CODE, NOT SECURITY!
                </p>
              </div>
              <div className="hidden md:block ml-8 border-l border-green-500/30 pl-8">
                <h2 className="text-lg font-semibold text-green-100">Threat Intelligence Dashboard</h2>
                <p className="text-sm text-green-300/60">Continuous monitoring of exploitable vulnerabilities across critical infrastructure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <form action={handleRefresh}>
              </form>
                           <a 
                href="/rss"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-black px-4 py-2 rounded-lg hover:from-green-500 hover:to-green-400 transition-all duration-200 shadow-sm font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.429 2.286A1.429 1.429 0 002 3.714v12.572a1.429 1.429 0 001.429 1.428h12.571a1.429 1.429 0 001.429-1.428V3.714A1.429 1.429 0 0016 2.286H3.429zm9.143 4.286a3.571 3.571 0 11-7.143 0 3.571 3.571 0 017.143 0zM3.429 17.143a3.571 3.571 0 003.571-3.571h-3.571v3.571z"/>
                </svg>
                RSS Feed
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Executive Summary Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-green-100 mb-4">
            Active Threat Intelligence Feed
          </h1>

          <div className="inline-block scanner px-6 py-2 mb-8 border border-green-500/30 bg-green-500/5">
            <p className="text-sm text-green-400/80 font-mono tracking-wider">
              code by razvan @stefanini
            </p>
          </div>

          
          {/* Threat Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-green-500/30 shadow-sm">
              <div className="text-2xl font-bold text-green-400">{vulnerabilities.length}</div>
              <div className="text-sm text-green-300/70">Total Tracked</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/30 shadow-sm">
              <div className="text-2xl font-bold text-red-400">{cisaVulns.length}</div>
              <div className="text-sm text-red-300/70">Active Exploits</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30 shadow-sm">
              <div className="text-2xl font-bold text-blue-400">{nvdVulns.length}</div>
              <div className="text-sm text-blue-300/70">High Severity</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-gray-500/30 shadow-sm">
              <div className="text-2xl font-bold text-gray-300">{githubVulns.length}</div>
              <div className="text-sm text-gray-400/70">Supply Chain</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30 shadow-sm">
              <div className="text-2xl font-bold text-orange-400">{criticalCount}</div>
              <div className="text-sm text-orange-300/70">Critical Risk</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 shadow-sm">
              <div className="text-2xl font-bold text-purple-400">{exploitedCount}</div>
              <div className="text-sm text-purple-300/70">In-the-Wild</div>
            </div>
          </div>
        </div>

        {/* Threat Classification by Source */}
        {vulnerabilities.length > 0 ? (
          <div className="space-y-12">
            {/* Intelligence Update Timestamp */}
            <div className="text-center text-sm text-green-300/60 font-mono">
              Intelligence last updated: {new Date().toLocaleString()} UTC
            </div>
            
            {/* CISA Known Exploited Vulnerabilities - Priority Alpha */}
            {cisaVulns.length > 0 && (
              <section>
                <CategoryHeader
                  title="CISA Known Exploited Vulnerabilities"
                  description="Active exploitation confirmed by CISA, requiring immediate attention"
                  count={cisaVulns.length}
                  icon="⚠️"
                  bgColor="bg-gradient-to-r from-red-900/40 to-red-800/30"
                  borderColor="border-red-500/30"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {cisaVulns.map((vuln) => (
                    <VulnerabilityCard key={vuln.id} vuln={vuln} />
                  ))}
                </div>
              </section>
            )}

            {/* National Vulnerability Database - Recent High Impact */}
            {nvdVulns.length > 0 && (
              <section>
                <CategoryHeader
                  title="National Vulnerability Database (NVD)"
                  description="Recently disclosed high-severity vulnerabilities requiring assessment and patching"
                  count={nvdVulns.length}
                  icon="🛡️"
                  bgColor="bg-gradient-to-r from-blue-900/40 to-blue-800/30"
                  borderColor="border-blue-500/30"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nvdVulns.map((vuln) => (
                    <VulnerabilityCard key={vuln.id} vuln={vuln} />
                  ))}
                </div>
              </section>
            )}

            {/* GitHub Security Advisories - Supply Chain Threats */}
            {githubVulns.length > 0 && (
              <section>
                <CategoryHeader
                  title="GitHub Security Advisories"
                  description="Open source package vulnerabilities affecting development and production environments"
                  count={githubVulns.length}
                  icon="📦"
                  bgColor="bg-gradient-to-r from-gray-800/40 to-gray-700/30"
                  borderColor="border-gray-500/30"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {githubVulns.map((vuln) => (
                    <VulnerabilityCard key={vuln.id} vuln={vuln} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Data Unavailable State */
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🔍</div>
            <h2 className="text-2xl font-semibold text-green-100 mb-4">Intelligence Feed Temporarily Unavailable</h2>
            <p className="text-green-300/70 mb-6 max-w-md mx-auto">
              Unable to retrieve current threat intelligence from configured sources. Data feeds may be experiencing temporary issues.
            </p>
            <form action={handleRefresh}>
              <button 
                type="submit"
                className="bg-green-600 text-black px-6 py-3 rounded-lg hover:bg-green-500 transition-colors font-medium"
              >
                Retry Data Collection
              </button>
            </form>
          </div>
        )}

        {/* Intelligence Sources & Methodology */}
        <section className="mt-16 bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-green-500/20 shadow-lg overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-green-100 mb-6 text-center">Authoritative Threat Intelligence Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-xl border border-red-500/30">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold text-red-300">CISA Known Exploited Vulnerabilities</h3>
                </div>
                <p className="text-red-200/80 text-sm leading-relaxed">
                  Authoritative catalog of vulnerabilities with confirmed active exploitation. 
                  Federal agencies mandated to remediate within specified timeframes per Binding Operational Directive 22-01.
                </p>
                <div className="mt-3 text-xs text-red-400/80 font-medium">
                  Update Frequency: Daily • Source: CISA
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl border border-blue-500/30">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold text-blue-300">National Vulnerability Database</h3>
                </div>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  Comprehensive vulnerability management repository maintained by NIST. 
                  Provides standardized vulnerability data including CVSS scoring, CWE classification, and impact assessment.
                </p>
                <div className="mt-3 text-xs text-blue-400/80 font-medium">
                  Update Frequency: Continuous • Source: NIST
                </div>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-gray-800/30 to-gray-700/20 rounded-xl border border-gray-500/30">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold text-gray-300">GitHub Security Advisories</h3>
                </div>
                <p className="text-gray-200/80 text-sm leading-relaxed">
                  Community-driven vulnerability database covering open source packages across multiple ecosystems. 
                  Critical for supply chain risk assessment and dependency management strategies.
                </p>
                <div className="mt-3 text-xs text-gray-400/80 font-medium">
                  Update Frequency: Real-time • Source: GitHub
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-green-500/20 bg-black/60 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <a 
              href="https://www.secforit.ro/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-200 group"
            >
              <SecforitLogo className="w-8 h-8 mr-3 group-hover:animate-pulse" />
              <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent group-hover:from-green-300 group-hover:to-green-200 transition-all duration-200">
                SECFORIT
              </span>
            </a>
            <p className="text-green-300/60 text-sm mb-2 font-mono tracking-wider">
              BREAK CODE, NOT SECURITY!
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Threat intelligence aggregated from official U.S. government databases and trusted security repositories. 
              Analysis methodology follows industry standard frameworks for vulnerability assessment and risk prioritization.
            </p>
            <div className="flex justify-center space-x-6">
              <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-green-400/70 hover:text-green-400 text-sm transition-colors">
                CISA KEV Catalog
              </a>
              <a href="https://nvd.nist.gov/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-green-400/70 hover:text-green-400 text-sm transition-colors">
                NVD Database
              </a>
              <a href="https://github.com/advisories" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-green-400/70 hover:text-green-400 text-sm transition-colors">
                GitHub Security
              </a>
              <a href="/rss" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-green-400/70 hover:text-green-400 text-sm transition-colors">
                RSS Feed
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}