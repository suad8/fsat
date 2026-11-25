#!/usr/bin/env bash
# ============================================================================
#  نسخ احتياطي واستعادة: قاعدة البيانات + الملفات المرفوعة
# ============================================================================
#  الاستعمال:
#    scripts/backup.sh backup  [--out DIR] [--keep N]   إنشاء نسخة (الافتراضي: backups/، تُبقي ١٤)
#    scripts/backup.sh list    [--out DIR]              عرض النسخ المتاحة
#    scripts/backup.sh verify  ARCHIVE                  فحص أرشيف دون استعادته
#    scripts/backup.sh restore ARCHIVE [--yes]          استعادة (تطلب تأكيدًا؛ أوقف التطبيق قبلها)
#
#  البيئة:
#    DATABASE_URL    file:./dev.db (SQLite، الافتراضي) أو postgres://… (يتطلب pg_dump/pg_restore)
#    BACKUP_FILES    مجلدات الملفات مفصولة بـ ":" — الافتراضي public/uploads:private-uploads
#                    (على Railway هي روابط رمزية إلى Volume؛ يُتبع الرابط تلقائيًا)
#    BACKUP_DIR      مكان الأرشيفات — الافتراضي ./backups
#
#  محتوى الأرشيف (tar.gz):
#    manifest.json            الوقت، نوع القاعدة، آخر هجرة، مجاميع SHA-256
#    database/data.sqlite     نسخة SQLite متّسقة (backup API) — أو database/dump.pgdump لـ PostgreSQL
#    files/<مجلد>/…           الملفات المرفوعة
#
#  ⚠️ الأرشيف يحوي بيانات العملاء وملفات تصاميمهم الخاصة: خزّنه خارج الخادم
#     (تخزين مشفّر/خاص) ولا تضعه داخل public ولا تدفعه إلى git.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
BACKUP_FILES="${BACKUP_FILES:-public/uploads:private-uploads}"
KEEP=14

die() { echo "✖ $*" >&2; exit 1; }
info() { echo "▶ $*"; }

