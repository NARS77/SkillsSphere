import logging
import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

class BaseEmailProvider:
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        raise NotImplementedError()

class SMTPEmailProvider(BaseEmailProvider):
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'SkillSphere <noreply@skillsphere.com>')
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"SMTP delivery failed: {e}")
            return False

class SendGridEmailProvider(BaseEmailProvider):
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        if not api_key:
            logger.warning("SENDGRID_API_KEY not configured. Falling back to SMTP/Console.")
            return SMTPEmailProvider().send(subject, message, recipient_list, html_message)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "personalizations": [{"to": [{"email": r} for r in recipient_list]}],
            "from": {"email": getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@skillsphere.com')},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": message},
                {"type": "text/html", "value": html_message or message}
            ]
        }
        try:
            res = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=10)
            return res.status_code in [200, 201, 202]
        except Exception as e:
            logger.error(f"SendGrid delivery failed: {e}")
            return False

class MailgunEmailProvider(BaseEmailProvider):
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        api_key = getattr(settings, 'MAILGUN_API_KEY', None)
        domain = getattr(settings, 'MAILGUN_DOMAIN', None)
        if not api_key or not domain:
            logger.warning("Mailgun settings not fully configured. Falling back to SMTP/Console.")
            return SMTPEmailProvider().send(subject, message, recipient_list, html_message)

        try:
            res = requests.post(
                f"https://api.mailgun.net/v3/{domain}/messages",
                auth=("api", api_key),
                data={
                    "from": getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@skillsphere.com'),
                    "to": recipient_list,
                    "subject": subject,
                    "text": message,
                    "html": html_message or message
                },
                timeout=10
            )
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Mailgun delivery failed: {e}")
            return False

class SESEmailProvider(BaseEmailProvider):
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        # AWS SES utilizes boto3. We mock the behavior. If boto3 is available and AWS configured, we can send.
        # Otherwise, fall back to SMTP.
        try:
            import boto3
            client = boto3.client(
                'ses',
                region_name=getattr(settings, 'AWS_SES_REGION_NAME', 'us-east-1'),
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            )
            destination = {'ToAddresses': recipient_list}
            message_body = {
                'Text': {'Data': message}
            }
            if html_message:
                message_body['Html'] = {'Data': html_message}
                
            payload = {
                'Source': getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@skillsphere.com'),
                'Destination': destination,
                'Message': {
                    'Subject': {'Data': subject},
                    'Body': message_body
                }
            }
            res = client.send_email(**payload)
            return bool(res.get('MessageId'))
        except Exception as e:
            logger.warning(f"AWS SES client or delivery not available ({e}). Falling back to SMTP.")
            return SMTPEmailProvider().send(subject, message, recipient_list, html_message)

class ResendEmailProvider(BaseEmailProvider):
    def send(self, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        api_key = getattr(settings, 'RESEND_API_KEY', None)
        if not api_key:
            logger.warning("RESEND_API_KEY not configured. Falling back to SMTP/Console.")
            return SMTPEmailProvider().send(subject, message, recipient_list, html_message)
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@skillsphere.com'),
            "to": recipient_list,
            "subject": subject,
            "text": message,
            "html": html_message or message
        }
        try:
            res = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
            return res.status_code in [200, 201, 202]
        except Exception as e:
            logger.error(f"Resend delivery failed: {e}")
            return False

class EmailProviderService:
    """
    Orchestrates email dispatch routing based on active environment provider settings.
    """
    _providers = {
        'smtp': SMTPEmailProvider(),
        'sendgrid': SendGridEmailProvider(),
        'mailgun': MailgunEmailProvider(),
        'ses': SESEmailProvider(),
        'resend': ResendEmailProvider()
    }

    @classmethod
    def get_provider(cls) -> BaseEmailProvider:
        provider_name = getattr(settings, 'EMAIL_PROVIDER', 'smtp').lower()
        return cls._providers.get(provider_name, SMTPEmailProvider())

    @classmethod
    def send(cls, subject: str, message: str, recipient_list: list, html_message: str = None) -> bool:
        provider = cls.get_provider()
        logger.info(f"Routing email with subject '{subject}' via provider '{provider.__class__.__name__}'")
        return provider.send(subject, message, recipient_list, html_message)
