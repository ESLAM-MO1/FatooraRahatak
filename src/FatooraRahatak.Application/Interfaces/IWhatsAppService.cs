namespace FatooraRahatak.Application.Interfaces;

public interface IWhatsAppService
{
    Task SendTextMessageAsync(string to, string message);
}
