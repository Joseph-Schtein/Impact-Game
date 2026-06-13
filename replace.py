import sys
content = open('public/app.js', 'r', encoding='utf-8').read()
content = content.replace('⚡', '<i class="uil uil-bolt"></i>')
content = content.replace("<div>${pName} ${pData.isHost ? '👑' : ''}</div>", "<div>${pName}</div>")
content = content.replace('⏳', '<i class="uit uit-hourglass"></i>')
open('public/app.js', 'w', encoding='utf-8').write(content)
