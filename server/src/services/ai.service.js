import { Event } from '../models/Event.js';
import { Session } from '../models/Session.js';
import { NotFoundError } from '../utils/AppError.js';

// Normalize topics input to array of strings
const normalizeTopics = (topics) => {
  if (!topics) return [];
  if (Array.isArray(topics)) return topics.map((t) => String(t).trim()).filter(Boolean);
  return String(topics)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
};

export const generateEventMarketingCopy = async ({
  title,
  type = 'conference',
  topics,
  tone = 'professional',
  targetAudience,
}) => {
  const topicList = normalizeTopics(topics);
  const topicsStr = topicList.length > 0 ? topicList.join(', ') : 'innovative technologies, leadership, and industry disruption';
  const audience = targetAudience || 'industry leaders, executives, engineers, and visionaries';

  const toneAdjectives = {
    professional: 'world-class, high-impact, and authoritative',
    inspirational: 'visionary, transformative, and empowering',
    energetic: 'fast-paced, exhilarating, and boundary-pushing',
    technical: 'deep-dive, engineering-focused, and cutting-edge',
  };
  const style = toneAdjectives[tone] || toneAdjectives.professional;

  const tagline = `Shaping the Next Horizon of ${title.replace(/(Summit|Conference|Expo|Workshop)/gi, '').trim() || 'Innovation'}`;

  const shortSummary = `Join ${audience} at ${title} for a ${style} exploration of ${topicsStr}.`;

  const description = `${title} is the premier ${type} bringing together ${audience} from across the globe. Designed to deliver an immersive and ${style} experience, this flagship summit dives deep into ${topicsStr}.

Attendees will gain privileged insights through keynotes by world-renowned experts, hands-on masterclasses, and executive multi-track discussions. Whether you are scaling an enterprise, building frontier products, or establishing transformative partnerships, this gathering provides the blueprint, network, and momentum you need to lead your industry forward.`;

  const socialTeasers = [
    `🚀 Mark your calendars! ${title} is gathering top minds to explore ${topicsStr}. Secure your pass now! #${title.replace(/[^a-zA-Z0-9]/g, '')} #Innovation`,
    `Excited to announce ${title} — a ${style} gathering for ${audience}. Discover actionable insights and connect with peers. Details: [link]`,
  ];

  const keyTakeaways = [
    `Uncover strategic playbooks for navigating ${topicList[0] || 'emerging industry shifts'}`,
    `Network with top-tier practitioners and decision-makers in exclusive breakout lounges`,
    `Experience multi-track deep dives into scalable architectures, product strategies, and future trends`,
  ];

  return {
    title,
    tagline,
    shortSummary,
    description,
    socialTeasers,
    keyTakeaways,
    suggestedTags: topicList.length > 0 ? topicList : ['Technology', 'Leadership', 'Innovation', 'FutureTrends'],
  };
};

