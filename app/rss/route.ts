import { NextRequest, NextResponse } from 'next/server';

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
  epssScore?: number | undefined;
  product?: string;
  vendor?: string;
  exploitAvailable?: boolean;
}

// Enhanced vulnerability sources with multiple intelligence feeds
const VULNERABILITY_SOURCES = [
  {
    name: 'CISA KEV',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    type: 'json'
  },
  {
    name: 'NVD Recent',
    url: 'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&startIndex=0',
    type: 'json'
  },
  {
    name: 'GitHub Security',
    url: 'https://api.github.com/advisories?per_page=15&sort=published&direction=desc',
    type: 'json'
  }
];

async function fetchCISAVulnerabilities(): Promise<Vulnerability[]> {
  try {
    const source = VULNERABILITY_SOURCES[0];
    if (!source) throw new Error('CISA source configuration not found');
    
    const response = await fetch(source.url, {
      next: { revalidate: 1800 } // Cache for 30 minutes
    });
    
    if (!response.ok) throw new Error('Failed to fetch CISA data');
    
    const data = await response.json();
    
    // Get recent vulnerabilities (last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    return data.vulnerabilities
      ?.filter((vuln: any) => new Date(vuln.dateAdded) > sixtyDaysAgo)
      .slice(0, 15)
      .map((vuln: any) => ({
        id: vuln.cveID || `cisa-${Date.now()}-${Math.random()}`,
        title: `${vuln.cveID}: ${vuln.vulnerabilityName}`,
        description: `${vuln.shortDescription} | Product: ${vuln.product} | Vendor: ${vuln.vendorProject}`,
        severity: 'Critical',
        published: vuln.dateAdded,
        updated: vuln.dateAdded,
        source: 'CISA Known Exploited Vulnerabilities',
        link: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
        cveId: vuln.cveID,
        product: vuln.product,
        vendor: vuln.vendorProject,
        exploitAvailable: true
      })) || [];
  } catch (error) {
    console.error('Error fetching CISA vulnerabilities:', error);
    return [];
  }
}

