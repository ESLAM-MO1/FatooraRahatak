using System.Text;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// مركزي بناء رسائل النظام بالقالب الإيميل الموحد.
/// كل طريقة تُرجع زوج (Subject, Body) حيث الـ Body هو محتوى القالب الداخلي
/// الذي يُغلَّف لاحقًا في EmailTemplateRenderer.Render.
/// </summary>
public static class EmailMessageFactory
{
    private static string Heading(string text) => $"<h2>{text}</h2>";
    private static string Paragraph(string text) => $"<p>{text}</p>";
    private static string Greeting(string name) =>
        string.IsNullOrWhiteSpace(name) ? "" : Paragraph($"مرحبًا <b>{name}</b>،");

    public static (string Subject, string Body) AccountVerification(string fullName, string code)
    {
        var body = new StringBuilder();
        body.Append(Heading("تفعيل حسابك في فاتورة راحتك"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("شكرًا لانضمامك إلى فاتورة راحتك! لإكمال تسجيل حسابك، أدخل رمز التفعيل التالي:"));
        body.Append(EmailTemplateRenderer.CodeBox(code));
        body.Append(Paragraph("هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان."));
        return ("تفعيل حسابك في فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) Welcome(string fullName)
    {
        var body = new StringBuilder();
        body.Append(Heading("أهلًا بك في فاتورة راحتك"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("تم تفعيل حسابك بنجاح. يمكنك الآن إنشاء فواتيرك الاحترافية، إدارة متجرك الإلكتروني، وتتبّع طلباتك — كل ذلك من مكان واحد."));
        body.Append(Paragraph("لبدء العمل، افتح لوحة التحكم الخاصة بك واستكشف المزايا المتاحة لك."));
        body.Append(Paragraph("نتمنى لك تجربة موفقة معنا!"));
        return ("أهلًا بك في فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) GoogleWelcome(string fullName)
    {
        var body = new StringBuilder();
        body.Append(Heading("أهلًا بك في فاتورة راحتك"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("تم إنشاء حسابك بنجاح عبر تسجيل الدخول باستخدام حساب Google الخاص بك."));
        body.Append(Paragraph("يمكنك الآن إنشاء فواتيرك الاحترافية، إدارة متجرك الإلكتروني، وتتبّع طلباتك — كل ذلك من مكان واحد."));
        body.Append(Paragraph("لبدء العمل، افتح لوحة التحكم الخاصة بك واستكشف المزايا المتاحة لك."));
        body.Append(Paragraph("نتمنى لك تجربة موفقة معنا!"));
        return ("أهلًا بك في فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) PasswordReset(string fullName, string code)
    {
        var body = new StringBuilder();
        body.Append(Heading("استرجاع كلمة المرور"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("استلمنا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك. أدخل رمز الاسترجاع التالي:"));
        body.Append(EmailTemplateRenderer.CodeBox(code));
        body.Append(Paragraph("هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة."));
        return ("استرجاع كلمة المرور - فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) ProfileUpdateVerification(string fullName, string code)
    {
        var body = new StringBuilder();
        body.Append(Heading("تأكيد تعديل بيانات الحساب"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("طلبنا تعديل بيانات حسابك. أدخل رمز التحقق التالي لتأكيد التغييرات:"));
        body.Append(EmailTemplateRenderer.CodeBox(code));
        body.Append(Paragraph("هذا الرمز صالح لمدة 10 دقائق."));
        return ("تأكيد تعديل بيانات الحساب - فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) PasswordChangeVerification(string fullName, string code)
    {
        var body = new StringBuilder();
        body.Append(Heading("تأكيد تغيير كلمة المرور"));
        body.Append(Greeting(fullName));
        body.Append(Paragraph("طلبت تغيير كلمة المرور الخاصة بحسابك. أدخل رمز التحقق التالي لإتمام العملية:"));
        body.Append(EmailTemplateRenderer.CodeBox(code));
        body.Append(Paragraph("هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب ذلك، يُرجى التواصل مع الدعم فورًا."));
        return ("تغيير كلمة المرور - فاتورة راحتك", body.ToString());
    }

    public static (string Subject, string Body) QuickLoginOtp(string storeName, string code)
    {
        var body = new StringBuilder();
        body.Append(Heading($"رمز الدخول السريع - {storeName}"));
        body.Append(Paragraph("استخدم الرمز التالي للدخول السريع إلى متجرك وتتبع طلباتك:"));
        body.Append(EmailTemplateRenderer.CodeBox(code));
        body.Append(Paragraph("هذا الرمز صالح لمدة 10 دقائق."));
        return ($"رمز الدخول السريع - {storeName}", body.ToString());
    }

    public static (string Subject, string Body) OrderConfirmation(Store store, Order order, IReadOnlyList<OrderItem> items)
    {
        var body = new StringBuilder();
        body.Append(Heading($"شكرًا لطلبك من {store.StoreName}"));
        body.Append(Paragraph($"تم استلام طلبك رقم <b>{order.OrderNumber}</b> بنجاح وسيتم تجهيزه وتوصيله في أقرب وقت."));

        var rows = new StringBuilder();
        foreach (var item in items)
        {
            rows.Append($"<tr><td>{item.ProductNameSnapshot}</td><td style=\"text-align:center\">{item.Quantity}</td><td style=\"text-align:left;direction:ltr\">{item.LineTotal.ToString("0.00")} ر.س</td></tr>");
        }
        body.Append("<table class=\"items\"><thead><tr><th>المنتج</th><th style=\"text-align:center\">الكمية</th><th style=\"text-align:left\">الإجمالي</th></tr></thead><tbody>");
        body.Append(rows);
        body.Append("</tbody></table>");

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("رقم الطلب", order.OrderNumber));
        details.Append(EmailTemplateRenderer.DetailRow("الإجمالي", $"{order.TotalAmount.ToString("0.00")} ر.س"));
        if (!string.IsNullOrWhiteSpace(order.ShippingAddress))
            details.Append(EmailTemplateRenderer.DetailRow("عنوان التوصيل", order.ShippingAddress));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("شكرًا لثقتك بنا."));
        return ($"تأكيد الطلب {order.OrderNumber} - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) OrderStatusUpdate(Store store, Order order, string statusText, string statusColor = "#C9A227")
    {
        var body = new StringBuilder();
        body.Append(Heading("تحديث حالة الطلب"));
        body.Append(Paragraph($"أصبحت حالة طلبك رقم <b>{order.OrderNumber}</b> الآن:"));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("رقم الطلب", order.OrderNumber));
        details.Append(EmailTemplateRenderer.DetailRow("الحالة الحالية", $"<span style=\"color:{statusColor}\">{statusText}</span>"));
        details.Append(EmailTemplateRenderer.DetailRow("الإجمالي", $"{order.TotalAmount.ToString("0.00")} ر.س"));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph($"شكرًا لتعاملك مع {store.StoreName}."));
        return ($"تحديث حالة الطلب {order.OrderNumber}", body.ToString());
    }

    public static (string Subject, string Body) ReturnRequestSubmitted(Store store, Order order, string reason)
    {
        var body = new StringBuilder();
        body.Append(Heading("طلب إرجاع جديد"));
        body.Append(Paragraph($"تم استلام طلب إرجاع الطلب رقم <b>{order.OrderNumber}</b> وسيتم مراجعته من قبل المتجر."));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("رقم الطلب", order.OrderNumber));
        details.Append(EmailTemplateRenderer.DetailRow("سبب الإرجاع", string.IsNullOrWhiteSpace(reason) ? "غير محدد" : reason));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("سنخبرك فور صدور قرار المتجر."));
        return ($"طلب إرجاع - الطلب {order.OrderNumber} - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) ReturnRequestDecision(Store store, Order order, bool approved, string? note)
    {
        var body = new StringBuilder();
        var decisionTitle = approved ? "تمت الموافقة على طلب الإرجاع" : "تم رفض طلب الإرجاع";
        body.Append(Heading(decisionTitle));

        var decisionText = approved
            ? $"تمت الموافقة على طلب إرجاع الطلب رقم <b>{order.OrderNumber}</b>، وسيتم إعادة المبلغ خلال فترة قصيرة."
            : $"نأسف، تم رفض طلب إرجاع الطلب رقم <b>{order.OrderNumber}</b>.";
        body.Append(Paragraph(decisionText));

        if (!string.IsNullOrWhiteSpace(note))
            body.Append(Paragraph($"<b>ملاحظة المتجر:</b> {note}"));
        body.Append(Paragraph($"شكرًا لتعاملك مع {store.StoreName}."));
        return ($"قرار طلب الإرجاع - الطلب {order.OrderNumber}", body.ToString());
    }

    public static (string Subject, string Body) InvoicePaid(Store store, Invoice invoice)
    {
        var body = new StringBuilder();
        body.Append(Heading($"تم تسديد الفاتورة {invoice.InvoiceNumber}"));
        body.Append(Paragraph("تم تأكيد عملية الدفع بنجاح. إليك تفاصيل الفاتورة:"));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("رقم الفاتورة", invoice.InvoiceNumber));
        details.Append(EmailTemplateRenderer.DetailRow("تاريخ الفاتورة", invoice.InvoiceDate.ToString("yyyy-MM-dd")));
        details.Append(EmailTemplateRenderer.DetailRow("العميل/الطرف", invoice.PartyName ?? (invoice.Customer?.FullName ?? "—")));
        details.Append(EmailTemplateRenderer.DetailRow("الإجمالي قبل الضريبة", $"{invoice.SubTotal.ToString("0.00")} ر.س"));
        if (invoice.DiscountAmount > 0)
            details.Append(EmailTemplateRenderer.DetailRow("الخصم", $"-{invoice.DiscountAmount.ToString("0.00")} ر.س"));
        if (invoice.TaxAmount > 0)
            details.Append(EmailTemplateRenderer.DetailRow("الضريبة", $"{invoice.TaxAmount.ToString("0.00")} ر.س"));
        details.Append(EmailTemplateRenderer.DetailRow("الإجمالي المستحق", $"{invoice.TotalAmount.ToString("0.00")} ر.س"));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph($"شكرًا لتعاملك مع {store.StoreName}."));
        return ($"فاتورة مدفوعة {invoice.InvoiceNumber} - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) SubscriptionExpiring(Store store, Subscription subscription, Package package, int daysLeft)
    {
        var body = new StringBuilder();
        body.Append(Heading("اقتراب انتهاء باقتك"));
        body.Append(Paragraph($"باقتك <b>{package.PackageName}</b> ستنتهي خلال <b>{daysLeft} يوم</b> ({subscription.EndDate:yyyy-MM-dd})."));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("الباقة", package.PackageName));
        details.Append(EmailTemplateRenderer.DetailRow("تاريخ الانتهاء", subscription.EndDate.ToString("yyyy-MM-dd")));
        details.Append(EmailTemplateRenderer.DetailRow("الأيام المتبقية", daysLeft.ToString()));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("جدّد اشتراكك الآن لاستمرار الخدمة دون انقطاع."));
        return ($"باقتك على وشك الانتهاء - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) SubscriptionActivated(Store store, Subscription subscription, Package package)
    {
        var body = new StringBuilder();
        body.Append(Heading("تم تفعيل باقتك بنجاح"));
        body.Append(Paragraph($"مبروك! تم تفعيل باقتك <b>{package.PackageName}</b> بنجاح."));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("الباقة", package.PackageName));
        details.Append(EmailTemplateRenderer.DetailRow("تاريخ البداية", subscription.StartDate.ToString("yyyy-MM-dd")));
        details.Append(EmailTemplateRenderer.DetailRow("تاريخ الانتهاء", subscription.EndDate.ToString("yyyy-MM-dd")));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("يمكنك الآن الاستفادة من كل مزايا باقتك."));
        return ($"تم تفعيل الباقة {package.PackageName} - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) SubscriptionUsageLimit(Store store, Package package, string resourceName, int used, int max, decimal percent)
    {
        var body = new StringBuilder();
        body.Append(Heading("اقتراب حد الاستخدام"));
        body.Append(Paragraph($"وصلت إلى <b>{percent:0}%</b> من الحد المسموح لـ <b>{resourceName}</b> في باقتك الحالية (<b>{package.PackageName}</b>)."));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("المورد", resourceName));
        details.Append(EmailTemplateRenderer.DetailRow("المستخدم", used.ToString()));
        details.Append(EmailTemplateRenderer.DetailRow("الحد الأقصى", max.ToString()));
        details.Append(EmailTemplateRenderer.DetailRow("نسبة الاستخدام", $"{percent:0}%"));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("راجع استهلاكك، أو فكّر في الترقية إلى باقة أكبر لتجنّب توقّف العمل عند بلوغ الحد."));
        return ($"تنبيه: اقتراب حد استخدام {resourceName} - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) SubscriptionRenewalFailed(Store store, Subscription subscription, Package package, string? reason)
    {
        var body = new StringBuilder();
        body.Append(Heading("تعذّر تجديد باقتك"));
        body.Append(Paragraph($"فشلت محاولة تجديد باقتك <b>{package.PackageName}</b>. قد يكون ذلك بسبب رصيد غير كافٍ أو فشل في عملية الدفع."));

        var details = new StringBuilder();
        details.Append(EmailTemplateRenderer.DetailRow("الباقة", package.PackageName));
        details.Append(EmailTemplateRenderer.DetailRow("تاريخ الانتهاء", subscription.EndDate.ToString("yyyy-MM-dd")));
        if (!string.IsNullOrWhiteSpace(reason))
            details.Append(EmailTemplateRenderer.DetailRow("السبب", reason));
        body.Append(EmailTemplateRenderer.DetailsBox(details.ToString()));
        body.Append(Paragraph("يمكنك إعادة محاولة التجديد من صفحة الباقات في لوحة التحكم الخاصة بك."));
        return ($"تعذّر تجديد الباقة - {store.StoreName}", body.ToString());
    }

    public static (string Subject, string Body) TestNotification(string storeName)
    {
        var body = new StringBuilder();
        body.Append(Heading("رسالة تجريبية ناجحة"));
        body.Append(Paragraph($"تم تفعيل إشعارات البريد لمتجر <b>{storeName}</b> بنجاح. ستصل رسائل العملاء من هذا القالب الموحد."));
        return ($"رسالة تجريبية من {storeName}", body.ToString());
    }

    public static (string Subject, string Body) MerchantDocumentDecision(string storeName, string docLabel, bool approved, string? reason)
    {
        var titleAr = approved ? "تم اعتماد المستند" : "تم رفض المستند";
        var body = new StringBuilder();
        body.Append(Heading(titleAr));
        body.Append(Paragraph(approved
            ? $"تم اعتماد مستند «{docLabel}» في طلب التوثيق الخاص بمتجر <b>{storeName}</b>."
            : $"تم رفض مستند «{docLabel}»" + (string.IsNullOrWhiteSpace(reason) ? "" : $" بسبب: <b>{reason}</b>")));
        body.Append(Paragraph("يمكنك متابعة حالة التوثيق من لوحة التحكم."));
        return (titleAr, body.ToString());
    }
}
