
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Settings, 
  User, 
  Plus, 
  Image,
  Menu
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Calendar },
  { title: 'Create Post', url: '/create', icon: Plus },
  { title: 'Content', url: '/content', icon: Image },
  { title: 'Calendar', url: '/calendar', icon: Calendar },
  { title: 'Accounts', url: '/accounts', icon: User },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-brand-100 text-brand-700 font-medium border-r-2 border-brand-500" 
      : "hover:bg-slate-100 text-slate-600 hover:text-slate-900";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-slate-900">EkClickPost</h1>
              <p className="text-xs text-slate-500">Social Media Manager</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavClassName}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {collapsed && (
        <div className="p-2">
          <SidebarTrigger className="w-full" />
        </div>
      )}
    </Sidebar>
  );
}
