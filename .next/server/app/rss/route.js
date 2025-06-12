(()=>{var e={};e.id=175,e.ids=[175],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},2226:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>m,routeModule:()=>y,serverHooks:()=>S,workAsyncStorage:()=>b,workUnitAsyncStorage:()=>f});var i={};r.r(i),r.d(i,{GET:()=>v,HEAD:()=>h});var a=r(6559),n=r(8088),s=r(7719),o=r(2190);let l=[{name:"CISA KEV",url:"https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",type:"json"},{name:"NVD Recent",url:"https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&startIndex=0",type:"json"},{name:"GitHub Security",url:"https://api.github.com/advisories?per_page=15&sort=published&direction=desc",type:"json"}];async function c(){try{let e=l[0];if(!e)throw Error("CISA source configuration not found");let t=await fetch(e.url,{next:{revalidate:1800}});if(!t.ok)throw Error("Failed to fetch CISA data");let r=await t.json(),i=new Date;return i.setDate(i.getDate()-60),r.vulnerabilities?.filter(e=>new Date(e.dateAdded)>i).slice(0,15).map(e=>({id:e.cveID||`cisa-${Date.now()}-${Math.random()}`,title:`${e.cveID}: ${e.vulnerabilityName}`,description:`${e.shortDescription} | Product: ${e.product} | Vendor: ${e.vendorProject}`,severity:"Critical",published:e.dateAdded,updated:e.dateAdded,source:"CISA Known Exploited Vulnerabilities",link:`https://nvd.nist.gov/vuln/detail/${e.cveID}`,cveId:e.cveID,product:e.product,vendor:e.vendorProject,exploitAvailable:!0}))||[]}catch(e){return console.error("Error fetching CISA vulnerabilities:",e),[]}}async function u(){try{let e=l[1];if(!e)throw Error("NVD source configuration not found");let t=await fetch(e.url,{next:{revalidate:1800},headers:{"User-Agent":"ZeroDayRSSFeed/1.0"}});if(!t.ok)throw Error("Failed to fetch NVD data");let r=await t.json();return r.vulnerabilities?.filter(e=>{let t=e.cve,r=t.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore||t.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore,i=new Date(t.published),a=new Date;return a.setDate(a.getDate()-10),r>=7&&i>a}).slice(0,10).map(e=>{let t=e.cve,r=t.descriptions?.find(e=>"en"===e.lang)?.value||"No description available",i=t.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore||t.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore;return{id:t.id,title:`${t.id}: High/Critical Severity Vulnerability`,description:r,severity:i>=9?"Critical":i>=7?"High":i>=4?"Medium":"Low",published:t.published,updated:t.lastModified,source:"National Vulnerability Database",link:`https://nvd.nist.gov/vuln/detail/${t.id}`,cveId:t.id,cvssScore:i,exploitAvailable:!1}})||[]}catch(e){return console.error("Error fetching NVD vulnerabilities:",e),[]}}async function d(){try{let e=l[2];if(!e)throw Error("GitHub source configuration not found");let t=await fetch(e.url,{next:{revalidate:1800},headers:{"User-Agent":"ZeroDayRSSFeed/1.0",Accept:"application/vnd.github.v3+json"}});if(!t.ok)throw Error("Failed to fetch GitHub data");let r=await t.json();return r?.filter(e=>"critical"===e.severity||"high"===e.severity).slice(0,8).map(e=>({id:e.ghsa_id,title:`${e.ghsa_id}: ${e.summary}`,description:e.description||"No description available",severity:"critical"===e.severity?"Critical":"High",published:e.published_at,updated:e.updated_at,source:"GitHub Security Advisories",link:e.html_url,cveId:e.cve_id,exploitAvailable:!1}))||[]}catch(e){return console.error("Error fetching GitHub vulnerabilities:",e),[]}}async function p(e){try{if(0===e.length)return{};let t=e.slice(0,10).join(","),r=await fetch(`https://api.first.org/data/v1/epss?cve=${t}`,{next:{revalidate:86400},headers:{"User-Agent":"ZeroDayRSSFeed/1.0"}});if(!r.ok)return{};let i=await r.json(),a={};return i.data?.forEach(e=>{e.cve&&e.epss&&(a[e.cve]=parseFloat(e.epss))}),a}catch(e){return console.error("Error fetching EPSS scores:",e),{}}}async function g(){let[e,t,r]=await Promise.all([c(),u(),d()]),i=[...e,...t,...r].sort((e,t)=>new Date(t.published).getTime()-new Date(e.published).getTime()),a=i.map(e=>e.cveId).filter(Boolean),n=await p(a);return i.map(e=>({...e,epssScore:e.cveId?n[e.cveId]:void 0}))}async function v(e){try{let e=await g();0===e.length&&console.warn("No vulnerabilities found, generating empty feed");let t=function(e){let t=new Date().toUTCString(),r="http://localhost:3000",i=e.map(e=>`
    <item>
      <title><![CDATA[${e.title}]]></title>
      <description><![CDATA[
        <p><strong>Severity:</strong> ${e.severity}</p>
        <p><strong>Source:</strong> ${e.source}</p>
        ${e.cvssScore?`<p><strong>CVSS Score:</strong> ${e.cvssScore}</p>`:""}
        ${e.epssScore?`<p><strong>EPSS Score:</strong> ${(100*e.epssScore).toFixed(1)}% (probability of exploitation)</p>`:""}
        ${e.exploitAvailable?`<p><strong>⚠️ ACTIVELY EXPLOITED:</strong> This vulnerability is being actively exploited in the wild</p>`:""}
        <p><strong>Description:</strong></p>
        <p>${e.description}</p>
        <p><a href="${e.link}" target="_blank">View Full Details</a></p>
      ]]></description>
      <link>${e.link}</link>
      <guid isPermaLink="false">${e.id}</guid>
      <pubDate>${new Date(e.published).toUTCString()}</pubDate>
      <category>${e.severity}</category>
      ${e.exploitAvailable?"<category>Actively Exploited</category>":""}
      ${e.cveId?`<category>${e.cveId}</category>`:""}
      <source url="${e.link}">${e.source}</source>
    </item>
  `).join("");return`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Zero-Day Intelligence Feed</title>
    <description>Real-time zero-day and critical vulnerability intelligence from CISA KEV, NVD, and GitHub Security Advisories with EPSS exploitation probability scoring</description>
    <link>${r}</link>
    <atom:link href="${r}/rss" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${t}</lastBuildDate>
    <pubDate>${t}</pubDate>
    <ttl>30</ttl>
    <generator>ZeroDay Intelligence RSS Feed v2.0</generator>
    <webMaster>security@example.com (Security Team)</webMaster>
    <managingEditor>security@example.com (Security Team)</managingEditor>
    <category>Security</category>
    <category>Vulnerabilities</category>
    <category>Zero-Day</category>
    <category>Threat Intelligence</category>
    <image>
      <url>${r}/security-icon.png</url>
      <title>Zero-Day Intelligence Feed</title>
      <link>${r}</link>
      <width>144</width>
      <height>144</height>
    </image>
    ${i}
  </channel>
</rss>`}(e),r=e.filter(e=>e.source.includes("CISA")).length,i=e.filter(e=>e.source.includes("NVD")).length,a=e.filter(e=>e.source.includes("GitHub")).length,n=e.filter(e=>e.exploitAvailable).length,s=e.filter(e=>"Critical"===e.severity).length;return new o.NextResponse(t,{status:200,headers:{"Content-Type":"application/rss+xml; charset=utf-8","Cache-Control":"public, max-age=1800, stale-while-revalidate=3600","X-Total-Vulnerabilities":e.length.toString(),"X-CISA-Count":r.toString(),"X-NVD-Count":i.toString(),"X-GitHub-Count":a.toString(),"X-Exploited-Count":n.toString(),"X-Critical-Count":s.toString(),"X-Feed-Version":"2.0","X-Last-Updated":new Date().toISOString()}})}catch(t){console.error("Error generating RSS feed:",t);let e=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Zero-Day Intelligence Feed - Error</title>
    <description>Error occurred while fetching vulnerability data</description>
    <link>http://localhost:3000</link>
    <item>
      <title>RSS Feed Error</title>
      <description>Unable to fetch vulnerability data at this time. Please try again later.</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;return new o.NextResponse(e,{status:500,headers:{"Content-Type":"application/rss+xml; charset=utf-8"}})}}async function h(e){try{let e=await g();return new o.NextResponse(null,{status:200,headers:{"X-Total-Vulnerabilities":e.length.toString(),"X-Last-Updated":new Date().toISOString(),"Cache-Control":"public, max-age=300"}})}catch(e){return new o.NextResponse(null,{status:503,headers:{"X-Error":"Service temporarily unavailable"}})}}let y=new a.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/rss/route",pathname:"/rss",filename:"route",bundlePath:"app/rss/route"},resolvedPagePath:"/Users/razvan/Documents/Personale/SECFORIT 2/day0/app/rss/route.ts",nextConfigOutput:"standalone",userland:i}),{workAsyncStorage:b,workUnitAsyncStorage:f,serverHooks:S}=y;function m(){return(0,s.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:f})}},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6487:()=>{},8335:()=>{},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[447,580],()=>r(2226));module.exports=i})();