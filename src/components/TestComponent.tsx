import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TestComponent() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Component Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input placeholder="Type something..." />
        </div>
        <div>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Option 1</SelectItem>
              <SelectItem value="2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button>Click me</Button>
        </div>
      </CardContent>
    </Card>
  );
}
