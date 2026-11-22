"""A linked editorial opens its matching outfit, with a safe invalid-ID fallback."""
import requests
from bs4 import BeautifulSoup
base='http://127.0.0.1:3104'
for key,title in [('slow-sunday','A slower Sunday'),('weekend-away','A weekend away'),('unknown','The daily uniform')]:
    response=requests.get(base+'/lookbook',params={'look':key},timeout=20)
    response.raise_for_status()
    doc=BeautifulSoup(response.text,'html.parser')
    assert doc.select_one('.lookbook-order h2').text==title
print('PASS: editorial deep links and invalid-ID fallback')
