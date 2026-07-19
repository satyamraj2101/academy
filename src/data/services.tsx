import React from 'react';
import { Rocket, Cable, Headphones, GraduationCap, CheckCircle2, AlertTriangle, Workflow, Search, Layers, ShieldCheck, RefreshCw, Cpu, Blocks, Activity, Users, Award, Box } from 'lucide-react';

export interface ServiceTab {
  label: string;
  content: React.ReactNode;
  insight?: string;
  alert?: string;
}

export interface InteractiveService {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  subTabs: ServiceTab[];
}

export const interactiveServices: InteractiveService[] = [
  {
    id: 'impl',
    title: 'CLM Implementation',
    subtitle: 'Accelerated by Internal AI',
    icon: <Rocket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    href: '/services/implementation',
    subTabs: [
      {
        label: 'Overview',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-control border border-indigo-100 dark:border-indigo-900/50">
    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-indigo-900 dark:text-indigo-100">End-to-End Deployment:</strong> Flawless rollouts for Leah, Ironclad, Sirion, and Icertis — up to 40% faster than traditional agencies.
    </p>
  </div>
  <div className="flex items-start gap-3 p-3">
    <Box className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
    <ul className="text-slate-600 dark:text-slate-400 space-y-2 list-none">
      <li>• <strong>Discovery:</strong> Full process mapping before any configuration begins.</li>
      <li>• <strong>AI-Powered Workflows:</strong> Approval and routing logic drafted, then tuned with your team.</li>
      <li>• <strong>Integrations:</strong> Native connectivity with Salesforce, SAP, NetSuite, and DocuSign.</li>
      <li>• <strong>Continuous Care:</strong> A dedicated advisory team stays on well past launch.</li>
    </ul>
  </div>
</div>)
      },
      {
        label: 'Methodology',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-sky-50/50 dark:bg-sky-950/20 p-3 rounded-control border border-sky-100 dark:border-sky-900/50">
    <Workflow className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-sky-900 dark:text-sky-100">Agile 6-Phase Framework:</strong> We replace risky 'big-bang' launches with continuous validation and full transparency.
    </p>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><Search className="w-3.5 h-3.5"/> Discovery</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Deep stakeholder interviews to map out how contracts actually move through your org.</p>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Design & Build</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Proprietary AI agents accelerate data mapping and workflow generation in 1-2 week sprints.</p>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> UAT Testing</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Your team tests the system by doing their actual jobs in a mirrored environment.</p>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5"/> Continuous Care</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Intensive 3-month launch support ensures 95%+ of user friction is resolved instantly.</p>
    </div>
  </div>
</div>)
      },
      {
        label: 'Industry Pitfall',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-control border border-rose-100 dark:border-rose-900/50">
    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-rose-900 dark:text-rose-100">The Deployment Trap:</strong> 50% of deployed CLM systems are abandoned within 18 months because teams focus on deployment dates rather than actual user adoption.
    </p>
  </div>
  <div className="p-3">
    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2">How We Prevent Failure:</h5>
    <ul className="text-slate-600 dark:text-slate-400 space-y-2 list-none text-xs">
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> <strong>Intelligent Data Migration:</strong> We don't just dump PDFs. AI extracts and structures metadata accurately.</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> <strong>Built for Business, Not Software:</strong> Simple, usable workflows first. Complexity added only when genuinely needed.</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> <strong>Mandatory Integrations:</strong> By go-live, CLM is connected to CRM/ERP so users don't double-entry data.</li>
    </ul>
  </div>
</div>)
      },
    ]
  },
  {
    id: 'integ',
    title: 'Custom Integrations',
    subtitle: 'AI-Powered Automation',
    icon: <Cable className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    href: '/services/integrations',
    subTabs: [
      {
        label: 'Overview',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-control border border-indigo-100 dark:border-indigo-900/50">
    <Cable className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-indigo-900 dark:text-indigo-100">Eradicate Data Silos:</strong> Zero-latency pathways connecting CLM natively to Salesforce, SAP, Oracle, and HR systems.
    </p>
  </div>
  <div className="grid grid-cols-2 gap-3 mt-2">
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control flex items-start gap-2">
      <RefreshCw className="w-4 h-4 text-sky-600 mt-0.5" />
      <div>
        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Bi-Directional Sync</h5>
        <p className="text-[11px] text-slate-500 mt-1">No manual double-entry across Salesforce and your CLM.</p>
      </div>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control flex items-start gap-2">
      <Cpu className="w-4 h-4 text-indigo-600 mt-0.5" />
      <div>
        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">AI Monitors</h5>
        <p className="text-[11px] text-slate-500 mt-1">Agents track obligations and auto-route approvals.</p>
      </div>
    </div>
  </div>
</div>)
      },
      {
        label: 'Capabilities',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 p-3">
    <Blocks className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
    <ul className="text-slate-600 dark:text-slate-400 space-y-3 list-none">
      <li>• <strong className="text-slate-800 dark:text-slate-200">CRM & ERP Connectors:</strong> Salesforce, HubSpot, SAP, NetSuite, Oracle. Turn sales quotes directly into executable contracts.</li>
      <li>• <strong className="text-slate-800 dark:text-slate-200">Automated Renewal Engine:</strong> AI triggers workflows 60 days before expiration, notifying exact stakeholders.</li>
      <li>• <strong className="text-slate-800 dark:text-slate-200">Finance & eSignature:</strong> Seamless handshake with DocuSign, syncing executed terms straight back to Quickbooks/Sage for invoicing.</li>
    </ul>
  </div>
</div>)
      },
      {
        label: 'Industry Pitfall',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-control border border-rose-100 dark:border-rose-900/50">
    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-rose-900 dark:text-rose-100">Generic Middleware Leaks:</strong> Out-of-the-box Zapier/Workato templates often drop packets and unsync metadata under high volume.
    </p>
  </div>
  <p className="text-xs text-slate-600 dark:text-slate-400 p-2">
    We don't build band-aid integrations. We construct custom, scalable enterprise API gateways that handle your current contract volume and are guaranteed to handle 10x growth without dropping a single payload.
  </p>
</div>)
      },
    ]
  },
  {
    id: 'supp',
    title: 'Managed Support',
    subtitle: 'Specialists On-Demand',
    icon: <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    href: '/services/support',
    subTabs: [
      {
        label: 'Overview',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-control border border-indigo-100 dark:border-indigo-900/50">
    <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-indigo-900 dark:text-indigo-100">Beyond the Helpdesk:</strong> SLA-backed access to certified CLM platform engineers for complex workflow changes and scaling.
    </p>
  </div>
  <div className="flex items-start gap-3 p-3">
    <Activity className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
    <ul className="text-slate-600 dark:text-slate-400 space-y-2 list-none">
      <li>• <strong>Template Audits:</strong> Continuous schema refinement as your business evolves.</li>
      <li>• <strong>Rapid Helpdesk:</strong> Guaranteed response times to unblock urgent deals.</li>
      <li>• <strong>Quarterly Reviews:</strong> Executive reporting on adoption, bottlenecks, and ROI.</li>
    </ul>
  </div>
</div>)
      },
      {
        label: 'Engagement Process',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> 24/7 Monitoring</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Continuous system health checks and workflow tracking.</p>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control">
      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"><Award className="w-3.5 h-3.5"/> Dedicated SLAs</h5>
      <p className="text-xs text-slate-600 dark:text-slate-400">Guaranteed response times based on issue priority levels.</p>
    </div>
  </div>
</div>)
      },
      {
        label: 'Industry Pitfall',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-control border border-rose-100 dark:border-rose-900/50">
    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-rose-900 dark:text-rose-100">The Self-Service Trap:</strong> Leaving users alone with a vendor PDF manual guarantees friction and eventual platform abandonment.
    </p>
  </div>
  <p className="text-xs text-slate-600 dark:text-slate-400 p-2">
    When a contract is stuck during end-of-quarter crunch, "read the documentation" isn't a solution. Our managed support acts as an extension of your legal ops team, intervening directly in the system to fix workflow blockers instantly.
  </p>
</div>)
      },
    ]
  },
  {
    id: 'train',
    title: 'Training',
    subtitle: 'Drives Platform Adoption',
    icon: <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    href: '/services/training',
    subTabs: [
      {
        label: 'Overview',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-control border border-indigo-100 dark:border-indigo-900/50">
    <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-indigo-900 dark:text-indigo-100">Role-Based Enablement:</strong> Interactive, contextual training sandboxes tailored for Sales, Legal, and Finance teams.
    </p>
  </div>
  <div className="grid grid-cols-2 gap-3 mt-2">
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control flex items-start gap-2">
      <Users className="w-4 h-4 text-sky-600 mt-0.5" />
      <div>
        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Corporate Training</h5>
        <p className="text-[11px] text-slate-500 mt-1">Structured curriculum and sandbox environments for entire departments.</p>
      </div>
    </div>
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-control flex items-start gap-2">
      <Award className="w-4 h-4 text-indigo-600 mt-0.5" />
      <div>
        <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Admin Certification</h5>
        <p className="text-[11px] text-slate-500 mt-1">1-on-1 coaching to build certified internal power-users.</p>
      </div>
    </div>
  </div>
</div>)
      },
      {
        label: 'Delivery Framework',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 p-3">
    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
    <ul className="text-slate-600 dark:text-slate-400 space-y-3 list-none">
      <li>• <strong className="text-slate-800 dark:text-slate-200">Needs Assessment:</strong> Evaluate current team proficiency.</li>
      <li>• <strong className="text-slate-800 dark:text-slate-200">Customized Playbooks:</strong> Tailor training to specific use cases.</li>
      <li>• <strong className="text-slate-800 dark:text-slate-200">Interactive Workshops:</strong> Hands-on sandbox sessions.</li>
    </ul>
  </div>
</div>)
      },
      {
        label: 'Industry Pitfall',
        content: (
<div className="space-y-4 text-sm leading-relaxed">
  <div className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-control border border-rose-100 dark:border-rose-900/50">
    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
    <p className="text-slate-700 dark:text-slate-300">
      <strong className="font-bold text-rose-900 dark:text-rose-100">Generic Seminar Failure:</strong> Broad, 100-person Zoom calls about "How to use CLM" are forgotten within a week.
    </p>
  </div>
  <p className="text-xs text-slate-600 dark:text-slate-400 p-2">
    If a sales rep is forced to sit through how legal structures templates, they tune out. We deliver hyper-focused, role-specific coaching. Sales learns how to generate NDAs; Legal learns how to audit clauses. Context drives 90%+ daily adoption.
  </p>
</div>)
      },
    ]
  },
];
