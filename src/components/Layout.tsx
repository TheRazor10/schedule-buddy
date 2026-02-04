import { ReactNode } from 'react';
import { useAppContext } from '@/context/AppContext';
import FirmSelector from './FirmSelector';
import { Skeleton } from '@/components/ui/skeleton';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-[200px]" />
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with firm selector */}
      <div className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <FirmSelector />
            <div className="text-xs text-muted-foreground hidden sm:block">
              Автоматично запазване
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
