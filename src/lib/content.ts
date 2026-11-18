import type { Contributor, RoadmapStage } from './types';

export const C = {
  brand: 'LearnSteer 2.0',
  nav: ['Services', 'Partners', 'About', 'Contact', 'Careers'],
  hero: {
    lines: ['Empowering education,', 'by youth.'],
    sub: 'Three decades of restoring excellence and reigniting the joy of the drive.',
    cta: 'Join with us',
    src: 'https://qzcvzusrjusqyqqkvyln.supabase.co/storage/v1/object/public/media/hero/videoplayback.mp4',
   // poster: '',
  },
  feat: {
    label: 'Porsche Certified Collision Centre',
    text:
      'ESR is recognised as an official Porsche Certified Collision Centre, one of only a select few in Australia. This rare endorsement, awarded by Porsche AG, reflects our long-standing commitment to precision, craftsmanship, and brand-aligned repair standards. From dedicated tooling to factory-trained technicians, every element of our process is engineered to restore your Porsche to its original form, precisely as the factory intended.',
  },
  marques: {
    intro: 'ESR specialise exclusively with the world’s most prestigious marques.',
    list: [
      'Porsche', 'Bentley', 'Ferrari', 'Rolls-Royce', 'Aston Martin', 'Lamborghini',
      'McLaren', 'Mercedes-AMG', 'BMW M', 'Audi RS', 'Range Rover', 'Maserati',
    ],
  },
  sol: {
    label: 'Tailored Solutions',
    text:
      'At ESR, we offer a complete end-to-end service experience for owners of luxury and high-performance vehicles. From minor repairs to complex structural restorations, every project is executed with manufacturer-aligned precision and unwavering attention to detail. Our advanced facilities, specialised tooling, and experienced technicians are supported by more than 30 years of industry trust, ensuring every vehicle receives care equal to the brand it carries, and every client receives service equal to the expectations they bring.',
    over: 'Our services',
    list: [
      'Insurance Repairs',
      'Claims Management',
      'Privately Commissioned Repairs',
      'High-end Detailing, Ceramic Coating, Paint Protection Film Packages',
      'Vehicle Transport & Collection',
      'Prestige Courtesy Vehicle Program',
    ],
  },
  footer: {
    sub: 'Automotive Group. Sydney, Australia. 1989 © 2026 ESR. All Rights Reserved.',
    signup: 'Sign up',
    ig: '@esrbespoke',
    priv: 'Privacy',
    contact: '(02) 9735 1111<br>enquiries@esrbespoke.au<br>8am – 5pm Monday to Friday',
    hq: ['ESR HQ', '419-431 Canterbury Road, Campsie NSW 2194', 'Hq@esrbespoke.au'],
    studio: ['ESR Bespoke Studio', '16-20 Birmingham Street, Alexandria NSW 2015', 'Studio@esrbespoke.au'],
  },
};



export const DEFAULT_STAGES: RoadmapStage[] = [
  { id: 's1', title: 'Idea & Founding', status: 'Completed', date_label: '2024', description: 'A group of students sets out to steer learning themselves.', sort_order: 1 },
  { id: 's2', title: 'Pilot Programs', status: 'Completed', date_label: '2025', description: 'First youth-led programs tested with partner schools.', sort_order: 2 },
  { id: 's3', title: 'LearnSteer 2.0 Platform', status: 'In progress', date_label: '2026', description: 'Building the platform that connects learners and mentors.', sort_order: 3 },
  { id: 's4', title: 'Island-wide Expansion', status: 'Planned', date_label: '2027', description: 'Bringing the program to every district.', sort_order: 4 },
];

const TEAMS = ['Programs', 'Engineering', 'Design', 'Partnerships', 'Research'];
export const PLACEHOLDER_CONTRIBUTORS: Contributor[] = Array.from({ length: 50 }, (_, i) => ({
  id: `c${i}`,
  name: `Contributor ${String(i + 1).padStart(2, '0')}`,
  role: `${TEAMS[i % 5]} ${['Lead', 'Member', 'Volunteer'][Math.floor(i / 5) % 3]}`,
  team: TEAMS[i % 5],
  image_path: null,
  link: null,
  sort_order: i + 1,
}));