export const generateStructuredAgenda = async ({
  eventTitle,
  tracksCount = 2,
  sessionsPerTrack = 3,
  topics,
  audience,
}) => {
  const topicList = normalizeTopics(topics);
  const primaryTopic = topicList[0] || 'Modern Engineering';
  const secondaryTopic = topicList[1] || 'Leadership & Strategy';

  const trackThemes = [
    { name: `${primaryTopic} Track`, color: '#4f46e5' },
    { name: `${secondaryTopic} Track`, color: '#059669' },
    { name: 'Emerging Frontiers', color: '#d97706' },
    { name: 'Executive Masterclass', color: '#dc2626' },
    { name: 'Hands-on Labs', color: '#7c3aed' },
  ];

  const selectedTracks = trackThemes.slice(0, Math.min(tracksCount, trackThemes.length));

  const sampleSessionTemplates = [
    {
      titleSuffix: 'Architectures: Zero to Scale',
      descSuffix: 'Deep dive into mission-critical systems and battle-tested patterns for high throughput.',
      room: 'Main Auditorium',
      duration: 60,
    },
    {
      titleSuffix: 'The Executive Playbook: Strategic Roadmaps',
      descSuffix: 'How forward-thinking leadership teams orchestrate capital, talent, and technological advantage.',
      room: 'Executive Hall B',
      duration: 45,
    },
    {
      titleSuffix: 'Practical Implementations & Case Studies',
      descSuffix: 'Unpacking real-world transformations, production failures, and hard-earned engineering lessons.',
      room: 'Workshop Room 102',
      duration: 60,
    },
    {
      titleSuffix: 'Future Horizons & Keynote Discussion',
      descSuffix: 'Panel and open forum analyzing the next 5 years of disruptive evolution.',
      room: 'Keynote Theatre',
      duration: 90,
    },
  ];

  const generatedSessions = [];
  selectedTracks.forEach((track, tIdx) => {
    for (let i = 0; i < sessionsPerTrack; i++) {
      const template = sampleSessionTemplates[(tIdx + i) % sampleSessionTemplates.length];
      const sessionTitle = `${track.name.replace(/ Track/i, '')}: ${template.titleSuffix}`;
      generatedSessions.push({
        title: sessionTitle,
        description: template.descSuffix,
        trackName: track.name,
        trackColor: track.color,
        room: template.room,
        durationMinutes: template.duration,
        tags: [track.name.split(' ')[0], 'Innovation', '2026'],
      });
    }
  });

  return {
    eventTitle,
    tracks: selectedTracks,
    totalSessions: generatedSessions.length,
    sessions: generatedSessions,
  };
};

export const polishSpeakerBio = async ({
  name,
  company,
  jobTitle,
  rawBio,
  speakerTopics,
}) => {
  const topics = normalizeTopics(speakerTopics);
  const companyStr = company ? ` at ${company}` : '';
  const titleStr = jobTitle ? `${jobTitle}${companyStr}` : 'Distinguished Leader';

  const polishedBio = `${name} is ${titleStr}, specializing in ${
    topics.length > 0 ? topics.join(', ') : 'transformative engineering and technology strategy'
  }. With an extensive track record of delivering high-impact solutions and driving organizational growth, ${name} has earned recognition as a thought leader and frequent keynote speaker across international tech conferences.

${rawBio.trim()}

Passionate about mentoring next-generation builders and fostering cultures of continuous innovation, ${name} brings pragmatic frameworks and actionable blueprints to every presentation.`;

  const shortBio = `${name} is ${titleStr}. An expert in ${
    topics[0] || 'cutting-edge technology'
  }, dedicated to accelerating industry transformation.`;

  const suggestedTalks = [
    `Navigating the Shift: Next-Gen ${topics[0] || 'Technology'} in Enterprise Production`,
    `Scaling High-Velocity Teams: The Human Factor of Engineering`,
    `Lessons from the Field: Building Resilient Systems in 2026`,
  ];

  return {
    name,
    polishedBio,
    shortBio,
    suggestedTalks,
  };
};

