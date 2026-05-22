const fs = require('fs');

const files = fs.readdirSync('src/routes').filter(f => f.startsWith('dashboard.') && f.endsWith('.tsx'));

for (const file of files) {
  const path = 'src/routes/' + file;
  let content = fs.readFileSync(path, 'utf8');
  
  if (!content.includes('DashboardSidebar')) {
    content = content.replace(
      'import { SiteHeader } from "@/components/site-header";',
      'import { SiteHeader } from "@/components/site-header";\nimport { DashboardSidebar } from "@/components/dashboard-sidebar";'
    );
  }
  
  const targetSplit = '      <SiteHeader />\n';
  if (content.includes(targetSplit) && !content.includes('<DashboardSidebar />')) {
    const parts = content.split(targetSplit);
    if (parts.length === 2) {
      const lastDivIndex = parts[1].lastIndexOf('    </div>');
      if (lastDivIndex !== -1) {
        const innerContent = parts[1].substring(0, lastDivIndex);
        const rest = parts[1].substring(lastDivIndex);
        
        parts[1] = '      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">\n' +
                   '        <DashboardSidebar />\n' +
                   '        <main className="border-l border-border">\n' +
                   innerContent +
                   '        </main>\n' +
                   '      </div>\n' +
                   rest;
                   
        fs.writeFileSync(path, parts.join(targetSplit));
        console.log('Updated', file);
      }
    }
  }
}
