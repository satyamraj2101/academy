export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  duration: string;
  price: number;
  image: string;
  category: 'Implementation' | 'Workflow' | 'Administration' | 'Consulting';
  platforms: string[];
}

export interface Certification {
  id: string;
  title: string;
  description: string;
  price: number;
  prerequisites: string[];
  image: string;
}

export const ACADEMY_COURSES: Course[] = [
  {
    id: 'clm-fundamentals',
    title: 'CLM Platform Fundamentals',
    description: 'Master the basics of enterprise contract lifecycle management. Learn repository management, template creation, and basic reporting.',
    level: 'Beginner',
    duration: '4 Weeks',
    price: 1500,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
    category: 'Administration',
    platforms: ['Leah', 'Ironclad', 'Sirion', 'Icertis']
  },
  {
    id: 'platform-master',
    title: 'Platform Master Administration',
    description: 'Advanced administration techniques, user management, complex data migrations, and API integrations.',
    level: 'Intermediate',
    duration: '6 Weeks',
    price: 2500,
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop',
    category: 'Administration',
    platforms: ['Leah', 'Ironclad', 'Sirion', 'Icertis']
  },
  {
    id: 'advanced-workflow',
    title: 'Advanced Workflow & Automation',
    description: 'Design and deploy dynamic condition-based workflows, automated approvals, and complex rule engines.',
    level: 'Advanced',
    duration: '8 Weeks',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    category: 'Workflow',
    platforms: ['Leah', 'Ironclad']
  },
  {
    id: 'clm-consulting',
    title: 'Enterprise CLM Consulting Mastery',
    description: 'The complete consulting playbook. Learn requirements gathering, solution architecture, and enterprise deployment strategies.',
    level: 'Expert',
    duration: '12 Weeks',
    price: 8000,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop',
    category: 'Consulting',
    platforms: ['All Platforms']
  }
];

export const ACADEMY_CERTIFICATIONS: Certification[] = [
  {
    id: 'cert-implementation-specialist',
    title: 'Certified CLM Implementation Specialist',
    description: 'The industry-recognized certification for enterprise CLM deployment. Proves your ability to architect and deliver complex CLM solutions.',
    price: 500,
    prerequisites: ['Enterprise CLM Consulting Mastery'],
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'cert-workflow-architect',
    title: 'Certified Workflow Architect',
    description: 'Validates expertise in designing complex conditional workflows, approval chains, and external integrations.',
    price: 350,
    prerequisites: ['Advanced Workflow & Automation'],
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop'
  }
];
