import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2, Clock, ArrowRight, Users } from 'lucide-react';
import { Position, Shift } from '@/types/schedule';

export default function FirmSetup() {
  const navigate = useNavigate();
  const { firmSettings, setFirmSettings, addPosition, removePosition, addShift, removeShift } = useAppContext();
  
  const [firmName, setFirmName] = useState(firmSettings.firmName);
  const [ownerName, setOwnerName] = useState(firmSettings.ownerName);
  const [operatingStart, setOperatingStart] = useState(firmSettings.operatingHoursStart);
  const [operatingEnd, setOperatingEnd] = useState(firmSettings.operatingHoursEnd);
  const [worksOnHolidays, setWorksOnHolidays] = useState(firmSettings.worksOnHolidays);

  // New position form
  const [newPositionName, setNewPositionName] = useState('');
  const [newMinPerDay, setNewMinPerDay] = useState('1');

  // New shift form
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftAbbr, setNewShiftAbbr] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('18:00');

  const handleAddPosition = () => {
    if (!newPositionName.trim()) return;
    
    const newPosition: Position = {
      id: crypto.randomUUID(),
      name: newPositionName.trim(),
      minPerDay: parseInt(newMinPerDay) || 1,
    };
    
    addPosition(newPosition);
    setNewPositionName('');
    setNewMinPerDay('1');
  };

  const handleAddShift = () => {
    if (!newShiftName.trim() || !newShiftAbbr.trim()) return;
    
    const newShift: Shift = {
      id: crypto.randomUUID(),
      name: newShiftName.trim(),
      abbreviation: newShiftAbbr.trim().toUpperCase(),
      startTime: newShiftStart,
      endTime: newShiftEnd,
    };
    
    addShift(newShift);
    setNewShiftName('');
    setNewShiftAbbr('');
    setNewShiftStart('09:00');
    setNewShiftEnd('18:00');
  };

  const handleContinue = () => {
    setFirmSettings({
      firmName,
      ownerName,
      operatingHoursStart: operatingStart,
      operatingHoursEnd: operatingEnd,
      worksOnHolidays,
      positions: firmSettings.positions,
      shifts: firmSettings.shifts,
    });
    navigate('/employees');
  };

  const isValid = firmName.trim() && firmSettings.positions.length > 0 && firmSettings.shifts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">График на Смените</h1>
          </div>
          <p className="text-muted-foreground">
            Генератор на работни графици съобразен с българското трудово законодателство
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Badge className="bg-primary">1. Фирма</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">2. Служители</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">3. Генериране</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">4. График</Badge>
        </div>

        <div className="space-y-6">
          {/* Firm Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Данни за фирмата
              </CardTitle>
              <CardDescription>Въведете основна информация за вашата фирма</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firmName">Име на фирмата *</Label>
                <Input
                  id="firmName"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="ООД Пример"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Име на собственика</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Иван Иванов"
                />
              </div>
            </CardContent>
          </Card>

          {/* Operating Hours Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Работно време
              </CardTitle>
              <CardDescription>Определете часовете, в които фирмата работи</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="operatingStart">Начало на работния ден</Label>
                  <Input
                    id="operatingStart"
                    type="time"
                    value={operatingStart}
                    onChange={(e) => setOperatingStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatingEnd">Край на работния ден</Label>
                  <Input
                    id="operatingEnd"
                    type="time"
                    value={operatingEnd}
                    onChange={(e) => setOperatingEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="worksOnHolidays">Работа в празнични дни</Label>
                  <p className="text-sm text-muted-foreground">
                    Ако е включено, служителите могат да бъдат планирани за работа в официални празници
                  </p>
                </div>
                <Switch
                  id="worksOnHolidays"
                  checked={worksOnHolidays}
                  onCheckedChange={setWorksOnHolidays}
                />
              </div>
            </CardContent>
          </Card>

          {/* Shifts Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Смени *
              </CardTitle>
              <CardDescription>
                Определете работните смени. Служителите ще бъдат разпределени между тях.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing shifts */}
              {firmSettings.shifts.length > 0 && (
                <div className="space-y-2">
                  {firmSettings.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="font-bold text-base">
                          {shift.abbreviation}
                        </Badge>
                        <div>
                          <span className="font-medium">{shift.name}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({shift.startTime} - {shift.endTime})
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeShift(shift.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new shift form */}
              <div className="rounded-lg border border-dashed p-4">
                <p className="mb-3 text-sm font-medium">Добави нова смяна</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="shiftName" className="text-xs">
                      Име на смяната
                    </Label>
                    <Input
                      id="shiftName"
                      value={newShiftName}
                      onChange={(e) => setNewShiftName(e.target.value)}
                      placeholder="Сутрешна"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shiftAbbr" className="text-xs">
                      Съкращение
                    </Label>
                    <Input
                      id="shiftAbbr"
                      value={newShiftAbbr}
                      onChange={(e) => setNewShiftAbbr(e.target.value.slice(0, 2))}
                      placeholder="С"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shiftStart" className="text-xs">
                      Начало
                    </Label>
                    <Input
                      id="shiftStart"
                      type="time"
                      value={newShiftStart}
                      onChange={(e) => setNewShiftStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shiftEnd" className="text-xs">
                      Край
                    </Label>
                    <Input
                      id="shiftEnd"
                      type="time"
                      value={newShiftEnd}
                      onChange={(e) => setNewShiftEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddShift}
                  disabled={!newShiftName.trim() || !newShiftAbbr.trim()}
                  className="mt-3 w-full"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Добави смяна
                </Button>
              </div>

              {/* Example hint */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <strong>Пример:</strong> Сутрешна смяна (С) 09:00-18:00, Вечерна смяна (В) 13:00-22:00
              </div>
            </CardContent>
          </Card>

          {/* Positions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Позиции *
              </CardTitle>
              <CardDescription>
                Определете позициите и минималния брой служители за всяка от тях на ден. 
                Генераторът ще ротира почивните дни, като гарантира покритие.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing positions */}
              {firmSettings.positions.length > 0 && (
                <div className="space-y-2">
                  {firmSettings.positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="font-semibold">
                          {position.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Мин. <strong>{position.minPerDay}</strong> на ден
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePosition(position.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new position form */}
              <div className="rounded-lg border border-dashed p-4">
                <p className="mb-3 text-sm font-medium">Добави нова позиция</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="positionName" className="text-xs">
                      Име на позицията
                    </Label>
                    <Input
                      id="positionName"
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                      placeholder="Бармани"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="minPerDay" className="text-xs">
                      Мин. на ден
                    </Label>
                    <Input
                      id="minPerDay"
                      type="number"
                      min="1"
                      max="10"
                      value={newMinPerDay}
                      onChange={(e) => setNewMinPerDay(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddPosition}
                  disabled={!newPositionName.trim()}
                  className="mt-3 w-full"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Добави позиция
                </Button>
              </div>

              {/* Example hint */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <strong>Пример:</strong> Ако имате 3 бармани и зададете минимум 2 на ден, 
                генераторът ще ротира почивните дни така, че винаги да има 2 бармани на работа.
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!isValid}
              className="gap-2"
            >
              Към служителите
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
