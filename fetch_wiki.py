import urllib.request
import json
import ssl
import urllib.parse

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_wiki_logo(query):
    url = f'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}%20logo&utf8=&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
        data = json.loads(response)
        if len(data["query"]["search"]) > 0:
            print(f'{query}: {data["query"]["search"][0]["title"]}')
        else:
            print(f'{query}: not found')
    except Exception as e:
        print(f'{query}: error {e}')

fetch_wiki_logo('Ironclad software')
fetch_wiki_logo('Icertis')
fetch_wiki_logo('SirionLabs')
fetch_wiki_logo('ContractPodAi')
