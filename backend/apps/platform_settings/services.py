from .models import PlatformSetting


class PlatformSettingService:
    @staticmethod
    def get_setting(key, default_value=None):
        setting = PlatformSetting.objects.filter(key=key).first()
        if setting:
            return setting.value.get("value", default_value)
        return default_value

    @staticmethod
    def set_setting(key, value):
        setting, created = PlatformSetting.objects.update_or_create(key=key, defaults={"value": {"value": value}})
        return setting
