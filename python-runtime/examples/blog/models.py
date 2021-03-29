from django.db import models

# Create your models here.
class Category(models.Model):
  """
  Django 要求模型必须继承 models.Model 类。
  Category 只需要一个简单的分类名 name 就可以了。
  CharField 指定了分类名 name 的数据类型，CharField 是字符型，
  CharField 的 max_length 参数指定其最大长度，超过这个长度的分类名就不能被存入数据库。
  当然 Django 还为我们提供了多种其它的数据类型，如日期时间类型 DateTimeField、整数类型 IntegerField 等等。
  Django 内置的全部类型可查看文档：
  https://docs.djangoproject.com/en/1.10/ref/models/fields/#field-types
  """
  name = models.CharField(max_length=100)
  excerpt = models.TextField(max_length=200, blank=True)

  def __str__(self):
    return self.name

class Label(models.Model):
  title=models.CharField(max_length=20,verbose_name='label name')