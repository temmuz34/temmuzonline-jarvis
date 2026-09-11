# TemmuzOnline canlı işletim notu

Canlı akış GitHub → Render → Node.js şeklindedir. `npm start` Render `PORT` değerini kullanır ve `0.0.0.0` üzerinde dinler. Basic Auth `TEMMUZ_AUTH_USER` ve `TEMMUZ_AUTH_PASSWORD` ile verilir.

Ekip üyeleri yazılım içindeki rol tanımlarıdır. Aktif kart, rapora dahil edilen rol demektir; insan danışmanın veya sürekli çalışan yapay zekâ ajanının çalıştığı anlamına gelmez. Gerçek veri ilgili bağlantı tamamlandığında rapora girer.

Kalıcı veri için Neon PostgreSQL ve `STORAGE_MODE=postgres` kullanılır. Önce JSON yedeği alıp `npm run migrate:storage` çalıştır. Ayrıntılı kurulum `UPGRADE-REPORT.md` içindedir.

Render Build Command: `npm install`  
Render Start Command: `npm start`

08:00 ve 13:00 raporları için dış scheduler `POST /api/scheduler/run` adresini `Authorization: Bearer <SCHEDULE_SECRET>` ile çağırır. Render Free uyuyabileceği için yalnız `setInterval` kesin saat garantisi vermez.

Google bağlantısı salt okunur. GA4 sayısal `GA4_PROPERTY_ID`, Search Console `SEARCH_CONSOLE_SITE_URL` ve Render Environment OAuth değişkenleri gerekir. Secret’lar HTML, localStorage, JSON export veya GitHub’a yazılmaz.
