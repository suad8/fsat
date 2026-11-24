import { formatNumber } from "@/lib/utils";

type Point = { key: string; label: string; orders: number; quotes: number };

/**
 * رسم بياني خفيف (SVG بلا مكتبة) للطلبات وطلبات العروض خلال ٣٠ يومًا.
 *
 * الاتجاه من اليمين لليسار كما تُقرأ الصفحة: أقدم يوم عند اليمين وأحدثها عند
 * اليسار. أعمدة = طلبات، خط = طلبات عروض الأسعار. لا يعتمد على اللون وحده:
 * الأعمدة والخط شكلان مختلفان ولكل منهما مفتاح نصي، وجدول مخفي بصريًا يقرؤه
 * قارئ الشاشة.
 */
export function ActivityChart({ data }: { data: Point[] }) {
  const width = 720;
  const height = 220;
  const pad = { top: 14, right: 8, bottom: 30, left: 30 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const rawMax = Math.max(1, ...data.map((point) => Math.max(point.orders, point.quotes)));
  const max = rawMax <= 4 ? 4 : Math.ceil(rawMax / 4) * 4;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.max(3, step * 0.56);

  // مؤشر 0 = أقدم يوم → أقصى اليمين
  const xCenter = (index: number) => pad.left + innerW - step * (index + 0.5);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;

  const totalOrders = data.reduce((sum, point) => sum + point.orders, 0);
  const totalQuotes = data.reduce((sum, point) => sum + point.quotes, 0);

  const linePoints = data.map((point, index) => `${xCenter(index)},${y(point.quotes)}`).join(" ");
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];

  return (
    <figure className="m-0">
      <div className="text-primary-600 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-brand-600" />
          طلبات المتجر ({formatNumber(totalOrders)})
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="var(--color-accent-600)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="9" cy="4" r="3" fill="var(--color-surface)" stroke="var(--color-accent-600)" strokeWidth="2" />
          </svg>
          طلبات عروض الأسعار ({formatNumber(totalQuotes)})
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`رسم بياني: ${totalOrders} طلب و${totalQuotes} طلب عرض سعر خلال آخر ٣٠ يومًا`}
        className="block h-auto w-full"
      >
        {/* خطوط الشبكة */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text
              x={pad.left - 6}
              y={y(tick) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-primary-500)"
            >
              {formatNumber(Math.round(tick))}
            </text>
          </g>
        ))}

        {/* أعمدة الطلبات */}
        {data.map((point, index) =>
          point.orders > 0 ? (
            <rect
              key={point.key}
              x={xCenter(index) - barW / 2}
              y={y(point.orders)}
              width={barW}
              height={Math.max(2, innerH - (y(point.orders) - pad.top))}
              rx="2"
              fill="var(--color-brand-600)"
              opacity="0.9"
            >
              <title>{`${point.label}: ${point.orders} طلب`}</title>
            </rect>
          ) : null,
        )}

        {/* خط عروض الأسعار */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-accent-600)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((point, index) =>
          point.quotes > 0 ? (
            <circle
              key={point.key}
              cx={xCenter(index)}
              cy={y(point.quotes)}
              r="3.2"
              fill="var(--color-surface)"
              stroke="var(--color-accent-600)"
              strokeWidth="2"
            >
              <title>{`${point.label}: ${point.quotes} طلب عرض سعر`}</title>
            </circle>
          ) : null,
        )}

        {/* تسميات المحور الأفقي: كل ٦ أيام + آخر يوم */}
        {data.map((point, index) =>
          index % 6 === 0 || index === data.length - 1 ? (
            <text
              key={point.key}
              x={xCenter(index)}
              y={height - 9}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-primary-500)"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>

      <table className="sr-only">
        <caption>الطلبات وطلبات عروض الأسعار اليومية خلال ٣٠ يومًا</caption>
        <thead>
          <tr>
            <th scope="col">اليوم</th>
            <th scope="col">الطلبات</th>
            <th scope="col">طلبات العروض</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.orders}</td>
              <td>{point.quotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
