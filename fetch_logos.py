import urllib.request
import re

urls = {
    'ironclad': 'https://ironcladapp.com/',
    'sirion': 'https://www.sirion.com/',
    'icertis': 'https://www.icertis.com/',
    'leah': 'https://contractpodai.com/'
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'https?://[^"\'\s]+\.(?:png|svg)(?i)', html)
        if match:
            print(f"{name}: {match.group(0)}")
        else:
            print(f"{name}: not found")
    except Exception as e:
        print(f"{name}: error {e}")
