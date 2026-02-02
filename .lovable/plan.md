

# Bulgarian Work Schedule Generator

## Overview
A professional web application for generating monthly employee work schedules that comply with Bulgarian labor law. The app takes firm and employee information, applies the official 2026 Bulgarian work calendar, and outputs a downloadable Excel timetable.

---

## Page 1: Home / Firm Setup

**Purpose:** Configure company details and operating parameters

**Features:**
- Input firm name and owner name
- Set daily operating hours (start and end time)
- Toggle "Works on holidays" (yes/no)
- Define multiple shifts:
  - Shift name (e.g., "Morning", "Evening", "Night")
  - Start time, end time
  - Total working hours displayed automatically
- Add/remove shifts dynamically
- "Continue to Employees" button

---

## Page 2: Employee Management

**Purpose:** Add and manage employee roster

**Features:**
- Employee list table showing all added employees
- Add new employee form:
  - First name, last name
  - EGN (10-digit Bulgarian ID with validation)
  - Position/role
  - Contract hours (dropdown: 2, 4, 6, or 8 hours)
- Automatic age calculation from EGN (determines minor status)
- Minor indicator badge for employees under 18
- Edit and delete employee options
- "Continue to Generate" button

---

## Page 3: Schedule Generator

**Purpose:** Select month and generate the schedule

**Features:**
- Month and year selector (2026 calendar data built-in)
- Display selected month's stats:
  - Working days count
  - Working hours (based on 8-hour standard)
  - Holidays in that month highlighted
- "Generate Schedule" button
- Loading indicator during generation

---

## Page 4: Schedule View & Export

**Purpose:** Display generated schedule and export to Excel

**Features:**
- **Schedule Table:**
  - Rows: Employees (name, position, contract hours)
  - Columns: Each day of the month (1-31)
  - Cells show: Shift name abbreviation or "REST" or "HOLIDAY"
  - Color coding:
    - 🟢 Green: Working shifts
    - 🔴 Red: Rest days
    - 🟡 Yellow: Holidays
- **Summary Statistics per Employee:**
  - Total hours worked
  - Total rest days
  - Compliance status (✓ or warning if rules violated)
- **Legend** explaining shift codes and colors
- **Export to Excel** button - downloads .xlsx file
- "Back to Edit" button to modify and regenerate

---

## Built-in Rules Engine

The scheduler will automatically enforce:

**Work Limits:**
- ✅ Each employee works exactly the official working days/hours for the month
- ✅ Maximum 6 consecutive work days, then mandatory 1-2 rest days
- ✅ Rest days distributed throughout the month (not clustered)

**12-Hour Shift Rules:**
- ✅ Maximum 2 consecutive days on 12-hour shifts
- ✅ 1-2 rest days required after 12-hour shift blocks

**Coverage:**
- ✅ At least 1 employee scheduled every day the firm is open

**Minor Protection (under 18):**
- ✅ Maximum 7 hours/day
- ✅ No shifts ending after 20:00
- ✅ No work on holidays
- ✅ Maximum 35 hours/week

**Adult Limits (18+):**
- ✅ Maximum 56 hours/week

**Shift Fairness:**
- ✅ Alternates morning/evening shifts per employee
- ✅ Balanced daily coverage across shifts

---

## Built-in 2026 Calendar Data

**Official Bulgarian Holidays:**
- January 1 - New Year's Day
- March 3 - Liberation Day
- April 10-13 - Easter (Orthodox)
- May 1 - Labor Day
- May 6 - St. George's Day
- September 6 - Unification Day
- September 22 - Independence Day
- December 24-26 - Christmas holidays

**Monthly Working Days/Hours:**
| Month | Days | Hours |
|-------|------|-------|
| January | 20 | 160 |
| February | 20 | 160 |
| March | 21 | 168 |
| April | 20 | 160 |
| May | 18 | 144 |
| June | 22 | 176 |
| July | 23 | 184 |
| August | 21 | 168 |
| September | 20 | 160 |
| October | 22 | 176 |
| November | 21 | 168 |
| December | 20 | 160 |

---

## Design Style
- Clean, professional business aesthetic
- Bulgarian language option for labels (optional toggle)
- Clear form layouts with proper validation
- Responsive design for desktop and tablet use
- Color-coded schedule for easy reading

