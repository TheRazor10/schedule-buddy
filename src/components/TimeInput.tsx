import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeInputProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export default function TimeInput({ value, onChange, id, disabled }: TimeInputProps) {
  // Parse current value
  const [hours, minutes] = value ? value.split(':') : ['00', '00'];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minutes}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hours}:${newMinute}`);
  };

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  // Generate minute options (00, 15, 30, 45 for simplicity, or 00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  return (
    <div className="flex items-center gap-1" id={id}>
      <Select value={hours} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="00" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {hourOptions.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-medium">:</span>
      <Select value={minutes} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="00" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {minuteOptions.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
