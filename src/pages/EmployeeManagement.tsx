import { useState, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, Trash2, Edit2, ArrowLeft, ArrowRight, AlertTriangle, Check, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Employee, IdType } from '@/types/schedule';
import { validateId, extractBirthDateFromEGN, isMinorFromBirthDate } from '@/utils/egnUtils';
import { parseEmployeesFromExcel } from '@/utils/excelImport';

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { employees, addEmployee, updateEmployee, removeEmployee, firmSettings } = useAppContext();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [egn, setEgn] = useState('');
  const [idType, setIdType] = useState<IdType>('egn');
  const [manualBirthDate, setManualBirthDate] = useState('');
  const [positionId, setPositionId] = useState('');
  const [contractHours, setContractHours] = useState<string>('8');
  const [egnError, setEgnError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Excel import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedEmployees, setImportedEmployees] = useState<Employee[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await parseEmployeesFromExcel(file, firmSettings.positions);
      setImportedEmployees(result.employees);
      setImportErrors(result.errors);
      setImportSkipped(result.skipped);
      setImportDialogOpen(true);
    } catch {
      setImportErrors(['Грешка при четене на файла']);
      setImportedEmployees([]);
      setImportSkipped(0);
      setImportDialogOpen(true);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    for (const emp of importedEmployees) {
      addEmployee(emp);
    }
    setImportDialogOpen(false);
    setImportedEmployees([]);
    setImportErrors([]);
    setImportSkipped(0);
  };

  // Get birth date from the current form state
  const getBirthDateFromForm = (): Date | null => {
    if (idType === 'egn') {
      return extractBirthDateFromEGN(egn);
    }
    if (manualBirthDate) {
      const date = new Date(manualBirthDate);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  // Check minor status from current form state
  const getIsMinorFromForm = (): boolean => {
    const birthDate = getBirthDateFromForm();
    if (!birthDate) return false;
    return isMinorFromBirthDate(birthDate);
  };

  const handleIdChange = (value: string) => {
    if (idType === 'egn' || idType === 'lnch') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setEgn(cleaned);

      if (cleaned.length === 10) {
        const validation = validateId(cleaned, idType);
        setEgnError(validation.valid ? '' : validation.error || 'Невалиден номер');

        if (validation.valid && idType === 'egn') {
          const birthDate = extractBirthDateFromEGN(cleaned);
          if (birthDate && isMinorFromBirthDate(birthDate) && parseInt(contractHours) > 7) {
            setContractHours('7');
          }
        }
      } else {
        setEgnError('');
      }
    } else {
      setEgn(value);
      setEgnError('');
    }
  };

  const handleIdTypeChange = (newType: IdType) => {
    setIdType(newType);
    setEgn('');
    setEgnError('');
    setManualBirthDate('');
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEgn('');
    setIdType('egn');
    setManualBirthDate('');
    setPositionId('');
    setContractHours('8');
    setEgnError('');
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !egn || !positionId) return;

    const validation = validateId(egn, idType);
    if (!validation.valid) {
      setEgnError(validation.error || 'Невалиден номер');
      return;
    }

    // For non-EGN types, birth date is required
    if (idType !== 'egn' && !manualBirthDate) {
      setEgnError('Въведете дата на раждане');
      return;
    }

    const birthDate = getBirthDateFromForm();
    const isMinor = birthDate ? isMinorFromBirthDate(birthDate) : false;

    const employeeData: Employee = {
      id: editingId || crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      egn,
      idType,
      positionId,
      contractHours: parseInt(contractHours) as 2 | 4 | 6 | 7 | 8 | 10 | 12,
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
    setIdType(employee.idType || 'egn');
    if (employee.idType && employee.idType !== 'egn' && employee.birthDate) {
      const d = new Date(employee.birthDate);
      if (!isNaN(d.getTime())) {
        setManualBirthDate(d.toISOString().split('T')[0]);
      }
    } else {
      setManualBirthDate('');
    }
    setPositionId(employee.positionId);
    setContractHours(employee.contractHours.toString());
    setEditingId(employee.id);
  };

  const getPositionName = (posId: string) => {
    const position = firmSettings.positions.find((p) => p.id === posId);
    return position?.name || '—';
  };

  const isIdValid = (() => {
    if (idType === 'egn' || idType === 'lnch') {
      return egn.length === 10 && !egnError;
    }
    return egn.trim().length > 0 && !egnError;
  })();

  const needsBirthDate = idType !== 'egn';
  const hasBirthDate = idType === 'egn' || !!manualBirthDate;

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    isIdValid &&
    hasBirthDate &&
    positionId;

  const canContinue = employees.length > 0;
  const formIsMinor = getIsMinorFromForm();

  const idTypeLabel = idType === 'egn' ? 'ЕГН' : idType === 'lnch' ? 'ЛНЧ' : 'Друг номер';

  return (
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
                <Label>Тип документ *</Label>
                <Select value={idType} onValueChange={(v) => handleIdTypeChange(v as IdType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="egn">ЕГН (Единен граждански номер)</SelectItem>
                    <SelectItem value="lnch">ЛНЧ (Личен номер на чужденец)</SelectItem>
                    <SelectItem value="other">Друг документ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="egn">{idTypeLabel} *</Label>
                <Input
                  id="egn"
                  value={egn}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder={idType === 'other' ? 'Номер на документ' : '0000000000'}
                  maxLength={idType === 'other' ? 50 : 10}
                  className={egnError ? 'border-destructive' : ''}
                />
                {egnError && (
                  <p className="text-sm text-destructive">{egnError}</p>
                )}
                {isIdValid && idType === 'egn' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">
                      {formIsMinor ? (
                        <span className="text-amber-600">Непълнолетен (под 18)</span>
                      ) : (
                        'Пълнолетен'
                      )}
                    </span>
                  </div>
                )}
              </div>

              {needsBirthDate && (
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Дата на раждане *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={manualBirthDate}
                    onChange={(e) => setManualBirthDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {manualBirthDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        {formIsMinor ? (
                          <span className="text-amber-600">Непълнолетен (под 18)</span>
                        ) : (
                          'Пълнолетен'
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="position">Позиция *</Label>
                {firmSettings.positions.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Първо добавете позиции в настройките на фирмата
                  </div>
                ) : (
                  <Select value={positionId} onValueChange={setPositionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Изберете позиция" />
                    </SelectTrigger>
                    <SelectContent>
                      {firmSettings.positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.name} (мин. {pos.minPerDay}/ден)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractHours">Договорни часове *</Label>
                <Select
                  value={contractHours}
                  onValueChange={(value) => {
                    if (formIsMinor && parseInt(value) > 7) return;
                    setContractHours(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12" disabled={formIsMinor}>
                      12 часа {formIsMinor && '— недостъпно за непълнолетни'}
                    </SelectItem>
                    <SelectItem value="10" disabled={formIsMinor}>
                      10 часа {formIsMinor && '— недостъпно за непълнолетни'}
                    </SelectItem>
                    <SelectItem value="8" disabled={formIsMinor}>
                      8 часа {formIsMinor && '— недостъпно за непълнолетни'}
                    </SelectItem>
                    <SelectItem value="7">7 часа</SelectItem>
                    <SelectItem value="6">6 часа</SelectItem>
                    <SelectItem value="4">4 часа</SelectItem>
                    <SelectItem value="2">2 часа</SelectItem>
                  </SelectContent>
                </Select>
                {formIsMinor && (
                  <p className="text-xs text-amber-600">
                    Непълнолетните служители могат да работят максимум 7 часа на ден
                  </p>
                )}
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
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="gap-1.5"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Импорт от Excel
                  </Button>
                  <Badge variant="secondary">{employees.length} служители</Badge>
                </div>
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
                        <TableHead>Позиция</TableHead>
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
                          <TableCell>{getPositionName(employee.positionId)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {employee.contractHours}ч
                            </Badge>
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

        {/* Import Results Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Резултат от импорта
              </DialogTitle>
              <DialogDescription>
                Прегледайте намерените служители преди да ги добавите
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  {importedEmployees.length} намерени
                </Badge>
                {importSkipped > 0 && (
                  <Badge variant="secondary">
                    {importSkipped} пропуснати
                  </Badge>
                )}
                {importErrors.length > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {importErrors.length} грешки
                  </Badge>
                )}
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Грешки:</p>
                  <ScrollArea className="max-h-24">
                    <ul className="text-sm text-red-700 space-y-0.5">
                      {importErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {/* Preview table */}
              {importedEmployees.length > 0 && (
                <ScrollArea className="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Име</TableHead>
                        <TableHead>ЕГН/ЛНЧ</TableHead>
                        <TableHead className="text-center">Часове</TableHead>
                        <TableHead>Позиция</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedEmployees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {emp.egn}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{emp.contractHours}ч</Badge>
                          </TableCell>
                          <TableCell>
                            {emp.positionId ? getPositionName(emp.positionId) : (
                              <span className="text-muted-foreground text-xs">Не е зададена</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {importedEmployees.length === 0 && importErrors.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  Не са намерени служители във файла
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Отказ
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importedEmployees.length === 0}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Добави {importedEmployees.length} служители
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
