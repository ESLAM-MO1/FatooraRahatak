using System.Text.RegularExpressions;
using FluentValidation;
using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Validators;

public partial class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    private static readonly Regex EmailRegex = MyEmailRegex();
    private static readonly Regex PhoneRegex = InternationalPhoneRegexPattern();

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex MyEmailRegex();

    // E.164 format: + followed by 8 to 15 digits total (country code + number)
    [GeneratedRegex(@"^\+[1-9]\d{7,14}$")]
    private static partial Regex InternationalPhoneRegexPattern();

    public RegisterDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني مطلوب")
            .Matches(EmailRegex).WithMessage("صيغة البريد الإلكتروني غير صحيحة");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("رقم الجوال مطلوب")
            .Matches(PhoneRegex).WithMessage("رقم الجوال غير صحيح");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("كلمة المرور مطلوبة")
            .MinimumLength(6).WithMessage("كلمة المرور يجب ألا تقل عن 6 رموز (أحرف أو أرقام)");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("الاسم مطلوب");
    }
}