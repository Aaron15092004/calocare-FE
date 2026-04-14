import React from 'react';
import { Leaf, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CleanEatingTipProps {
  title: string;
  description: string;
  category: string;
}

export const CleanEatingTip: React.FC<CleanEatingTipProps> = ({
  title,
  description,
  category,
}) => {
  return (
    <Card variant="nutrition" className="group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {category}
            </span>
            <h4 className="font-semibold text-foreground mt-1 mb-2">{title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <Button variant="ghost" size="icon" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
