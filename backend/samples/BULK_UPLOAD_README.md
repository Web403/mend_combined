# Hotel User Bulk Upload - Testing Guide

## CSV Format

The bulk upload accepts CSV files with the following columns:

### Required Columns
- `email` - User email (must be unique)
- `firstName` - User's first name
- `lastName` - User's last name
- `dob` - Date of birth (format: YYYY-MM-DD)

### Optional Columns
- `phone` - Phone number
- `whatsappNumber` - WhatsApp number
- `middleName` - Middle name
- `gender` - Gender (e.g., Male, Female)
- `role` - User role (default: EMPLOYEE)
- `profession` - Profession (see valid values below)
- `availability` - Availability (see valid values below)
- `yearsOfExperience` - Years of experience (see valid values below)
- `idType` - ID type (PASSPORT, AADHAR, DRIVING_LICENSE, etc.)
- `idNumber` - ID number
- `previousVenues` - Previous venues (semicolon-separated; e.g., "Hotel A;Hotel B")
- `departmentType` - Department type (see valid values below)
- `departmentRole` - Department role (see valid values below)
- `street` - Street address
- `city` - City
- `state` - State/Province
- `country` - Country
- `pinCode` - Postal code
- `department` - Department name

## Valid Enum Values

### Roles
- `ADMIN` - Administrator
- `MANAGER` - Manager
- `EMPLOYEE` - Employee (default)
- `STUDENT` - Student
- `PROFESSIONAL` - Professional

### Department Types
- `FRONT_OFFICE`
- `HOUSEKEEPING`
- `FOOD_AND_BEVERAGE`
- `KITCHEN`
- `ENGINEERING_AND_MAINTENANCE`
- `SECURITY`
- `HUMAN_RESOURCES`
- `FINANCE_AND_ACCOUNTS`
- `SALES_AND_MARKETING`
- `IT`

### Department Roles by Type

**FRONT_OFFICE:**
- FRONT_OFFICE_MANAGER
- DUTY_MANAGER
- RECEPTIONIST
- GUEST_RELATIONS_EXECUTIVE
- CONCIERGE
- BELLBOY

**HOUSEKEEPING:**
- HOUSEKEEPING_MANAGER
- HOUSEKEEPING_SUPERVISOR
- ROOM_ATTENDANT
- LAUNDRY_ATTENDANT
- PUBLIC_AREA_ATTENDANT

**FOOD_AND_BEVERAGE:**
- FNB_MANAGER
- RESTAURANT_MANAGER
- CAPTAIN
- WAITER
- BARTENDER
- BANQUET_EXECUTIVE

**KITCHEN:**
- EXECUTIVE_CHEF
- SOUS_CHEF
- CHEF_DE_PARTIE
- COMMIS_CHEF
- BAKERY_CHEF
- PASTRY_CHEF

**ENGINEERING_AND_MAINTENANCE:**
- ENGINEERING_MANAGER
- MAINTENANCE_SUPERVISOR
- ELECTRICIAN
- PLUMBER
- HVAC_TECHNICIAN

**SECURITY:**
- SECURITY_MANAGER
- SECURITY_SUPERVISOR
- SECURITY_OFFICER
- SECURITY_GUARD

**HUMAN_RESOURCES:**
- HR_MANAGER
- HR_EXECUTIVE
- RECRUITER
- TRAINING_COORDINATOR

**FINANCE_AND_ACCOUNTS:**
- FINANCE_MANAGER
- ACCOUNTANT
- AUDITOR
- CASHIER

**SALES_AND_MARKETING:**
- SALES_MANAGER
- SALES_EXECUTIVE
- CORPORATE_SALES_EXECUTIVE
- MARKETING_EXECUTIVE

**IT:**
- IT_MANAGER
- SYSTEM_ADMINISTRATOR
- NETWORK_ENGINEER
- IT_SUPPORT_EXECUTIVE

### Professions
- `CAPTAIN`
- `CHEF`
- `WAITER`
- `BARTENDER`
- `HOSTESS`
- `MANAGEMENT`
- `STUDENT`
- `OTHER`

### Availability
- `Weekdays`
- `Weekends`
- `Both weekdays & weekends`
- `Flexible / Any time`

### Years of Experience
- `Less than 1 year`
- `1–2 years`
- `3–5 years`
- `5–10 years`
- `10+ years`

### ID Types
- `PASSPORT`
- `AADHAR`
- `DRIVING_LICENSE`
- `VOTER_ID`
- `PAN_CARD`
- `OTHER`

## API Usage

### Upload CSV File
```bash
curl -X POST "http://localhost:3000/hotel/admin/Hotels/{hotelId}/users/bulk" \
  -H "Authorization: Bearer {token}" \
  -F "file=@hotel_users_bulk_sample.csv"
```

### Upload Excel File
```bash
curl -X POST "http://localhost:3000/hotel/admin/Hotels/{hotelId}/users/bulk" \
  -H "Authorization: Bearer {token}" \
  -F "file=@hotel_users_bulk_sample.xlsx"
```

## Creating Excel Files

### Using LibreOffice / Excel
1. Open `hotel_users_bulk_sample.csv` in Excel or LibreOffice Calc
2. Save as `.xlsx` format
3. Upload via the API

### Using Python
```python
import pandas as pd

# Read CSV
df = pd.read_csv('hotel_users_bulk_sample.csv')

# Save as Excel
df.to_excel('hotel_users_bulk_sample.xlsx', index=False, engine='openpyxl')
```

### Using Node.js
```javascript
const XLSX = require('xlsx');
const fs = require('fs');

const csv = fs.readFileSync('hotel_users_bulk_sample.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',');
const data = lines.slice(1).map(line => {
  const values = line.split(',');
  const row = {};
  headers.forEach((header, i) => {
    row[header] = values[i];
  });
  return row;
});

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
XLSX.writeFile(workbook, 'hotel_users_bulk_sample.xlsx');
```

## Sample Files

- `hotel_users_bulk_sample.csv` - Full sample with 10 users across all departments
- `hotel_users_minimal.csv` - Minimal sample with 3 users (required fields only)

## Response Format

### Success
```json
{
  "success": true,
  "message": "Bulk hotel user upload completed",
  "data": [
    {
      "success": true,
      "user": {
        "id": "user_abc123",
        "email": "john@hotel.com",
        "role": "EMPLOYEE",
        "hotelId": "...",
        "createdAt": "2024-06-18T10:30:00Z"
      }
    },
    {
      "success": false,
      "error": "Email already in use",
      "data": { "email": "duplicate@hotel.com", "firstName": "John" }
    }
  ]
}
```

## Troubleshooting

- **Cast to ObjectId failed** → Ensure hotelId is valid
- **Invalid enum value** → Check department type/role against valid values above
- **Email already in use** → Use unique email addresses
- **Missing required field** → Ensure firstName, lastName, email, dob are present
- **Invalid date format** → Use YYYY-MM-DD format for dob
