#!/usr/bin/env bash
# يتحقق أن scripts/railway-start.sh يعمل محليًا على DATA_DIR مؤقت:
#   هجرات ← بذر أول مرة ← next start ← /api/health = 200 ← إعادة تشغيل لا تعيد البذر.
#
# يعمل على نسخة مؤقتة من المشروع لأن السكربت يستبدل public/uploads برابط رمزي
# (لا نريد المساس بملفات المستودع). يتطلب بناءً سابقًا (.next).
# الاستعمال: bash scripts/qa/railway-start-test.sh   (QA_PORT لتغيير المنفذ)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${QA_PORT:-3170}"
WORK="$(mktemp -d)"
DATA="$(mktemp -d)"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK" "$DATA"
}
trap cleanup EXIT

[ -f "$ROOT/.next/BUILD_ID" ] || { echo "✗ لا يوجد .next — شغّل npm run build أولًا"; exit 1; }

echo "› نسخ المشروع إلى $WORK"
mkdir -p "$WORK"
for item in .next prisma public scripts src package.json prisma.config.ts next.config.ts tsconfig.json; do
  [ -e "$ROOT/$item" ] && cp -r "$ROOT/$item" "$WORK/$item"
done
ln -s "$ROOT/node_modules" "$WORK/node_modules"

# Turbopack ينشئ في .next/node_modules روابط نسبية للحزم الخارجية (better-sqlite3، sharp)؛
# بعد النسخ تنكسر، فنعيد ربطها بـ node_modules في النسخة
if [ -d "$WORK/.next/node_modules" ]; then
  for link in "$WORK"/.next/node_modules/* "$WORK"/.next/node_modules/@*/*; do
    [ -L "$link" ] || continue
    rel="${link#"$WORK"/.next/node_modules/}"
    name="$(echo "$rel" | sed -E 's/-[0-9a-f]{16}$//')"
    ln -sfn "$ROOT/node_modules/$name" "$link"
  done
fi

LOG=""
start() {
  LOG="$DATA/server-$1.log"
  (cd "$WORK" && env -u DATABASE_URL DATA_DIR="$DATA" PORT="$PORT" AUTH_SECRET="qa-secret-qa-secret-qa-secret-qa-secret" \
    bash scripts/railway-start.sh) >"$LOG" 2>&1 &
  SERVER_PID=$!
}

wait_health() {
  for _ in $(seq 1 90); do
    if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then return 0; fi
    kill -0 "$SERVER_PID" 2>/dev/null || { echo "✗ العملية توقفت:"; tail -30 "$LOG"; return 1; }
    sleep 1
  done
  echo "✗ انتهت مهلة /api/health"; tail -30 "$LOG"; return 1
}

echo "› تشغيل أول (هجرات + بذر)"
start 1
wait_health
echo "  /api/health → $(curl -sS "http://localhost:$PORT/api/health")"
[ -f "$DATA/db/prod.db" ] || { echo "✗ prod.db لم يُنشأ"; exit 1; }
[ -f "$DATA/db/.seeded" ] || { echo "✗ .seeded غير موجود"; exit 1; }
[ -L "$WORK/public/uploads" ] || { echo "✗ public/uploads ليس رابطًا إلى الـ Volume"; exit 1; }
code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/shop")
[ "$code" = "200" ] || { echo "✗ /shop → $code"; exit 1; }
echo "  /shop → $code، prod.db و .seeded موجودان"

echo "› إيقاف ثم إعادة تشغيل (لا بذر ثانٍ)"
kill "$SERVER_PID"; wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""
start 2
wait_health
if grep -q "بدء تهيئة البيانات الأولية" "$LOG"; then
  echo "✗ أُعيد البذر في التشغيل الثاني"; exit 1
fi
echo "  التشغيل الثاني سليم"
echo "✔ railway-start.sh يعمل"
