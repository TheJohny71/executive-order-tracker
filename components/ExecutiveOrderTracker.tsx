import React from 'react';
import { List, BarChart2, Search, Filter, Calendar, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function ExecutiveOrderTracker() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Executive Order Tracker</h1>
          <p className="text-muted-foreground">
            Last Updated: 2/2/2025 • Track and analyze White House executive orders and memoranda
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex space-x-4">
          <Button variant="outline" size="icon">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button variant="outline">Compare</Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders... (Press '/' to focus)" 
              className="pl-10"
            />
          </div>
          
          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="executive-order">Executive Order</SelectItem>
              <SelectItem value="memorandum">Memorandum</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="environment">Environment</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              {/* Add more categories */}
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Agencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dhs">DHS</SelectItem>
              <SelectItem value="doe">DOE</SelectItem>
              <SelectItem value="doj">DOJ</SelectItem>
              {/* Add more agencies */}
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Select Date
          </Button>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing 0 of 0 orders</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Orders List/Grid will go here */}
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}