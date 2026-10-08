"""ينزّل خطوط Google المستعملة في index.html ويضمّنها في نسخة التطبيق، فتظهر الخطوط دون إنترنت.
يُشغَّل على خادم GitHub أثناء البناء فقط؛ ولا يغيّر ملفات الموقع الأصلية."""
import re, sys, os, urllib.request

www = sys.argv[1]
idx = os.path.join(www, 'index.html')
html = open(idx, encoding='utf-8').read()
m = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', html)
if not m:
    print('no google fonts link'); sys.exit(0)
UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u.replace('&amp;', '&'), headers=UA), timeout=60).read()
css = get(m.group(1)).decode('utf-8')
os.makedirs(os.path.join(www, 'fonts'), exist_ok=True)
n = 0
def repl(mm):
    global n
    n += 1
    name = 'f%d.woff2' % n
    open(os.path.join(www, 'fonts', name), 'wb').write(get(mm.group(1)))
    return 'url(%s)' % name
css = re.sub(r'url\((https://[^)]+)\)', repl, css)
open(os.path.join(www, 'fonts', 'fonts.css'), 'w', encoding='utf-8').write(css)
html = html.replace(m.group(0), '<link rel="stylesheet" href="fonts/fonts.css">')
open(idx, 'w', encoding='utf-8').write(html)
print('fonts bundled:', n)
