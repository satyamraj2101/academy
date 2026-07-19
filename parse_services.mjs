import fs from 'fs';

const content = fs.readFileSync('ecosystem_content_utf8.md', 'utf8');

const services = [];
let currentService = null;
let currentTab = null;

const lines = content.split('\n').map(l => l.trimRight());

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('# SERVICE ')) {
    if (currentService) services.push(currentService);
    currentService = { id: '', title: '', subtitle: '', subTabs: [] };
    if (line.includes('IMPLEMENTATION')) currentService.id = 'impl';
    if (line.includes('INTEGRATION')) currentService.id = 'integ';
    if (line.includes('SUPPORT')) currentService.id = 'supp';
    if (line.includes('TRAINING')) currentService.id = 'train';
  }
  
  if (line.includes('ACCELERATED BY INTERNAL AI')) currentService.subtitle = 'Accelerated by Internal AI';
  if (line.includes('AI-POWERED AUTOMATION')) currentService.subtitle = 'AI-Powered Automation';
  if (line.includes('DEDICATED CLM SPECIALISTS')) currentService.subtitle = 'Dedicated Specialists on Demand';
  if (line.includes('DRIVES ADOPTION AND LONG-TERM CONFIDENCE')) currentService.subtitle = 'Drives Adoption & Confidence';
  
  if (line.includes('"CLM Implementation"')) currentService.title = 'CLM Implementation';
  if (line.includes('"Custom Integrations"')) currentService.title = 'Custom Integrations';
  if (line.includes('"Managed Support"')) currentService.title = 'Managed Support';
  if (line.includes('"Training"')) currentService.title = 'Training';
  
  if (line.match(/^## TAB \d\.\d/)) {
    if (currentTab) currentService.subTabs.push(currentTab);
    currentTab = { label: '', content: '' };
    if (line.includes('OVERVIEW')) currentTab.label = 'Overview';
    else if (line.includes('OUR METHODOLOGY')) currentTab.label = 'Our Methodology';
    else if (line.includes('INDUSTRY PITFALL')) currentTab.label = 'Industry Pitfall';
    else currentTab.label = line.replace(/^## TAB \d\.\d ΓÇö /, '').replace(/^## TAB \d\.\d — /, '').trim();
  }
  
  if (currentTab && line.includes('__Headline:')) {
    const headline = lines[i+1] ? lines[i+1].replace(/^__"/, '').replace(/"\s*$/, '').trim() : '';
    currentTab.content += `**${headline}**\n\n`;
  }
  if (currentTab && line.includes('__Sub-headline:')) {
    const sub = lines[i+1] ? lines[i+1].replace(/^__"/, '').replace(/"\s*$/, '').trim() : '';
    currentTab.content += `*${sub}*\n\n`;
  }
  if (currentTab && line.includes('__Body Copy:')) {
    let body = '';
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('##') && !lines[j].startsWith('# SERVICE')) {
      let bLine = lines[j].replace(/^__/, '').trim();
      bLine = bLine.replace(/ΓÇö/g, '—').replace(/ΓÇó/g, '•');
      if (bLine.length > 0) {
        body += bLine + '\n\n';
      }
      j++;
    }
    currentTab.content += body.trim();
  }
}

if (currentTab) currentService.subTabs.push(currentTab);
if (currentService) services.push(currentService);

const jsCode = `import React from 'react';
import { Rocket, Cable, Headphones, GraduationCap } from 'lucide-react';

export const interactiveServices = [
${services.map(s => `  {
    id: '${s.id}',
    title: '${s.title}',
    subtitle: '${s.subtitle}',
    icon: <${s.id === 'impl' ? 'Rocket' : s.id === 'integ' ? 'Cable' : s.id === 'supp' ? 'Headphones' : 'GraduationCap'} className="w-5 h-5 text-indigo-600 dark:text-indigo-405" />,
    href: '/services/${s.id === 'impl' ? 'implementation' : s.id === 'integ' ? 'integrations' : s.id === 'supp' ? 'support' : 'training'}',
    subTabs: [
${s.subTabs.map(t => `      {
        label: '${t.label}',
        content: ${JSON.stringify(t.content)}
      }`).join(',\n')}
    ]
  }`).join(',\n')}
];
`;

fs.writeFileSync('src/data/services.tsx', jsCode);
console.log('Successfully wrote src/data/services.tsx with full content!');
