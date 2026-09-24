import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import connectDB from '../config/db.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { Session } from '../models/Session.js';
import { Sponsor } from '../models/Sponsor.js';
import { Registration } from '../models/Registration.js';
import { EventMembership } from '../models/EventMembership.js';
import { RefreshToken } from '../models/RefreshToken.js';

const DEMO_PASSWORD = 'Password123!';

async function seed({ standalone = false } = {}) {
  console.log('🚀 Starting EventForge database seeding...');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  console.log('🧹 Clearing previous seed data...');
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Venue.deleteMany({}),
    Event.deleteMany({}),
    Session.deleteMany({}),
    Sponsor.deleteMany({}),
    Registration.deleteMany({}),
    EventMembership.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Create Organizations
  console.log('🏢 Creating Organizations...');
  const org1 = await Organization.create({
    name: 'TechForge Global Enterprise',
    slug: 'techforge-global',
    subscription: {
      tier: 'enterprise',
      status: 'active',
      limits: { maxEvents: 50, maxAttendees: 5000 },
    },
    contact: { email: 'contact@techforge-global.com', phone: '+1-415-555-0100' },
  });

  const org2 = await Organization.create({
    name: 'InnovateX Media Group',
    slug: 'innovatex-media',
    subscription: {
      tier: 'pro',
      status: 'active',
      limits: { maxEvents: 10, maxAttendees: 1000 },
    },
    contact: { email: 'hello@innovatex.media', phone: '+1-212-555-0199' },
  });

  // 2. Create Users
  console.log('👥 Creating Users (Admin, Organizers, Speakers, Attendees, Sponsors)...');
  const adminUser = await User.create({
    name: 'System Administrator',
    email: 'admin@eventforge.com',
    passwordHash,
    globalRole: 'admin',
    company: 'EventForge Core',
    jobTitle: 'Chief Platform Administrator',
  });

  const organizer1 = await User.create({
    name: 'Alexandra Vance',
    email: 'organizer@eventforge.com',
    passwordHash,
    globalRole: 'user',
    organization: org1._id,
    company: 'TechForge Global',
    jobTitle: 'Director of Global Events',
    bio: 'Experienced event director with over a decade curating world-class developer conferences.',
  });

  const organizer2 = await User.create({
    name: 'Sarah Jenkins',
    email: 'sarah.organizer@eventforge.com',
    passwordHash,
    globalRole: 'user',
    organization: org2._id,
    company: 'InnovateX Media',
    jobTitle: 'Head of Conferences',
  });

  const speaker1 = await User.create({
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@ai-horizon.org',
    passwordHash,
    globalRole: 'user',
    company: 'Horizon AI Labs',
    jobTitle: 'VP of Frontier Research',
    bio: 'Pioneering researcher in transformer reasoning, autonomous agents, and foundation models.',
    speakerTopics: ['Frontier AI', 'Reasoning Models', 'Agentic Systems', 'Machine Learning'],
    socialLinks: {
      twitter: 'https://twitter.com/elenarostova',
      linkedin: 'https://linkedin.com/in/elena-rostova-ai',
      github: 'https://github.com/erostova',
    },
  });

  const speaker2 = await User.create({
    name: 'Marcus Chen',
    email: 'marcus.chen@distributed-systems.io',
    passwordHash,
    globalRole: 'user',
    company: 'CloudScale Infrastructure',
    jobTitle: 'Principal Systems Architect',
    bio: 'Specialist in low-latency event distribution, distributed databases, and high-throughput microservices.',
    speakerTopics: ['Distributed Systems', 'Cloud Scale', 'Microservices', 'Kubernetes'],
    socialLinks: {
      linkedin: 'https://linkedin.com/in/marcus-chen-cloud',
      github: 'https://github.com/marcuschen',
    },
  });

  const speaker3 = await User.create({
    name: 'Aisha Patel',
    email: 'aisha.patel@security-forward.net',
    passwordHash,
    globalRole: 'user',
    company: 'CyberShield Global',
    jobTitle: 'Chief Information Security Officer',
    bio: 'Recognized cybersecurity strategist focused on Zero Trust implementations and cloud security architecture.',
    speakerTopics: ['Zero Trust', 'Cloud Security', 'AI Infrastructure Security'],
  });

  const attendee1 = await User.create({
    name: 'Alex Rivera',
    email: 'attendee@eventforge.com',
    passwordHash,
    globalRole: 'user',
    company: 'NextGen Digital',
    jobTitle: 'Senior Software Engineer',
    interests: ['Artificial Intelligence', 'Cloud Architecture'],
  });

  const attendee2 = await User.create({
    name: 'Jordan Lee',
    email: 'jordan.lee@fintech.test',
    passwordHash,
    globalRole: 'user',
    company: 'Starlight Capital',
    jobTitle: 'VP of Product',
    interests: ['Product Strategy', 'Cybersecurity'],
  });

  const attendee3 = await User.create({
    name: 'Rachel Green',
    email: 'rachel.green@designhub.test',
    passwordHash,
    globalRole: 'user',
    company: 'DesignHub Creative',
    jobTitle: 'Engineering Manager',
    interests: ['Engineering Leadership', 'Data & Analytics'],
  });

  const attendee4 = await User.create({
    name: 'David Kim',
    email: 'david.kim@enterprise.test',
    passwordHash,
    globalRole: 'user',
    company: 'Apex Systems',
    jobTitle: 'DevOps Lead',
    interests: ['Cloud Architecture', 'DevOps & Scale'],
  });

  const sponsorRep = await User.create({
    name: 'Jensen Huang (Rep)',
    email: 'jensen.rep@nvidia.com',
    passwordHash,
    globalRole: 'user',
    company: 'Nvidia Cloud Technologies',
    jobTitle: 'Partner Solutions Director',
  });

  // 3. Create Venues
  console.log('📍 Creating Venues...');
  const venue1 = await Venue.create({
    organization: org1._id,
    name: 'Moscone Center West',
    description: 'Premier convention facility in downtown San Francisco featuring multi-tier auditoriums and modern A/V.',
    address: {
      street: '747 Howard St',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      postalCode: '94103',
    },
    capacity: 3500,
    amenities: ['Gigabit Fiber WiFi', 'Auditorium A/V', 'Exhibition Floor', 'Catering Kitchen', 'Green Rooms'],
    contactEmail: 'events@moscone.com',
    contactPhone: '+1-415-974-4000',
  });

  const venue2 = await Venue.create({
    organization: org1._id,
    name: 'Metropolitan Grand Ballroom',
    description: 'Luxury executive convention venue in midtown Manhattan.',
    address: {
      street: '1535 Broadway',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10036',
    },
    capacity: 1200,
    amenities: ['Executive Lounges', 'High-Res LED Stage Walls', 'Broadcast Booths'],
    contactEmail: 'booking@metropolitan.nyc',
    contactPhone: '+1-212-398-1900',
  });

  const venue3 = await Venue.create({
    organization: org2._id,
    name: 'Austin Convention & Tech Center',
    description: 'Tech-forward event facility in Austin, TX.',
    address: {
      street: '500 E Cesar Chavez St',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      postalCode: '78701',
    },
    capacity: 2000,
    amenities: ['Outdoor Terrace', 'Workshop Labs', 'Ultra-fast WiFi'],
  });

  // 4. Create Events
  console.log('📅 Creating Events...');
  const now = new Date();
  const event1StartDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // in 15 days
  const event1EndDate = new Date(event1StartDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days long

  const event1 = await Event.create({
    organization: org1._id,
    title: 'Global AI & Cloud Summit 2026',
    slug: 'global-ai-cloud-summit-2026',
    description:
      'The premier flagship summit bringing together global technology executives, engineering architects, and researchers. Dive deep into frontier AI, multi-track scalable cloud systems, and real-world transformation blueprints.',
    type: 'conference',
    status: 'published',
    startDate: event1StartDate,
    endDate: event1EndDate,
    timezone: 'America/Los_Angeles',
    venue: venue1._id,
    capacity: 1200,
    isPublic: true,
    tags: ['Artificial Intelligence', 'Cloud Architecture', 'Innovation', 'Engineering Leadership'],
    ticketTypes: [
      {
        name: 'General Admission',
        price: 0,
        quantity: 800,
        sold: 2,
        description: 'Complimentary pass with access to all keynote sessions and the exhibition floor.',
      },
      {
        name: 'VIP Executive Pass',
        price: 299,
        quantity: 300,
        sold: 2,
        description: 'Includes priority keynote seating, VIP networking reception, and speaker lounge access.',
      },
      {
        name: 'Student & Academic Pass',
        price: 0,
        quantity: 100,
        sold: 0,
        description: 'Complimentary pass for accredited students and research faculty.',
      },
    ],
  });

  const event2StartDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // in 30 days
  const event2EndDate = new Date(event2StartDate.getTime() + 24 * 60 * 60 * 1000);

  const event2 = await Event.create({
    organization: org1._id,
    title: 'CyberSecurity Frontiers & Zero Trust 2026',
    slug: 'cybersecurity-frontiers-2026',
    description:
      'Comprehensive security conference focused on enterprise defense, cryptographic resilience, and safeguarding cloud-native environments against automated threats.',
    type: 'conference',
    status: 'published',
    startDate: event2StartDate,
    endDate: event2EndDate,
    timezone: 'America/New_York',
    venue: venue2._id,
    capacity: 600,
    isPublic: true,
    tags: ['Cybersecurity', 'Zero Trust', 'Cloud Security', 'Compliance'],
    ticketTypes: [
      {
        name: 'Standard Security Pass',
        price: 149,
        quantity: 500,
        sold: 0,
        description: 'Full conference access and technical briefings.',
      },
      {
        name: 'Executive CISO Pass',
        price: 499,
        quantity: 100,
        sold: 0,
        description: 'Includes private roundtables and closed-door threat intelligence briefings.',
      },
    ],
  });

  const event3StartDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const event3EndDate = new Date(event3StartDate.getTime() + 8 * 60 * 60 * 1000);

  const event3 = await Event.create({
    organization: org2._id,
    title: 'Next-Gen Developer Experience & Tooling Workshop',
    slug: 'next-gen-devex-workshop',
    description: 'Hands-on intensive masterclass on modern build systems, CI/CD observability, and generative developer tooling.',
    type: 'workshop',
    status: 'draft',
    startDate: event3StartDate,
    endDate: event3EndDate,
    timezone: 'America/Chicago',
    venue: venue3._id,
    capacity: 150,
    isPublic: true,
    tags: ['DevOps', 'Developer Experience', 'Productivity'],
    ticketTypes: [
      { name: 'Workshop Participant', price: 99, quantity: 150, sold: 0, description: 'Hands-on lab access' },
    ],
  });

  // 5. Event Memberships
  console.log('🤝 Creating Event Memberships...');
  await EventMembership.create([
    { event: event1._id, user: organizer1._id, role: 'organizer' },
    { event: event1._id, user: speaker1._id, role: 'speaker' },
    { event: event1._id, user: speaker2._id, role: 'speaker' },
    { event: event1._id, user: speaker3._id, role: 'speaker' },
    { event: event1._id, user: sponsorRep._id, role: 'sponsor' },
    { event: event2._id, user: organizer1._id, role: 'organizer' },
    { event: event3._id, user: organizer2._id, role: 'organizer' },
  ]);

  // 6. Multi-Track Sessions for Event 1
  console.log('🎤 Creating Multi-Track Sessions...');
  const day1Start = new Date(event1StartDate);
  day1Start.setUTCHours(9, 0, 0, 0);

  const session1Start = new Date(day1Start);
  const session1End = new Date(session1Start.getTime() + 60 * 60 * 1000); // 09:00 - 10:00

  const session2Start = new Date(session1End.getTime() + 30 * 60 * 1000); // 10:30 - 11:30
  const session2End = new Date(session2Start.getTime() + 60 * 60 * 1000);

  const session3Start = new Date(day1Start); // Parallel in Track B at 09:00 - 10:15
  const session3End = new Date(session3Start.getTime() + 75 * 60 * 1000);

  const session4Start = new Date(session3End.getTime() + 15 * 60 * 1000); // 10:30 - 11:45
  const session4End = new Date(session4Start.getTime() + 75 * 60 * 1000);

  const session5Start = new Date(day1Start.getTime() + 4 * 60 * 60 * 1000); // 13:00 - 14:15
  const session5End = new Date(session5Start.getTime() + 75 * 60 * 1000);

  await Session.create([
    {
      event: event1._id,
      title: 'Opening Keynote: Frontier Reasoning Models & The Autonomous Horizon',
      description: 'An architectural deep dive into next-generation foundation models, chain-of-thought verification, and autonomous agent loops.',
      track: { name: 'Frontier AI & Models', color: '#6366f1' },
      room: 'Main Auditorium',
      startTime: session1Start,
      endTime: session1End,
      speakers: [speaker1._id],
      tags: ['AI', 'Keynote', 'Frontier Models'],
    },
    {
      event: event1._id,
      title: 'Enterprise Agentic Architectures: From Prototype to 10M Requests/Day',
      description: 'Production strategies, deterministic guardrails, state management, and latency optimizations when deploying agent workflows.',
      track: { name: 'Frontier AI & Models', color: '#6366f1' },
      room: 'Main Auditorium',
      startTime: session2Start,
      endTime: session2End,
      speakers: [speaker1._id],
      tags: ['Agents', 'Production', 'Architecture'],
    },
    {
      event: event1._id,
      title: 'High-Throughput Distributed Storage & Zero-Latency Data Pipelines',
      description: 'Unpacking battle-tested patterns for scaling stateful distributed systems across hybrid multi-cloud topologies.',
      track: { name: 'Cloud Scale & Distributed Systems', color: '#10b981' },
      room: 'Track Hall B',
      startTime: session3Start,
      endTime: session3End,
      speakers: [speaker2._id],
      tags: ['Distributed Systems', 'Cloud', 'Storage'],
    },
    {
      event: event1._id,
      title: 'Microservices at Hyperscale: Chaos Engineering & Resiliency Lessons',
      description: 'Real-world outage retrospectives, failure domain isolation, and automated circuit breaking under catastrophic load.',
      track: { name: 'Cloud Scale & Distributed Systems', color: '#10b981' },
      room: 'Track Hall B',
      startTime: session4Start,
      endTime: session4End,
      speakers: [speaker2._id],
      tags: ['Microservices', 'Resiliency', 'Scale'],
    },
    {
      event: event1._id,
      title: 'Securing Generative Pipelines: Threat Modeling & Zero-Trust Enclaves',
      description: 'Mitigating prompt injection, securing vector database pipelines, and protecting proprietary IP in enterprise deployments.',
      track: { name: 'Security & Infrastructure', color: '#f59e0b' },
      room: 'Workshop Room 102',
      startTime: session5Start,
      endTime: session5End,
      speakers: [speaker3._id],
      tags: ['Security', 'Zero Trust', 'Infrastructure'],
    },
  ]);

  // 7. Sponsors for Event 1
  console.log('💎 Creating Sponsors & Booth Allocations...');
  await Sponsor.create([
    {
      event: event1._id,
      name: 'Nvidia Cloud Technologies',
      tier: 'platinum',
      description: 'Accelerating the world computing platform with frontier GPUs, inference microservices, and AI supercomputing.',
      websiteUrl: 'https://nvidia.com',
      boothNumber: 'Booth #A-01 (Main Entrance)',
      contactName: 'Jensen Huang (Rep)',
      contactEmail: 'jensen.rep@nvidia.com',
      representatives: [sponsorRep._id],
    },
    {
      event: event1._id,
      name: 'Cloudflare Networks',
      tier: 'gold',
      description: 'Global cloud platform delivering speed, security, and programmable edge compute across 300+ cities.',
      websiteUrl: 'https://cloudflare.com',
      boothNumber: 'Booth #B-04',
      contactName: 'Matthew Prince (Rep)',
      contactEmail: 'sponsor@cloudflare.com',
    },
    {
      event: event1._id,
      name: 'Datadog Observability',
      tier: 'silver',
      description: 'Unified monitoring, log management, and security analytics for cloud-scale applications.',
      websiteUrl: 'https://datadoghq.com',
      boothNumber: 'Booth #C-12',
      contactName: 'Alexis Le-Quoc',
      contactEmail: 'events@datadog.com',
    },
    {
      event: event1._id,
      name: 'GitHub & OpenAI Developer Hub',
      tier: 'partner',
      description: 'Empowering software developers with intelligent developer platforms and paired AI assistants.',
      websiteUrl: 'https://github.com',
      boothNumber: 'Booth #P-01',
      contactName: 'Community Partnerships Team',
      contactEmail: 'partnerships@github.com',
    },
  ]);

  // 8. Registrations & QR Codes
  console.log('🎟️ Creating Registrations with QR Code Generation...');
  const createRegistration = async (user, ticketType, paymentStatus, checkedIn) => {
    const ticketCode = `EF-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    const qrPayload = JSON.stringify({
      ticketCode,
      eventId: event1._id.toString(),
      userId: user._id.toString(),
      attendeeName: user.name,
      ticketTier: ticketType.name,
    });

    const qrCode = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    return Registration.create({
      event: event1._id,
      user: user._id,
      ticketType: {
        name: ticketType.name,
        price: ticketType.price,
      },
      ticketCode,
      qrCode,
      status: 'confirmed',
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? new Date() : undefined,
      checkedIn,
      checkedInAt: checkedIn ? new Date() : undefined,
      notes: `${ticketType.name} pass for ${user.name}`,
    });
  };

  const vipTier = event1.ticketTypes.find((t) => t.name === 'VIP Executive Pass');
  const genTier = event1.ticketTypes.find((t) => t.name === 'General Admission');

  await createRegistration(attendee1, vipTier, 'paid', true);
  await createRegistration(attendee2, genTier, 'free', true);
  await createRegistration(attendee3, vipTier, 'unpaid', false);
  await createRegistration(attendee4, genTier, 'free', false);

  console.log('\n======================================================');
  console.log('✅ EventForge Database Seeding Successfully Completed!');
  console.log('======================================================\n');
  console.log('🔑 DEMO CREDENTIALS (All accounts use password: Password123!)\n');
  console.log('┌──────────────┬───────────────────────────────┬───────────────────────────────┐');
  console.log('│ Role         │ Email                         │ Context                       │');
  console.log('├──────────────┼───────────────────────────────┼───────────────────────────────┤');
  console.log('│ Superadmin   │ admin@eventforge.com          │ Full platform administration  │');
  console.log('│ Organizer    │ organizer@eventforge.com      │ TechForge Global Director     │');
  console.log('│ Organizer 2  │ sarah.organizer@eventforge.com│ InnovateX Media Lead          │');
  console.log('│ Speaker 1    │ elena.rostova@ai-horizon.org  │ Keynote Speaker (Frontier AI) │');
  console.log('│ Speaker 2    │ marcus.chen@distributed-systems.io│ Systems Architect         │');
  console.log('│ Attendee 1   │ attendee@eventforge.com       │ VIP Pass (Checked In)         │');
  console.log('│ Attendee 2   │ jordan.lee@fintech.test       │ General Admission (Checked In)│');
  console.log('│ Attendee 3   │ rachel.green@designhub.test   │ VIP Pass (Unpaid)             │');
  console.log('│ Sponsor Rep  │ jensen.rep@nvidia.com         │ Nvidia Cloud Platinum Booth   │');
  console.log('└──────────────┴───────────────────────────────┴───────────────────────────────┘\n');
  console.log('🌐 Flagship Event: /events/global-ai-cloud-summit-2026\n');

  if (standalone) {
    process.exit(0);
  }
  return { status: 'seeded', timestamp: new Date().toISOString() };
}

export { seed as runSeed };

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seed/index.js')) {
  seed({ standalone: true }).catch((err) => {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  });
}
