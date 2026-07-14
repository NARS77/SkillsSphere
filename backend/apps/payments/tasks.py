import logging
from celery import shared_task
from .models import Payment

logger = logging.getLogger(__name__)


@shared_task(name="payments.generate_invoice_task")
def generate_invoice_task(payment_id):
    """
    Asynchronously generate and save billing receipt PDF for a successful checkout payment.
    """
    logger.info(f"Generating invoice receipt asynchronously for payment ID: {payment_id}")
    try:
        payment = Payment.objects.get(id=payment_id)
        from .services import CommerceService

        CommerceService.generate_payout_receipt(payment)
        logger.info(f"Successfully generated invoice receipt PDF for payment {payment_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to generate invoice receipt: {e}", exc_info=True)
        return False
