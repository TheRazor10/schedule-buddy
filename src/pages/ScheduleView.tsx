import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Check,
  AlertTriangle,
  Calendar,
  LogOut,
} from 'lucide-react';
import { getMonthName, getDaysInMonth } from '@/data/bulgarianCalendar2026';
import { exportScheduleToExcel } from '@/utils/excelExport';
import { cn } from '@/lib/utils';

export default function ScheduleView() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { schedule, employees, firmSettings, selectedMonth, selectedYear } = useAppContext();

  if (!schedule) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Няма генериран график</CardTitle>
            <CardDescription>
              Моля, първо генерирайте график от предишната страница
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/generate')}>
              Към генериране
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleExport = () => {
    exportScheduleToExcel({
      schedule,
      employees,
      positions: firmSettings.positions,
      shifts: firmSettings.shifts,
      firmName: firmSettings.firmName,
    });
  };

  // Get day of week for each day (0 = Sunday, 6 = Saturday)
  const getDayOfWeek = (day: number) => {
    return new Date(selectedYear, selectedMonth - 1, day).getDay();
  };

  const getDayName = (dayOfWeek: number) => {
    const names = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return names[dayOfWeek];
  };

  const getPositionName = (positionId: string) => {
    const position = firmSettings.positions.find((p) => p.id === positionId);
    return position?.name || '—';
  };

  const getShift = (shiftId?: string) => {
    if (!shiftId) return null;
    return firmSettings.shifts.find((s) => s.id === shiftId);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                График за {getMonthName(selectedMonth)} {selectedYear}
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Изход
            </Button>
          </div>
          <p className="text-muted-foreground text-center">
            {firmSettings.firmName} • Генериран на{' '}
            {schedule.generatedAt.toLocaleDateString('bg-BG')}
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
          <Badge variant="outline" className="cursor-pointer" onClick={() => navigate('/generate')}>
            3. Генериране
          </Badge>
          <div className="h-0.5 w-8 bg-primary" />
          <Badge className="bg-primary">4. График</Badge>
        </div>

        {/* Coverage Gaps Warning */}
        {schedule.coverageGaps && schedule.coverageGaps.length > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Предупреждение: Недостатъчен персонал
              </CardTitle>
              <CardDescription className="text-amber-600">
                Следните дни имат недостатъчно покритие поради липса на персонал
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Group by position */}
                {firmSettings.positions.map((pos) => {
                  const posGaps = schedule.coverageGaps?.filter((g) => g.positionId === pos.id) || [];
                  if (posGaps.length === 0) return null;
                  
                  return (
                    <div key={pos.id} className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                        {pos.name}
                      </Badge>
                      <span className="text-sm text-amber-700">Без покритие на:</span>
                      <div className="flex flex-wrap gap-1">
                        {posGaps.map((gap) => (
                          <Badge key={gap.day} variant="outline" className="border-amber-400 text-amber-700">
                            {gap.day} {getMonthName(selectedMonth)}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-amber-600">
                        ({posGaps.length} дни)
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Легенда</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {firmSettings.shifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-green-500 text-xs font-bold text-white">
                    {shift.abbreviation}
                  </div>
                  <span className="text-sm">{shift.name} ({shift.startTime}-{shift.endTime})</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-red-400" />
                <span className="text-sm">Почивка</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-amber-400" />
                <span className="text-sm">Празник</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded border-2 border-dashed border-muted-foreground/30 bg-muted/50" />
                <span className="text-sm">Събота/Неделя</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Работен график
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-[150px] bg-background">
                    Служител
                  </TableHead>
                  <TableHead className="sticky left-[150px] z-10 bg-background text-center">
                    Часове
                  </TableHead>
                  {days.map((day) => {
                    const dayOfWeek = getDayOfWeek(day);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    return (
                      <TableHead
                        key={day}
                        className={cn(
                          'min-w-[40px] text-center',
                          isWeekend && 'bg-muted/50'
                        )}
                      >
                        <div className="text-xs text-muted-foreground">{getDayName(dayOfWeek)}</div>
                        <div>{day}</div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-center">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.employeeSchedules.map((empSchedule) => {
                  const employee = employees.find((e) => e.id === empSchedule.employeeId);
                  if (!employee) return null;

                  return (
                    <TableRow key={empSchedule.employeeId}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div>
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getPositionName(employee.positionId)}
                        </div>
                      </TableCell>
                      <TableCell className="sticky left-[150px] z-10 bg-background text-center">
                        <Badge variant="outline">{employee.contractHours}ч</Badge>
                      </TableCell>
                      {days.map((day) => {
                        const entry = empSchedule.entries[day];
                        const dayOfWeek = getDayOfWeek(day);
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const shift = entry?.type === 'work' ? getShift(entry.shiftId) : null;

                        let bgColor = '';
                        let textColor = 'text-foreground';
                        let content = '';

                        if (!entry) {
                          bgColor = 'bg-muted';
                          content = '—';
                        } else if (entry.type === 'holiday') {
                          bgColor = 'bg-amber-400';
                          textColor = 'text-amber-900';
                          content = 'ПР';
                        } else if (entry.type === 'rest') {
                          bgColor = 'bg-red-400';
                          textColor = 'text-red-900';
                          content = 'П';
                        } else if (entry.type === 'work') {
                          bgColor = 'bg-green-500';
                          textColor = 'text-white';
                          content = shift?.abbreviation || 'Р';
                        }

                        return (
                          <TableCell
                            key={day}
                            className={cn(
                              'p-1 text-center',
                              isWeekend && 'bg-muted/30'
                            )}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'mx-auto flex h-8 w-8 items-center justify-center rounded text-xs font-medium',
                                    bgColor,
                                    textColor
                                  )}
                                >
                                  {content}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {entry?.type === 'work' && shift && (
                                  <p>{shift.name} ({shift.startTime}-{shift.endTime}) - {entry.hours}ч</p>
                                )}
                                {entry?.type === 'work' && !shift && (
                                  <p>Работа ({entry.hours}ч)</p>
                                )}
                                {entry?.type === 'rest' && <p>Почивка</p>}
                                {entry?.type === 'holiday' && <p>Официален празник</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {empSchedule.isCompliant ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="gap-1 bg-green-100 text-green-700">
                                <Check className="h-3 w-3" />
                                OK
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Всички правила са спазени</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className="gap-1 bg-amber-100 text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                Внимание
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <ul className="list-inside list-disc">
                                {empSchedule.complianceIssues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Обобщение по служители</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Служител</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead className="text-center">Договор</TableHead>
                  <TableHead className="text-center">Работни дни</TableHead>
                  <TableHead className="text-center">Общо часове</TableHead>
                  <TableHead className="text-center">Почивни дни</TableHead>
                  <TableHead className="text-center">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.employeeSchedules.map((empSchedule) => {
                  const employee = employees.find((e) => e.id === empSchedule.employeeId);
                  if (!employee) return null;

                  return (
                    <TableRow key={empSchedule.employeeId}>
                      <TableCell className="font-medium">
                        {employee.firstName} {employee.lastName}
                        {employee.isMinor && (
                          <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                            Непълнолетен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getPositionName(employee.positionId)}</TableCell>
                      <TableCell className="text-center">{employee.contractHours}ч</TableCell>
                      <TableCell className="text-center">{empSchedule.totalWorkDays}</TableCell>
                      <TableCell className="text-center">{empSchedule.totalHours}ч</TableCell>
                      <TableCell className="text-center">{empSchedule.totalRestDays}</TableCell>
                      <TableCell className="text-center">
                        {empSchedule.isCompliant ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Check className="mr-1 h-3 w-3" />
                            Съответства
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Предупреждения
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/generate')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Редактирай и генерирай отново
          </Button>
          <Button size="lg" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Изтегли като Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
