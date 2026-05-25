import httpx

from src.config import settings


class EmailDeliveryError(RuntimeError):
    pass


async def send_email(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
) -> None:
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "text": text,
    }

    if html is not None:
        payload["html"] = html

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY.get_secret_value()}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers=headers,
        )

    if response.status_code >= 400:
        raise EmailDeliveryError(response.text)


async def send_verification_code(*, to_email: str, code: str) -> None:
    subject = f"{settings.APP_NAME}: код подтверждения"

    text = (
        f"Ваш код подтверждения: {code}\n\n"
        f"Код истекает через {settings.VERIFICATION_CODE_EXPIRE_MINUTES} минут."
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>{settings.APP_NAME}</h2>
      <p>Ваш код подтверждения:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">{code}</p>
      <p>Код истекает через {settings.VERIFICATION_CODE_EXPIRE_MINUTES} минут.</p>
      <p>Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
    </div>
    """

    await send_email(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
    )