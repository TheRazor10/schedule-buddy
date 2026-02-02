import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ArrowLeft, Play, Loader2, CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import { getMonthData, getMonthName, MONTHLY_DATA_2026 } from '@/data/bulgarianCalendar2026';
import { generateSchedule } from '@/utils/scheduleGenerator';

export default function ScheduleGenerator() {
  const navigate = useNavigate();
  const {
    firmSettings,
    employees,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSchedule,
  } = useAppContext();

  const [isGenerating, setIsGenerating] = useState(false);

  const monthData = getMonthData(selectedMonth);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate some processing time for UX
    await new Promise((resolve) => setTimeout(resolve, 800));

    const schedule = generateSchedule({
      firmSettings,
      employees,
      month: selectedMonth,
      year: selectedYear,
    });

    setSchedule(schedule);
    setIsGenerating(false);
    navigate('/schedule');
  };

  const canGenerate = firmSettings.shifts.length > 0 && employees.length > 0;

  // Get holidays for selected month
  const holidaysInMonth = monthData.holidays;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Calendar className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Генериране на график</h1>
          </div>
          <p className="text-muted-foreground">
            Изберете месец и генерирайте работен график
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Badge variant="outline" className="cursor-pointer" onClick={() => navigate('/')}>
            1. Фирма
          </Badge>
          <div className="h-0.5 w-8 bg-primary" />
          <Badge variant="outline" className="cursor-pointer" onClick={() => navigate('/employees')}>
            2. Служители
          </Badge>
          <div className="h-0.5 w-8 bg-primary" />
          <Badge className="bg-primary">3. Генериране</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">4. График</Badge>
        </div>

        <div className="space-y-6">
          {/* Month Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Избор на месец
              </CardTitle>
              <CardDescription>
                Изберете месеца, за който искате да генерирате график
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Месец</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(MONTHLY_DATA_2026).map((m) => (
                        <SelectItem key={m} value={m}>
                          {getMonthName(parseInt(m))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Година</label>
                  <Select value={selectedYear.toString()} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Статистика за {getMonthName(selectedMonth)} 2026
              </CardTitle>
              <CardDescription>
                Официални работни дни и часове според българския календар
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{monthData.workingDays}</p>
                  <p className="text-sm text-muted-foreground">Работни дни</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{monthData.workingHours}</p>
                  <p className="text-sm text-muted-foreground">Работни часове</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{holidaysInMonth.length}</p>
                  <p className="text-sm text-muted-foreground">Официални празници</p>
                </div>
              </div>

              {holidaysInMonth.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Празници през този месец:</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {holidaysInMonth.map((day) => (
                      <Badge key={day} variant="outline" className="border-amber-300 bg-amber-100">
                        {day} {getMonthName(selectedMonth)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Обобщение</CardTitle>
              <CardDescription>Преглед на данните преди генериране</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Фирма</p>
                  <p className="font-medium">{firmSettings.firmName || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Служители</p>
                  <p className="font-medium">{employees.length} служители</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Смени</p>
                  <div className="flex flex-wrap gap-1">
                    {firmSettings.shifts.map((shift) => (
                      <Badge key={shift.id} variant="secondary">
                        {shift.name} ({shift.hours}ч)
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {!canGenerate && (
                <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                  <p className="font-medium">Не може да се генерира график</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {firmSettings.shifts.length === 0 && <li>Добавете поне една смяна</li>}
                    {employees.length === 0 && <li>Добавете поне един служител</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/employees')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Генериране...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Генерирай график
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
