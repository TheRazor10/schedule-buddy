import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRoles } from '@/hooks/useRoles';

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const { refetch, isApproved } = useRoles();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    await refetch();
    setChecking(false);
    
    // If approved, reload the page to redirect
    if (isApproved) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Clock className="h-12 w-12 text-warning mx-auto mb-2" />
          <CardTitle className="text-2xl">Очаква се одобрение</CardTitle>
          <CardDescription className="text-base">
            Вашият акаунт е създаден успешно, но все още не е одобрен от администратор.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Регистриран имейл:</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Моля, изчакайте администратор да одобри вашия акаунт. След одобрение ще получите достъп до системата.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCheckStatus}
              disabled={checking}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Провери статуса
            </Button>
            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Изход
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
