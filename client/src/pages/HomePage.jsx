import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0yaDF2NGgtMXYtNHptLTIgMmg0djFoLTR2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Forge Unforgettable Events
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-100">
              Plan conferences, workshops, exhibitions, and corporate events with
              AI-powered tools. Manage venues, speakers, sponsors, registrations, and
              attendee engagement — all in one platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                to="/register"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-transform hover:scale-105 hover:bg-primary-50"
              >
                Start Free
              </Link>
              <Link
                to="/events"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything You Need to Run World-Class Events
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
              From planning to post-event analytics, EventForge handles it all.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Ready to forge your next event?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Join thousands of organizers who trust EventForge to deliver exceptional experiences.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-transform hover:scale-105"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    icon: '📅',
    title: 'Event Management',
    description: 'Create and manage conferences, workshops, exhibitions, and corporate events with an intuitive wizard.',
  },
  {
    icon: '🏛️',
    title: 'Venue & Scheduling',
    description: 'Schedule sessions across rooms with automatic conflict detection for rooms and speakers.',
  },
  {
    icon: '🎫',
    title: 'Tickets & Registration',
    description: 'Flexible ticket categories, coupon codes, waitlist management, and approval workflows.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Content',
    description: 'Generate event descriptions, speaker bios, and announcements with AI. Get personalized session recommendations.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Track registrations, revenue, attendance, session popularity, and feedback in real-time dashboards.',
  },
  {
    icon: '📱',
    title: 'QR Check-in',
    description: 'Fast attendee check-in and session attendance tracking with QR code scanning.',
  },
];
