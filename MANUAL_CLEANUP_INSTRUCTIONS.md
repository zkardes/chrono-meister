# 🔧 Manual Database Cleanup Instructions

Since there are network connectivity issues with the CLI, please follow these steps to manually clean up your database:

## 🎯 **Step 1: Access Supabase Dashboard**

1. **Open your browser** and go to: https://supabase.com/dashboard
2. **Login** to your account
3. **Navigate** to your project: `chrono-meister` (Project ID: zcnhuvydqpotvgvwfcxs)
4. **Click** on "SQL Editor" in the left sidebar

## 🗄️ **Step 2: Run the Cleanup Script**

1. **Copy the entire content** from the file: [`MANUAL_DATABASE_CLEANUP.sql`](file:///Users/zkardes/Documents/GitHub/chrono-meister/MANUAL_DATABASE_CLEANUP.sql)

2. **Paste it** into the SQL Editor in Supabase Dashboard

3. **Click "Run"** to execute the script

   > ⚠️ **Warning**: This will delete ALL existing data and create fresh demo data!

## ✅ **Step 3: Verify the Cleanup**

After running the script, you should see a result table showing:

```
status: "Database Cleanup and Seeding Complete!"
companies_count: 1
employees_count: 8
groups_count: 5
time_slots_count: 5
schedule_assignments_count: 20+
time_entries_count: 15+
vacation_requests_count: 5
```

## 🔐 **Step 4: Create User Accounts**

Since auth users need to be created through registration:

### **Option A: Use Registration Form (Recommended)**

1. **Go to your app**: http://localhost:8080/register
2. **Register each user** with these details:

**Admin User (Register First):**

- Email: `thomas.weber@demo.company`
- Password: `Demo123!`
- First Name: `Thomas`
- Last Name: `Weber`
- Employee ID: `EMP003`
- **Company Code: `DEMO2025`** ⭐ (Most Important!)

**Additional Users:**

- `anna.schmidt@demo.company` - Password: `Demo123!` - Employee ID: `EMP002`
- `max.mustermann@demo.company` - Password: `Demo123!` - Employee ID: `EMP001`
- `sarah.johnson@demo.company` - Password: `Demo123!` - Employee ID: `EMP006`
- `lisa.mueller@demo.company` - Password: `Demo123!` - Employee ID: `EMP004`
- `peter.klein@demo.company` - Password: `Demo123!` - Employee ID: `EMP005`
- `michael.brown@demo.company` - Password: `Demo123!` - Employee ID: `EMP007`
- `laura.davis@demo.company` - Password: `Demo123!` - Employee ID: `EMP008`

### **Step 5: Set Admin Role**

After creating Thomas Weber's account:

1. **Go back to Supabase Dashboard** → SQL Editor
2. **Run this query** to make Thomas an admin:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'thomas.weber@demo.company'
);
```

## 🎉 **What You'll Have After Cleanup**

### **🏢 Demo Company Structure:**

- **Demo Corporation GmbH** (Company Code: DEMO2025)
- **8 Employees** across different departments
- **5 Groups/Teams** with proper hierarchy
- **5 Time Slots** for flexible scheduling

### **📊 Sample Data Included:**

- ✅ **Current week schedule assignments**
- ✅ **Past week time entries**
- ✅ **Vacation requests** with mixed statuses
- ✅ **Employee-group relationships**
- ✅ **Realistic German childcare facility setup**

### **🔑 User Credentials:**

- **Admin:** `thomas.weber@demo.company` / `Demo123!`
- **All Employees:** `[name]@demo.company` / `Demo123!`

## 🚀 **Testing Your Clean Database**

1. **Login as Admin** (Thomas Weber):

   - Full scheduling management
   - Time slot creation/editing
   - Employee assignment
   - Vacation approval

2. **Login as Employee** (any other user):
   - Personal schedule viewing
   - Shift assignment requests
   - Time tracking
   - Vacation submissions

## 🆘 **Troubleshooting**

### If the cleanup script fails:

1. **Check for active connections**: Make sure no other applications are connected
2. **Run in smaller chunks**: Execute each section (STEP 1, STEP 2, etc.) separately
3. **Check permissions**: Ensure you have admin access to the database

### If user registration fails:

1. **Verify company code**: Must be exactly `DEMO2025`
2. **Check email format**: Must use `@demo.company` domain
3. **Ensure database cleanup completed**: Run the verification query again

### If data doesn't appear:

1. **Refresh your application**
2. **Check browser console** for error messages
3. **Verify user authentication** is working

## 📝 **Alternative: CLI Retry**

If you want to try the CLI again later:

```bash
# Try the migration again when network is stable
cd /Users/zkardes/Documents/GitHub/chrono-meister
supabase db push
```

---

## ✨ **Your Database Will Be Clean and Ready!**

After following these steps, you'll have a completely clean database with fresh, realistic demo data ready for testing all the scheduling features.

**Key Point**: Always use company code `DEMO2025` when registering users! 🎯
