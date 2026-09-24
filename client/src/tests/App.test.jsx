import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('renders the homepage', () => {
    renderApp();
    expect(screen.getByText('EventForge')).toBeInTheDocument();
  });

  it('renders the hero section', () => {
    renderApp();
    expect(screen.getByText('Forge Unforgettable Events')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderApp();
    expect(screen.getByText('Event Management')).toBeInTheDocument();
    expect(screen.getByText('QR Check-in')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderApp();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });
});
