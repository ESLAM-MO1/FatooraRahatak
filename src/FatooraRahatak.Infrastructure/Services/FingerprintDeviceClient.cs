using System.Net.Sockets;
using System.Text;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// طبقة التواصل مع أجهزة الحضور عبر الشبكة (TCP/IP).
/// تدعم بروتوكول أجهزة ZKTeco القياسي (المنفذ 4370) عبر قراءة سجلات الجهاز،
/// مع دعم أجهزة Hikvision وNFC التي توفّر واجهة HTTP بسيطة.
/// ملاحظة: قراءة بصمة الجهاز نفسه تتطلب الـ SDK الرسمي من الشركة المصنعة
/// لتفكيك سجل البصمة الرقمية؛ هذه الطبقة تجلب سجلات الحضور (Check In/Out)
/// النصية التي يخزنها الجهاز داخليًا.
/// </summary>
public class FingerprintDeviceClient
{
    private readonly HttpClient _httpClient;

    public FingerprintDeviceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// محاولة الاتصال بالجهاز عبر TCP (منفذ ZKTeco الافتراضي 4370) وإرجاع
    /// قائمة سجلات خام. إن فشل اتصال TCP جرّب HTTP لو الجهاز يوفر واجهة.
    /// </summary>
    public async Task<List<DeviceRawAttendance>> PullAttendanceAsync(string deviceIp, int port, CancellationToken ct = default)
    {
        // 1) جرّب TCP أولاً (بروتوكول ZKTeco)
        try
        {
            using var tcp = new TcpClient();
            var connectTask = tcp.ConnectAsync(deviceIp, port);
            var done = await Task.WhenAny(connectTask, Task.Delay(3000, ct));
            if (done != connectTask || !tcp.Connected)
                throw new TimeoutException("تعذر الاتصال بالجهاز عبر TCP");

            // بروتوكول قراءة الحضور في أجهزة ZKTeco يحتاج الـ SDK (CommData API)؛
            // نكتفي باختبار الاتصال وإرجاع قائمة فارغة مع إشارة أن الاتصال نجح.
            return new List<DeviceRawAttendance>
            {
                new() { Connected = true, IsSimulated = true }
            };
        }
        catch
        {
            // 2) جرّب HTTP (لو الجهاز يوفر واجهة REST — بعض أجهزة Hikvision/المحدثة)
            try
            {
                var uri = new UriBuilder("http", deviceIp, port == 0 ? 80 : port, "/api/attendance/records").Uri;
                var response = await _httpClient.GetAsync(uri, ct);
                if (response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(ct);
                    return new List<DeviceRawAttendance>
                    {
                        new() { Connected = true, IsSimulated = false, RawPayload = body }
                    };
                }
            }
            catch
            {
                // تجاهل — الرجوع للرسالة أدناه
            }

            throw new InvalidOperationException(
                "تعذر الاتصال بجهاز الحضور. تأكد من أن الجهاز متصل بالشبكة، وأن عنوان IP والمنفذ صحيحان، " +
                "وأن منفذ الاتصال (4370 لأجهزة البصمة) مسموح به في جدار الحماية. " +
                "ملاحظة: قراءة البصمة نفسها تتطلب تثبيت برنامج/مكتبة الشركة المصنعة على الخادم.");
        }
    }
}

public class DeviceRawAttendance
{
    public bool Connected { get; set; }
    public bool IsSimulated { get; set; }
    public string? RawPayload { get; set; }
}
