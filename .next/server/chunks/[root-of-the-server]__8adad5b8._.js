module.exports = {

"[project]/.next-internal/server/app/rss/route/actions.js [app-rsc] (server actions loader, ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),
"[project]/app/rss/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "GET": (()=>GET)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
// Official sources for vulnerability data
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
    }
];
async function fetchCISAVulnerabilities() {
    try {
        const response = await fetch(VULNERABILITY_SOURCES[0].url, {
            next: {
                revalidate: 3600
            } // Cache for 1 hour
        });
        if (!response.ok) throw new Error('Failed to fetch CISA data');
        const data = await response.json();
        return data.vulnerabilities?.slice(0, 10).map((vuln)=>({
                id: vuln.cveID || `cisa-${Date.now()}-${Math.random()}`,
                title: `${vuln.cveID}: ${vuln.vulnerabilityName}`,
                description: `${vuln.shortDescription} | Product: ${vuln.product} | Vendor: ${vuln.vendorProject}`,
                severity: 'Critical',
                published: vuln.dateAdded,
                updated: vuln.dateAdded,
                source: 'CISA Known Exploited Vulnerabilities',
                link: `https://nvd.nist.gov/vuln/detail/${vuln.cveID}`,
                cveId: vuln.cveID
            })) || [];
    } catch (error) {
        console.error('Error fetching CISA vulnerabilities:', error);
        return [];
    }
}
async function fetchNVDVulnerabilities() {
    try {
        const response = await fetch(VULNERABILITY_SOURCES[1].url, {
            next: {
                revalidate: 3600
            },
            headers: {
                'User-Agent': 'ZeroDayRSSFeed/1.0'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch NVD data');
        const data = await response.json();
        return data.vulnerabilities?.slice(0, 10).map((item)=>{
            const vuln = item.cve;
            const description = vuln.descriptions?.find((d)=>d.lang === 'en')?.value || 'No description available';
            const cvssScore = vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;
            return {
                id: vuln.id,
                title: `${vuln.id}: ${description.substring(0, 100)}...`,
                description: description,
                severity: cvssScore >= 9 ? 'Critical' : cvssScore >= 7 ? 'High' : cvssScore >= 4 ? 'Medium' : 'Low',
                published: vuln.published,
                updated: vuln.lastModified,
                source: 'National Vulnerability Database',
                link: `https://nvd.nist.gov/vuln/detail/${vuln.id}`,
                cveId: vuln.id,
                cvssScore: cvssScore
            };
        }) || [];
    } catch (error) {
        console.error('Error fetching NVD vulnerabilities:', error);
        return [];
    }
}
async function getAllVulnerabilities() {
    const [cisaVulns, nvdVulns] = await Promise.all([
        fetchCISAVulnerabilities(),
        fetchNVDVulnerabilities()
    ]);
    const allVulns = [
        ...cisaVulns,
        ...nvdVulns
    ];
    return allVulns.sort((a, b)=>new Date(b.published).getTime() - new Date(a.published).getTime());
}
function generateRSSFeed(vulnerabilities) {
    const now = new Date().toUTCString();
    const baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000';
    const rssItems = vulnerabilities.map((vuln)=>`
    <item>
      <title><![CDATA[${vuln.title}]]></title>
      <description><![CDATA[
        <p><strong>Severity:</strong> ${vuln.severity}</p>
        <p><strong>Source:</strong> ${vuln.source}</p>
        ${vuln.cvssScore ? `<p><strong>CVSS Score:</strong> ${vuln.cvssScore}</p>` : ''}
        <p><strong>Description:</strong></p>
        <p>${vuln.description}</p>
        <p><a href="${vuln.link}" target="_blank">View Full Details</a></p>
      ]]></description>
      <link>${vuln.link}</link>
      <guid isPermaLink="false">${vuln.id}</guid>
      <pubDate>${new Date(vuln.published).toUTCString()}</pubDate>
      <category>${vuln.severity}</category>
      <source url="${vuln.link}">${vuln.source}</source>
    </item>
  `).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zero-Day Vulnerabilities Feed</title>
    <description>Latest zero-day and critical vulnerabilities from official security sources</description>
    <link>${baseUrl}/rss</link>
    <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <ttl>60</ttl>
    ${rssItems}
  </channel>
</rss>`;
}
async function GET(request) {
    try {
        const vulnerabilities = await getAllVulnerabilities();
        const rssContent = generateRSSFeed(vulnerabilities);
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](rssContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/rss+xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        console.error('Error generating RSS feed:', error);
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"]('Error generating feed', {
            status: 500
        });
    }
}
}}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__8adad5b8._.js.map