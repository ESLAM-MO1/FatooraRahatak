using System.Text.RegularExpressions;
using FluentValidation;
using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Validators;

public partial class ResetPasswordDtoValidator : AbstractValidator<ResetPasswordDto>
{
    private static readonly Regex EmailRegex = MyEmailRegex();

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex MyEmailRegex();

    public ResetPasswordDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني مطلوب")
            .Matches(EmailRegex).WithMessage("صيغة البريد الإلكتروني غير صحيحة");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("رمز التحقق مطلوب")
            .Length(6).WithMessage("رمز التحقق يجب أن يكون 6 أرقام");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("كلمة المرور الجديدة مطلوبة")
            .MinimumLength(6).WithMessage("كلمة المرور يجب ألا تقل عن 6 رموز (أحرف أو أرقام)");
    }
}
