# ChemLabX Lite

معمل كيمياء افتراضي يعمل **بدون إنترنت** كتطبيق ويب تقدمي (PWA) — نسخة الأساس/الخفيفة من ChemLabX 4.0.

An offline-first virtual chemistry lab PWA (the foundation / lite build of ChemLabX 4.0). No backend, no network calls at runtime: chemistry data, content packs, fonts, and the app shell are all local and precached by a service worker.

---

## لماذا «Lite»؟

هذا المستودع هو **خط الأساس** (Foundation) وليس المنتج الكامل:

- تطبيق أمامي فقط (Vanilla JS) بلا خادم أو قاعدة بيانات سحابية.
- البيانات تُحفظ محليًا في المتصفح (IndexedDB + `localStorage`).
- المحتوى التعليمي `content-v1`: 6 دروس و20 سؤالًا و14 تجربة — تم التحقق من بنيتها واتساقها المرجعي، **وليس** اعتمادًا علميًا نهائيًا لكل سؤال.
- لا مزامنة متعددة الأجهزة، ولا فصول/واجبات على الخادم.

## المزايا

- **معمل تفاعلي**: سحب المواد، خلط، تسخين، ترشيح، وقياس — مع محاكاة أثر حراري/لوني/غازي.
- **سلامة كيميائية**: قواعد تحذير وتنبيهات قبل التجارب الخطرة.
- **تعلّم**: دروس، اختبارات بتغذية راجعة، XP وإنجازات، ملف شخصي.
- **أدوار**: طالب / معلم / مدير مع مصفوفة صلاحيات.
- **عربي/إنجليزي** مع RTL كامل.
- **وصولية**: روابط تخطي، إدارة تركيز في الحوارات، تباين AA، تنقّل بلوحة المفاتيح.
- **أوفلاين حقيقي**: Service Worker `chemlabx-v14` + خطوط محلية مستضافة ذاتيًا (Cairo / Inter / Roboto Mono).
- **بلا طلبات خارجية**: صفر اتصال بـ Google Fonts أو أي CDN.

## التشغيل

المتصفح يمنع Service Worker على `file://`، لذا شغّل خادمًا محليًا:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File test/server.ps1 -Port 8765
```

ثم افتح: <http://127.0.0.1:8765/index.html>

أو أي خادم ثابت آخر (Python: `python -m http.server 8765`).

## حسابات تجريبية

| الدور | البريد | كلمة المرور |
|---|---|---|
| طالب | `student@chemlabx.com` | `student123` |
| معلم | `teacher@chemlabx.com` | `teacher123` |
| مدير | `admin@chemlabx.com` | `admin123` |

> هذه حسابات عرض محلية فقط. لا تستخدمها في نشر حقيقي.

## الاختبار والتحقق

```powershell
# 143 فحصًا في 4 سياقات (online / offline×2 / preload) + 10 صفحات + SW cold-start
powershell -NoProfile -ExecutionPolicy Bypass -File test/verify.ps1

# المدقّقات المستقلة
python test/validate_content.py
python test/validate_chemistry.py
python test/validate_changejournal.py
python test/validate_authorization.py
```

الحالة الحالية: **143 PASS / 0 FAIL** · 10/10 صفحات · content 37/37 · chemistry نظيف · changejournal PASS · authorization PASS.

## البنية

```
index.html … admin.html      صفحات التطبيق (10)
css/                         أنماط + رموز ثيم + css/fonts.css
js/core/                     i18n, auth, db, ui, versions, dataport
js/domain/                   content, chemistry, laboratory, safety, results, education,
                             changejournal, authorization
js/data/                     materials (185), reactions (28), achievements, content packs
js/lab/                      engine, bench, effects, particles, shelf
js/pages/                    منطق كل صفحة
fonts/                       16 woff2 محلي + LICENSE.txt
test/                        harness + validators + verify.ps1 + server.ps1
docs/architecture/           قرارات ومخططات معمارية
```

## الإصدارات المثبتة

`SCHEMA_VERSION=2` · `CHEMISTRY_DATA_VERSION='validated-v1'` · `CONTENT_VERSION='content-v1'` (مربوط بـ manifest) · `APP_VERSION='4.0.0-foundation'`.

## ملاحظات

- `content-v1` يضمن: إصدار الحزم، المخطط، اكتمال اللغتين، وسلامة الإحالة تجربة↔تفاعل — لا يضمن مراجعة علمية خبيرة لكل نص.
- التخزين محلي بالكامل؛ مسح بيانات المتصفح يمسح التقدم.
- لا يوجد مستودع خلفي، لذا لا تُرسل بيانات إلى أي خادم.

## الترخيص

لم يُحدَّد ترخيص للمشروع بعد — جميع الحقوق محفوظة. خطوط Cairo وInter وRoboto Mono مدرجة بتراخيصها في [`fonts/LICENSE.txt`](fonts/LICENSE.txt) (SIL OFL 1.1).
