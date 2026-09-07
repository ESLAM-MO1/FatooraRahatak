namespace FatooraRahatak.Application.Interfaces;

public interface ICustomerSessionService
{
    string IssueToken(long storeId, string phone);
    (long StoreId, string Phone)? ValidateToken(string token);
}
