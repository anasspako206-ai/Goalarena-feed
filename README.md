# الإعداد (مرة واحدة)
1. أنشئ مستودعاً **عاماً** على GitHub (مثلاً `goalarena-feed`) وارفع محتويات هذا المجلد كما هي (بما فيه `.github`).
2. Settings ← Actions ← General ← Workflow permissions ← **Read and write permissions**.
3. تبويب Actions ← `arab-matches` ← **Run workflow** (مرة أولى). سيظهر `extra.json` في المستودع.
4. في القالب ضع في `GA`:  extraFeed: 'https://raw.githubusercontent.com/<USER>/<REPO>/main/extra.json'
5. (اختياري) مفتاح TheSportsDB المدفوع: Settings ← Secrets ← Actions ← `TSDB_KEY`.
أسماء الفرق بالعربية: عدّل `teams-ar.json` (الاسم الإنجليزي كما يظهر في extra.json ← العربي).
