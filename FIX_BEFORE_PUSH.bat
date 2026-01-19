@echo off
echo 🚨 FIXING GIT HISTORY - REMOVING .env FILES
echo.
echo ⚠️  WARNING: This will rewrite Git history!
echo ⚠️  Make sure you have a backup!
echo.
pause

echo 📁 Creating backup...
if not exist ".git-backup" (
    xcopy /E /I /H .git .git-backup
    echo ✅ Backup created at .git-backup
) else (
    echo ⚠️  Backup already exists
)

echo.
echo 🗑️  Removing .env files from Git history...
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env backend/.env" --prune-empty --tag-name-filter cat -- --all

echo.
echo 🧹 Cleaning up...
if exist ".git\refs\original" (
    rmdir /S /Q ".git\refs\original"
)

git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo.
echo ✅ COMPLETED! 
echo.
echo 📋 Next steps:
echo 1. Check git log to verify .env files are gone
echo 2. Add and commit your security fixes
echo 3. Push to GitHub
echo.
echo 🔍 Verify with: git log --all --full-history -- backend/.env
echo (Should show no results)
echo.
pause