async function fetchNVDVulnerabilities(): Promise<Vulnerability[]> {
  try {
    const source = VULNERABILITY_SOURCES[1];
    if (!source) throw new Error('NVD source configuration not found');
    
    const response = await fetch(source.url, {
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'ZeroDayRSSFeed/1.0'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch NVD data');
    
    const data = await response.json();
    
    return data.vulnerabilities
      ?.filter((item: any) => {
        const vuln = item.cve;
        const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                         vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
        
        const publishedDate = new Date(vuln.published);
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        
        return cvssScore >= 7.0 && publishedDate > tenDaysAgo;
      })
      .slice(0, 10)
      .map((item: any) => {
        const vuln = item.cve;
        const description = vuln.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available';
        const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 
                         vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
        
        return {
          id: vuln.id,
          title: `${vuln.id}: High/Critical Severity Vulnerability`,
          description: description,
          severity: cvssScore >= 9 ? 'Critical' : cvssScore >= 7 ? 'High' : cvssScore >= 4 ? 'Medium' : 'Low',
          published: vuln.published,
          updated: vuln.lastModified,
          source: 'National Vulnerability Database',
          link: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
          cveId: vuln.id,
          cvssScore: cvssScore,
          exploitAvailable: false
        };
      }) || [];
  } catch (error) {
    console.error('Error fetching NVD vulnerabilities:', error);
    return [];
  }
}

async function fetchGitHubVulnerabilities(): Promise<Vulnerability[]> {
  try {
    const source = VULNERABILITY_SOURCES[2];
    if (!source) throw new Error('GitHub source configuration not found');
    
    const response = await fetch(source.url, {
      next: { revalidate: 1800 },
      headers: {
        'User-Agent': 'ZeroDayRSSFeed/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch GitHub data');
    
    const data = await response.json();
    
    return data
      ?.filter((advisory: any) => advisory.severity === 'critical' || advisory.severity === 'high')
      .slice(0, 8)
      .map((advisory: any) => ({
        id: advisory.ghsa_id,
        title: `${advisory.ghsa_id}: ${advisory.summary}`,
        description: advisory.description || 'No description available',
        severity: advisory.severity === 'critical' ? 'Critical' : 'High',
        published: advisory.published_at,
        updated: advisory.updated_at,
        source: 'GitHub Security Advisories',
        link: advisory.html_url,
        cveId: advisory.cve_id,
        exploitAvailable: false
      })) || [];
  } catch (error) {
    console.error('Error fetching GitHub vulnerabilities:', error);
    return [];
  }
}

async function fetchEPSSScores(cveIds: string[]): Promise<Record<string, number>> {
  try {
    if (cveIds.length === 0) return {};
    
    const cveQuery = cveIds.slice(0, 10).join(','); // Limit to 10 CVEs
    const response = await fetch(`https://api.first.org/data/v1/epss?cve=${cveQuery}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      headers: {
        'User-Agent': 'ZeroDayRSSFeed/1.0'
      }
    });
    
    if (!response.ok) return {};
    
    const data = await response.json();
    const scores: Record<string, number> = {};
    
    data.data?.forEach((item: any) => {
      if (item.cve && item.epss) {
        scores[item.cve] = parseFloat(item.epss);
      }
    });
    
    return scores;
  } catch (error) {
    console.error('Error fetching EPSS scores:', error);
    return {};
  }
}

async function getAllVulnerabilities(): Promise<Vulnerability[]> {
  const [cisaVulns, nvdVulns, githubVulns] = await Promise.all([
    fetchCISAVulnerabilities(),
    fetchNVDVulnerabilities(),
    fetchGitHubVulnerabilities()
  ]);
  
  // Combine and sort by published date (newest first)
  const allVulns = [...cisaVulns, ...nvdVulns, ...githubVulns];
  const sortedVulns = allVulns.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
  
  // Enhance with EPSS scores
  const cveIds = sortedVulns.map(v => v.cveId).filter(Boolean) as string[];
  const epssScores = await fetchEPSSScores(cveIds);
  
  return sortedVulns.map(vuln => ({
    ...vuln,
    epssScore: vuln.cveId ? epssScores[vuln.cveId] : undefined
  }));
}

function generateRSSFeed(vulnerabilities: Vulnerability[]): string {
  const now = new Date().toUTCString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const rssItems = vulnerabilities.map(vuln => `
    <item>
      <title><![CDATA[${vuln.title}]]></title>
      <description><![CDATA[
        <p><strong>Severity:</strong> ${vuln.severity}</p>
        <p><strong>Source:</strong> ${vuln.source}</p>
        ${vuln.cvssScore ? `<p><strong>CVSS Score:</strong> ${vuln.cvssScore}</p>` : ''}
        ${vuln.epssScore ? `<p><strong>EPSS Score:</strong> ${(vuln.epssScore * 100).toFixed(1)}% (probability of exploitation)</p>` : ''}
        ${vuln.exploitAvailable ? `<p><strong>⚠️ ACTIVELY EXPLOITED:</strong> This vulnerability is being actively exploited in the wild</p>` : ''}
        <p><strong>Description:</strong></p>
        <p>${vuln.description}</p>
        <p><a href="${vuln.link}" target="_blank">View Full Details</a></p>
      ]]></description>
      <link>${vuln.link}</link>
      <guid isPermaLink="false">${vuln.id}</guid>
      <pubDate>${new Date(vuln.published).toUTCString()}</pubDate>
      <category>${vuln.severity}</category>
      ${vuln.exploitAvailable ? '<category>Actively Exploited</category>' : ''}
      ${vuln.cveId ? `<category>${vuln.cveId}</category>` : ''}
      <source url="${vuln.link}">${vuln.source}</source>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Zero-Day Intelligence Feed</title>
    <description>Real-time zero-day and critical vulnerability intelligence from CISA KEV, NVD, and GitHub Security Advisories with EPSS exploitation probability scoring</description>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>30</ttl>
    <generator>ZeroDay Intelligence RSS Feed v2.0</generator>
    <webMaster>security@example.com (Security Team)</webMaster>
    <managingEditor>security@example.com (Security Team)</managingEditor>
    <category>Security</category>
    <category>Vulnerabilities</category>
    <category>Zero-Day</category>
    <category>Threat Intelligence</category>
    <image>
      <url>${baseUrl}/security-icon.png</url>
      <title>Zero-Day Intelligence Feed</title>
      <link>${baseUrl}</link>
      <width>144</width>
      <height>144</height>
    </image>
    ${rssItems}
  </channel>
</rss>`;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Generating enhanced RSS feed with threat intelligence...');
    const vulnerabilities = await getAllVulnerabilities();
    
    if (vulnerabilities.length === 0) {
      console.warn('No vulnerabilities found, generating empty feed');
    }
    
    const rssContent = generateRSSFeed(vulnerabilities);
    
    // Enhanced headers with vulnerability metrics
    const cisaCount = vulnerabilities.filter(v => v.source.includes('CISA')).length;
    const nvdCount = vulnerabilities.filter(v => v.source.includes('NVD')).length;
    const githubCount = vulnerabilities.filter(v => v.source.includes('GitHub')).length;
    const exploitedCount = vulnerabilities.filter(v => v.exploitAvailable).length;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;
    
    return new NextResponse(rssContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
        'X-Total-Vulnerabilities': vulnerabilities.length.toString(),
        'X-CISA-Count': cisaCount.toString(),
        'X-NVD-Count': nvdCount.toString(),
        'X-GitHub-Count': githubCount.toString(),
        'X-Exploited-Count': exploitedCount.toString(),
        'X-Critical-Count': criticalCount.toString(),
        'X-Feed-Version': '2.0',
        'X-Last-Updated': new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    
    // Return a minimal error feed
    const errorFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Zero-Day Intelligence Feed - Error</title>
    <description>Error occurred while fetching vulnerability data</description>
    <link>${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}</link>
    <item>
      <title>RSS Feed Error</title>
      <description>Unable to fetch vulnerability data at this time. Please try again later.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;
    
    return new NextResponse(errorFeed, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8'
      }
    });
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const vulnerabilities = await getAllVulnerabilities();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Vulnerabilities': vulnerabilities.length.toString(),
        'X-Last-Updated': new Date().toISOString(),
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Error': 'Service temporarily unavailable'
      }
    });
  }
}