is_postgres() { [[ "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; }

sqlite_path() {
  local p="${DATABASE_URL#file:}"
  [[ "$p" = /* ]] || p="$ROOT/${p#./}"
  echo "$p"
}

sha() { sha256sum "$1" | cut -d' ' -f1; }

# ---------------------------------------------------------------------------
cmd_backup() {
  local out="$BACKUP_DIR"
  while [ $# -gt 0 ]; do
    case "$1" in
      --out) out="$2"; shift 2 ;;
      --keep) KEEP="$2"; shift 2 ;;
      *) die "خيار غير معروف: $1" ;;
    esac
  done

  mkdir -p "$out"
  # مجلد النسخ لا يُدفع إلى git أبدًا
  [ -f "$out/.gitignore" ] || printf '*\n!.gitignore\n' > "$out/.gitignore"

  local stamp work archive kind last_migration
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  work="$(mktemp -d)"
  trap "rm -rf '$work'" EXIT
  mkdir -p "$work/database" "$work/files"

  if is_postgres; then
    kind="postgresql"
    command -v pg_dump >/dev/null || die "pg_dump غير مثبّت"
    info "نسخ قاعدة PostgreSQL…"
    pg_dump --format=custom --no-owner --no-privileges --file="$work/database/dump.pgdump" "$DATABASE_URL"
    pg_restore --list "$work/database/dump.pgdump" >/dev/null || die "فشل التحقق من نسخة pg_dump"
    last_migration="postgresql"
  else
    kind="sqlite"
    local db; db="$(sqlite_path)"
    [ -f "$db" ] || die "قاعدة SQLite غير موجودة: $db"
    info "نسخ قاعدة SQLite ($db)…"
    node "$ROOT/scripts/sqlite-tool.mjs" backup "$db" "$work/database/data.sqlite"
    last_migration="$(node "$ROOT/scripts/sqlite-tool.mjs" summary "$work/database/data.sqlite" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).lastMigration')"
  fi

  # الملفات المرفوعة (تُتبع الروابط الرمزية: على Railway هي إلى الـ Volume)
  local IFS=':' dir copied=()
  for dir in $BACKUP_FILES; do
    if [ -d "$dir" ]; then
      mkdir -p "$work/files/$dir"
      cp -rL "$dir/." "$work/files/$dir/"
      copied+=("$dir")
      info "ملفات: $dir ($(find "$work/files/$dir" -type f | wc -l | tr -d ' ') ملف)"
    fi
  done
  unset IFS

  local dirs_json="" d
  for d in "${copied[@]+"${copied[@]}"}"; do dirs_json+="\"$d\","; done
  dirs_json="${dirs_json%,}"

  # manifest بمجاميع SHA-256 لكل ملف: يكشف أي تلف قبل الاستعادة
  ( cd "$work" && find database files -type f -print0 | sort -z | xargs -0 -r sha256sum > checksums.sha256 )
  cat > "$work/manifest.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database": "$kind",
  "lastMigration": "${last_migration}",
  "fileDirs": [$dirs_json],
  "gitRevision": "$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
}
EOF

  archive="$out/fsat-backup-$stamp.tar.gz"
  tar -C "$work" -czf "$archive" manifest.json checksums.sha256 database files
  chmod 600 "$archive"
  echo "✔ $archive ($(du -h "$archive" | cut -f1))"

  # الاحتفاظ بآخر N نسخ فقط
  local old
  old="$(ls -1t "$out"/fsat-backup-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) || true)"
  if [ -n "$old" ]; then
    echo "$old" | xargs -r rm -f
    info "حُذفت نسخ أقدم من آخر $KEEP"
  fi
}

# ---------------------------------------------------------------------------
cmd_list() {
  local out="$BACKUP_DIR"
  [ "${1:-}" = "--out" ] && out="$2"
  ls -1t "$out"/fsat-backup-*.tar.gz 2>/dev/null | while read -r f; do
    echo "$(du -h "$f" | cut -f1)  $f"
  done || true
}

# يستخرج الأرشيف إلى مجلد مؤقت ويفحصه؛ يطبع مساره
extract_and_verify() {
  local archive="$1" dest
  [ -f "$archive" ] || die "الأرشيف غير موجود: $archive"
  dest="$(mktemp -d)"
  tar -C "$dest" -xzf "$archive"
  [ -f "$dest/manifest.json" ] || die "ليس أرشيف نسخة صالحًا (manifest مفقود)"
  ( cd "$dest" && sha256sum --quiet -c checksums.sha256 ) || die "مجاميع التحقق لا تطابق: الأرشيف تالف"

  if [ -f "$dest/database/data.sqlite" ]; then
    node "$ROOT/scripts/sqlite-tool.mjs" check "$dest/database/data.sqlite" >/dev/null || die "قاعدة SQLite في الأرشيف تالفة"
  elif [ -f "$dest/database/dump.pgdump" ]; then
    pg_restore --list "$dest/database/dump.pgdump" >/dev/null || die "نسخة pg_dump تالفة"
  else
    die "لا توجد نسخة قاعدة بيانات داخل الأرشيف"
  fi
  echo "$dest"
}

cmd_verify() {
  [ $# -ge 1 ] || die "الاستعمال: verify ARCHIVE"
  local dest; dest="$(extract_and_verify "$1")"
  cat "$dest/manifest.json"
  rm -rf "$dest"
  echo "✔ الأرشيف سليم"
}

cmd_restore() {
  [ $# -ge 1 ] || die "الاستعمال: restore ARCHIVE [--yes]"
  local archive="$1" yes=0
  shift
  [ "${1:-}" = "--yes" ] && yes=1

  local dest; dest="$(extract_and_verify "$archive")"
  trap "rm -rf '$dest'" EXIT
  cat "$dest/manifest.json"

  if [ "$yes" != "1" ]; then
    echo
    echo "⚠️  ستُستبدل القاعدة الحالية والملفات المرفوعة بمحتوى هذا الأرشيف."
    echo "    أوقف التطبيق أولاً. تُحفظ نسخة من الوضع الحالي قبل الاستبدال."
    read -r -p "اكتب RESTORE للمتابعة: " answer
    [ "$answer" = "RESTORE" ] || die "أُلغيت الاستعادة"
  fi

  local safety="$BACKUP_DIR/pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$safety"

  if [ -f "$dest/database/data.sqlite" ]; then
    is_postgres && die "الأرشيف SQLite لكن DATABASE_URL يشير إلى PostgreSQL"
    local db; db="$(sqlite_path)"
    mkdir -p "$(dirname "$db")"
    # نسخة أمان للوضع الحالي قبل أي استبدال
    if [ -f "$db" ]; then
      node "$ROOT/scripts/sqlite-tool.mjs" backup "$db" "$safety/data.sqlite" --skip-check >/dev/null \
        || cp "$db" "$safety/data.sqlite"
    fi
    rm -f "$db" "$db-wal" "$db-shm"
    cp "$dest/database/data.sqlite" "$db"
    node "$ROOT/scripts/sqlite-tool.mjs" check "$db" >/dev/null || die "القاعدة المستعادة فشلت الفحص"
    info "استُعيدت قاعدة SQLite → $db"
  else
    is_postgres || die "الأرشيف PostgreSQL لكن DATABASE_URL يشير إلى SQLite"
    info "نسخة أمان للقاعدة الحالية…"
    pg_dump --format=custom --no-owner --no-privileges --file="$safety/dump.pgdump" "$DATABASE_URL" || true
    pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction -d "$DATABASE_URL" "$dest/database/dump.pgdump"
    info "استُعيدت قاعدة PostgreSQL"
  fi

  # الملفات: المجلد الحالي يُنقل إلى نسخة الأمان ثم يُستبدل (يُحافظ على الرابط الرمزي)
  if [ -d "$dest/files" ]; then
    local IFS=':' dir
    for dir in $BACKUP_FILES; do
      if [ -d "$dest/files/$dir" ]; then
        if [ -d "$dir" ]; then
          mkdir -p "$safety/files/$dir"
          cp -rL "$dir/." "$safety/files/$dir/" 2>/dev/null || true
          find "$dir/" -mindepth 1 -delete   # المحتوى فقط — الرابط الرمزي/المجلد يبقى
        else
          mkdir -p "$dir"
        fi
        cp -r "$dest/files/$dir/." "$dir/"
        info "استُعيدت ملفات: $dir"
      fi
    done
    unset IFS
  fi

  echo "✔ تمت الاستعادة. نسخة الأمان: $safety"
  echo "  شغّل: npx prisma migrate deploy  (لو كان الأرشيف أقدم من الهجرات الحالية)"
}

# ---------------------------------------------------------------------------
case "${1:-}" in
  backup)  shift; cmd_backup "$@" ;;
  list)    shift; cmd_list "$@" ;;
  verify)  shift; cmd_verify "$@" ;;
  restore) shift; cmd_restore "$@" ;;
  *) sed -n '2,24p' "${BASH_SOURCE[0]}"; exit 1 ;;
esac
