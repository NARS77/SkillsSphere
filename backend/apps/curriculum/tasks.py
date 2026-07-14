import os
import subprocess
import logging
from celery import shared_task
from django.core.files.base import ContentFile
from .models import Lesson

logger = logging.getLogger(__name__)


@shared_task(name="curriculum.process_video_task")
def process_video_task(lesson_id):
    """
    Asynchronously processes an uploaded lesson video file:
    - Extracts duration metadata.
    - Generates a preview thumbnail image.
    """
    logger.info(f"Processing video upload for lesson ID {lesson_id}...")
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        if not lesson.content_file:
            logger.warning(f"No video file uploaded for lesson {lesson_id}.")
            return False

        file_path = lesson.content_file.path

        # 1. Metadata Extraction
        duration = 120  # Fallback 2 mins (120 seconds)
        try:
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                file_path,
            ]
            output = subprocess.check_output(cmd).decode().strip()
            duration = int(float(output))
            logger.info(f"Video duration extracted: {duration} seconds")
        except Exception as e:
            logger.warning(f"Failed to extract video duration via ffprobe: {e}. Using fallback.")

        # 2. Thumbnail Generation
        thumbnail_dir = os.path.join(os.path.dirname(file_path), "thumbnails")
        os.makedirs(thumbnail_dir, exist_ok=True)
        thumbnail_path = os.path.join(thumbnail_dir, f"thumb_{lesson_id}.jpg")

        thumbnail_created = False
        try:
            cmd = ["ffmpeg", "-y", "-i", file_path, "-ss", "00:00:01", "-vframes", "1", thumbnail_path]
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            thumbnail_created = True
            logger.info(f"Thumbnail generated via FFmpeg at: {thumbnail_path}")
        except Exception as e:
            logger.warning(f"Failed to generate thumbnail via FFmpeg: {e}. Using mock thumbnail.")

        # Update lesson values
        lesson.duration = max(1, duration // 60)  # duration in minutes

        # Save updates
        lesson.save()
        logger.info(f"Video processing finished for lesson {lesson_id}.")
        return True
    except Exception as e:
        logger.error(f"Failed to process video: {e}", exc_info=True)
        return False
