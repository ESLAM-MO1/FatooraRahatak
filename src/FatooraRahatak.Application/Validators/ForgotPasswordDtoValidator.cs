using System.Text.RegularExpressions;
using FluentValidation;
using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Validators;

public partial class ForgotPasswordDtoValidator : AbstractValidator<ForgotPasswordDto>
{
    private static readonly Regex EmailRegex = MyEmailRegex();

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex MyEmailRegex();

    public ForgotPasswordDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني مطلوب")
            .Matches(EmailRegex).WithMessage("صيغة البريد الإلكتروني غير صحيحة");
    }
}
