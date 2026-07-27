using System.Text.RegularExpressions;
using FluentValidation;
using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Validators;

public partial class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    private static readonly Regex EmailRegex = MyEmailRegex();
    private static readonly Regex SaudiPhoneRegex = SaudiPhoneRegexPattern();

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex MyEmailRegex();

    [GeneratedRegex(@"^(?:\+966|05)(5|0|3|6|4|9|1|2|7|8)\d{7}$")]
    private static partial Regex SaudiPhoneRegexPattern();

    public RegisterDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني مطلوب")
            .Matches(EmailRegex).WithMessage("صيغة البريد الإلكتروني غير صحيحة");

        RuleFor(x => x.Phone)
            .NotEmpty().WithMessage("رقم الجوال مطلوب")
            .Matches(SaudiPhoneRegex).WithMessage("رقم الجوال غير صحيح، يجب أن يبدأ بـ 05 أو +966 ويتكون من 9 أرقام");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("كلمة المرور مطلوبة")
            .MinimumLength(6).WithMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("الاسم مطلوب");
    }
}
