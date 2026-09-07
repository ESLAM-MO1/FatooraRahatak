/**
 * محتوى مساعدة كل صفحة في لوحة التحكم، ويُعرض في النافذة المنبثقة التي تفتح
 * من أيقونة (؟) الثابتة (PageHelp component).
 *
 * المفتاح = المسار (pathname) تمامًا كما يظهر من usePathname() (بدون query params).
 * إذا لم تكن الصفحة موجودة هنا، فلن يظهر زر المساعدة لها.
 *
 * كل صفحة جديدة تُضاف إلى لوحة التحكم يجب أن تحصل على سطر هنا بنفس الأسلوب: عنوان
 * قصير + شرح تفصيلي (وليس مجرد جملة) يغطي وظيفة الصفحة، وكيف
 * يستخدمها المستخدم خطوة بخطوة.
 */

export interface PageHelpEntry {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export const PAGE_HELP_CONTENT: Record<string, PageHelpEntry> = {
  "/dashboard": {
    titleAr: "مساعدة: الصفحة الرئيسية",
    titleEn: "Help: Dashboard Home",
    bodyAr:
      "هذه هي الصفحة الرئيسية التي تشاهدها بعد تسجيل الدخول مباشرة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض حالتك الحالية: الباقة المشترك فيها واستهلاكك من المنتجات والموظفين والمخازن.\n" +
      "• تتابع ملخص مبيعاتك خلال الشهر (إجمالي المبيعات، مبيعات نقطة البيع، الفواتير، والطلبات الجديدة).\n" +
      "• تتنقل إلى بقية أقسام لوحة التحكم من القائمة الجانبية حسب دورك (صاحب متجر / موظف / مدير عام).\n\n" +
      "المسؤولون العامون وموظفو المنصة يرون روابط سريعة لأقسام الإدارة هنا بدلاً من بيانات المتجر.",
    bodyEn:
      "This is the main page you see right after logging in.\n\n" +
      "From here you can:\n" +
      "• See your current status: your subscription package and how much you've used of products, employees, and warehouses.\n" +
      "• Follow your monthly sales summary (total sales, POS sales, invoices, and new orders).\n" +
      "• Navigate to other dashboard sections from the sidebar depending on your role (Merchant / Employee / General Manager).\n\n" +
      "Super admins and platform staff see quick links to admin sections here instead of store data.",
  },
  "/dashboard/products": {
    titleAr: "مساعدة: المنتجات",
    titleEn: "Help: Products",
    bodyAr:
      "هذه الصفحة تعرض جميع منتجات متجرك مع إمكانية إضافة وتعديل المنتجات.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف منتج جديد بالضغط على زر \"إضافة منتج\" وملء البيانات (الفئة، الاسم بالعربي والإنجليزي، الوصف، السعر الأساسي وسعر الخصم، الوزن، والكمية الأولية).\n" +
      "• تبحث عن منتج بالاسم أو رمز التخزين (SKU).\n" +
      "• تعدّل منتج موجود أو تضيف له متغيرات (Variants) من زر النسخ.\n" +
      "• ترسل المنتج للأرشيف أو تسترجعه أو تحذفه نهائيًا من تبويب الأرشيف.\n" +
      "• تراجع تقييمات العملاء على منتجاتك من تبويب التقييمات.\n\n" +
      "الجدول يعرض: الاسم، رمز التخزين، السعر، الكمية المتاحة، وحالة المنتج (نشط / مسودة / مؤرشف / نفدت الكمية).",
    bodyEn:
      "This page lists all of your store's products with the ability to add and edit them.\n\n" +
      "From here you can:\n" +
      "• Add a new product using the \"Add Product\" button and fill in the details (category, Arabic/English names, description, base and discount price, weight, and initial quantity).\n" +
      "• Search for a product by name or SKU.\n" +
      "• Edit an existing product or add variants to it from the button on its row.\n" +
      "• Archive, restore, or permanently delete products from the Archive tab.\n" +
      "• Review customer ratings for your products from the Reviews tab.\n\n" +
      "The table shows: name, SKU, price, available quantity, and product status (Active / Draft / Archived / Out of stock).",
  },
  "/dashboard/products/[id]": {
    titleAr: "مساعدة: تفاصيل المنتج",
    titleEn: "Help: Product Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل منتج معين (الاسم، رمز التخزين، الأسعار، الكمية المتاحة، والوصف).\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف متغيرات للمنتج (اسم المتغير، تعديل السعر، الكمية الأولية، وخصائص إضافية) وتعدّل عليها أو تحذفها أو تعطّلها.\n" +
      "• ترفع صورًا للمنتج وتحدد الصورة الأساسية وترتيب العرض، وتحذف أي صورة.\n\n" +
      "البيانات هنا مقروءة بشكل أساسي، وكل إجراء في صفحة منفصلة أو زر واضح داخل البطاقات.",
    bodyEn:
      "This page shows the details of a single product (name, SKU, prices, available quantity, and description).\n\n" +
      "From here you can:\n" +
      "• Add variants to the product (variant name, price adjustment, initial quantity, and extra attributes), then edit, delete, or deactivate them.\n" +
      "• Upload product images, set the primary image and display order, and delete any image.\n\n" +
      "Most information here is read-only, and each action has a clear button inside the relevant card.",
  },
  "/dashboard/orders": {
    titleAr: "مساعدة: الطلبات",
    titleEn: "Help: Orders",
    bodyAr:
      "هذه الصفحة تعرض جميع طلبات متجرك مصنفة حسب الحالة.\n\n" +
      "من هنا يمكنك:\n" +
      "• ترشح الطلبات حسب الحالة (جديد، بانتظار الدفع، قيد المعالجة، تم الشحن، تم التسليم، مرتجع، بانتظار الاسترداد).\n" +
      "• تضغط على رقم الطلب للانتقال لصفحة تفاصيل الطلب.\n\n" +
      "الجدول يعرض: رقم الطلب، العميل، الإجمالي، حالة الطلب، وتاريخ الإنشاء، مع ترقيم صفحات.\n\n" +
      "هذه الصفحة للعرض والتنقل فقط — إجراءات الطلب (تغيير الحالة، الإلغاء، تأكيد التحويل) تتم من صفحة تفاصيل الطلب.",
    bodyEn:
      "This page lists all of your store's orders, filtered by status.\n\n" +
      "From here you can:\n" +
      "• Filter orders by status (New, Pending Payment, Processing, Shipped, Delivered, Returned, Pending Refund).\n" +
      "• Click an order number to view the order details page.\n\n" +
      "The table shows: order number, customer, total, status badge, and creation date, with pagination.\n\n" +
      "This is a read-only listing page — order actions (changing status, cancelling, confirming transfers) happen on the order detail page.",
  },
  "/dashboard/orders/[id]": {
    titleAr: "مساعدة: تفاصيل الطلب",
    titleEn: "Help: Order Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل طلب واحد (بيانات العميل، عنوان الشحن، الشحنات، طريقة الدفع، المنتجات، وتاريخ الحالات).\n\n" +
      "من هنا يمكنك:\n" +
      "• تأكيد تحويل بنكي لطلبات الدفع البنكي قبل الدفع.\n" +
      "• تتابع الشحنات ومسار التتبع المرتبط بها.\n" +
      "• تغيّر حالة الطلب من القائمة المنسدلة وحفظها.\n" +
      "• إلغاء الطلب (ظاهر للطلبات الجديدة أو قيد المعالجة أو بانتظار الدفع).\n\n" +
      "تأكد من مراجعة ملاحظات العميل ومعلومات الشحن قبل تغيير الحالة.",
    bodyEn:
      "This page shows the details of a single order (customer info, shipping address, shipments, payment method, items, and status history).\n\n" +
      "From here you can:\n" +
      "• Confirm a bank transfer for orders placed with bank transfer that are not yet paid.\n" +
      "• Follow the shipments and their tracking events.\n" +
      "• Change the order status from the dropdown and save it.\n" +
      "• Cancel the order (shown for New, Processing, or Pending Payment orders).\n\n" +
      "Always review the customer's notes and shipping information before changing the status.",
  },
  "/dashboard/orders/returns": {
    titleAr: "مساعدة: طلبات الاسترجاع",
    titleEn: "Help: Order Returns",
    bodyAr:
      "هذه الصفحة تعرض طلبات استرجاع المنتجات من العملاء.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعتمد طلب الاسترجاع أو ترفضه من زري (اعتماد / رفض) الظاهرين في طلبات بانتظار القرار.\n" +
      "• تكتب ملاحظة القرار في الحقل أسفل الجدول ويتم تطبيقها على القرار التالي.\n\n" +
      "الجدول يعرض: رقم الطلب، العميل، إجمالي الطلب، سبب الاسترجاع، الحالة، والتاريخ، مع عرض ملاحظة القرار للطلبات المحسومة.",
    bodyEn:
      "This page lists customer return requests for products.\n\n" +
      "From here you can:\n" +
      "• Approve or reject a return request using the (Approve / Reject) buttons shown on pending rows.\n" +
      "• Write the decision note in the field below the table; it applies to the next decision you make.\n\n" +
      "The table shows: order number, customer, order total, return reason, status, and date, plus the decision note for settled requests.",
  },
  "/dashboard/customers": {
    titleAr: "مساعدة: العملاء",
    titleEn: "Help: Customers",
    bodyAr:
      "هذه الصفحة تعرض قاعدة عملاء متجرك.\n\n" +
      "من هنا يمكنك:\n" +
      "• تبحث عن عميل بالاسم أو رقم الهاتف.\n" +
      "• تضيف عميلًا جديدًا بالضغط على زر \"إضافة عميل\" وملء البيانات (الاسم، الهاتف، البريد، ملاحظات).\n" +
      "• تضغط على اسم العميل للانتقال لصفحة تفاصيله وسجل مشترياته.\n\n" +
      "الجدول يعرض: الاسم، الهاتف، عدد الطلبات، إجمالي الإنفاق، وتاريخ آخر طلب.",
    bodyEn:
      "This page shows your store's customer base.\n\n" +
      "From here you can:\n" +
      "• Search for a customer by name or phone number.\n" +
      "• Add a new customer using the \"Add Customer\" button and fill in their details (name, phone, email, notes).\n" +
      "• Click a customer's name to view their details and purchase history.\n\n" +
      "The table shows: name, phone, order count, total spent, and last order date.",
  },
  "/dashboard/customers/[id]": {
    titleAr: "مساعدة: تفاصيل العميل",
    titleEn: "Help: Customer Details",
    bodyAr:
      "هذه الصفحة تعرض بيانات عميل واحد وسجل مشترياته.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض رقم الهاتف وعدد الطلبات وإجمالي الإنفاق.\n" +
      "• تتصفح جدول سجل المشتريات (رقم الطلب، عدد المنتجات، الإجمالي، الحالة، والتاريخ).\n" +
      "• تنتقل لأي طلب من الجدول لاستعراض تفاصيله.\n\n" +
      "هذه الصفحة للعرض فقط ولا تحتوي على إجراءات تعديل.",
    bodyEn:
      "This page shows a single customer's data and purchase history.\n\n" +
      "From here you can:\n" +
      "• See their phone number, order count, and total spent.\n" +
      "• Browse the purchase history table (order number, item count, total, status, and date).\n" +
      "• Navigate to any order from the table to view its details.\n\n" +
      "This is a read-only page with no editing actions.",
  },
  "/dashboard/categories": {
    titleAr: "مساعدة: الفئات",
    titleEn: "Help: Categories",
    bodyAr:
      "هذه الصفحة تدير تصنيفات منتجات متجرك.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف فئة جديدة (الاسم بالعربي والإنجليزي، فئة رئيسية اختيارية، وترتيب العرض).\n" +
      "• تعدّل أو تحذف فئة موجودة.\n" +
      "• تحافظ على هيكل هرمي بوضع الفئات تحت فئات رئيسية.\n\n" +
      "الجدول يعرض: اسم الفئة، الفئة الرئيسية، ترتيب العرض، وحالة التفعيل.",
    bodyEn:
      "This page manages your store's product categories.\n\n" +
      "From here you can:\n" +
      "• Add a new category (Arabic/English names, optional parent category, and sort order).\n" +
      "• Edit or delete an existing category.\n" +
      "• Maintain a hierarchy by placing categories under parent categories.\n\n" +
      "The table shows: category name, parent category, sort order, and active status.",
  },
  "/dashboard/coupons": {
    titleAr: "مساعدة: أكواد الخصم",
    titleEn: "Help: Coupons",
    bodyAr:
      "هذه الصفحة تتيح لك إنشاء وإدارة أكواد خصم يستخدمها العملاء في صفحة الدفع.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف كود خصم جديد (الكود، نوع الخصم نسبة أو مبلغ ثابت، القيمة، حد الاستخدام، الحد الأدنى للطلب، وفترة الصلاحية).\n" +
      "• تعطّل كود خصم موجود بالضغط على زر إلغاء التفعيل.\n\n" +
      "الجدول يعرض: الكود، قيمة الخصم، الحد الأدنى للطلب، تاريخ البدء والانتهاء، والحالة.",
    bodyEn:
      "This page lets you create and manage discount codes that customers use at checkout.\n\n" +
      "From here you can:\n" +
      "• Add a new coupon code (code, discount type Percentage or Fixed Amount, value, usage limit, minimum order, and validity period).\n" +
      "• Deactivate an existing coupon using the deactivate button.\n\n" +
      "The table shows: code, discount value, minimum order, validity dates, and status.",
  },
  "/dashboard/inventory": {
    titleAr: "مساعدة: المخزون",
    titleEn: "Help: Inventory",
    bodyAr:
      "هذه الصفحة مركز إدارة المخزون في متجرك وتحتوي على ثلاثة أقسام.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتتبع المخزون الحالي للمنتجات في كل مخزن (الكمية المتاحة والمحجوزة ومستوى إعادة الطلب).\n" +
      "• تنقل كميات بين المخازن (من مخزن إلى مخزن) مع إمكانية اعتماد النقل فورًا.\n" +
      "• تسجل تلفيات المخزون (المخزن، المنتج، الكمية، السبب) وتعتمدها.\n\n" +
      "استخدم فلتر المخزن في تبويب المخزون لعرض منتجات مخزن محدد.",
    bodyEn:
      "This page is your store's inventory management hub with three sections.\n\n" +
      "From here you can:\n" +
      "• Track current stock levels for products in each warehouse (available and reserved quantities, and reorder level).\n" +
      "• Transfer quantities between warehouses with the option to approve the transfer right away.\n" +
      "• Record stock damages (warehouse, product, quantity, reason) and approve them.\n\n" +
      "Use the warehouse filter in the Stock tab to view products from a specific warehouse.",
  },
  "/dashboard/warehouses": {
    titleAr: "مساعدة: المخازن",
    titleEn: "Help: Warehouses",
    bodyAr:
      "هذه الصفحة تدير المخازن الخاصة بمتجرك.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف مخزنًا جديدًا بالضغط على زر \"إضافة مخزن\" وملء الاسم والعنوان الاختياري.\n\n" +
      "الجدول يعرض: اسم المخزن (مع شارة الافتراضي)، العنوان، وحالة التفعيل.",
    bodyEn:
      "This page manages your store's warehouses.\n\n" +
      "From here you can:\n" +
      "• Add a new warehouse using the \"Add Warehouse\" button and fill in the name and optional address.\n\n" +
      "The table shows: warehouse name (with a default badge), address, and active status.",
  },
  "/dashboard/transfers": {
    titleAr: "مساعدة: تحويلات المخزون",
    titleEn: "Help: Stock Transfers",
    bodyAr:
      "هذه الصفحة تعرض طلبات نقل المخزون بين المخازن.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتابع التحويلات المعلقة والمقبولة والمرفوضة.\n" +
      "• تعتمد تحويلًا معلقًا بالضغط على زر الاعتماد.\n\n" +
      "الجدول يعرض: المخزن المصدر، المخزن الهدف، عدد المنتجات، الحالة، والتاريخ.",
    bodyEn:
      "This page lists stock transfers between warehouses.\n\n" +
      "From here you can:\n" +
      "• Follow pending, approved, and rejected transfers.\n" +
      "• Approve a pending transfer using the approve button.\n\n" +
      "The table shows: source warehouse, destination warehouse, item count, status, and date.",
  },
  "/dashboard/damages": {
    titleAr: "مساعدة: تلفيات المخزون",
    titleEn: "Help: Stock Damages",
    bodyAr:
      "هذه الصفحة تعرض تقارير تلف المخزون المسجلة في متجرك.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتابع تقارير التلف المعلقة والمعتمدة.\n" +
      "• تعتمد تقرير تلف غير معتمد بالضغط على زر الاعتماد.\n\n" +
      "الجدول يعرض: المخزن، المنتج، الكمية، السبب، الحالة، والتاريخ.",
    bodyEn:
      "This page lists the stock damage reports recorded for your store.\n\n" +
      "From here you can:\n" +
      "• Follow pending and approved damage reports.\n" +
      "• Approve an unapproved report using the approve button.\n\n" +
      "The table shows: warehouse, product, quantity, reason, status, and date.",
  },
  "/dashboard/stock-counts": {
    titleAr: "مساعدة: جرد المخزون",
    titleEn: "Help: Stock Counts",
    bodyAr:
      "هذه الصفحة تتيح لك بدء جرد فعلي للمخزون ومتابعة الجردات السابقة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تبدأ جردًا جديدًا باختيار المخزن والضغط على زر بدء الجرد، وسينقلك مباشرة لصفحة تفاصيل الجرد.\n" +
      "• تتصفح الجردات السابقة من الجدول (المخزن، عدد المنتجات، الحالة، والتاريخ).",
    bodyEn:
      "This page lets you start a new physical stock count and review previous counts.\n\n" +
      "From here you can:\n" +
      "• Start a new count by selecting a warehouse and clicking the Start Count button; you'll be taken to the count details page.\n" +
      "• Browse previous counts from the table (warehouse, item count, status, and date).",
  },
  "/dashboard/stock-counts/[id]": {
    titleAr: "مساعدة: تفاصيل الجرد",
    titleEn: "Help: Stock Count Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل جرد مخزون وتتيح إدخال الكميات الفعلية المُحصاة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تدخل الكمية الفعلية لكل منتج في الحقل بجوار الكمية المسجلة أثناء حالة قيد التنفيذ وتحفظ كل صف على حدة.\n" +
      "• تعتمد الجرد كاملًا بعد الانتهاء من إدخال الكميات.\n\n" +
      "بعد الاعتماد يظهر عمود الفروقات بالأخضر (زيادة) أو الأحمر (نقص).",
    bodyEn:
      "This page shows a single stock count and lets you enter the actual counted quantities.\n\n" +
      "From here you can:\n" +
      "• Enter the actual counted quantity for each product next to the recorded quantity while the count is in progress, saving each row individually.\n" +
      "• Approve the whole count once all quantities are entered.\n\n" +
      "After approval, a variance column appears in green (+) or red (-).",
  },
  "/dashboard/statistics": {
    titleAr: "مساعدة: الإحصائيات",
    titleEn: "Help: Statistics",
    bodyAr:
      "هذه الصفحة تعرض إحصائيات أداء متجرك خلال فترة محددة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تختار الفترة (يوميًا / شهريًا / سنويًا) لعرض البيانات.\n" +
      "• تعرض إجمالي المبيعات وتوزيع الطلبات حسب الحالة.\n" +
      "• تستعرض أكثر المنتجات مبيعًا وأكثر العملاء شراءً.\n\n" +
      "هذه الصفحة للعرض فقط ولا تحتوي على إجراءات تعديل.",
    bodyEn:
      "This page shows your store's performance statistics for a selected period.\n\n" +
      "From here you can:\n" +
      "• Choose the period (daily / monthly / yearly) to display the data.\n" +
      "• See total sales and order distribution by status.\n" +
      "• Review your top-selling products and top-buying customers.\n\n" +
      "This is a read-only page with no editing actions.",
  },
  "/dashboard/pos": {
    titleAr: "مساعدة: نقطة البيع (الكاشير)",
    titleEn: "Help: Point of Sale (POS)",
    bodyAr:
      "هذه الصفحة تتيح لك بيع المنتجات مباشرة من الكاشير.\n\n" +
      "استخدمها بالترتيب التالي:\n" +
      "• افتح وردية باختيار رصيد البداية، وستغلقها في نهاية اليوم بإدخال رصيد النهاية.\n" +
      "• ابحث عن المنتج بالاسم أو امسح الباركود، وأضفه للسلة مع تحديد الكمية.\n" +
      "• اختر طريقة الدفع (نقدي أو آجل)، وأدخل المبلغ المستلم لحساب الباقي.\n" +
      "• اضغط إتمام البيع ثم اطبع الإيصال من النافذة المعروضة.\n\n" +
      "يُطبق ضريبة القيمة المضافة (15%) تلقائيًا إذا كان متجرك مسجلًا ضريبيًا.",
    bodyEn:
      "This page lets you sell products directly from the cashier.\n\n" +
      "Use it in this order:\n" +
      "• Open a shift by entering the starting cash, and close it at the end of the day by entering the ending cash.\n" +
      "• Search for a product by name or scan its barcode, then add it to the cart with the quantity.\n" +
      "• Choose the payment method (Cash or Credit) and enter the amount received to calculate the change.\n" +
      "• Complete the sale, then print the receipt from the shown window.\n\n" +
      "VAT (15%) is applied automatically if your store is VAT-registered.",
  },
  "/dashboard/shipping": {
    titleAr: "مساعدة: الشحن والتوصيل",
    titleEn: "Help: Shipping",
    bodyAr:
      "هذه الصفحة تدير شركات الشحن وتتبع الشحنات وتحتوي على ثلاثة أقسام.\n\n" +
      "من هنا يمكنك:\n" +
      "• تفعّل أو تعطّل شركات الشحن (سمسا، أرامكس، زاجل، ناقل، يدوي) وتعدّل أسعار الشحن لكل منها.\n" +
      "• تحسب تكلفة توصيل لأي مدينة قبل الشحن.\n" +
      "• تنشئ شحنة لطلب، وتتابع حالة الشحن، وتزامن التتبع، وتطبع الملصق، وترى مسار الشحنة.\n\n" +
      "ابدأ بتفعيل الشركات وضبط الأسعار قبل إنشاء أي شحنة.",
    bodyEn:
      "This page manages shipping companies and shipment tracking with three sections.\n\n" +
      "From here you can:\n" +
      "• Enable or disable shipping companies (Smsa, Aramex, Zajil, Naqel, Manual) and edit their rates.\n" +
      "• Calculate delivery cost for any city before shipping.\n" +
      "• Create a shipment for an order, follow its status, sync tracking, print the label, and view the tracking trail.\n\n" +
      "Start by enabling companies and setting their rates before creating any shipment.",
  },
  "/dashboard/store-settings": {
    titleAr: "مساعدة: إعدادات المتجر",
    titleEn: "Help: Store Settings",
    bodyAr:
      "هذه الصفحة هي مركز الإعدادات الكامل لمتجرك وتحتوي على أقسام جانبية متعددة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتحكم في حالة المتجر (نشط / مخفي) وتعرض رابط متجرك وتنسخه.\n" +
      "• تفعّل التسجيل الضريبي وتدخل الرقم الضريبي وتضبط العملة واللغة.\n" +
      "• تضيف دومينًا مخصصًا وتختار تصميم المتجر وتخصيص الألوان وصورة الغلاف.\n" +
      "• تتواصل مع فريق التصميم من قسم محادثة التصميم.\n" +
      "• تزيد بيانات التواصل والروابط الاجتماعية.\n" +
      "• تفعّل أو تعطّل وسائل الشحن والدفع، وتحرّر صفحات المتجر (عن، الشروط، سياسة الخصوصية...).\n" +
      "• تدير الأسئلة الشائعة والمدونة من أقسامها المخصصة.\n" +
      "• تدير البنرات الإعلانية (سلايدر أعلى الصفحة، شبكة بنرات، بانر أسفل) من قسم البنرات.\n" +
      "• تتحكم في الميزات المتقدمة: البحث داخل المتجر، التقييمات، الكوبونات، إشعارات العملاء، حد تنبيه المخزون، وشارات الثقة.\n\n" +
      "استخدم القائمة الجانبية داخل الصفحة للتنقل بين الأقسام.",
    bodyEn:
      "This page is your store's full settings hub with multiple sections in the sidebar.\n\n" +
      "From here you can:\n" +
      "• Control the store status (active / hidden) and view and copy your store's URL.\n" +
      "• Enable VAT registration, enter the VAT number, and set currency and language.\n" +
      "• Add a custom domain, choose the store theme, customize colors, and upload a cover image.\n" +
      "• Chat with the design team from the Design Chat section.\n" +
      "• Add contact details and social links.\n" +
      "• Enable or disable shipping and payment methods, and edit store pages (About, Terms, Privacy Policy, etc.).\n" +
      "• Manage the FAQ and blog from their dedicated sections.\n" +
      "• Control advanced features: in-store search, reviews, coupons, customer notifications, low-stock threshold, and trust badges.\n\n" +
      "Use the in-page sidebar to move between sections.",
  },
  "/dashboard/subscription": {
    titleAr: "مساعدة: الاشتراك والباقة",
    titleEn: "Help: Subscription",
    bodyAr:
      "هذه الصفحة تتيح لك إدارة اشتراكك في الباقة الحالية وتغييرها عند الحاجة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض باقتك الحالية وتفاصيلها (تاريخ الفوترة، الدورة، تاريخ الانتهاء، الرصيد، وفترة السماح).\n" +
      "• تجدد اشتراكك أو تلغي التجديد التلقائي.\n" +
      "• تتابع استهلاكك من حدود الباقة (المنتجات، الموظفين، المخازن).\n" +
      "• ترقّي أو تخفض باقتك باختيار دورة الفوترة (شهري / سنوي / سنتان) والضغط على زر الترقية أو التخفيض للباقة المناسبة.\n\n" +
      "الترقية بمبلغ مستحق تفتح نافذة دفع عبر بوابة ميسرة وتتابع حالة الدفع تلقائيًا.",
    bodyEn:
      "This page lets you manage your current package subscription and change it when needed.\n\n" +
      "From here you can:\n" +
      "• See your current package and its details (billing date, cycle, end date, balance, and grace period).\n" +
      "• Renew your subscription or cancel auto-renewal.\n" +
      "• Track your usage against package limits (products, employees, warehouses).\n" +
      "• Upgrade or downgrade by choosing a billing cycle (Monthly / Yearly / Two Years) and pressing the upgrade or downgrade button on the package.\n\n" +
      "An upgrade with an amount due opens the Moyasar payment gateway and tracks the payment status automatically.",
  },
  "/dashboard/merchant-account": {
    titleAr: "مساعدة: الحساب التجاري (توثيق الهوية)",
    titleEn: "Help: Merchant Account (KYC)",
    bodyAr:
      "هذه الصفحة تتيح لك إدخال بيانات حسابك التجاري لتفعيله على المنصة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تدخل بيانات العلامة التجارية (الاسم، رابط الموقع، الشعار).\n" +
      "• تدخل بيانات الكيان القانوني (الاسم القانوني، نوع الترخيص، رقم الترخيص).\n" +
      "• تدخل بيانات المالك (الاسم، البريد، الهاتف مع رمز الدولة، البلد، المدينة، تاريخ الميلاد مع تحقق 18+، والهوية الوطنية).\n" +
      "• تحفظ بياناتك ثم تضغط إرسال للمراجعة.\n\n" +
      "بعد الإرسال تصبح الحقول مغلقة حتى تتم المراجعة، وتظهر حالة الطلب (قيد المراجعة / معتمد / مرفوض مع السبب).",
    bodyEn:
      "This page lets you enter your merchant account details to activate it on the platform.\n\n" +
      "From here you can:\n" +
      "• Enter your brand details (name, website URL, logo).\n" +
      "• Enter the legal entity details (legal name, license type, license number).\n" +
      "• Enter the owner details (name, email, phone with country code, country, city, birth date with 18+ validation, and national ID).\n" +
      "• Save your data, then submit it for review.\n\n" +
      "After submission the fields are locked until the review finishes, and the request status appears (Pending / Approved / Rejected with reason).",
  },
  "/dashboard/merchant-verification": {
    titleAr: "مساعدة: توثيق المستندات",
    titleEn: "Help: Document Verification",
    bodyAr:
      "هذه الصفحة تتيح لك رفع المستندات الرسمية لتوثيق متجرك واعتماده لدى المنصة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تختار نوع المستند (سجل تجاري، بطاقة هوية، ترخيص، شهادة ضريبة القيمة المضافة، أخرى) وترفع الملف.\n" +
      "• تحذف مستندًا مرفوعًا بالخطأ.\n" +
      "• تضغط إرسال للمراجعة بعد اكتمال المستندات.\n\n" +
      "التعديل متاح فقط عندما تكون الحالة لم تُرسل أو مرفوضة، وتظهر حالة الطلب وسبب الرفض إن وجد.",
    bodyEn:
      "This page lets you upload official documents to verify and approve your store on the platform.\n\n" +
      "From here you can:\n" +
      "• Choose the document type (Commercial Register, ID Card, License, VAT Certificate, Other) and upload the file.\n" +
      "• Remove an uploaded document if you made a mistake.\n" +
      "• Submit for review once the documents are complete.\n\n" +
      "Editing is available only when the status is Not Submitted or Rejected; the status and rejection reason are shown.",
  },
  "/dashboard/referrals": {
    titleAr: "مساعدة: البرنامج التسويقي (الإحالات)",
    titleEn: "Help: Referral Program",
    bodyAr:
      "هذه الصفحة تتيح لك دعوة أصدقائك للاشتراك في المنصة وربح عمولة عن كل اشتراك مدفوع جديد.\n\n" +
      "من هنا يمكنك:\n" +
      "• تنسخ كود الإحالة الخاص بك أو رابط المشاركة وترسلها لأصدقائك.\n" +
      "• تتابع رصيدك، وعدد الإحالات، والإحالات المحولة، والعمولات المعلقة.\n" +
      "• تستعرض قائمة الأشخاص الذين دعوتهم وحالة كل واحد (مسجل / محول).\n" +
      "• تراجع عمولاتك وحالتها (مدفوعة / مرفوضة / معلقة).\n\n" +
      "متاح فقط إذا كانت باقتك تتضمن ميزة التسويق بالعمولة (Affiliate).",
    bodyEn:
      "This page lets you invite your friends to join the platform and earn a commission on every new paid subscription.\n\n" +
      "From here you can:\n" +
      "• Copy your referral code or share link and send it to your friends.\n" +
      "• Track your balance, total referrals, converted referrals, and pending commissions.\n" +
      "• Review the list of people you invited and each one's status (Registered / Converted).\n" +
      "• Review your commissions and their status (Paid / Rejected / Pending).\n\n" +
      "Only available if your package includes the affiliate marketing feature.",
  },
  "/dashboard/settlements": {
    titleAr: "مساعدة: المستحقات المالية",
    titleEn: "Help: Settlements",
    bodyAr:
      "هذه الصفحة تتيح لك متابعة مستحقاتك المالية من المبيعات وإدارة بيانات الحساب البنكي المستلِم لها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض صافي المستحقات المعلقة والمحصلة.\n" +
      "• تدخل بيانات الحساب البنكي (اسم البنك، اسم صاحب الحساب، الآيبان) وتحفظها.\n" +
      "• تستعرض سجل دفعات التحصيل (رقم الدفعة، الفترة، الإجمالي، العمولة، الصافي، والحالة).",
    bodyEn:
      "This page lets you follow your financial earnings from sales and manage the receiving bank account.\n\n" +
      "From here you can:\n" +
      "• See your pending and settled net amounts.\n" +
      "• Enter and save your bank details (bank name, account holder name, IBAN).\n" +
      "• Review the settlement history (batch number, period, gross, commission, net, and status).",
  },
  "/dashboard/integrations": {
    titleAr: "مساعدة: تكامل المنصات",
    titleEn: "Help: Platform Integrations",
    bodyAr:
      "هذه الصفحة تتيح لك ربط متجرك بمنصات البيع والأسواق الإلكترونية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتصفح المنصات مصنفة إلى: منصات محلية (سلة، زد، Shopify، WooCommerce)، أسواق إلكترونية (نون، أمازون، جاهز، هنقرستيشن)، ومنصات عالمية (علي بابا، علي إكسبريس، Temu).\n" +
      "• تربط أي منصة بالضغط على زر ربط وإدخال مفاتيح الـ API وبيانات المتجر.\n" +
      "• تتحكم في إعدادات المزامنة لكل منصة (المنتجات، الطلبات، المخزون).\n" +
      "• تفعّل أو تعطّل المنصة أو تلغي ربطها بالكامل.\n\n" +
      "المزامنة التلقائية تتطلب مفاتيح API صالحة من كل منصة، وتُفعّل تدريجيًا حسب توفر الـ API لكل منصة.",
    bodyEn:
      "This page lets you connect your store to selling platforms and marketplaces.\n\n" +
      "From here you can:\n" +
      "• Browse platforms grouped into: local platforms (Salla, Zid, Shopify, WooCommerce), marketplaces (Noon, Amazon, Jahez, HungerStation), and global platforms (Alibaba, AliExpress, Temu).\n" +
      "• Connect any platform using the Connect button and entering the API keys and store details.\n" +
      "• Control the sync settings per platform (products, orders, inventory).\n" +
      "• Enable, disable, or fully disconnect a platform.\n\n" +
      "Automatic syncing requires valid API keys from each platform and is enabled gradually as each platform's API becomes available.",
  },
  "/dashboard/marketing": {
    titleAr: "مساعدة: التسويق والمتابعة",
    titleEn: "Help: Marketing",
    bodyAr:
      "هذه الصفحة تتيح لك ربط متجرك بقنوات الإعلان وتتبع التحويلات وإنشاء حملات تسويقية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تربط بكسيل فيسبوك وGoogle Analytics وTikTok وSnapchat وواتساب للأعمال وإدارة أكواد التتبع.\n" +
      "• تفعّل التتبع من الخادم (Conversion API) لفيسبوك وجوجل وإرسال حدث اختباري.\n" +
      "• تعرض أداء كل قناة (الطلبات، الإيرادات، العملاء، ونسبة المشاركة).\n" +
      "• تنشئ وتعدل وتحذف حملات (الاسم، القناة، كود الكوبون، تاريخ البداية والنهاية، والتفعيل).\n\n" +
      "ابحث عن كود البيكسل أو معرّف المتابعة الخاص بكل قناة من لوحة القناة نفسها قبل ربطه.",
    bodyEn:
      "This page lets you connect your store to ad channels, track conversions, and run marketing campaigns.\n\n" +
      "From here you can:\n" +
      "• Connect Facebook Pixel, Google Analytics, TikTok, Snapchat, and WhatsApp Business and manage tracking codes.\n" +
      "• Enable server-side tracking (Conversion API) for Facebook and Google and send a test event.\n" +
      "• See each channel's performance (orders, revenue, customers, and share percentage).\n" +
      "• Create, edit, and delete campaigns (name, channel, coupon code, start/end dates, and active flag).\n\n" +
      "Get the pixel code or tracking ID for each channel from the channel's own panel before connecting it.",
  },
  "/dashboard/employees": {
    titleAr: "مساعدة: الموظفون",
    titleEn: "Help: Employees",
    bodyAr:
      "هذه الصفحة تدير موظفي متجرك وتحتوي على ثلاثة أقسام.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف موظفًا جديدًا (الاسم، البريد، الهاتف، كلمة المرور، الدور، والراتب) أو تعدّل بياناته أو تعطّله.\n" +
      "• تدعو موظفين جدد عبر رابط دعوة يُنسخ ويرسل بالبريد.\n" +
      "• تنشئ أدوارًا وظيفية جديدة وتحدد صلاحيات كل دور من مجموعة الصلاحيات المتاحة.\n\n" +
      "الأدوار النظامية (مثل Owner) لا يمكن تعديلها أو تعيينها للموظفين، والصلاحيات تتحكم فيما يظهر للموظف داخل لوحة التحكم.",
    bodyEn:
      "This page manages your store's employees and has three sections.\n\n" +
      "From here you can:\n" +
      "• Add a new employee (name, email, phone, password, role, and salary) or edit or deactivate them.\n" +
      "• Invite new employees through a shareable invitation link that can be copied and emailed.\n" +
      "• Create new job roles and define each role's permissions from the available permission set.\n\n" +
      "System roles (like Owner) cannot be edited or assigned to employees, and permissions control what each employee sees in the dashboard.",
  },
  "/dashboard/attendance": {
    titleAr: "مساعدة: الحضور والانصراف",
    titleEn: "Help: Attendance",
    bodyAr:
      "هذه الصفحة تتيح تسجيل حضور وانصراف الموظفين وعرض سجل الحضور، مع إمكانية الربط بأجهزة البصمة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تختار الموظف ثم تضغط تسجيل حضور أو تسجيل انصراف (تسجيل يدوي).\n" +
      "• تضيف جهاز حضور (بصمة / NFC / وجه) بإدخال اسم الجهاز وعنوان IP والمنفذ، ثم تضغط زر \"سحب سجلات البصمة\" لجلب سجلات الجهاز تلقائيًا.\n" +
      "• تربط كل موظف برقم المستخدم على الجهاز من صفحة الموظفين (حقل \"رقم المستخدم على جهاز البصمة\") حتى تُطابَق سجلات الجهاز مع الموظف الصحيح.\n" +
      "• تتصفح سجل الحضور مع فلاتر (موظف محدد أو فترة زمنية) وتمييز طريقة التسجيل (يدوي / بصمة).\n\n" +
      "ملاحظة: قراءة بصمة الجهاز نفسها تتطلب تثبيت مكتبة الشركة المصنعة (SDK) على الخادم؛ حاليًا يمكن سحب السجلات عبر الاتصال بالجهاز أو استيراد ملف السجلات.",
    bodyEn:
      "This page records employee check-in and check-out times and shows the attendance log, with the option to connect fingerprint devices.\n\n" +
      "From here you can:\n" +
      "• Select an employee, then press Check In or Check Out (manual entry).\n" +
      "• Add an attendance device (fingerprint / NFC / face) by entering its name, IP, and port, then press \"Pull Fingerprint Records\" to fetch device logs automatically.\n" +
      "• Link each employee to their device user ID from the Employees page (the \"Device User ID\" field) so device records match the right employee.\n" +
      "• Browse the attendance log with filters (specific employee or time period) and a method badge (Manual / Fingerprint).\n\n" +
      "Note: reading the actual fingerprint requires installing the manufacturer's SDK on the server; currently you can pull records over the device connection or import a records file.",
  },
  "/dashboard/leave-requests": {
    titleAr: "مساعدة: طلبات الإجازات",
    titleEn: "Help: Leave Requests",
    bodyAr:
      "هذه الصفحة تدير طلبات إجازات الموظفين.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعتمد أو ترفض طلب إجازة معلقًا بالضغط على زري الاعتماد أو الرفض مع رسالة تأكيد.\n" +
      "• تنشئ طلب إجازة بالنيابة عن موظف (الموظف، نوع الإجازة، تاريخ البداية والنهاية، السبب).\n" +
      "• تصفّي الطلبات حسب موظف محدد.\n\n" +
      "الجدول يعرض: الموظف، نوع الإجازة، الفترة، السبب، والحالة.",
    bodyEn:
      "This page manages employee leave requests.\n\n" +
      "From here you can:\n" +
      "• Approve or reject a pending leave request using the approve/reject buttons with a confirmation prompt.\n" +
      "• Create a leave request on behalf of an employee (employee, leave type, start/end dates, reason).\n" +
      "• Filter requests by a specific employee.\n\n" +
      "The table shows: employee, leave type, period, reason, and status.",
  },
  "/dashboard/payroll": {
    titleAr: "مساعدة: الرواتب والأجور",
    titleEn: "Help: Payroll",
    bodyAr:
      "هذه الصفحة توليد رواتب الموظفين وإدارة دورتها الشهرية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تولّد رواتب الشهر المحدد بضغطة واحدة ثم تعدّل البدلات والخصومات والعمولة لكل موظف.\n" +
      "• تعتمد الصف الجاهز ثم تعلّمه كمدفوع بعد الصرف.\n" +
      "• تنتقل للقيد المحاسبي المرتبط بكل راتب بعد اعتماده.\n\n" +
      "الجدول يعرض: اسم الموظف، الأساسي، البدلات، الخصومات، العمولة، الصافي، والحالة مع إمكانية المعاينة الحية للصافي قبل الحفظ.",
    bodyEn:
      "This page generates employee salaries and manages the monthly payroll cycle.\n\n" +
      "From here you can:\n" +
      "• Generate payroll for the selected month with one click, then edit allowances, deductions, and commission per employee.\n" +
      "• Approve a ready row, then mark it as paid after disbursement.\n" +
      "• Navigate to the related journal entry for each salary after approval.\n\n" +
      "The table shows: employee name, basic, allowances, deductions, commission, net, and status, with a live net preview before saving.",
  },
  "/dashboard/accounting/accounts": {
    titleAr: "مساعدة: دليل الحسابات",
    titleEn: "Help: Chart of Accounts",
    bodyAr:
      "هذه الصفحة تعرض دليل الحسابات الخاص بمتجرك بشكل هرمي قابل للطي.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتصفح الحسابات الرئيسية والفرعية ورصيد كل حساب.\n" +
      "• تضيف حسابًا جديدًا (رمز الحساب، الاسم، النوع، والحساب الأب الاختياري) أو تعدّل حسابًا موجودًا.\n" +
      "• تضيف حسابًا فرعيًا تحت أي حساب من زر الإضافة بجانبه.\n\n" +
      "نوع الحساب (أصل / التزام / حقوق ملكية / إيراد / مصروف) يحدد ظهوره في التقارير المالية، والنظام لا يسمح بحذف الحسابات الافتراضية.",
    bodyEn:
      "This page shows your store's chart of accounts as a collapsible hierarchy.\n\n" +
      "From here you can:\n" +
      "• Browse main and sub-accounts and each account's balance.\n" +
      "• Add a new account (account code, name, type, and optional parent account) or edit an existing one.\n" +
      "• Add a sub-account under any account using the add button next to it.\n\n" +
      "The account type (Asset / Liability / Equity / Revenue / Expense) controls how it appears in financial reports, and default accounts cannot be deleted.",
  },
  "/dashboard/accounting/journal-entries": {
    titleAr: "مساعدة: قيود اليومية",
    titleEn: "Help: Journal Entries",
    bodyAr:
      "هذه الصفحة تعرض قيود اليومية المسجلة في النظام مع إمكانية التصفية والتنقل.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتصفّى القيود حسب الحالة (بانتظار الاعتماد / معتمد / مرفوض / معكوس) والفترة الزمنية.\n" +
      "• تنتقل لأي قيد لعرض تفاصيله.\n" +
      "• تنشئ قيدًا يدويًا جديدًا من زر قيد جديد.\n\n" +
      "الجدول يعرض: رقم القيد، التاريخ، الوصف، إجمالي المدين، من قام بالإنشاء، والحالة.",
    bodyEn:
      "This page lists the journal entries recorded in the system with filtering and navigation.\n\n" +
      "From here you can:\n" +
      "• Filter entries by status (Pending Approval / Approved / Rejected / Reversed) and time period.\n" +
      "• Navigate to any entry to view its details.\n" +
      "• Create a new manual entry using the New Entry button.\n\n" +
      "The table shows: entry number, date, description, total debit, created by, and status.",
  },
  "/dashboard/accounting/journal-entries/new": {
    titleAr: "مساعدة: قيد يومية جديد",
    titleEn: "Help: New Journal Entry",
    bodyAr:
      "هذه الصفحة تتيح إنشاء قيد يومية يدوي متوازن.\n\n" +
      "استخدمها بالترتيب التالي:\n" +
      "• حدد تاريخ القيد ووصفه الاختياري.\n" +
      "• أضف سطرين على الأقل واختر الحساب (من قائمة الحسابات النشطة) وحدد المدين أو الدائن لكل سطر.\n" +
      "• راقب مؤشر التوازن — لا يمكن الحفظ إلا إذا تساوت أرصدة الدائن والمدين وعلى الأقل سطرين صحيحين.\n\n" +
      "بعد الحفظ سيتم نقلك تلقائيًا لصفحة تفاصيل القيد.",
    bodyEn:
      "This page lets you create a balanced manual journal entry.\n\n" +
      "Use it in this order:\n" +
      "• Set the entry date and an optional description.\n" +
      "• Add at least two lines, choose the account (from the active accounts list), and set the debit or credit amount for each line.\n" +
      "• Watch the balance indicator — you can only save when credits equal debits and at least two valid lines exist.\n\n" +
      "After saving, you'll be taken to the entry's detail page automatically.",
  },
  "/dashboard/accounting/journal-entries/[id]": {
    titleAr: "مساعدة: تفاصيل قيد اليومية",
    titleEn: "Help: Journal Entry Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل قيد يومية واحد.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض بيانات القيد (التاريخ، من أنشأه، من اعتمده، المصدر، والوصف).\n" +
      "• تستعرض سطور القيد (الحساب، الوصف، المدين، الدائن) مع الإجماليات.\n" +
      "• تعتمد أو ترفض القيد إذا كان بانتظار الاعتماد.\n" +
      "• تعكس القيد إذا كان معتمدًا لإنشاء قيد مضاد.\n\n" +
      "لو القيد المعروض هو قيد عكسي ستجد رابطًا للقيد الأصلي.",
    bodyEn:
      "This page shows the details of a single journal entry.\n\n" +
      "From here you can:\n" +
      "• See the entry metadata (date, created by, approved by, source, and description).\n" +
      "• Review the entry lines (account, description, debit, credit) with totals.\n" +
      "• Approve or reject the entry if it's pending approval.\n" +
      "• Reverse the entry if approved to create a reversal entry.\n\n" +
      "If the entry is a reversal, a link to the original entry appears.",
  },
  "/dashboard/accounting/vouchers": {
    titleAr: "مساعدة: السندات النقدية",
    titleEn: "Help: Vouchers",
    bodyAr:
      "هذه الصفحة تعرض سندات القبض والدفع النقدية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تصفّي السندات حسب النوع (الكل / سندات قبض / سندات دفع).\n" +
      "• تنتقل لتفاصيل أي سند من رقمه في الجدول.\n" +
      "• تنشئ سندًا جديدًا من زر سند جديد.\n\n" +
      "الجدول يعرض: رقم السند، النوع، التاريخ، الحساب المقابل، الطرف، المبلغ، والقيد المحاسبي المرتبط إن وجد.",
    bodyEn:
      "This page lists cash receipt and payment vouchers.\n\n" +
      "From here you can:\n" +
      "• Filter vouchers by type (All / Receipt Vouchers / Payment Vouchers).\n" +
      "• Navigate to any voucher's details from its number in the table.\n" +
      "• Create a new voucher using the New Voucher button.\n\n" +
      "The table shows: voucher number, type, date, counterpart account, party, amount, and the related journal entry if it exists.",
  },
  "/dashboard/accounting/vouchers/new": {
    titleAr: "مساعدة: سند جديد",
    titleEn: "Help: New Voucher",
    bodyAr:
      "هذه الصفحة تتيح إنشاء سند قبض أو سند دفع.\n\n" +
      "استخدمها بالترتيب التالي:\n" +
      "• اختر نوع السند (قبض أو دفع) من الأزرار.\n" +
      "• حدد التاريخ، طريقة الدفع (نقدي أو بنكي)، المبلغ، الحساب المقابل، والبيانات الاختيارية (الطرف والوصف).\n" +
      "• اضغط حفظ لإيداع السند وسيتم تحويلك لقائمة السندات.\n\n" +
      "لا يمكن الحفظ بدون تحديد حساب مقابل ومبلغ أكبر من صفر.",
    bodyEn:
      "This page lets you create a receipt or payment voucher.\n\n" +
      "Use it in this order:\n" +
      "• Choose the voucher type (Receipt or Payment) from the toggle buttons.\n" +
      "• Set the date, payment method (Cash or Bank), amount, counterpart account, and optional fields (party and description).\n" +
      "• Press Save to post the voucher; you'll be taken back to the vouchers list.\n\n" +
      "You cannot save without selecting a counterpart account and an amount greater than zero.",
  },
  "/dashboard/accounting/vouchers/[id]": {
    titleAr: "مساعدة: تفاصيل السند",
    titleEn: "Help: Voucher Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل سند نقدي واحد.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض تفاصيل السند (التاريخ، طريقة الدفع، الحساب المقابل، الطرف، الوصف، والمبلغ).\n" +
      "• تنتقل للقيد المحاسبي المرتبط بالسند إن وُجد.\n\n" +
      "هذه الصفحة للعرض فقط، وكل تعديل يتم من شاشة إنشاء السند.",
    bodyEn:
      "This page shows the details of a single cash voucher.\n\n" +
      "From here you can:\n" +
      "• See the voucher details (date, payment method, counterpart account, party, description, and amount).\n" +
      "• Navigate to the related journal entry if one exists.\n\n" +
      "This is a read-only page; any changes are made from the voucher creation screen.",
  },
  "/dashboard/accounting/invoices": {
    titleAr: "مساعدة: فواتير البيع والشراء",
    titleEn: "Help: Sales & Purchase Invoices",
    bodyAr:
      "هذه الصفحة تعرض فواتير البيع والشراء مع فلترة وتنقل صفحات.\n\n" +
      "من هنا يمكنك:\n" +
      "• تصفّي الفواتير حسب النوع (بيع أو شراء) والفترة الزمنية.\n" +
      "• تنتقل لأي فاتورة من رقمها في الجدول.\n" +
      "• تنشئ فاتورة بيع أو فاتورة شراء جديدة من الأزرار في الأعلى.\n\n" +
      "الجدول يعرض: رقم الفاتورة، النوع، التاريخ، الطرف، طريقة الدفع، الإجمالي، والقيد المرتبط.",
    bodyEn:
      "This page lists sales and purchase invoices with filtering and pagination.\n\n" +
      "From here you can:\n" +
      "• Filter invoices by type (Sales or Purchase) and time period.\n" +
      "• Navigate to any invoice from its number in the table.\n" +
      "• Create a new sale or purchase invoice using the buttons at the top.\n\n" +
      "The table shows: invoice number, type, date, party, payment method, total, and the related entry.",
  },
  "/dashboard/accounting/invoices/new-sale": {
    titleAr: "مساعدة: فاتورة بيع جديدة",
    titleEn: "Help: New Sales Invoice",
    bodyAr:
      "هذه الصفحة تتيح إنشاء فاتورة بيع لعملائك.\n\n" +
      "استخدمها بالترتيب التالي:\n" +
      "• حدد التاريخ وطريقة الدفع (نقدي أو آجل) سواء كان العميل ضيفًا أو مسجلًا.\n" +
      "• أضف سطرًا واحدًا على الأقل، واختر المنتج والكمية وسعر الوحدة والخصم لكل سطر.\n" +
      "• راقب ملخص الفاتورة (المجموع، الخصم، الضريبة التقديرية 15%، والإجمالي) ثم احفظ.\n\n" +
      "تُتحقق الكمية المتاحة والخصم تلقائيًا قبل الحفظ، وسجل في مخزونك فورًا.",
    bodyEn:
      "This page lets you create a sales invoice for your customers.\n" +
      "Use it in this order:\n" +
      "• Set the date and payment method (Cash or Credit), and choose whether the customer is a guest or registered.\n" +
      "• Add at least one line and pick the product, quantity, unit price, and discount for each line.\n" +
      "• Review the invoice summary (subtotal, discount, estimated 15% VAT, and total) then save.\n" +
      "• Stock availability and discounts are validated before saving, and your inventory is updated immediately.",
  },
  "/dashboard/accounting/invoices/new-purchase": {
    titleAr: "مساعدة: فاتورة شراء جديدة",
    titleEn: "Help: New Purchase Invoice",
    bodyAr:
      "هذه الصفحة تتيح إنشاء فاتورة شراء من الموردين.\n\n" +
      "استخدمها بالترتيب التالي:\n" +
      "• أدخل بيانات المورد (الاسم إلزامي، الهاتف والمدينة اختياريان) وحدد التاريخ وطريقة الدفع.\n" +
      "• أضف سطرًا واحدًا على الأقل واختر المنتج والكمية وسعر الشراء والخصم.\n" +
      "• راقب ملخص الفاتورة ثم احفظ وستُحدّث تكلفة المخزون.\n\n" +
      "سعر الوحدة يبدأ تلقائيًا من تكلفة المنتج ويمكن تعديله.",
    bodyEn:
      "This page lets you create a purchase invoice from suppliers.\n" +
      "Use it in this order:\n" +
      "• Enter the supplier details (name is required; phone and city are optional) and set the date and payment method.\n" +
      "• Add at least one line and pick the product, quantity, purchase price, and discount.\n" +
      "• Review the invoice summary, then save; inventory cost is updated.\n\n" +
      "The unit price starts automatically from the product's cost and can be edited.",
  },
  "/dashboard/accounting/invoices/[id]": {
    titleAr: "مساعدة: تفاصيل الفاتورة",
    titleEn: "Help: Invoice Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل فاتورة واحدة للعرض والطباعة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض بيانات الطرف وبيانات المتجر (بما فيها الرقم الضريبي عند التسجيل).\n" +
      "• تستعرض بنود الفاتورة والملخص (المجموع، الخصم، الضريبة، والإجمالي).\n" +
      "• تطبع الفاتورة بتنسيق جاهز أو تحمّلها PDF.\n\n" +
      "إذا كان متجرك مسجلًا ضريبيًا يظهر رمز QR الخاص بالفاتورة الإلكترونية.",
    bodyEn:
      "This page shows the details of a single invoice for viewing and printing.\n\n" +
      "From here you can:\n" +
      "• See the party's details and the company details (including the VAT number if registered).\n" +
      "• Review the invoice lines and summary (subtotal, discount, tax, and total).\n" +
      "• Print the invoice with ready formatting or download it as PDF.\n\n" +
      "If your store is VAT-registered, the e-invoicing QR code is displayed.",
  },
  "/dashboard/accounting/ledger": {
    titleAr: "مساعدة: دفتر الأستاذ العام",
    titleEn: "Help: General Ledger",
    bodyAr:
      "هذه الصفحة تعرض حركات حساب واحد في دفتر الأستاذ العام.\n\n" +
      "من هنا يمكنك:\n" +
      "• تختار الحساب من القائمة ثم تحدده لتظهر حركاته.\n" +
      "• تصفّي الحركات حسب الفترة الزمنية.\n" +
      "• تستعرض الرصيد الافتتاحي والختامي وحركات الحساب (التاريخ، رقم القيد، الوصف، المدين، الدائن، والرصيد المتجدد).\n" +
      "• تصدّر النتيجة Excel أو تطبعها PDF.",
    bodyEn:
      "This page shows the movements of one account in the general ledger.\n\n" +
      "From here you can:\n" +
      "• Select an account from the list to show its movements.\n" +
      "• Filter movements by time period.\n" +
      "• See the opening and closing balances and the account's movements (date, entry number, description, debit, credit, and running balance).\n" +
      "• Export the result as Excel or print it as PDF.",
  },
  "/dashboard/accounting/fixed-assets": {
    titleAr: "مساعدة: الأصول الثابتة",
    titleEn: "Help: Fixed Assets",
    bodyAr:
      "هذه الصفحة تدير سجل الأصول الثابتة واستهلاكها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تسجّل أصلًا ثابتًا جديدًا (الاسم، التكلفة، تاريخ الشراء، والعمر الإنتاجي).\n" +
      "• تشغّل إهلاك شهر لأصل واحد أو لكل الأصول دفعة واحدة.\n" +
      "• تعرض نتيجة التشغيل (قيمة الإهلاك لكل أصل) وتنتقل للقيد المحاسبي المولّد لكل أصل.\n\n" +
      "الجدول يعرض: الاسم، تاريخ الشراء، التكلفة، العمر الإنتاجي، الإهلاك الشهري والمجمع، القيمة الدفترية، والحالة.",
    bodyEn:
      "This page manages your fixed assets register and their depreciation.\n\n" +
      "From here you can:\n" +
      "• Register a new fixed asset (name, cost, purchase date, and useful life).\n" +
      "• Run monthly depreciation for one asset or all assets at once.\n" +
      "• See the run results (depreciation amount per asset) and open the generated journal entry for each.\n\n" +
      "The table shows: name, purchase date, cost, useful life, monthly and accumulated depreciation, book value, and status.",
  },
  "/dashboard/accounting/fixed-assets/new": {
    titleAr: "مساعدة: أصل ثابت جديد",
    titleEn: "Help: New Fixed Asset",
    bodyAr:
      "هذه الصفحة تتيح تسجيل أصل ثابت جديد في السجل.\n\n" +
      "من هنا يمكنك:\n" +
      "• تدخل اسم الأصل (إلزامي)، تكلفة الشراء (أكبر من صفر)، تاريخ الشراء، والعمر الإنتاجي بالسنوات.\n" +
      "• تعرض معاينة فورية للإهلاك الشهري التقديري (التكلفة مقسومة على عدد شهور العمر الإنتاجي).\n\n" +
      "بعد الحفظ سيتم نقلك تلقائيًا لقائمة الأصول الثابتة.",
    bodyEn:
      "This page lets you register a new fixed asset in the register.\n\n" +
      "From here you can:\n" +
      "• Enter the asset name (required), purchase cost (greater than zero), purchase date, and useful life in years.\n" +
      "• See a live preview of the estimated monthly depreciation (cost divided by the months of useful life).\n\n" +
      "After saving, you'll be taken back to the fixed assets list automatically.",
  },
  "/dashboard/accounting/reports": {
    titleAr: "مساعدة: التقارير المالية",
    titleEn: "Help: Financial Reports",
    bodyAr:
      "هذه الصفحة تعرض التقارير المالية الأربعة الرئيسية لشركتك.\n\n" +
      "من هنا يمكنك:\n" +
      "• ميزان المراجعة (ميزان تجريبي) لمعظم الأرصدة المدينة والدائنة مع مؤشر التوازن.\n" +
      "• قائمة الدخل (الإيرادات والمصروفات وصافي الربح أو الخسارة).\n" +
      "• الميزانية العمومية (الأصول والخصوم وحقوق الملكية في تاريخ معين).\n" +
      "• قائمة التدفقات النقدية (رصيد النقد الافتتاحي والختامي وحركات كل مصدر).\n" +
      "• تصفية النتائج حسب الفترة ونوع الحساب واختيار كل تقرير.\n" +
      "• تصدير أي تقرير Excel أو طباعته PDF.\n\n" +
      "متاح فقط إذا كانت باقتك تتضمن ميزة المحاسبة الكاملة.",
    bodyEn:
      "This page presents your company's four main financial reports.\n\n" +
      "From here you can:\n" +
      "• Trial Balance for opening balances' debits and credits with a balance indicator.\n" +
      "• Income Statement (revenues, expenses, and net profit or loss).\n" +
      "• Balance Sheet (assets, liabilities, and equity as of a given date).\n" +
      "• Cash Flow (opening and closing cash balances and movements by source).\n" +
      "• Filter results by period, account type, and source, per report.\n" +
      "• Export any report as Excel or print it as PDF.\n\n" +
      "Only available if your package includes the full accounting feature.",
  },
  "/dashboard/transactions": {
    titleAr: "مساعدة: الحركات المالية",
    titleEn: "Help: Transactions",
    bodyAr:
      "هذه الصفحة تعرض جميع الحركات المالية المسجلة في النظام.\n\n" +
      "استخدم الفلاتر المتاحة لتضييق النتائج حسب الفترة أو النوع، وراجع التفاصيل من الصفوف نفسها.\n\n" +
      "هذه الصفحة للعرض والمراجعة المالية لمتابعة الإيرادات والمصروفات اليومية.",
    bodyEn:
      "This page lists all financial movements recorded in the system.\n\n" +
      "Use the available filters to narrow the results by period or type, and review the details from the rows.\n\n" +
      "This page is for viewing and financial review to follow daily income and expenses.",
  },
  "/dashboard/tickets/[id]": {
    titleAr: "مساعدة: تفاصيل تذكرة الدعم",
    titleEn: "Help: Support Ticket Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل تذكرة دعم فنية واحدة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض بيانات التذكرة (رقم التذكرة، الموضوع، التاريخ، والحالة).\n" +
      "• تقرأ الرسالة الأصلية وكل الردود المتبادلة مع فريق الدعم.\n" +
      "• ترسل ردًا جديدًا ما دامت التذكرة غير مغلقة.\n\n" +
      "التذكرة المغلقة للعرض فقط ولا يمكن الرد عليها.",
    bodyEn:
      "This page shows the details of a single technical support ticket.\n\n" +
      "From here you can:\n" +
      "• See the ticket details (ticket number, subject, date, and status).\n" +
      "• Read the original message and all replies exchanged with the support team.\n" +
      "• Send a new reply while the ticket is not yet closed.\n\n" +
      "A closed ticket is read-only and cannot receive replies.",
  },
  "/dashboard/create-store": {
    titleAr: "مساعدة: إنشاء متجر",
    titleEn: "Help: Create Store",
    bodyAr:
      "هذه الصفحة تتيح إنشاء متجرك على المنصة لأول مرة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تكتب اسم متجرك كما سيظهر للعملاء.\n" +
      "• تحدد الرابط المختصر (Slug) بأحرف إنجليزية صغيرة وأرقام وشرطات فقط.\n" +
      "• تضغط إنشاء المتجر وسيصبح متجرك جاهزًا للبدء.\n\n" +
      "الرابط المختصر لا يمكن تغييره لاحقًا وسيُستخدم لزيارة متجرك ودفع الفواتير وتسجيل العملاء.",
    bodyEn:
      "This page lets you create your store on the platform for the first time.\n\n" +
      "From here you can:\n" +
      "• Enter your store name as it will appear to customers.\n" +
      "• Set the short link (slug) using only lowercase English letters, numbers, and dashes.\n" +
      "• Press Create Store and your store will be ready to use.\n\n" +
      "The slug cannot be changed later and is used for visiting your store, paying invoices, and registering customers.",
  },
  "/dashboard/profile": {
    titleAr: "مساعدة: الملف الشخصي",
    titleEn: "Help: Profile",
    bodyAr:
      "هذه الصفحة تتيح لك إدارة بياناتك الشخصية على المنصة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعدّل الاسم الكامل واسم المتجر والبريد الإلكتروني ورقم الهاتف.\n" +
      "• ترفع صورة ملفك الشخصي.\n" +
      "• تغيّر كلمة المرور الخاصة بك.\n\n" +
      "حفظ التعديلات يتطلب تأكيدًا برمز تأكيد يصلك، وعند تغيير كلمة المرور سيُطلب منك تسجيل الدخول مرة أخرى.",
    bodyEn:
      "This page lets you manage your personal data on the platform.\n\n" +
      "From here you can:\n" +
      "• Edit your full name, store name, email, and phone number.\n" +
      "• Upload your profile picture.\n" +
      "• Change your password.\n\n" +
      "Saving changes requires an OTP code sent to you, and after changing your password you'll be asked to log in again.",
  },
  "/dashboard/stores": {
    titleAr: "مساعدة: إدارة المتاجر",
    titleEn: "Help: Manage Stores",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لعرض وإدارة جميع المتاجر المسجلة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تستعرض جميع المتاجر مع بيانات مالك كل متجر وباقته واستهلاكه ونسبة الاستهلاك من الباقة.\n" +
      "• تصفّي المتاجر حسب الحالة أو الباقة.\n" +
      "• تدخل لتفاصيل أي متجر لعرض بياناته وإدارة دومينه.\n" +
      "• توقف متجرًا عن العمل أو تعيد تفعيله.\n\n" +
      "هذه الصفحة محمية ولا تظهر إلا للمدير العام (SuperAdmin) أو الموظف المصرح له بإدارة المتاجر.",
    bodyEn:
      "This page is for the platform team to view and manage all registered stores.\n\n" +
      "From here you can:\n" +
      "• View all stores with each store's owner, package, consumption, and package usage percentage.\n" +
      "• Filter stores by status or package.\n" +
      "• Open any store's details to view its data and manage its domain.\n" +
      "• Suspend a store or reactivate it.\n\n" +
      "This page is protected and only shown to the platform super admin or authorized staff.",
  },
  "/dashboard/stores/[id]": {
    titleAr: "مساعدة: تفاصيل المتجر",
    titleEn: "Help: Store Details",
    bodyAr:
      "هذه الصفحة تعرض تفاصيل متجر واحد لمدراء المنصة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعرض البيانات الأساسية للمتجر (الاسم، الرابط، الباقة، الحالة، المالك، عدد المنتجات والموظفين، وتاريخ التسجيل).\n" +
      "• تفعّل الدومين المخصص للمتجر إذا كانت حالته معلقة.\n" +
      "• توقف المتجر أو تعيد تفعيله.",
    bodyEn:
      "This page shows the details of a single store for platform managers.\n\n" +
      "From here you can:\n" +
      "• See the store's basic info (name, URL, package, status, owner, product/employee counts, and registration date).\n" +
      "• Activate the store's custom domain if it's pending.\n" +
      "• Suspend or reactivate the store.",
  },
  "/dashboard/packages": {
    titleAr: "مساعدة: إدارة الباقات",
    titleEn: "Help: Package Management",
    bodyAr:
      "هذه الصفحة مخصصة لفريق منصة فاتورة راحتك (المدير العام / موظف الباقات) لإدارة باقات الاشتراك التي تُعرض على التجار.\n\n" +
      "يمكنك من هنا:\n" +
      "• إنشاء باقة جديدة أو تعديل باقة موجودة (اسم الباقة، السعر الشهري، ونسبة العمولة على المبيعات إن وُجدت).\n" +
      "• تحديد حدود كل باقة (Limits): أقصى عدد منتجات، وأقصى عدد طلبات في الشهر، وأقصى عدد موظفين، وأقصى عدد مخازن مسموح به للتاجر المشترك في الباقة. اكتب صفرًا أو اترك الحقل فارغًا إذا كانت الميزة غير متاحة، أو اختر \"غير محدود\" إذا لم يوجد سقف.\n" +
      "• تفعيل أو إلغاء مميزات إضافية للباقة مثل: المحاسبة الكاملة، الرواتب، الفاتورة الإلكترونية (ZATCA)، الدومين المخصص، التسويق بالعمولة (Affiliate)، والوصول إلى API.\n" +
      "• الاطلاع على عدد التجار المشتركين حاليًا في كل باقة قبل تعديلها أو حذفها، لتجنب التأثير على تجار مشتركين فعلًا.\n\n" +
      "أي تعديل تجريه هنا يؤثر على التجار الجدد الذين سيشتركون في الباقة، وقد يؤثر على القدامى وفق سياسة الترقية/التخفيض المطبقة في النظام.",
    bodyEn:
      "This page is for the platform team (Super Admin / Packages staff) to manage the subscription packages offered to merchants.\n\n" +
      "From here you can:\n" +
      "• Create a new package or edit an existing one (package name, monthly price, and commission rate on sales if applicable).\n" +
      "• Set each package's limits: maximum products, monthly orders, employees, and warehouses allowed for a merchant on this plan. Enter zero or leave empty if the feature isn't available, or choose \"Unlimited\" if there's no cap.\n" +
      "• Enable or disable extra features per package: full accounting, payroll, e-invoicing (ZATCA), custom domain, affiliate marketing, and API access.\n" +
      "• See how many merchants are currently subscribed to each package before editing or deleting it, so you avoid affecting merchants already on that plan.\n\n" +
      "Any change here affects new merchants who subscribe to that package, and may affect existing ones depending on the platform's upgrade/downgrade policy.",
  },
  "/dashboard/users": {
    titleAr: "مساعدة: إدارة المستخدمين",
    titleEn: "Help: User Management",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لإدارة حسابات المستخدمين.\n\n" +
      "من هنا يمكنك:\n" +
      "• تستعرض جميع المستخدمين وتصفّيهم حسب النوع (مالك متجر / موظف / مدير عام / موظف منصة).\n" +
      "• تفعّل أو تعطّل حساب مستخدم.\n" +
      "• تستعرض حسابات مالكي المتاجر بشكل منفصل.\n" +
      "• تنشئ حسابات موظفي المنصة (مدير عام / دعم / مالية / تقني) من تبويب الموظفين — متاح للمدير العام فقط.\n" +
      "• ترسل إشعارًا لجميع المستخدمين أو لمتجر محدد من تبويب الإشعارات.",
    bodyEn:
      "This page is for the platform team to manage user accounts.\n\n" +
      "From here you can:\n" +
      "• View all users and filter them by type (Store Owner / Employee / Super Admin / Support Staff).\n" +
      "• Activate or deactivate a user account.\n" +
      "• View store owner accounts separately.\n" +
      "• Create platform staff accounts (Admin / Support / Finance / Technical) from the Staff tab — super admin only.\n" +
      "• Send a notification to all users or a specific store from the Notifications tab.",
  },
  "/dashboard/reports": {
    titleAr: "مساعدة: تقارير المنصة",
    titleEn: "Help: Platform Reports",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لتجميع تقارير الأداء العامة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتابع ملخص المنصة (إجمالي المتاجر والحالات، المستخدمين، المنتجات، الطلبات، الإيرادات، الإحالات، والعمولات المعلقة).\n" +
      "• تعرض توزيع المتاجر حسب الباقة مع نسب المشاركة.\n" +
      "• تصدّر تقرير المنصة Excel أو CSV أو PDF.\n" +
      "• تختار مؤشرات التقارير المطلوبة وتدير جداول إرسال التقارير الدورية (يومي/أسبوعي/شهري) وتحدد المستلمين.\n\n" +
      "مختار المؤشرات وجداول الإرسال متاحة لمدير حساب المنصة، وبقية الموظفين يشاهدونها للعرض فقط.",
    bodyEn:
      "This page is for the platform team to compile overall performance reports.\n\n" +
      "From here you can:\n" +
      "• Track the platform summary (total stores and statuses, users, products, orders, revenue, referrals, and pending commissions).\n" +
      "• See store distribution by package with share bars.\n" +
      "• Export the platform report as Excel, CSV, or PDF.\n" +
      "• Select the required report KPIs and manage recurring report schedules (daily/weekly/monthly) and their recipients.\n\n" +
      "KPI selection and schedules are available to the platform admin; other staff members have read-only access.",
  },
  "/dashboard/kpis": {
    titleAr: "مساعدة: مؤشرات الأداء",
    titleEn: "Help: KPIs",
    bodyAr:
      "هذه الصفحة الخاصة بفريق المنصة تعرض مؤشرات أداء المنصة بمرئية واضحة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتابع بطاقات المؤشرات الرئيسية (الإيراد الشهري المتكرر، الإيراد السنوي، المتاجر النشطة، التحويل من تجربة لمدفوعة، ومعدل الإلغاء).\n" +
      "• تعرض رسم بياني لنمو المتاجر الجديدة مقابل الإلغاءات شهريًا.\n" +
      "• تستعرض توزيع المتاجر حسب الباقة في رسم دائري.\n" +
      "• تتابع قائمة المتاجر الأكثر إيرادًا وقائمة المتاجر المعرضة للخطر (آخر تسجيل دخول).\n\n" +
      "المؤشرات المعروضة تعتمد على المؤشرات المختارة من صفحة التقارير.",
    bodyEn:
      "This platform team page shows platform KPIs in a clear visual format.\n\n" +
      "From here you can:\n" +
      "• Follow the main KPI cards (MRR, ARR, active stores, trial-to-paid conversion, and churn rate).\n" +
      "• See a line chart of monthly growth of new stores vs cancelled subscriptions.\n" +
      "• View package distribution in a donut chart.\n" +
      "• Track the top-revenue stores and at-risk stores (last login date).\n\n" +
      "The displayed KPIs depend on the KPIs selected on the reports page.",
  },
  "/dashboard/business-reports": {
    titleAr: "مساعدة: التقارير التشغيلية",
    titleEn: "Help: Business Reports",
    bodyAr:
      "هذه الصفحة تجمع تقارير تشغيل متجرك في ثمانية تقارير.\n\n" +
      "من هنا يمكنك:\n" +
      "• تقارير المبيعات (المبيعات اليومية وأفضل المنتجات) والخصومات (استخدام الكوبونات) والضريبة.\n" +
      "• تقارير المخزون: انخفاض المخزون (مع تحديد الحد) والحركات والتقييم.\n" +
      "• تقرير كشف حساب العميل وتقرير الأعمار المدينة المستحقة (AR Aging).\n\n" +
      "لكل تقرير فلاتر خاصة به (الفترة، الحد الأدنى، أو العميل) وزر تشغيل وأزرار تصدير CSV/Excel/PDF.",
    bodyEn:
      "This page brings together your store's operational reports into eight reports.\n\n" +
      "From here you can:\n" +
      "• Sales reports (daily sales and top products), discounts (coupon usage), and tax.\n" +
      "• Inventory reports: low-stock (with threshold), movements, and valuation.\n" +
      "• Customer statement and accounts receivable aging (AR) reports.\n\n" +
      "Each report has its own filters (period, threshold, or customer), a Run button, and CSV/Excel/PDF export buttons.",
  },
  "/dashboard/admin-settlements": {
    titleAr: "مساعدة: تسويات المنصة",
    titleEn: "Help: Platform Settlements",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لإدارة دفعات تحصيل المستحقات للمتاجر.\n\n" +
      "من هنا يمكنك:\n" +
      "• تولّد دفعة تحصيل جديدة بضغطة زر لتجميع مستحقات المتاجر لفترة محددة.\n" +
      "• تستعرض الدفعات السابقة وبيانات كل متجر في الدفعة (الإجمالي، العمولة، خصم الشحن، والصافي).\n" +
      "• تؤكد الدفعة غير المكتملة بإدخال مرجع الدفع.",
    bodyEn:
      "This page is for the platform team to manage settlement batches for stores.\n\n" +
      "From here you can:\n" +
      "• Generate a new settlement batch with one click to aggregate store earnings for a period.\n" +
      "• Review previous batches and each store's data in a batch (gross, commission, shipping deduction, and net).\n" +
      "• Confirm an incomplete batch by entering the payment reference.",
  },
  "/dashboard/admin-verifications": {
    titleAr: "مساعدة: مراجعة طلبات التوثيق",
    titleEn: "Help: Verification Review",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لمراجعة طلبات توثيق المتاجر ومستنداتها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تصفّي الطلبات حسب الحالة (الكل / معلق / معتمد / مرفوض / لم يُقدم).\n" +
      "• تعرض مستندات كل طلب وتراجع كل مستند على حدة (اعتماد أو رفض مع سبب).\n" +
      "• تعتمد أو ترفض الطلب بالكامل مع كتابة سبب الرفض إن وجد.\n\n" +
      "مراجعة دقيقة للمستندات قبل الاعتماد تحمي المنصة من الحسابات غير الموثقة.",
    bodyEn:
      "This page is for the platform team to review store verification requests and their documents.\n\n" +
      "From here you can:\n" +
      "• Filter requests by status (All / Pending / Approved / Rejected / Not Submitted).\n" +
      "• View each request's documents and review them individually (approve or reject with a reason).\n" +
      "• Approve or reject the whole request, optionally with a rejection reason.\n" +
      "• Reviewing documents carefully before approval protects the platform from unverified accounts.",
  },
  "/dashboard/admin-referrals": {
    titleAr: "مساعدة: إدارة الإحالات والعمولات",
    titleEn: "Help: Referrals & Commissions",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لإدارة برنامج الإحالات وموافقات العمولات.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتصفّى الإحالات حسب الحالة أو البحث أو الفترة وتعتمد أو ترفض كل إحالة مع ملاحظة.\n" +
      "• تراجع العمولات وتعدّل نسبة العمولة لإحالة معلقة.\n" +
      "• تحدّث نسبة العمولة الافتراضية العامة للبرنامج.\n\n" +
      "اعتماد الإحالة يضيف العمولة تلقائيًا لرصيد صاحب الإحالة.",
    bodyEn:
      "This page is for the platform team to manage the referral program and commission approvals.\n\n" +
      "From here you can:\n" +
      "• Filter referrals by status, search, or period, then approve or reject each referral with a note.\n" +
      "• Review commissions and edit the commission rate for a pending referral.\n" +
      "• Update the global default commission rate.\n\n" +
      "Approving a referral adds the commission to the referrer's balance automatically.",
  },
  "/dashboard/admin-merchant-accounts": {
    titleAr: "مساعدة: مراجعة الحسابات التجارية",
    titleEn: "Help: Merchant Account Review",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لمراجعة حسابات التجار (KYC) قبل تفعيلها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تصفّي الحسابات حسب الحالة (الكل / معلق / معتمد / مرفوض / موقوف / لم يُقدم).\n" +
      "• تستعرض بيانات العلامة التجارية والكيان القانوني والمالك لكل حساب.\n" +
      "• تعتمد أو ترفض الحساب مع كتابة سبب الرفض.\n" +
      "• توقف حسابًا معتمدًا (مع إلزامية السبب) أو تعيد تفعيله.\n\n" +
      "جميع الحسابات المعتمدة تُراجع بياناتها يدويًا قبل الاعتماد.",
    bodyEn:
      "This page is for the platform team to review merchant accounts (KYC) before activation.\n\n" +
      "From here you can:\n" +
      "• Filter accounts by status (All / Pending / Approved / Rejected / Suspended / Not Submitted).\n" +
      "• Review each account's brand, legal entity, and owner data.\n" +
      "• Approve or reject the account, optionally with a rejection reason.\n" +
      "• Suspend an approved account (reason required) or reactivate it.\n" +
      "• All accounts are manually reviewed before approval.",
  },
  "/dashboard/domains": {
    titleAr: "مساعدة: إدارة النطاقات",
    titleEn: "Help: Domains",
    bodyAr:
      "هذه الصفحة تعرض أدوات إدارة النطاقات لمنصة فاتورة راحتك وتسع تبويبات رئيسية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تدير النطاقات الفرعية والدومينات المخصصة للمتاجر وبيانات DNS وسجلات إعادة التوجيه.\n" +
      "• تطلب شهادات SSL وتجددها للدومينات المخصصة.\n" +
      "• تراقب حالة النطاقات وتبحث عن نطاق متاح.\n" +
      "• تدير إعدادات البريد الاحترافي للنطاقات وسجل النطاقات المسجلة وقائمة النطاقات المحظورة.\n\n" +
      "التحقق من DNS (العنوان IP المتوقع مقابل الفعلي) يساعد في تشخيص مشاكل ربط الدومين.",
    bodyEn:
      "This page provides domain management tools for the platform with nine main tabs.\n\n" +
      "From here you can:\n" +
      "• Manage subdomains, custom domains for stores, DNS records, and redirects.\n" +
      "• Request and renew SSL certificates for custom domains.\n" +
      "• Monitor domain status and search for an available domain.\n" +
      "• Manage professional email setups per domain, registration records, and the blacklist.\n\n" +
      "DNS verification (expected vs actual IP) helps diagnose domain connection issues.",
  },
  "/dashboard/themes": {
    titleAr: "مساعدة: إدارة التصميمات",
    titleEn: "Help: Themes",
    bodyAr:
      "هذه الصفحة تعرض جميع تصميمات المتاجر المتاحة على المنصة وتتيح تفعيلها أو تعطيلها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تستعرض التصميمات مجمعة حسب الفئة (B2C / B2B / مميزة).\n" +
      "• تعرض معاينة مصغرة لألوان كل تصميم ووصفه وحالته.\n" +
      "• تفعّل أو تعطّل أي تصميم من زر التبديل.\n\n" +
      "التصميمات المعطلة لا يظهر للمتاجر اختيارها عند تخصيص متجرهم.",
    bodyEn:
      "This page lists all store themes available on the platform and lets you enable or disable them.\n\n" +
      "From here you can:\n" +
      "• Browse themes grouped by category (B2C / B2B / Special).\n" +
      "• See a mini preview of each theme's colors, its name, description, and status.\n" +
      "• Enable or disable any theme using its toggle switch.\n" +
      "• Disabled themes are not shown to stores when they customize their store.",
  },
  "/dashboard/settings": {
    titleAr: "مساعدة: إعدادات المنصة",
    titleEn: "Help: Platform Settings",
    bodyAr:
      "هذه الصفحة تعرض الإعدادات العامة للمنصة على شكل مفاتيح وقيم.\n\n" +
      "من هنا يمكنك:\n" +
      "• تستعرض الإعدادات الحالية وتعدّل القيم.\n" +
      "• تضيف إعدادًا جديدًا أو تحذف صفًا.\n" +
      "• تحفظ التغييرات دفعة واحدة بالضغط على زر الحفظ.\n\n" +
      "استخدمها بحذر لأن التغييرات تؤثر على المنصة كلها.",
    bodyEn:
      "This page shows the platform's global settings as key/value pairs.\n\n" +
      "From here you can:\n" +
      "• Review current settings and edit their values.\n" +
      "• Add a new setting or delete a row.\n" +
      "• Save all changes at once with the save button.\n\n" +
      "Use it with caution because changes affect the entire platform.",
  },
  "/dashboard/site-content": {
    titleAr: "مساعدة: محتوى الموقع التعريفي",
    titleEn: "Help: Marketing Site Content",
    bodyAr:
      "هذه الصفحة خاصة بفريق المنصة لإدارة محتوى الموقع التعريفي ومراسلات العملاء.\n\n" +
      "من هنا يمكنك:\n" +
      "• تعدّل الصفحة الرئيسية كاملة (العنوان، الوصف، الصور والفيديو، المميزات، روابط التواصل، والفوتر).\n" +
      "• تحرّر صفحات الميزات وعن وتواصل معنا بالعربي والإنجليزي.\n" +
      "• تدير الأسئلة الشائعة ونشرها أو إخفاءها.\n" +
      "• تتابع رسائل العملاء والرد عليها وتغيير حالتها من تبويب تواصل معنا.\n\n" +
      "الحفظ يتم لكل قسم على حدة، وارفع الصور والفيديو من نفس الصفحة قبل الحفظ.",
    bodyEn:
      "This page is for the platform team to manage the marketing site content and customer messages.\n\n" +
      "From here you can:\n" +
      "• Edit the full homepage (title, description, images and video, features, social links, and footer).\n" +
      "• Edit the Features, About, and Contact pages in Arabic and English.\n" +
      "• Manage FAQ items and publish or hide them.\n" +
      "• Follow customer messages, reply, and change their status from the Contact tab.\n\n" +
      "Each section is saved separately, and upload images and video from the same page before saving.",
  },
  "/dashboard/site-menus": {
    titleAr: "مساعدة: قوائم الموقع",
    titleEn: "Help: Site Menus",
    bodyAr:
      "هذه الصفحة تدير قوائم التنقل في الموقع التعريفي للمنصة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تستعرض القوائم مجمعة حسب الموقع (الميزات، عن، أدوات الفوتر، فوتر عن، فوتر المساعدة).\n" +
      "• تضيف عنصر قائمة أو عنصرًا فرعيًا تحت عنصر موجود.\n" +
      "• تعدّل العناوين والروابط والترتيب والأيقونة وحالة الظهور.\n" +
      "• تخفي عنصرًا أو تظهره أو تحذفه.\n\n" +
      "التغييرات تنعكس مباشرة على الموقع التعريفي للمنصة.",
    bodyEn:
      "This page manages the navigation menus in the platform's marketing site.\n\n" +
      "From here you can:\n" +
      "• View menus grouped by location (Features, About, Footer tools, Footer about, Footer help).\n" +
      "• Add a menu item or a sub-item under an existing item.\n" +
      "• Edit titles, links, sort order, icons, and visibility.\n" +
      "• Hide, show, or delete an item.\n\n" +
      "Changes are reflected directly on the marketing site.",
  },
  "/dashboard/dashboard-sections": {
    titleAr: "مساعدة: أقسام لوحة التحكم",
    titleEn: "Help: Dashboard Sections",
    bodyAr:
      "هذه الصفحة تدير أقسام القائمة الجانبية في لوحة التحكم والأزرار داخلها.\n\n" +
      "من هنا يمكنك:\n" +
      "• تنشئ قسمًا جديدًا أو تعدّل قسمًا موجودًا (العنوان بالعربي والإنجليزي، الأيقونة، الدور المستهدف، وترتيب العرض).\n" +
      "• تضيف روابط داخل القسم (عنوان، رابط، أيقونة، صلاحية اختيارية) أو تزيلها.\n" +
      "• تُظهر القسم أو تخفيه أو تحذفه.\n\n" +
      "الدور المستهدف يحدد من سيرى القسم (المدير العام / المالك / الموظف)، والصلاحيات تتحكم في ظهور كل رابط على حدة.",
    bodyEn:
      "This page manages the dashboard sidebar sections and the links inside them.\n\n" +
      "From here you can:\n" +
      "• Create a new section or edit an existing one (Arabic/English title, icon, target role, and sort order).\n" +
      "• Add links inside a section (label, href, icon, optional permission) or remove them.\n" +
      "• Show, hide, or delete a section.\n\n" +
      "The target role determines who sees the section (Super Admin / Owner / Employee), and permissions control each link's visibility.",
  },
  "/dashboard/blog": {
    titleAr: "مساعدة: مدونة المنصة",
    titleEn: "Help: Platform Blog",
    bodyAr:
      "هذه الصفحة تدير مقالات مدونة المنصة التعريفية.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف مقالًا جديدًا (العنوان، المحتوى، صورة مميزة، اسم المؤلف) أو تعدّل مقالًا موجودًا.\n" +
      "• تنشر مقالًا أو تلغي نشره.\n" +
      "• تحذف مقالًا نهائيًا.\n\n" +
      "الصورة المميزة تُفحص تلقائيًا بحيث تكون بنسبة 16:9 للعرض الأمثل في الموقع.",
    bodyEn:
      "This page manages the platform's marketing blog posts.\n\n" +
      "From here you can:\n" +
      "• Add a new post (title, content, featured image, author name) or edit an existing one.\n" +
      "• Publish or unpublish a post.\n" +
      "• Permanently delete a post.\n\n" +
      "The featured image is validated automatically to be 16:9 for optimal display on the site.",
  },
  "/dashboard/store-blog": {
    titleAr: "مساعدة: مدونة المتجر",
    titleEn: "Help: Store Blog",
    bodyAr:
      "هذه الصفحة تدير مدونة متجرك الخاصة بالعملاء.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف مقالًا جديدًا (العنوان بالعربي والإنجليزي مع رابط تلقائي، المحتوى، صورة مميزة، المؤلف، والحالة).\n" +
      "• تنشر مقالًا أو تلغي نشره أو تعدّله أو تحذفه.\n" +
      "• تحدد الوصف التعريفي لتحسين الظهور في محركات البحث.\n\n" +
      "المقالات المنشورة تظهر في صفحة مدونة متجرك العامة للعملاء.",
    bodyEn:
      "This page manages your store's blog for customers.\n\n" +
      "From here you can:\n" +
      "• Add a new post (Arabic/English titles with auto-generate slugs, content, featured image, author, and status).\n" +
      "• Publish, unpublish, edit, or delete a post.\n" +
      "• Set the SEO title and description to improve search engine visibility.\n\n" +
      "Published posts appear on your store's public blog page for customers.",
  },
  "/dashboard/careers": {
    titleAr: "مساعدة: الوظائف والتوظيف",
    titleEn: "Help: Careers & Applications",
    bodyAr:
      "هذه الصفحة تدير الوظائف الشاغرة على المنصة وطلبات التوظيف الواردة.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف وظيفة جديدة (العنوان بالعربي والإنجليزي، الموقع، النوع، ترتيب العرض، والتفعيل) أو تعدّل أو تحذف وظيفة.\n" +
      "• تستعرض طلبات التوظيف لكل وظيفة وبيانات مقدم الطلب وسيرته الذاتية.\n" +
      "• تحدّث حالة الطلب (جديد / مراجعة / مقبول / مرفوض).\n\n" +
      "الوظائف النشطة تظهر في صفحة الوظائف العامة على الموقع.",
    bodyEn:
      "This page manages job openings on the platform and incoming applications.\n\n" +
      "From here you can:\n" +
      "• Add a new job (Arabic/English titles, location, type, sort order, and active) or edit or delete a job.\n" +
      "• View applications for each job, the applicant's details, and their CV.\n" +
      "• Update the application status (New / Reviewed / Accepted / Rejected).\n\n" +
      "Active jobs appear on the public careers page on the site.",
  },
  "/dashboard/academy": {
    titleAr: "مساعدة: الأكاديمية",
    titleEn: "Help: Academy",
    bodyAr:
      "هذه الصفحة تدير دورة الأكاديمية التعليمية على المنصة وتحتوي على ثلاثة أقسام.\n\n" +
      "من هنا يمكنك:\n" +
      "• تدير الدورات (الاسم بالعربي والإنجليزي، الوصف، الفئة، المستوى، المدة، ترتيب العرض، والتفعيل).\n" +
      "• تدير دروس كل دورة (العنوان، الوصف، رابط الفيديو، ترتيب العرض، والتفعيل).\n" +
      "• تستعرض طلبات التسجيل في الدورات وتحدّث حالتها (جديد / مراجعة / مقبول / مرفوض).",
    bodyEn:
      "This page manages the academy's educational courses with three sections.\n\n" +
      "From here you can:\n" +
      "• Manage courses (Arabic/English titles, description, category, level, duration, sort order, and active).\n" +
      "• Manage each course's lessons (title, description, video URL, sort order, and active).\n" +
      "• Review course enrollments and update their status (New / Reviewed / Accepted / Rejected).",
  },
  "/dashboard/store-faq": {
    titleAr: "مساعدة: الأسئلة الشائعة للمتجر",
    titleEn: "Help: Store FAQ",
    bodyAr:
      "هذه الصفحة تدير الأسئلة الشائعة التي تظهر في متجرك للعملاء.\n\n" +
      "من هنا يمكنك:\n" +
      "• تضيف سؤالًا وجوابه بالعربي والإنجليزي وتحدد ترتيب العرض.\n" +
      "• تنشر سؤالًا أو تخفيه.\n" +
      "• تعدّل أو تحذف أي سؤال.\n\n" +
      "الأسئلة المنشورة تظهر في صفحة الأسئلة الشائعة داخل متجرك.",
    bodyEn:
      "This page manages the frequently asked questions displayed in your store.\n\n" +
      "From here you can:\n" +
      "• Add a question and answer in Arabic and English and set the display order.\n" +
      "• Publish or hide a question.\n" +
      "• Edit or delete any question.\n\n" +
      "Published questions appear on your store's FAQ page for customers.",
  },
  "/dashboard/design-requests": {
    titleAr: "مساعدة: طلبات التصميم",
    titleEn: "Help: Design Requests",
    bodyAr:
      "هذه الصفحة هي صندوق الوارد لطلبات تصاميم المتاجر من أصحاب المتاجر.\n\n" +
      "من هنا يمكنك:\n" +
      "• تتصفح قائمة طلبات التصميم وحالة كل طلب ووقت آخر رسالة.\n" +
      "• تدخل في محادثة مباشرة مع صاحب المتجر حول تصميمه.\n" +
      "• تغيّر حالة المعالجة (مفتوح / قيد التنفيذ / مكتمل).\n" +
      "• ترسل ردًا جديدًا في المحادثة.",
    bodyEn:
      "This page is the inbox for store design requests from store owners.\n\n" +
      "From here you can:\n" +
      "• Browse the request list with each request's status and last message time.\n" +
      "• Join a direct conversation with the store owner about their design.\n" +
      "• Change the processing status (Open / In Progress / Completed).\n" +
      "• Send a new reply in the conversation.",
  },
  };