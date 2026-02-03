import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useFirms, usePositions, useShifts, DBFirm } from '@/hooks/useFirms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Building2, Clock, ArrowRight, Users, LogOut, History, Coffee } from 'lucide-react';
import { Position, Shift } from '@/types/schedule';

export default function FirmSetup() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { firmSettings, setFirmSettings, addPosition, removePosition, addShift, removeShift } = useAppContext();
  const { firms, loading: firmsLoading, createFirm, updateFirm } = useFirms();
  
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const { positions: dbPositions, createPosition, deletePosition } = usePositions(selectedFirmId);
  const { shifts: dbShifts, createShift, deleteShift } = useShifts(selectedFirmId);
  
  const [firmName, setFirmName] = useState(firmSettings.firmName);
  const [ownerName, setOwnerName] = useState(firmSettings.ownerName);
  const [operatingStart, setOperatingStart] = useState(firmSettings.operatingHoursStart);
  const [operatingEnd, setOperatingEnd] = useState(firmSettings.operatingHoursEnd);
  const [worksOnHolidays, setWorksOnHolidays] = useState(firmSettings.worksOnHolidays);
  const [breakDuration, setBreakDuration] = useState(firmSettings.breakDurationMinutes.toString());

  // New position form
  const [newPositionName, setNewPositionName] = useState('');
  const [newMinPerDay, setNewMinPerDay] = useState('1');

  // New shift form
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftAbbr, setNewShiftAbbr] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('18:00');

  // Load selected firm's data
  useEffect(() => {
    if (selectedFirmId && firms.length > 0) {
      const firm = firms.find(f => f.id === selectedFirmId);
      if (firm) {
        setFirmName(firm.name);
        setOwnerName(firm.owner_name);
        setOperatingStart(firm.operating_hours_start);
        setOperatingEnd(firm.operating_hours_end);
        setWorksOnHolidays(firm.works_on_holidays);
        setBreakDuration(firm.break_duration_minutes.toString());
      }
    }
  }, [selectedFirmId, firms]);

  // Sync DB positions/shifts to context
  useEffect(() => {
    if (dbPositions.length > 0 || dbShifts.length > 0) {
      const positions: Position[] = dbPositions.map(p => ({
        id: p.id,
        name: p.name,
        minPerDay: p.min_per_day,
      }));
      const shifts: Shift[] = dbShifts.map(s => ({
        id: s.id,
        name: s.name,
        abbreviation: s.abbreviation,
        startTime: s.start_time,
        endTime: s.end_time,
      }));
      setFirmSettings({
        firmName,
        ownerName,
        operatingHoursStart: operatingStart,
        operatingHoursEnd: operatingEnd,
        worksOnHolidays,
        breakDurationMinutes: parseInt(breakDuration) || 60,
        positions,
        shifts,
      });
    }
  }, [dbPositions, dbShifts]);

  const handleSelectFirm = (firmId: string) => {
    if (firmId === 'new') {
      setSelectedFirmId(null);
      setFirmName('');
      setOwnerName('');
      setOperatingStart('08:00');
      setOperatingEnd('20:00');
      setWorksOnHolidays(false);
      setBreakDuration('60');
      // Clear context positions and shifts
      firmSettings.positions.forEach(p => removePosition(p.id));
      firmSettings.shifts.forEach(s => removeShift(s.id));
    } else {
      setSelectedFirmId(firmId);
    }
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) return;
    
    const newPosition: Position = {
      id: crypto.randomUUID(),
      name: newPositionName.trim(),
      minPerDay: parseInt(newMinPerDay) || 1,
    };
    
    if (selectedFirmId) {
      await createPosition({
        firm_id: selectedFirmId,
        name: newPositionName.trim(),
        min_per_day: parseInt(newMinPerDay) || 1,
      });
    } else {
      addPosition(newPosition);
    }
    
    setNewPositionName('');
    setNewMinPerDay('1');
  };

  const handleRemovePosition = async (id: string) => {
    if (selectedFirmId) {
      await deletePosition(id);
    } else {
      removePosition(id);
    }
  };

  const handleAddShift = async () => {
    if (!newShiftName.trim() || !newShiftAbbr.trim()) return;
    
    const newShift: Shift = {
      id: crypto.randomUUID(),
      name: newShiftName.trim(),
      abbreviation: newShiftAbbr.trim().toUpperCase(),
      startTime: newShiftStart,
      endTime: newShiftEnd,
    };
    
    if (selectedFirmId) {
      await createShift({
        firm_id: selectedFirmId,
        name: newShiftName.trim(),
        abbreviation: newShiftAbbr.trim().toUpperCase(),
        start_time: newShiftStart,
        end_time: newShiftEnd,
      });
    } else {
      addShift(newShift);
    }
    
    setNewShiftName('');
    setNewShiftAbbr('');
    setNewShiftStart('09:00');
    setNewShiftEnd('18:00');
  };

  const handleRemoveShift = async (id: string) => {
    if (selectedFirmId) {
      await deleteShift(id);
    } else {
      removeShift(id);
    }
  };

  const handleContinue = async () => {
    const firmData = {
      name: firmName,
      owner_name: ownerName,
      operating_hours_start: operatingStart,
      operating_hours_end: operatingEnd,
      works_on_holidays: worksOnHolidays,
      break_duration_minutes: parseInt(breakDuration) || 60,
    };

    let firmId = selectedFirmId;

    if (selectedFirmId) {
      // Update existing firm
      await updateFirm(selectedFirmId, firmData);
    } else {
      // Create new firm
      const newFirm = await createFirm(firmData);
      if (newFirm) {
        firmId = newFirm.id;
        // Save positions and shifts to DB
        for (const pos of firmSettings.positions) {
          await createPosition({
            firm_id: newFirm.id,
            name: pos.name,
            min_per_day: pos.minPerDay,
          });
        }
        for (const shift of firmSettings.shifts) {
          await createShift({
            firm_id: newFirm.id,
            name: shift.name,
            abbreviation: shift.abbreviation,
            start_time: shift.startTime,
            end_time: shift.endTime,
          });
        }
      }
    }

    // Update context with final values
    setFirmSettings({
      firmName,
      ownerName,
      operatingHoursStart: operatingStart,
      operatingHoursEnd: operatingEnd,
      worksOnHolidays,
      breakDurationMinutes: parseInt(breakDuration) || 60,
      positions: selectedFirmId ? dbPositions.map(p => ({
        id: p.id,
        name: p.name,
        minPerDay: p.min_per_day,
      })) : firmSettings.positions,
      shifts: selectedFirmId ? dbShifts.map(s => ({
        id: s.id,
        name: s.name,
        abbreviation: s.abbreviation,
        startTime: s.start_time,
        endTime: s.end_time,
      })) : firmSettings.shifts,
    });

    // Store selected firm ID for other pages
    if (firmId) {
      sessionStorage.setItem('selectedFirmId', firmId);
    }

    navigate('/employees');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayPositions = selectedFirmId ? dbPositions.map(p => ({
    id: p.id,
    name: p.name,
    minPerDay: p.min_per_day,
  })) : firmSettings.positions;

  const displayShifts = selectedFirmId ? dbShifts.map(s => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    startTime: s.start_time,
    endTime: s.end_time,
  })) : firmSettings.shifts;

  const isValid = firmName.trim() && displayPositions.length > 0 && displayShifts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header with logout */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">График на Смените</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Изход
            </Button>
          </div>
          <p className="text-muted-foreground text-center">
            Генератор на работни графици съобразен с българското трудово законодателство
          </p>
          {user && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Влезли сте като: {user.email}
            </p>
          )}
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
          {/* Firm Selection Card */}
          {firms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Изберете фирма
                </CardTitle>
                <CardDescription>
                  Изберете съществуваща фирма или създайте нова
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedFirmId || 'new'}
                  onValueChange={handleSelectFirm}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Изберете фирма" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Създай нова фирма
                      </span>
                    </SelectItem>
                    {firms.map((firm) => (
                      <SelectItem key={firm.id} value={firm.id}>
                        {firm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

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
              
              {/* Break Duration */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Coffee className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="breakDuration">Продължителност на почивката</Label>
                </div>
                <Select value={breakDuration} onValueChange={setBreakDuration}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Без почивка</SelectItem>
                    <SelectItem value="15">15 минути</SelectItem>
                    <SelectItem value="30">30 минути</SelectItem>
                    <SelectItem value="45">45 минути</SelectItem>
                    <SelectItem value="60">1 час</SelectItem>
                    <SelectItem value="90">1 час и 30 минути</SelectItem>
                    <SelectItem value="120">2 часа</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Почивката се добавя към работното време на служителя
                </p>
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
              {displayShifts.length > 0 && (
                <div className="space-y-2">
                  {displayShifts.map((shift) => (
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
                        onClick={() => handleRemoveShift(shift.id)}
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
              {displayPositions.length > 0 && (
                <div className="space-y-2">
                  {displayPositions.map((position) => (
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
                        onClick={() => handleRemovePosition(position.id)}
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
