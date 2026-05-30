from src.celery_app.email_task import (
    EmailDeliveryError,
    send_email as send_email_task,
)
from src.config import settings


def _enqueue_email(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
) -> None:
    try:
        send_email_task.apply_async(
            kwargs={
                "to_email": to_email,
                "subject": subject,
                "text": text,
                "html": html,
            },
            queue="emails",
        )
    except Exception as exc:
        raise EmailDeliveryError("Failed to enqueue email task") from exc


def send_verification_code(*, to_email: str, code: str) -> None:
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

    _enqueue_email(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
    )


def send_password_reset_email(*, to_email: str, username: str, reset_token: str) -> None:
    subject = f"{settings.APP_NAME}: сброс пароля"

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    text = (
        f"Привет, {username}!\n\n"
        f"Вы запросили сброс Вашего пароля. Перейдите по ссылке ниже что бы установить новый пароль:\n{reset_url}\n\n"
        f"Ссылка истекает через {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут."
    )

    html = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>{settings.APP_NAME}</h2>
      <p>Привет, {username}!</p>
      <p>Вы запросили сброс Вашего пароля. Чтобы установить новый пароль, нажмите на кнопку ниже:</p>
      <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; background-color: #007BFF; text-decoration: none; border-radius: 4px;">Сбросить пароль</a>
      <p>Ссылка истекает через {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} минут.</p>
      <p>Если вы не запрашивали сброс пароля, просто проигнорируйте письмо.</p>
    </div>
    """

    _enqueue_email(
        to_email=to_email,
        subject=subject,
        text=text,
        html=html,
    )
