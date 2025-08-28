@echo off
cd /d "c:\Users\danie\CascadeProjects\windsurf-project\carrot"
echo === AVATAR DEBUG OUTPUT ===
echo Current directory: %cd%
echo Database file check:
if exist dev.db (
    echo Database exists - Size: 
    for %%A in (dev.db) do echo %%~zA bytes
) else (
    echo Database NOT FOUND
)

echo.
echo Running Node.js database check...
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); (async () => { try { const users = await p.user.findMany(); console.log('Users found:', users.length); users.forEach(u => { console.log('- ' + u.email + ' (' + u.username + ')'); console.log('  profilePhoto: ' + (u.profilePhoto ? 'YES (' + u.profilePhoto.length + ' chars)' : 'NO')); console.log('  image: ' + (u.image ? 'YES (' + u.image.length + ' chars)' : 'NO')); }); const posts = await p.post.findMany({ include: { User: true } }); console.log('Posts found:', posts.length); posts.forEach(post => { console.log('Post ' + post.id + ': ' + (post.User?.username || 'NO USER')); console.log('  Avatar: ' + (post.User?.profilePhoto || post.User?.image ? 'HAS PHOTO' : 'PLACEHOLDER')); }); } catch (e) { console.error('Error:', e.message); } finally { await p.$disconnect(); } })();"

pause
