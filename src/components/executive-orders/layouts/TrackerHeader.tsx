// File: src/components/executive-orders/layouts/TrackerHeader.tsx
// Description: Header component with navigation and actions

import React from 'react';
import { 
  Search, 
  PlusCircle, 
  FileText, 
  Users, 
  Bell, 
  User, 
  Settings, 
  Moon, 
  Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TrackerHeaderProps {
  onSearch: (query: string) => void;
  onCreateNew: () => void;
  onThemeToggle: () => void;
  className?: string;
}

export function TrackerHeader({
  onSearch,
  onCreateNew,
  onThemeToggle,
  className = ''
}: TrackerHeaderProps) {
  return (
    <nav className={`bg-white border-b ${className}`}>
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Brand and Navigation */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">EO Tracker Pro</h1>
            <div className="hidden md:flex space-x-4">
              <Button variant="ghost">Dashboard</Button>
              <Button variant="ghost">Orders</Button>
              <Button variant="ghost">Analytics</Button>
              <Button variant="ghost">Workspace</Button>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {/* Global Search */}
            <div className="hidden lg:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 w-96"
                placeholder="Search orders, annotations, or press / for commands..."
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onCreateNew}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Annotation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="h-4 w-4 mr-2" />
                  New Workspace
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="h-4 w-4 mr-2" />
                  New Alert
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onThemeToggle}>
                  <Moon className="h-4 w-4 mr-2" />
                  Theme
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Lock className="h-4 w-4 mr-2" />
                  Security
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}