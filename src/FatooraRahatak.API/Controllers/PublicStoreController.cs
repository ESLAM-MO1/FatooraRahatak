using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
namespace FatooraRahatak.API.Controllers;
[ApiController]
[Route("api/v1/public/stores")]
public class PublicStoreController : ControllerBase
{
    private readonly IPublicStoreService _publicStoreService;
    private readonly IOrderService _orderService;
    private readonly IQuickLoginService _quickLoginService;
    private readonly ICustomerSessionService _customerSessionService;
    private readonly IPaymentService _paymentService;
    public PublicStoreController(IPublicStoreService publicStoreService, IOrderService orderService, IQuickLoginService quickLoginService, ICustomerSessionService customerSessionService, IPaymentService paymentService)
    {
        _publicStoreService = publicStoreService;
        _orderService = orderService;
        _quickLoginService = quickLoginService;
        _customerSessionService = customerSessionService;
        _paymentService = paymentService;
    }

    private string? GetCustomerPhone()
    {
        var auth = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(auth)) return null;
        var token = auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? auth["Bearer ".Length..].Trim()
            : auth.Trim();
        var session = _customerSessionService.ValidateToken(token);
        return session?.Phone;
    }

    private bool IsCustomerPhoneMatching(string phone, string? customerPhone) =>
        !string.IsNullOrWhiteSpace(customerPhone) &&
        new string(phone.Where(char.IsDigit).ToArray()).TrimStart('0') ==
        new string(customerPhone.Where(char.IsDigit).ToArray()).TrimStart('0');
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetStore(string slug)
    {
        var store = await _publicStoreService.GetStoreBySlugAsync(slug);
        if (store == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = store });
    }
    [HttpGet("{slug}/categories")]
    public async Task<IActionResult> GetCategories(string slug)
    {
        var categories = await _publicStoreService.GetCategoriesAsync(slug);
        if (categories == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = categories });
    }
    [HttpGet("{slug}/products")]
    public async Task<IActionResult> GetProducts(string slug, [FromQuery] long? categoryId)
    {
        var products = await _publicStoreService.GetProductsAsync(slug, categoryId);
        if (products == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = products });
    }
    [HttpGet("{slug}/products/{productId}")]
    public async Task<IActionResult> GetProductDetail(string slug, long productId)
    {
        var product = await _publicStoreService.GetProductDetailAsync(slug, productId);
        if (product == null)
            return NotFound(new { success = false, message = "المنتج غير موجود" });
        return Ok(new { success = true, data = product });
    }
    [HttpGet("{slug}/return-policy")]
    public async Task<IActionResult> GetReturnPolicy(string slug)
    {
        var policy = await _publicStoreService.GetReturnPolicyAsync(slug);
        if (policy == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = policy });
    }
    [HttpGet("{slug}/contact")]
    public async Task<IActionResult> GetContact(string slug)
    {
        var contact = await _publicStoreService.GetContactAsync(slug);
        if (contact == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = contact });
    }
    [HttpGet("{slug}/products/{productId}/reviews")]
    public async Task<IActionResult> GetProductReviews(string slug, long productId)
    {
        var reviews = await _publicStoreService.GetProductReviewsAsync(slug, productId);
        if (reviews == null)
            return NotFound(new { success = false, message = "المتجر أو المنتج غير موجود" });
        return Ok(new { success = true, data = reviews });
    }
    [HttpGet("{slug}/products/{productId}/related")]
    public async Task<IActionResult> GetRelatedProducts(string slug, long productId)
    {
        var products = await _publicStoreService.GetRelatedProductsAsync(slug, productId);
        if (products == null)
            return NotFound(new { success = false, message = "المتجر أو المنتج غير موجود" });
        return Ok(new { success = true, data = products });
    }
    [HttpPost("{slug}/products/{productId}/reviews")]
    public async Task<IActionResult> CreateProductReview(string slug, long productId, [FromBody] CreateProductReviewDto dto)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }
        try
        {
            var review = await _publicStoreService.CreateProductReviewAsync(slug, productId, customerId, dto);
            if (review == null)
                return NotFound(new { success = false, message = "المتجر أو المنتج غير موجود" });
            return Ok(new { success = true, data = review, message = "تم إضافة التقييم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("{slug}/orders/{orderNumber}")]
    public async Task<IActionResult> GetOrder(string slug, string orderNumber, [FromQuery] string? phone)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }

        var order = await _publicStoreService.GetOrderAsync(slug, orderNumber, phone, customerId);
        if (order == null)
            return NotFound(new { success = false, message = "الطلب غير موجود أو بيانات التحقق غير صحيحة" });

        return Ok(new { success = true, data = order });
    }

    // حالة الدفع الإلكتروني للطلب — تستخدمه صفحة "شكرًا" للتحقق من اكتمال السداد
    // بعد عودة العميل من صفحة الدفع المحمية عند موياسر.
    [HttpGet("{slug}/orders/{orderNumber}/payment-status")]
    public async Task<IActionResult> GetOrderPaymentStatus(string slug, string orderNumber)
    {
        try
        {
            var result = await _paymentService.CheckOrderPaymentStatusBySlugAsync(slug, orderNumber);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // 📄 رفع إيصال الحوالة البنكية من العميل — متحقق منه بجلسة سريعة برقم الهاتف
    // (نفس آلية التحقق الخاصة بجلب تفاصيل الطلب تمامًا)
    [HttpPost("{slug}/orders/{orderNumber}/bank-transfer/receipt")]
    public async Task<IActionResult> UploadBankTransferReceipt(string slug, string orderNumber, [FromBody] SubmitBankTransferReceiptDto dto)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }

        var phone = GetCustomerPhone();
        if (phone == null && customerId == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً لرفع الإيصال" });

        try
        {
            var result = await _paymentService.UploadBankTransferReceiptAsync(slug, orderNumber, phone, customerId, dto.ReceiptUrl, dto.Reference);
            if (!result.Success)
                return BadRequest(new { success = false, message = result.Message });
            return Ok(new { success = true, data = result, message = result.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // معاينة تكلفة الشحن التقديرية قبل ما العميل يأكد الطلب — بنفس الشركة والمنطق اللي هيُطبّق فعليًا
    [HttpPost("{slug}/shipping-quote")]
    public async Task<IActionResult> GetShippingQuote(string slug, [FromBody] PublicShippingQuoteRequestDto dto)
    {
        var result = await _publicStoreService.GetShippingQuoteAsync(slug, dto);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("{slug}/checkout")]
    public async Task<IActionResult> Checkout(string slug, [FromBody] CheckoutRequestDto dto)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }
        try
        {
            var result = await _orderService.CheckoutAsync(slug, customerId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPost("{slug}/orders/return")]
    public async Task<IActionResult> RequestReturn(string slug, [FromBody] FatooraRahatak.Application.DTOs.Orders.RequestReturnDto dto)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }
        try
        {
            await _orderService.RequestReturnAsync(slug, customerId, dto);
            return Ok(new { success = true, message = "تم إرسال طلب الإرجاع بنجاح، وسيتم مراجعته من المتجر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPost("{slug}/quick-login/send")]
    public async Task<IActionResult> QuickLoginSend(string slug, [FromBody] QuickLoginRequestDto dto)
    {
        try
        {
            var result = await _quickLoginService.SendOtpAsync(slug, dto.Phone);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPost("{slug}/quick-login/verify")]
    public async Task<IActionResult> QuickLoginVerify(string slug, [FromBody] QuickLoginVerifyDto dto)
    {
        try
        {
            var result = await _quickLoginService.VerifyOtpAsync(slug, dto.Phone, dto.Code);
            if (result == null)
                return NotFound(new { success = false, message = "لم نعثر على بيانات سابقة لهذا الرقم" });
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    // بيانات العميل اللحظية لجلسة الدخول السريع — يحدّث عداد الطلبات عند فتح الـ popup
    // بدلًا من الاعتماد على بيانات قديمة مخزّنة في المتصفح (localStorage).
    [HttpGet("{slug}/quick-login/me")]
    public async Task<IActionResult> QuickLoginMe(string slug)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        try
        {
            var customer = await _quickLoginService.GetCustomerByPhoneAsync(slug, phone);
            if (customer == null)
                return NotFound(new { success = false, message = "لم نعثر على بيانات سابقة لهذا الرقم" });
            return Ok(new { success = true, data = customer });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("{slug}/customer/orders")]
    public async Task<IActionResult> GetCustomerOrders(string slug)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        var orders = await _publicStoreService.GetCustomerOrdersAsync(slug, phone);
        return Ok(new { success = true, data = orders });
    }
    [HttpPost("{slug}/customer/orders/{orderNumber}/cancel")]
    public async Task<IActionResult> CancelCustomerOrder(string slug, string orderNumber)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        try
        {
            await _orderService.CancelOrderPublicAsync(slug, orderNumber, phone);
            return Ok(new { success = true, message = "تم إلغاء الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("{slug}/customer/addresses")]
    public async Task<IActionResult> GetCustomerAddresses(string slug)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        var addresses = await _publicStoreService.GetCustomerAddressesAsync(slug, phone);
        return Ok(new { success = true, data = addresses });
    }
    [HttpPost("{slug}/customer/addresses")]
    public async Task<IActionResult> SaveCustomerAddress(string slug, [FromBody] SaveCustomerAddressDto dto)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        try
        {
            var address = await _publicStoreService.SaveCustomerAddressAsync(slug, phone, dto);
            return Ok(new { success = true, data = address, message = "تم حفظ العنوان بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("{slug}/customer/addresses/{addressId}")]
    public async Task<IActionResult> UpdateCustomerAddress(string slug, long addressId, [FromBody] SaveCustomerAddressDto dto)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        try
        {
            var address = await _publicStoreService.UpdateCustomerAddressAsync(slug, phone, addressId, dto);
            return Ok(new { success = true, data = address, message = "تم تحديث العنوان بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpDelete("{slug}/customer/addresses/{addressId}")]
    public async Task<IActionResult> DeleteCustomerAddress(string slug, long addressId)
    {
        var phone = GetCustomerPhone();
        if (phone == null)
            return Unauthorized(new { success = false, message = "يرجى تسجيل الدخول أولاً" });
        try
        {
            await _publicStoreService.DeleteCustomerAddressAsync(slug, phone, addressId);
            return Ok(new { success = true, message = "تم حذف العنوان بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}