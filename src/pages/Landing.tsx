
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Settings, User, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Schedule posts across all platforms with our intelligent timing suggestions'
  },
  {
    icon: User,
    title: 'Multi-Account Management',
    description: 'Manage multiple social media accounts from one central dashboard'
  },
  {
    icon: Settings,
    title: 'Content Optimization',
    description: 'AI-powered suggestions to optimize your content for each platform'
  },
  {
    icon: Plus,
    title: 'Bulk Publishing',
    description: 'Create once, publish everywhere with platform-specific customizations'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$9',
    description: 'Perfect for small businesses',
    features: ['5 Social Accounts', '100 Posts/month', 'Basic Analytics', 'Email Support']
  },
  {
    name: 'Professional',
    price: '$29',
    description: 'For growing businesses',
    features: ['15 Social Accounts', 'Unlimited Posts', 'Advanced Analytics', 'Priority Support', 'Team Collaboration'],
    popular: true
  },
  {
    name: 'Enterprise',
    price: '$99',
    description: 'For large organizations',
    features: ['Unlimited Accounts', 'Custom Integrations', 'White Label', 'Dedicated Support', 'API Access']
  }
];

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-bold text-xl text-slate-900">EkClickPost</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button className="gradient-bg text-white">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Social Media Management
            <span className="gradient-bg bg-clip-text text-transparent block">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Schedule, create, and manage your social media presence across all platforms 
            with our powerful yet easy-to-use management tool.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="gradient-bg text-white text-lg px-8 py-4">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 sm:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-slate-600">
              Powerful features designed to streamline your social media workflow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover-lift">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-brand-100 rounded-xl flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-slate-600">
              Choose the perfect plan for your social media needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`border-0 shadow-md hover-lift ${
                plan.popular ? 'ring-2 ring-brand-500' : ''
              }`}>
                <CardContent className="p-8">
                  {plan.popular && (
                    <div className="text-center mb-6">
                      <span className="bg-brand-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-600 mb-4">{plan.description}</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold text-slate-900">
                        {plan.price}
                      </span>
                      <span className="text-slate-600">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'gradient-bg text-white' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-xl">EkClickPost</span>
          </div>
          <p className="text-slate-400 mb-8">
            Simplifying social media management for businesses worldwide
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-400">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Contact</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
