import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Trash2, Edit2, ArrowLeft, ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { Employee } from '@/types/schedule';
import { validateEGN, extractBirthDateFromEGN, isMinorFromEGN } from '@/utils/egnUtils';

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { employees, addEmployee, updateEmployee, removeEmployee, firmSettings } = useAppContext();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [egn, setEgn] = useState('');
  const [position, setPosition] = useState('');
  const [contractHours, setContractHours] = useState<string>('8');
  const [egnError, setEgnError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEgnChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setEgn(cleaned);
    
    if (cleaned.length === 10) {
      const validation = validateEGN(cleaned);
      setEgnError(validation.valid ? '' : validation.error || 'Невалидно ЕГН');
      
      // Auto-adjust contract hours for minors (max 7 hours)
      if (validation.valid) {
        const isMinor = isMinorFromEGN(cleaned, new Date(2026, 0, 1));
        if (isMinor && parseInt(contractHours) > 7) {
          setContractHours('7');
        }
      }
    } else {
      setEgnError('');
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEgn('');
    setPosition('');
    setContractHours('8');
    setEgnError('');
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !egn || !position.trim()) return;
    
    const validation = validateEGN(egn);
    if (!validation.valid) {
      setEgnError(validation.error || 'Невалидно ЕГН');
      return;
    }

    const birthDate = extractBirthDateFromEGN(egn);
    const isMinor = isMinorFromEGN(egn, new Date(2026, 0, 1)); // Check as of 2026

    const employeeData: Employee = {
      id: editingId || crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      egn,
      position: position.trim(),
      contractHours: parseInt(contractHours) as 2 | 4 | 6 | 7 | 8,
      isMinor,
      birthDate: birthDate || new Date(),
    };

    if (editingId) {
      updateEmployee(editingId, employeeData);
    } else {
      addEmployee(employeeData);
    }

    resetForm();
  };

  const handleEdit = (employee: Employee) => {
    setFirstName(employee.firstName);
    setLastName(employee.lastName);
    setEgn(employee.egn);
    setPosition(employee.position);
    setContractHours(employee.contractHours.toString());
    setEditingId(employee.id);
  };

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    egn.length === 10 &&
    !egnError &&
    position.trim();

  const canContinue = employees.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Служители</h1>
          </div>
          <p className="text-muted-foreground">
            Добавете служителите, които ще бъдат включени в графика
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Badge variant="outline" className="cursor-pointer" onClick={() => navigate('/')}>
            1. Фирма
          </Badge>
          <div className="h-0.5 w-8 bg-primary" />
          <Badge className="bg-primary">2. Служители</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">3. Генериране</Badge>
          <div className="h-0.5 w-8 bg-muted" />
          <Badge variant="outline">4. График</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add Employee Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingId ? 'Редактиране' : 'Нов служител'}
              </CardTitle>
              <CardDescription>
                {editingId
                  ? 'Редактирайте данните на служителя'
                  : 'Въведете данните за новия служител'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Име *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Иван"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Иванов"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="egn">ЕГН *</Label>
                <Input
                  id="egn"
                  value={egn}
                  onChange={(e) => handleEgnChange(e.target.value)}
                  placeholder="0000000000"
                  maxLength={10}
                  className={egnError ? 'border-destructive' : ''}
                />
                {egnError && (
                  <p className="text-sm text-destructive">{egnError}</p>
                )}
                {egn.length === 10 && !egnError && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">
                      {isMinorFromEGN(egn, new Date(2026, 0, 1)) ? (
                        <span className="text-amber-600">Непълнолетен (под 18)</span>
                      ) : (
                        'Пълнолетен'
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Длъжност *</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Продавач"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractHours">Договорни часове *</Label>
                {(() => {
                  const isMinor = egn.length === 10 && !egnError && isMinorFromEGN(egn, new Date(2026, 0, 1));
                  return (
                    <>
                      <Select 
                        value={contractHours} 
                        onValueChange={(value) => {
                          // Prevent minors from selecting more than 7 hours
                          if (isMinor && parseInt(value) > 7) return;
                          setContractHours(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8" disabled={isMinor}>
                            8 часа (пълен работен ден) {isMinor && '(недостъпно за непълнолетни)'}
                          </SelectItem>
                          <SelectItem value="7">7 часа (максимум за непълнолетни)</SelectItem>
                          <SelectItem value="6">6 часа</SelectItem>
                          <SelectItem value="4">4 часа (половин работен ден)</SelectItem>
                          <SelectItem value="2">2 часа</SelectItem>
                        </SelectContent>
                      </Select>
                      {isMinor && (
                        <p className="text-xs text-amber-600">
                          Непълнолетните служители могат да работят максимум 7 часа на ден
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className="flex-1"
                >
                  {editingId ? 'Запази промените' : 'Добави служител'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    Отказ
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Списък със служители</span>
                <Badge variant="secondary">{employees.length} служители</Badge>
              </CardTitle>
              <CardDescription>
                Преглед и управление на добавените служители
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Все още няма добавени служители
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Използвайте формата отляво, за да добавите служител
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Име</TableHead>
                        <TableHead>Длъжност</TableHead>
                        <TableHead className="text-center">Часове</TableHead>
                        <TableHead className="text-center">Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{employee.contractHours}ч</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {employee.isMinor ? (
                              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                                <AlertTriangle className="h-3 w-3" />
                                Непълнолетен
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Пълнолетен
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                                className="h-8 w-8"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEmployee(employee.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <Button
            size="lg"
            onClick={() => navigate('/generate')}
            disabled={!canContinue}
            className="gap-2"
          >
            Към генериране
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