export const recommendPersonalizedSchedule = async (eventId, { interests, jobTitle, user }) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  const sessions = await Session.find({ event: eventId })
    .populate('speakers', 'name company jobTitle avatar')
    .sort({ startTime: 1 });

  if (sessions.length === 0) {
    return {
      eventId,
      eventTitle: event.title,
      recommendations: [],
      message: 'No sessions have been scheduled for this event yet.',
    };
  }

  // Combine query interests with user profile interests if logged in
  const queryInterestList = normalizeTopics(interests);
  const profileInterestList = user?.interests || [];
  const allInterests = Array.from(new Set([...queryInterestList, ...profileInterestList]));
  const role = jobTitle || user?.jobTitle || '';

  // Score each session based on keyword overlap
  const scoredSessions = sessions.map((session) => {
    let score = 50; // base score
    const reasonParts = [];

    const searchableText = `${session.title} ${session.description || ''} ${session.track?.name || ''} ${(session.tags || []).join(' ')}`.toLowerCase();

    // Check interests overlap
    allInterests.forEach((interest) => {
      if (searchableText.includes(interest.toLowerCase())) {
        score += 25;
        reasonParts.push(`matches "${interest}"`);
      }
    });

    // Check role/job title alignment
    if (role && searchableText.includes(role.toLowerCase().split(' ')[0])) {
      score += 20;
      reasonParts.push(`relevant to ${role}`);
    }

    // Boost keynotes and general tracks
    if (session.track?.name?.toLowerCase().includes('keynote') || session.title.toLowerCase().includes('keynote')) {
      score += 15;
      reasonParts.push('featured keynote');
    }

    const matchScore = Math.min(99, Math.max(60, score));
    const matchReason =
      reasonParts.length > 0
        ? `Recommended because it ${reasonParts.join(', ')}.`
        : 'High-value session recommended for all conference attendees.';

    return {
      session: {
        _id: session._id,
        title: session.title,
        description: session.description,
        room: session.room,
        track: session.track,
        startTime: session.startTime,
        endTime: session.endTime,
        speakers: session.speakers,
      },
      matchScore,
      matchReason,
    };
  });

  // Sort by match score descending
  scoredSessions.sort((a, b) => b.matchScore - a.matchScore);

  return {
    eventId,
    eventTitle: event.title,
    userProfile: {
      matchedInterests: allInterests,
      role,
    },
    totalRecommended: scoredSessions.length,
    recommendations: scoredSessions,
  };
};

