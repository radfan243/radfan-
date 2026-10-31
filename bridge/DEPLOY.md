# تشغيل جسر GOLDAN AI مع MT5

الجسر للقراءة فقط: ينقل شموع XAUUSD من MT5 إلى GOLDAN AI ولا يرسل أوامر تداول.

## استضافة الجسر
1. انشر مجلد bridge على VPS أو خدمة تدعم Docker.
2. اضبط GOLDAN_BRIDGE_TOKEN على قيمة عشوائية طويلة (32 حرفًا أو أكثر). لا تحفظها في GitHub.
3. استخدم HTTPS واختبر /health.
4. اختياري: اضبط GOLDAN_ALLOWED_ORIGINS على نطاق التطبيق.

## إعداد MT5 على Windows/VPS
1. افتح MT5 ثم File → Open Data Folder → MQL5 → Experts.
2. انسخ mt5/GOLDAN_XAUUSD_Bridge.mq5 إلى Experts وافتحه في MetaEditor واضغط Compile.
3. في MT5: Tools → Options → Expert Advisors، فعّل Allow WebRequest وأضف عنوان HTTPS للجسر.
4. أرفق EA على شارت الذهب، واضبط BridgeURL وBridgeToken وGoldSymbol بحسب وسيطك.
5. اترك MT5 وVPS يعملين. يرسل EA شموع الإطار المحدد كل 15 ثانية.

## ربط تطبيق الهاتف
في صفحة تحليل الذهب أدخل عنوان HTTPS للجسر. التطبيق يقرأ بيانات GET فقط. لا يحتاج كلمة مرور حساب التداول أو صلاحية تنفيذ.

## ملاحظات
- لا تشارك BridgeToken ولا تضعه في JavaScript.
- رمز الذهب يختلف بين الوسطاء (مثل XAUUSD أو GOLD أو XAUUSD.a). عدّل GoldSymbol حسب وسيطك.
- لإرسال أطر M5 وM15 وH1 وH4، شغّل نسخًا منفصلة من EA مع تغيير FeedTimeframe لكل نسخة.
- تطبيق MT5 على Android وحده لا يشغّل هذا الجسر؛ يلزم MT5 Desktop على Windows أو VPS.
## ربط TradingView أيضًا
1. اضبط متغير البيئة السري GOLDAN_TV_WEBHOOK_TOKEN في خدمة الجسر (قيمة طويلة مختلفة عن GOLDAN_BRIDGE_TOKEN).
2. افتح tradingview/GOLDAN_AI_XAUUSD_Alerts.pine وانسخ الكود إلى Pine Editor في TradingView ثم أضفه إلى مخطط XAUUSD.
3. أنشئ Alert واختر Any alert() function call.
4. فعّل Webhook URL وضع عنوان: https://YOUR-HOST/api/tradingview/alert
5. في إعدادات مؤشر Pine ضع السر نفسه في حقل Webhook secret، ثم احفظ التنبيه.
6. ستظهر آخر إشارة TradingView في صفحة GOLDAN AI للمقارنة مع تحليل شموع MT5.

ملاحظة: TradingView يرسل تنبيهًا عند إغلاق الشمعة فقط؛ هذا لا يزوّد التطبيق بسجل OHLC كامل من TradingView. المخطط المضمّن للعرض، وMT5 هو مصدر الشموع الفعلية لمحرك GOLDAN.