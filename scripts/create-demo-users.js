/**
 * Demo User Creation Script
 *
 * This script creates the demo user accounts in Supabase Auth
 * Run this after applying the database migrations
 *
 * Usage: node scripts/create-demo-users.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing environment variables. Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const demoUsers = [
  {
    email: "thomas.weber@demo.company",
    password: "Demo123!",
    firstName: "Thomas",
    lastName: "Weber",
    employeeId: "EMP003",
    companyCode: "DEMO2025",
    role: "admin",
  },
  {
    email: "anna.schmidt@demo.company",
    password: "Demo123!",
    firstName: "Anna",
    lastName: "Schmidt",
    employeeId: "EMP002",
    companyCode: "DEMO2025",
  },
  {
    email: "max.mustermann@demo.company",
    password: "Demo123!",
    firstName: "Max",
    lastName: "Mustermann",
    employeeId: "EMP001",
    companyCode: "DEMO2025",
  },
  {
    email: "sarah.johnson@demo.company",
    password: "Demo123!",
    firstName: "Sarah",
    lastName: "Johnson",
    employeeId: "EMP006",
    companyCode: "DEMO2025",
  },
  {
    email: "lisa.mueller@demo.company",
    password: "Demo123!",
    firstName: "Lisa",
    lastName: "Müller",
    employeeId: "EMP004",
    companyCode: "DEMO2025",
  },
  {
    email: "peter.klein@demo.company",
    password: "Demo123!",
    firstName: "Peter",
    lastName: "Klein",
    employeeId: "EMP005",
    companyCode: "DEMO2025",
  },
  {
    email: "michael.brown@demo.company",
    password: "Demo123!",
    firstName: "Michael",
    lastName: "Brown",
    employeeId: "EMP007",
    companyCode: "DEMO2025",
  },
  {
    email: "laura.davis@demo.company",
    password: "Demo123!",
    firstName: "Laura",
    lastName: "Davis",
    employeeId: "EMP008",
    companyCode: "DEMO2025",
  },
];

async function createDemoUsers() {
  console.log("🚀 Starting demo user creation...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const user of demoUsers) {
    try {
      console.log(
        `👤 Creating user: ${user.firstName} ${user.lastName} (${user.email})`
      );

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          companyCode: user.companyCode,
        },
      });

      if (error) {
        console.error(`   ❌ Error creating ${user.email}:`, error.message);
        errorCount++;
        continue;
      }

      console.log(
        `   ✅ Successfully created ${user.email} (ID: ${data.user.id})`
      );

      // If this is Thomas Weber, make him an admin
      if (user.role === "admin") {
        console.log(`   🔧 Setting admin role for ${user.email}...`);

        // Update user profile to admin role
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ role: "admin" })
          .eq("id", data.user.id);

        if (updateError) {
          console.error(`   ❌ Error setting admin role:`, updateError.message);
        } else {
          console.log(`   ✅ Admin role set successfully`);
        }
      }

      successCount++;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(
        `   ❌ Unexpected error creating ${user.email}:`,
        err.message
      );
      errorCount++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${errorCount} users`);
  console.log(`📧 Total users: ${demoUsers.length}`);

  if (successCount > 0) {
    console.log("\n🎉 Demo users created successfully!");
    console.log("\n🔑 Login Credentials:");
    console.log("Email: Any of the emails above");
    console.log("Password: Demo123!");
    console.log("\n👨‍💼 Admin User:");
    console.log("Email: thomas.weber@demo.company");
    console.log("Password: Demo123!");
    console.log("\n📋 Company Code for new registrations: DEMO2025");
  }
}

// Run the script
createDemoUsers().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
