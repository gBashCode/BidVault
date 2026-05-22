const fs = require('fs');

const files = fs.readdirSync('src/routes').filter(f => f.startsWith('dashboard.') && f.endsWith('.tsx'));

for (const file of files) {
  const path = 'src/routes/' + file;
  let content = fs.readFileSync(path, 'utf8');
  
  // 1. REVERT BAD CHANGES
  const badStart = '      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">\n' +
                   '        <DashboardSidebar />\n' +
                   '        <main className="border-l border-border">\n';
  
  if (content.includes(badStart)) {
    content = content.replace(badStart, '');
    
    // Replace the bad ending
    const badEnd = '        </main>\n      </div>\n    </div>\n  );\n}';
    if (content.includes(badEnd)) {
      content = content.replace(badEnd, '    </div>\n  );\n}');
    } else {
       // fallback in case of trailing spaces or newlines
       content = content.replace(/ {8}<\/main>\n {6}<\/div>\n( {4}<\/div>\n  \);\n})/, '$1');
    }
  }

  // 2. APPLY CORRECT CHANGES
  // The correct place to close </main></div> is right before the end of the main component.
  // The main component always ends with:
  //     </div>
  //   );
  // }
  // BEFORE any subcomponents which are preceded by /* ── sub-components ── */ or just another function.
  
  // Let's find the FIRST occurrence of:
  //     </div>
  //   );
  // }
  // That belongs to the main component.
  
  const targetSplit = '      <SiteHeader />\n';
  if (content.includes(targetSplit) && !content.includes('<DashboardSidebar />')) {
    const parts = content.split(targetSplit);
    
    // find the first closing of the main component
    // we look for \n    </div>\n  );\n}
    const endPattern = '\n    </div>\n  );\n}';
    const firstEndIndex = parts[1].indexOf(endPattern);
    
    if (firstEndIndex !== -1) {
      const innerContent = parts[1].substring(0, firstEndIndex);
      const rest = parts[1].substring(firstEndIndex);
      
      parts[1] = '      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">\n' +
                 '        <DashboardSidebar />\n' +
                 '        <main className="border-l border-border">\n' +
                 innerContent +
                 '\n        </main>\n      </div>' +
                 rest;
                 
      fs.writeFileSync(path, parts.join(targetSplit));
      console.log('Fixed and updated', file);
    } else {
      console.log('Could not find end of main component in', file);
      // Try alternative ending format
      const altEndPattern = '    </div>\n  );\n}';
      const altEndIndex = parts[1].indexOf(altEndPattern);
      if (altEndIndex !== -1) {
          const innerContent = parts[1].substring(0, altEndIndex);
          const rest = parts[1].substring(altEndIndex);
          
          parts[1] = '      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">\n' +
                     '        <DashboardSidebar />\n' +
                     '        <main className="border-l border-border">\n' +
                     innerContent +
                     '        </main>\n      </div>\n' +
                     rest;
                     
          fs.writeFileSync(path, parts.join(targetSplit));
          console.log('Fixed and updated (alt)', file);
      }
    }
  } else {
    // Write reverted content if we didn't re-apply
    fs.writeFileSync(path, content);
    console.log('Reverted only', file);
  }
}
