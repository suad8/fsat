# نظام التصميم

لغة بصرية مستوحاة من عالم الطباعة، مبنية فوق محرّك الثيم (الألوان تُولَّد من `/admin/theme`)، والحركة بـ GSAP.

## الرموز (`src/app/globals.css`)
- الانحناءات: `--radius-*` (حتى 2rem) — البطاقات `rounded-2xl`/`3xl`، الأزرار `rounded-xl`.
- الظلال: `shadow-card`, `shadow-card-hover`, `shadow-pop`, `shadow-glow` (مصبوغة بالبنفسجي).
- العناوين: وزن 800، تباعد حروف سالب خفيف.

## أدوات الطباعة (utilities)
| الأداة | الاستخدام |
|---|---|
| `halftone` + `halftone-fade` | شبكة نقطية كالأوفست (اللون عبر `text-*`) |
| `crop-marks` | علامات قص في زاويتين (`--crop-color` لتغيير اللون) |
| `foil-text` | تدرّج ذهبي لامع متحرك للكلمات المفتاحية |
| `grain` | حبيبات ورق فوق الأسطح الداكنة |
| `spotlight` | بقعة ضوء تتبع المؤشر (تُفعَّل عبر `Tilt`) |
| `shine` | بريق يمرّ على الأزرار عند التمرير |

## الحركة (GSAP)
كل التسجيل في `src/lib/gsap.ts`؛ كل الحركات داخل `gsap.matchMedia()` فتتوقف عند `prefers-reduced-motion`. الحالة الابتدائية المخفية معرّفة في CSS ضمن `(prefers-reduced-motion: no-preference) and (scripting: enabled)`.

| المكوّن | الوظيفة |
|---|---|
| `Reveal` | ظهور عند التمرير (ScrollTrigger) |
| `Intro` | مدخل متتابع لترويسات الصفحات |
| `HeroMotion` | timeline الـ Hero، عدّادات، بارالاكس، علامة التسجيل |
| `Tilt` | إمالة 3D + spotlight للبطاقات (مؤشر دقيق فقط) |
| `Magnetic` | انجذاب الأزرار نحو المؤشر |
| `Marquee` | شريط أقسام لا نهائي |
| `StepsTimeline` | خط زمني يمتلئ مع التمرير |
| `ScrollProgress` | شريط تقدّم القراءة |
| `Header` | يختفي عند النزول ويعود عند الصعود (يحرّك `top` لا `transform` حتى لا تنكسر قائمة الجوال) |
