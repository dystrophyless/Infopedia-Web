import httpx
from asgiref.sync import async_to_sync

from src.celery_app.app import app
from src.config import settings


class EmailDeliveryError(RuntimeError):
    pass


async def run_email_task(
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


@app.task(
    name="email_task.send_email",
    autoretry_for=(EmailDeliveryError, httpx.HTTPError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
)
def send_email(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
) -> None:
    async_to_sync(run_email_task)(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
    )
