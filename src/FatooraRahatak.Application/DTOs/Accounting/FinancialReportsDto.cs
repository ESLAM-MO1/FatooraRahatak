namespace FatooraRahatak.Application.DTOs.Accounting;

public class TrialBalanceLineDto
{
    public long AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountNameAr { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal DebitBalance { get; set; }
    public decimal CreditBalance { get; set; }
}

public class TrialBalanceDto
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public List<TrialBalanceLineDto> Lines { get; set; } = new();
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public bool IsBalanced { get; set; }
}

public class IncomeStatementLineDto
{
    public long AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountNameAr { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class IncomeStatementDto
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public List<IncomeStatementLineDto> RevenueLines { get; set; } = new();
    public List<IncomeStatementLineDto> ExpenseLines { get; set; } = new();
    public decimal TotalRevenue { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
}

public class BalanceSheetLineDto
{
    public long AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountNameAr { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class BalanceSheetDto
{
    public DateOnly AsOf { get; set; }
    public List<BalanceSheetLineDto> AssetLines { get; set; } = new();
    public List<BalanceSheetLineDto> LiabilityLines { get; set; } = new();
    public List<BalanceSheetLineDto> EquityLines { get; set; } = new();
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public decimal TotalEquity { get; set; }
    public bool IsBalanced { get; set; }
}

public class CashFlowLineDto
{
    public string SourceType { get; set; } = string.Empty;
    public decimal NetAmount { get; set; }
}

public class CashFlowDto
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public decimal OpeningCashBalance { get; set; }
    public decimal ClosingCashBalance { get; set; }
    public decimal NetChangeInCash { get; set; }
    public List<CashFlowLineDto> MovementsBySource { get; set; } = new();
}