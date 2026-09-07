using System.Text.RegularExpressions;
using FluentValidation;
using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Validators;

public partial class VerifyAccountDtoValidator : AbstractValidator<VerifyAccountDto>
{
    private static readonly Regex EmailRegex = MyEmailRegex();

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex MyEmailRegex();

    public VerifyAccountDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني مطلوب")
            .Matches(EmailRegex).WithMessage("صيغة البريد الإلكتروني غير صحيحة");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("رمز التفعيل مطلوب")
            .Length(6).WithMessage("رمز التفعيل يجب أن يكون 6 أرقام");
    }
}
