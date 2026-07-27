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

    def save(self, *args, **kwargs):
        generated_slug = slugify(self.name)
        if not self.slug:
            self.slug = generated_slug
        elif self.pk:
            previous = (
                type(self)
                ._default_manager.filter(pk=self.pk)
                .values_list("name", flat=True)
                .first()
            )
            if previous and self.slug == slugify(previous):
                self.slug = generated_slug
        super().save(*args, **kwargs)


class AbstractTenantDomain(models.Model):
    domain = models.CharField(
        max_length=255, unique=True, validators=[DomainNameValidator()]
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        abstract = True
