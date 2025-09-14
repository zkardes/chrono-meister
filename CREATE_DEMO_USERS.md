# 🔐 Demo User Creation Guide

Since we don't have the Supabase service role key configured, you'll need to create the demo users manually through the registration form. Here's how to do it:

## 🚀 Quick Setup Instructions

### 1. **Navigate to Registration Page**

- Open your application at `http://localhost:8080`
- Click on "Register" or go to `/register`

### 2. **Use Company Code: `DEMO2025`**

This is crucial for all demo users to be properly linked to the demo company.

### 3. **Create Admin User First**

**Thomas Weber** (Admin/Manager):

- **Email:** `thomas.weber@demo.company`
- **Password:** `Demo123!`
- **First Name:** `Thomas`
- **Last Name:** `Weber`
- **Employee ID:** `EMP003`
- **Company Code:** `DEMO2025`

After registration, you'll need to manually set this user as admin in the database:

```sql
UPDATE user_profiles SET role = 'admin' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'thomas.weber@demo.company'
);
```

### 4. **Create Remaining Users**

#### Regular Staff:

1. **Anna Schmidt** (Group Leader)

   - Email: `anna.schmidt@demo.company`
   - Password: `Demo123!`
   - Name: Anna Schmidt
   - Employee ID: `EMP002`

2. **Max Mustermann** (Staff)

   - Email: `max.mustermann@demo.company`
   - Password: `Demo123!`
   - Name: Max Mustermann
   - Employee ID: `EMP001`

3. **Sarah Johnson** (Group Leader)

   - Email: `sarah.johnson@demo.company`
   - Password: `Demo123!`
   - Name: Sarah Johnson
   - Employee ID: `EMP006`

4. **Lisa Müller** (Trainee)

   - Email: `lisa.mueller@demo.company`
   - Password: `Demo123!`
   - Name: Lisa Müller
   - Employee ID: `EMP004`

5. **Peter Klein** (Support)

   - Email: `peter.klein@demo.company`
   - Password: `Demo123!`
   - Name: Peter Klein
   - Employee ID: `EMP005`

6. **Michael Brown** (Kitchen)

   - Email: `michael.brown@demo.company`
   - Password: `Demo123!`
   - Name: Michael Brown
   - Employee ID: `EMP007`

7. **Laura Davis** (Staff)
   - Email: `laura.davis@demo.company`
   - Password: `Demo123!`
   - Name: Laura Davis
   - Employee ID: `EMP008`

## 🔄 Alternative: Automatic User Creation

If you have access to Supabase service role key, you can:

1. **Add service role key to `.env.local`:**

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. **Run the automatic creation script:**

```bash
npm run create-users
```

This will create all demo users automatically with the correct passwords and metadata.

## 🎯 Testing the System

### Login as Admin:

- **Email:** `thomas.weber@demo.company`
- **Password:** `Demo123!`
- **Features:** Full access to scheduling, employee management, vacation approval

### Login as Employee:

- **Email:** `max.mustermann@demo.company` (or any other employee)
- **Password:** `Demo123!`
- **Features:** Personal scheduling, time tracking, vacation requests

## 📊 What You'll See After Setup

### Demo Company Data:

- **8 Employees** across different departments
- **5 Groups/Teams** (Krippengruppe, Kindergartengruppe, Verwaltung, etc.)
- **5 Time Slots** for flexible scheduling
- **Current week schedule assignments**
- **Sample time entries** from the past week
- **Vacation requests** with mixed statuses

### Scheduling Features:

- **Time Slot Management** (Admin only)
- **Employee Assignment** to shifts
- **Group-based filtering**
- **Role-based permissions**

### Time Tracking:

- **Clock in/out functionality**
- **Overtime calculation**
- **Break time tracking**
- **Project assignment**

### Vacation Management:

- **Request submission**
- **Approval workflow**
- **Status tracking**
- **Calendar integration**

## 🔐 Security Note

All demo users use the same password: `Demo123!`

In production, you should:

- Require users to change their password on first login
- Implement stronger password policies
- Use proper user invitation flows
- Set up proper email verification

## 🆘 Troubleshooting

### If registration fails:

1. Check that company code `DEMO2025` exists in the database
2. Verify email format uses `@demo.company` domain
3. Ensure database migrations have been applied
4. Check browser console for specific error messages

### If users don't have proper roles:

1. Check `user_profiles` table for role assignments
2. Manually update roles in the database if needed
3. Verify the authentication trigger is working properly

### If employee data doesn't link:

1. Verify employee records exist with matching email addresses
2. Check the `auth_user_id` field in employees table
3. Run the registration debug utility if available

## 📚 Next Steps

Once users are created:

1. **Test Admin Features:** Login as Thomas Weber and explore scheduling management
2. **Test Employee Features:** Login as any employee and try time tracking
3. **Test Group Filtering:** Use group filters in scheduling as admin
4. **Create Schedule Assignments:** Try assigning employees to different shifts
5. **Submit Vacation Requests:** Test the vacation approval workflow

Your demo environment is now ready for full testing! 🎉
