import {
  AdminCard,
  AdminEmpty,
  AdminHeading,
  AdminTable,
  Td,
  Th,
} from "@/components/admin/AdminUi";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPriceWithCurrency } from "@/lib/utils";

export const metadata = { title: "العملاء" };

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      companyName: true,
      city: true,
      createdAt: true,
      orders: { select: { total: true, status: true } },
    },
  });

  return (
    <>
      <AdminHeading
        title="العملاء"
        description="يُنشأ سجل العميل تلقائيًا عند أول طلب، ويُربط برقم الجوال."
      />

      <AdminCard padded={false}>
        {customers.length === 0 ? (
          <AdminEmpty
            icon="users"
            title="لا يوجد عملاء بعد"
            description="سيُضاف العميل تلقائيًا عند إتمام أول طلب من الموقع."
          />
        ) : (
          <AdminTable
            caption="قائمة العملاء"
            head={
              <>
                <Th>العميل</Th>
                <Th>الجوال</Th>
                <Th>المنشأة</Th>
                <Th>المدينة</Th>
                <Th>الطلبات</Th>
                <Th>إجمالي المشتريات</Th>
                <Th>أول طلب</Th>
              </>
            }
          >
            {customers.map((customer) => {
              // الطلبات الملغاة لا تُحتسب في إجمالي مشتريات العميل
              const active = customer.orders.filter((order) => order.status !== "CANCELLED");
              const lifetime = active.reduce((sum, order) => sum + order.total, 0);

              return (
                <tr key={customer.id} className="hover:bg-surface-muted transition-colors">
                  <Td>
                    <span className="block font-medium">{customer.name}</span>
                    {customer.email ? (
                      <span className="text-primary-400 block text-[0.7rem]" dir="ltr">
                        {customer.email}
                      </span>
                    ) : null}
                  </Td>

                  <Td>
                    <a
                      href={`tel:+${customer.phone}`}
                      className="text-accent-700 hover:text-accent-800 inline-flex items-center gap-1.5 font-mono text-xs font-bold transition-colors"
                      dir="ltr"
                    >
                      <Icon name="phone" className="size-3.5" strokeWidth={1.8} />
                      {customer.phone}
                    </a>
                  </Td>

                  <Td className="text-primary-600 text-sm">{customer.companyName ?? "—"}</Td>

                  <Td className="text-primary-600 text-sm">{customer.city ?? "—"}</Td>

                  <Td className="text-center text-sm font-bold tabular-nums">
                    {active.length}
                  </Td>

                  <Td className="text-sm font-bold tabular-nums whitespace-nowrap">
                    {formatPriceWithCurrency(lifetime)}
                  </Td>

                  <Td className="text-primary-500 text-xs whitespace-nowrap">
                    {formatDate(customer.createdAt)}
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </AdminCard>
    </>
  );
}
