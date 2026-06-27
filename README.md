# Reef Monitor, dashboard za telefon

Pi gura očitavanja (temperatura + kuleri) na Vercel, telefon otvori URL i prikazuje
trenutnu temperaturu, stanje kulera i grafik za poslednja 24h. Pi NE otvara nijedan
port niti mu treba javni IP, samo šalje napolje. Radi sa bilo kog mesta, ne samo na
kućnom WiFi-u.

```
Raspberry Pi  --(HTTPS POST /api/ingest, Bearer secret)-->  Vercel  -->  Upstash Redis
Telefon       --(otvori URL)-->  Vercel dashboard  --(/api/state)-->  Upstash Redis
```

## Fajlovi
- `index.html`      dashboard (PWA, dodaje se na home screen)
- `manifest.json`   + `icon-180.png`, `icon-512.png`  (ikona aplikacije)
- `api/ingest.js`   prima podatke od Pi-ja (proverava tajni ključ)
- `api/state.js`    servira podatke dashboardu
- `package.json`    zavisnost (@upstash/redis)
- `reef_push.py`    ide na Pi, čita iz InfluxDB i šalje na Vercel

---

## 1. GitHub + Vercel
1. Napravi nov GitHub repo i ubaci sve OSIM `reef_push.py` (taj ide na Pi).
2. vercel.com -> Add New Project -> import taj repo. Framework: Other. Deploy.

## 2. Upstash Redis (besplatno)
1. U Vercel projektu: tab **Storage** -> **Create / Connect Store** -> **Upstash Redis**.
2. Region blizu (npr. Frankfurt). Vercel sam ubaci env varijable
   (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).

## 3. Tajni ključ
1. Na Pi-ju smisli nasumičan string:  `openssl rand -hex 24`
2. Vercel -> Settings -> Environment Variables -> dodaj
   `INGEST_SECRET = taj-string`  (Production). Redeploy projekat.

## 4. Raspberry Pi
U `~/reef/.env` dodaj (INFLUX_TOKEN već imaš):
```
VERCEL_INGEST_URL=https://TVOJ-PROJEKAT.vercel.app/api/ingest
INGEST_SECRET=isti-string-kao-na-vercelu
```

Kopiraj `reef_push.py` u `~/reef/`, pa napravi servis:
```bash
sudo tee /etc/systemd/system/reef-push.service >/dev/null <<'EOF'
[Unit]
Description=Reef push to Vercel
After=network-online.target reef-monitor.service
Wants=network-online.target

[Service]
User=zoran
WorkingDirectory=/home/zoran/reef
ExecStart=/home/zoran/reef/venv/bin/python /home/zoran/reef/reef_push.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now reef-push
journalctl -u reef-push -f
```
U logu treba da vidiš redove `poslato: 25.9 C, kuleri=0, http=200`.

## 5. Telefon
Otvori URL u Safariju -> dugme Share -> **Dodaj na Home Screen**. Pojavi se ikona,
otvara se preko celog ekrana kao app.

---

## Napomene
- Dashboard se osvežava sam na 30 s. Ako Pi ne pošalje podatak 3 min, gore se pojavi
  upozorenje da je temperatura možda zastarela (da ne gledaš staru vrednost kao tačnu).
- `reef_push.py` ne dira hardver, samo čita iz InfluxDB-a (gde `reef_monitor.py` već
  upisuje i temperaturu i stanje kulera). Dve skripte, jedna baza, bez sukoba.
- Ciljni opseg na grafiku (24.5 do 27.5) je samo vizuelna traka, menja se u `index.html`
  (konstante `TARGET_LO` / `TARGET_HI`).
