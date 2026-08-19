using RodeoBarberShop.Api.Entities;

namespace RodeoBarberShop.Api.Services.Auth;

public interface ITokenService
{
    string CreateAccessToken(User user);
}
