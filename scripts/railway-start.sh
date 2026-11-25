#!/usr/bin/env bash
# تشغيل الإنتاج على Railway.
# قرص Railway مؤقت، لذا تُحفظ قاعدة البيانات والملفات المرفوعة داخل Volume
# مركّب على DATA_DIR (الافتراضي /data) وتُربط بمساراتها التي يتوقعها التطبيق.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/db" "$DATA_DIR/uploads" "$DATA_DIR/private-uploads" public

# صور المنتجات المرفقة بالمستودع تُنسخ مرة واحدة إلى الـ Volume قبل استبدال المجلد برابط
if [ -d public/uploads ] && [ ! -L public/uploads ]; then
  cp -rn public/uploads/. "$DATA_DIR/uploads/"
  rm -rf public/uploads
fi
ln -sfn "$DATA_DIR/uploads" public/uploads
ln -sfn "$DATA_DIR/private-uploads" private-uploads

export DATABASE_URL="${DATABASE_URL:-file:$DATA_DIR/db/prod.db}"

FIRST_RUN=0
[ -f "$DATA_DIR/db/.seeded" ] || FIRST_RUN=1

npx prisma migrate deploy

if [ "$FIRST_RUN" = "1" ]; then
  npx tsx prisma/seed.ts
  touch "$DATA_DIR/db/.seeded"
fi

# exec مباشرة على ثنائي next (لا npx) ليتلقّى SIGTERM من Railway ويُغلق بسلام
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
