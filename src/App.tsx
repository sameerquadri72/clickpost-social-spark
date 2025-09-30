import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PostsProvider } from "@/contexts/PostsContext";
import { SocialAccountsProvider } from "@/contexts/SocialAccountsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { scheduledPublishingService } from "@/services/scheduledPublishingService";
import { Layout } from "@/components/Layout";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { OAuthCallbackHandler } from "@/components/OAuthCallbackHandler";
import NotFound from "./pages/NotFound";
import { CreatePost } from "@/pages/CreatePost";
import { Calendar } from "@/pages/Calendar";
import { Accounts } from "@/pages/Accounts";
import { ScheduledPosts } from "@/pages/ScheduledPosts";
import { Drafts } from "@/pages/Drafts";

const queryClient = new QueryClient();

const App = () => {
  // Start the scheduled publishing service when the app loads
  React.useEffect(() => {
    // Start the service after a short delay to ensure auth is ready
    const timer = setTimeout(() => {
      scheduledPublishingService.start();
    }, 2000);

    return () => {
      clearTimeout(timer);
      scheduledPublishingService.stop();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SocialAccountsProvider>
            <PostsProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* OAuth Callbacks */}
                <Route path="/auth/:platform/callback" element={<OAuthCallbackHandler />} />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/create" element={
                  <ProtectedRoute>
                    <Layout>
                      <CreatePost />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/scheduled" element={
                  <ProtectedRoute>
                    <Layout>
                      <ScheduledPosts />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/drafts" element={
                  <ProtectedRoute>
                    <Layout>
                      <Drafts />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/content" element={
                  <ProtectedRoute>
                    <Layout>
                      <div className="text-center py-20">
                        <h1 className="text-3xl font-bold mb-4">Content Management</h1>
                        <p className="text-slate-600">Content management interface coming soon...</p>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <Layout>
                      <Calendar />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/accounts" element={
                  <ProtectedRoute>
                    <Layout>
                      <Accounts />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Layout>
                      <div className="text-center py-20">
                        <h1 className="text-3xl font-bold mb-4">Settings</h1>
                        <p className="text-slate-600">Settings interface coming soon...</p>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </PostsProvider>
          </SocialAccountsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;