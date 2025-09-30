import React, { useEffect } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';

// Pages
import AuthPage from '@/pages/AuthPage';
import HomePage from '@/pages/HomePage';
import RoomPage from '@/pages/RoomPage';
import NotFoundPage from '@/pages/not-found';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';

// Root component that handles route redirects based on auth state
function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect authenticated users from auth page to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && location === '/auth') {
      setLocation('/home');
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // Redirect unauthenticated users from root to auth
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location === '/') {
      setLocation('/auth');
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // Redirect authenticated users from root to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && location === '/') {
      setLocation('/home');
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <Route path="/home">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/room/:roomCode">
        <ProtectedRoute>
          <RoomPage />
        </ProtectedRoute>
      </Route>
      
      {/* Root redirect */}
      <Route path="/">
        {isAuthenticated ? <HomePage /> : <AuthPage />}
      </Route>
      
      {/* 404 Not Found */}
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="videoconnect-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <div className="relative h-full w-full bg-background overflow-hidden">
                {/* Main Application Routes */}
                <AppRouter />
                
                {/* Toast Notifications */}
                <Toaster />
              </div>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
