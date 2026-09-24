import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useMutation } from '@tanstack/react-query';
import { logout } from '../api/auth';
import {
  FiUser,
  FiCalendar,
  FiMapPin,
  FiPlus,
  FiLogOut,
  FiChevronDown,
  FiZap,
} from 'react-icons/fi';
import AiCopilotModal from '../components/AiCopilotModal';

export default function MainLayout() {
  const { isAuthenticated, user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const dropdownRef = useRef(null);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearUser();
      setDropdownOpen(false);
      navigate('/login');
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">EventForge</span>
          </Link>

          <nav className="flex items-center gap-5">
            <Link
              to="/events"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition"
            >
              Explore Events
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/my-tickets"
                  className="hidden md:inline-block text-sm font-medium text-gray-600 hover:text-primary-600 transition"
                >
                  My Tickets
                </Link>
                <Link
                  to="/dashboard/venues"
                  className="hidden md:inline-block text-sm font-medium text-gray-600 hover:text-primary-600 transition"
                >
                  Venues
                </Link>
                <Link
                  to="/dashboard"
                  className="hidden md:inline-block text-sm font-medium text-gray-600 hover:text-primary-600 transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/events/new"
                  className="hidden sm:inline-flex items-center rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 shadow-sm"
                >
                  + Create Event
                </Link>

                {/* Profile Avatar Dropdown Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition"
                    aria-label="User menu"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-sm shadow-sm hover:bg-primary-700 transition">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <FiChevronDown
                      className={`text-gray-500 text-xs transition-transform ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Card */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white py-2 shadow-xl ring-1 ring-black ring-opacity-5 z-50 border border-gray-100">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        {user?.globalRole === 'admin' && (
                          <span className="mt-1.5 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-800">
                            Administrator
                          </span>
                        )}
                      </div>

                      {/* Navigation Links */}
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <FiCalendar className="text-gray-400" />
                          Dashboard
                        </Link>
                        <Link
                          to="/my-tickets"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <FiUser className="text-gray-400" />
                          My Tickets & Passes
                        </Link>
                        <Link
                          to="/dashboard/venues"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <FiMapPin className="text-gray-400" />
                          Venues Management
                        </Link>
                        <Link
                          to="/dashboard/events/new"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 transition"
                        >
                          <FiPlus className="text-primary-600" />
                          Create New Event
                        </Link>
                      </div>

                      {/* Sign Out Button */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          type="button"
                          onClick={() => logoutMutation.mutate()}
                          disabled={logoutMutation.isPending}
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition font-medium"
                        >
                          <FiLogOut className="text-red-500" />
                          {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Log in
                </Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-3.5">
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} EventForge. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI Copilot Trigger */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20"
          title="Open EventForge AI Copilot"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 group-hover:rotate-12 transition">
            <FiZap className="text-amber-300 text-xs" />
          </span>
          <span>AI Copilot</span>
        </button>
      </div>

      <AiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </div>
  );
}
