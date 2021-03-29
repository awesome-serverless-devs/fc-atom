from django.contrib import admin

# Register your models here.
from blog.models import Category, Label
class CategoryAdmin(admin.ModelAdmin):
  pass
class LabelAdmin(admin.ModelAdmin):
  pass

admin.site.register(Category,CategoryAdmin)
admin.site.register(Label,LabelAdmin)