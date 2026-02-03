import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles, useAdminUsers } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, X, Loader2, Shield, Users, UserCheck, Clock } from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const { pendingUsers, approvedUsers, loading: usersLoading, approveUser, revokeApproval } = useAdminUsers();

  const handleApprove = async (userId: string) => {
    await approveUser(userId);
  };

  const handleRevoke = async (userId: string) => {
    await revokeApproval(userId);
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Достъпът е забранен</CardTitle>
            <CardDescription>
              Нямате права за достъп до тази страница
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Обратно към началото
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Администраторски панел</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut}>
            Изход
          </Button>
        </div>

        {/* Pending Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle>Чакащи одобрение</CardTitle>
            </div>
            <CardDescription>
              Потребители, които чакат одобрение за достъп
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Няма чакащи потребители за одобрение
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Регистриран: {new Date(user.created_at).toLocaleDateString('bg-BG')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Чакащ</Badge>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.user_id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Одобри
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Approved Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle>Одобрени потребители</CardTitle>
            </div>
            <CardDescription>
              Потребители с активен достъп до системата
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : approvedUsers.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Няма одобрени потребители
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {approvedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Одобрен на: {new Date(user.updated_at).toLocaleDateString('bg-BG')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">Активен</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(user.user_id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Отмени
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
