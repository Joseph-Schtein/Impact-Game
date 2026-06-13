@echo off
echo Cleaning npm cache to prevent npx glitches...
call npm cache clear --force
echo Deploying to Firebase Hosting...
call npx -y firebase-tools@latest deploy --only hosting
echo Deployment finished!
pause
