import { MessagesList } from "@/app/admin/(dashboard)/messages/MessagesList";
import { AdminCard, AdminEmpty, AdminHeading } from "@/components/admin/AdminUi";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "رسائل الموقع" };

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const unread = messages.filter((message) => message.status === "NEW").length;

  return (
    <>
      <AdminHeading
        title="رسائل الموقع"
        description={
          unread > 0
            ? `${unread} رسالة غير مقروءة من نموذج «اتصل بنا».`
            : "الرسائل الواردة من نموذج «اتصل بنا»."
        }
      />

      {messages.length === 0 ? (
        <AdminCard padded={false}>
          <AdminEmpty
            icon="mail"
            title="لا توجد رسائل بعد"
            description="ستظهر هنا الرسائل الواردة من نموذج التواصل في الموقع."
          />
        </AdminCard>
      ) : (
        <MessagesList messages={messages} />
      )}
    </>
  );
}