export const runCopilotChat = async ({ message, history = [], eventId, user }) => {
  let eventContext = null;
  if (eventId) {
    try {
      const ev = await Event.findById(eventId).populate('venue');
      if (ev) {
        eventContext = {
          title: ev.title,
          type: ev.type,
          capacity: ev.capacity,
          startDate: ev.startDate,
          status: ev.status,
          venue: ev.venue?.name || 'In-Person',
        };
      }
    } catch {
      // Ignore if event not found
    }
  }

  const msgLower = message.toLowerCase();

  let responseContent = '';

  if (msgLower.includes('pricing') || msgLower.includes('ticket')) {
    responseContent = `For a ${eventContext?.type || 'conference'} like "${eventContext?.title || 'your event'}", here is a proven 3-tier ticketing strategy:

1. **Early Bird Pass ($99 - $149)**
   - Capped at first 20% of capacity or 30 days prior.
   - Drives immediate cash flow and early registration momentum.
2. **Standard Full Conference Pass ($249 - $349)**
   - Full general admission access to all multi-track sessions, keynotes, and the exhibition floor.
3. **VIP Executive Pass ($599 - $799)**
   - Includes priority keynote seating, VIP networking lounge, speaker reception access, and on-demand session recordings.

💡 *Pro-tip: Set ticket capacity limits in EventForge to automatically prevent overselling.*`;
  } else if (msgLower.includes('email') || msgLower.includes('announcement') || msgLower.includes('newsletter') || msgLower.includes('marketing') || msgLower.includes('promo')) {
    responseContent = `Here is a launch announcement draft for your attendees:

**Subject: Announcing ${eventContext?.title || 'Our Flagship Tech Summit 2026'} — Registration Now Open!**

Hi [First Name],

We are thrilled to officially unveil **${eventContext?.title || 'EventForge Summit'}**, taking place on ${eventContext?.startDate ? new Date(eventContext.startDate).toLocaleDateString() : 'the upcoming summit dates'}.

Join global industry leaders and technical innovators for 2 days of immersive keynotes, multi-track masterclasses, and executive networking.

👉 **Secure your early bird ticket today**: [Registration Link]

We look forward to welcoming you!
*The EventForge Organizing Committee*`;
  } else if (msgLower.includes('sponsor') || msgLower.includes('booth') || msgLower.includes('exhibition') || msgLower.includes('tier')) {
    responseContent = `Here are 4 high-value sponsorship deliverables corporate partners love:

- 💎 **Platinum Tier ($10,000+)**: Exclusive keynote stage naming rights, 10x10 premium booth stand at the main hall entrance, and dedicated pre-conference promotional emails.
- 🥇 **Gold Tier ($5,000)**: Standard 8x8 booth stand, attendee badge lanyard branding, and 5 complimentary executive passes.
- 🥈 **Silver Tier ($2,500)**: Logo in public schedule directory, reception sponsorship signage, and 2 attendee passes.
- 📍 **Exhibition Stand Optimization**: Place coffee stations and networking lounges adjacent to sponsor booths to maximize foot traffic and attendee dwell time.`;
  } else if (msgLower.includes('checklist') || msgLower.includes('day-of') || msgLower.includes('logistics') || msgLower.includes('run of show')) {
    responseContent = `Here is an essential **Day-of-Event Organizer Checklist**:

**T-minus 3 Hours (Setup & Audio/Visual)**
- [ ] Verify A/V mic batteries, presentation clickers, and projector resolutions in each track room.
- [ ] Place registration check-in desks, charge QR code scanners, and organize printed badge stations.
- [ ] Confirm venue WiFi credentials and test attendee sign-in portal.

**T-minus 1 Hour (Speaker & Sponsor Briefing)**
- [ ] Meet keynote speakers in Green Room; load final slide decks to presentation laptops.
- [ ] Verify sponsor booth reps have badges, power strips, and promotional materials in place.

**Doors Open (Live Check-In)**
- [ ] Monitor real-time check-in velocity on the EventForge Analytics dashboard.
- [ ] Ensure volunteers guide flow between Main Stage and Track breakout rooms.`;
  } else if (msgLower.includes('agenda') || msgLower.includes('schedule') || msgLower.includes('track') || msgLower.includes('session')) {
    responseContent = `Here is a recommended agenda structure for **"${eventContext?.title || 'your event'}"**:

- **08:30 - 09:30 UTC**: Registration & Morning Networking Coffee
- **09:30 - 10:30 UTC**: Opening Keynote & Industry Landscape Analysis
- **10:45 - 12:15 UTC**: Parallel Multi-Track Breakouts (Engineering vs. Strategy)
- **12:15 - 13:30 UTC**: Catered Lunch & Exhibition Hall Exploration
- **13:30 - 15:00 UTC**: Deep-Dive Masterclasses & Hands-on Workshops
- **15:15 - 16:30 UTC**: Executive Panel Discussion & Q&A
- **16:30 - 18:00 UTC**: Sponsor Mixer & Evening Networking Reception`;
  } else if (msgLower.includes('speaker') || msgLower.includes('keynote') || msgLower.includes('talk')) {
    responseContent = `Key tips for speaker coordination:
1. **Send Invitations Early**: Use EventForge's Invite Speaker flow to generate personal access links.
2. **Standardize Deck Formats**: Request 16:9 widescreen slide decks at least 48 hours prior.
3. **Buffer Times**: Schedule 15-minute buffers between presentations for Q&A and seamless mic changeovers.`;
  } else {
    responseContent = `I am your **EventForge AI Copilot**. ${
      eventContext ? `Currently assisting with **"${eventContext.title}"** (${eventContext.type}).` : ''
    }

Here is what I can help you with:
- 🎟️ **Ticketing Strategy**: Recommend pricing tiers and capacity allocations.
- ✍️ **Marketing Copy**: Draft promotional emails, LinkedIn teasers, and website bios.
- 🤝 **Sponsor Proposals**: Structure tiered packages and booth floor layouts.
- 📋 **Event Checklist**: Day-of logistics and run-of-show schedules.
- 💡 **Agenda Planning**: Multi-track sessions, keynote buffers, and breakout tracks.

What would you like to build or optimize next?`;
  }

  return {
    response: responseContent,
    context: eventContext,
    timestamp: new Date().toISOString(),
  };
};
