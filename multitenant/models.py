from django.core.validators import DomainNameValidator
from django.db import models
from django.utils.text import slugify


class AbstractTenant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_name = self.name

    def save(self, *args, **kwargs):
        generated_slug = slugify(self.name)
        if not self.slug or self.slug == slugify(self._original_name):
            self.slug = generated_slug
        super().save(*args, **kwargs)
        self._original_name = self.name


class AbstractTenantDomain(models.Model):
    domain = models.CharField(
        max_length=255, unique=True, validators=[DomainNameValidator()]
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        abstract = True
