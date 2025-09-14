# Environment Switcher for Chrono Meister
# Usage: .\switch-env.ps1 [local|production]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "production")]
    [string]$Environment
)

$envFile = ".\.env.local"

Write-Host "Switching to $Environment environment..." -ForegroundColor Cyan

if ($Environment -eq "production") {
    # Production configuration
    $content = @"
# Production Supabase Configuration (currently active)
VITE_SUPABASE_URL=https://zcnhuvydqpotvgvwfcxs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjbmh1dnlkcXBvdHZndndmY3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjA3MjMsImV4cCI6MjA3MjgzNjcyM30.i8Ne1z1YwJgtw3HVtyJuViAEmQmow5DJFlYAtrYerH0

# Local Supabase Configuration (for local development)
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXvdj7ooHNsZD5t_hBSqzHBlF1aFNvc
"@

    Write-Host "✓ Configured for PRODUCTION Supabase" -ForegroundColor Green
    Write-Host "  URL: https://zcnhuvydqpotvgvwfcxs.supabase.co" -ForegroundColor Gray
} else {
    # Local configuration
    $content = @"
# Local Supabase Configuration (currently active)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXvdj7ooHNsZD5t_hBSqzHBlF1aFNvc

# Production Supabase Configuration (for production)
# VITE_SUPABASE_URL=https://zcnhuvydqpotvgvwfcxs.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjbmh1dnlkcXBvdHZndndmY3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNjA3MjMsImV4cCI6MjA3MjgzNjcyM30.i8Ne1z1YwJgtw3HVtyJuViAEmQmow5DJFlYAtrYerH0
"@

    Write-Host "✓ Configured for LOCAL Supabase" -ForegroundColor Green
    Write-Host "  URL: http://127.0.0.1:54321" -ForegroundColor Gray
    Write-Host "  Remember to start local Supabase: npm run supabase:start" -ForegroundColor Yellow
}

$content | Out-File -FilePath $envFile -Encoding UTF8
Write-Host "Environment configuration updated!" -ForegroundColor Green
